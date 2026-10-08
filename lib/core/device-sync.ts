/**
 * Keeps preferences (localStorage) and, optionally, the photo library (IndexedDB) in sync with the store.
 * Started once on the client (components/studio/DeviceSync.tsx). Pure dependencies are injected so the
 * whole flow is testable without a browser (tests/device-sync.test.ts).
 */

import type { StudioItem, StudioState } from './types';
import { Prefs, loadPrefs, savePrefs, prefsFromState, statePatchFromPrefs } from './prefs';
import { CacheMeta, CachedPhoto, PhotoStore, orderRestored, planCacheSync, toCachedPhoto } from './library-cache';
import { AI_PLAN_PRESET_ID, sanitizeAiPlanRecord } from '../engine/ai-plan';

export interface SyncStore {
  getState(): StudioState;
  setState(partial: Partial<StudioState>): void;
  subscribe(listener: (s: StudioState) => void): () => void;
  addItems(items: StudioItem[]): void;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface DeviceSyncDeps {
  store: SyncStore;
  photos: PhotoStore | null;
  prefsStorage: StorageLike | null;
  freeQuota: () => Promise<number | null>;
  createItem: (file: File, index: number, restore: { id: string; createdAt: number }) => StudioItem;
  knownPresetIds: readonly string[];
  debounceMs?: number;
}

export type LibraryKeepStatus = 'off' | 'unavailable' | 'kept' | 'partial' | 'full';

export interface DeviceSyncStatus {
  remember: boolean;
  /** IndexedDB could be opened */
  available: boolean;
  keptCount: number;
  keptBytes: number;
  skippedCount: number;
  state: LibraryKeepStatus;
}

export class DeviceSync {
  private prefs: Prefs;
  private cached = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private unsub: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private quotaHit = false;
  private lastPrefsJson = '';
  status: DeviceSyncStatus;

  constructor(private deps: DeviceSyncDeps) {
    this.prefs = loadPrefs(deps.knownPresetIds, deps.prefsStorage);
    this.status = {
      remember: this.prefs.rememberLibrary,
      available: !!deps.photos,
      keptCount: 0,
      keptBytes: 0,
      skippedCount: 0,
      state: !deps.photos ? 'unavailable' : this.prefs.rememberLibrary ? 'kept' : 'off',
    };
  }

  subscribeStatus(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setStatus(patch: Partial<DeviceSyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Applies saved prefs, restores kept photos into an empty library, then follows the store */
  async start(): Promise<void> {
    const { store, photos } = this.deps;
    store.setState(statePatchFromPrefs(this.prefs, store.getState()));
    this.lastPrefsJson = JSON.stringify(this.prefs);

    if (photos) {
      try {
        const all = await photos.getAll();
        all.forEach((p) => this.cached.set(p.id, p.blob.size));
        if (this.prefs.rememberLibrary && store.getState().items.length === 0 && all.length > 0) {
          await this.restore(all, await photos.getMeta());
        } else if (!this.prefs.rememberLibrary && all.length > 0) {
          await photos.clear();
          this.cached.clear();
        }
        this.refreshCounts();
      } catch {
        this.setStatus({ available: false, state: 'unavailable' });
      }
    }

    this.unsub = store.subscribe(() => this.schedule());
    this.schedule();
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Waits for pending writes (tests, page hide) */
  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.enqueue();
    }
    await this.chain;
  }

  /** Turns the photo memory on/off. Off deletes kept photos from this device. */
  async setRemember(on: boolean): Promise<void> {
    this.prefs = { ...this.prefs, rememberLibrary: on };
    savePrefs(this.prefs, this.deps.prefsStorage);
    this.lastPrefsJson = JSON.stringify(this.prefs);
    this.quotaHit = false;
    this.setStatus({ remember: on, state: !this.deps.photos ? 'unavailable' : on ? 'kept' : 'off' });
    if (!on && this.deps.photos) {
      this.chain = this.chain.then(async () => {
        try {
          await this.deps.photos!.clear();
        } catch {
          /* already gone */
        }
        this.cached.clear();
        this.refreshCounts();
      });
      await this.chain;
    } else {
      this.schedule();
      await this.flushNow();
    }
  }

  private async restore(all: CachedPhoto[], meta: CacheMeta | null) {
    const ordered = orderRestored(all, meta);
    const items = ordered.map((p, i) => {
      const file = new File([p.blob], p.name, { type: p.type });
      const item = this.deps.createItem(file, i, { id: p.id, createdAt: p.createdAt });
      return { ...item, sourceId: p.sourceId, derivedBy: p.derivedBy ?? undefined };
    });
    const ids = new Set(items.map((i) => i.id));
    this.deps.store.addItems(items);
    const state = this.deps.store.getState();
    const pick = <T>(rec: Record<string, T> | undefined) =>
      Object.fromEntries(Object.entries(rec ?? {}).filter(([id]) => ids.has(id))) as Record<string, T>;
    // AI plans come back from storage: validate them again (D28)
    const edits = pick(meta?.edits);
    for (const [id, e] of Object.entries(edits)) {
      if (!e || !('aiPlan' in e)) continue;
      const rec = sanitizeAiPlanRecord(e.aiPlan);
      const next = { ...e, aiPlan: rec ?? undefined };
      if (!rec && next.presetId === AI_PLAN_PRESET_ID) next.presetId = null;
      edits[id] = next;
    }
    this.deps.store.setState({
      edits: { ...state.edits, ...edits },
      storyLayout: { ...state.storyLayout, cellTransforms: { ...state.storyLayout.cellTransforms, ...pick(meta?.cellTransforms) } },
      selectedItemId: meta?.selectedId && ids.has(meta.selectedId) ? meta.selectedId : state.selectedItemId,
    });
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.enqueue();
    }, this.deps.debounceMs ?? 400);
  }

  private enqueue() {
    this.chain = this.chain.then(() => this.sync()).catch(() => undefined);
  }

  private async sync(): Promise<void> {
    const state = this.deps.store.getState();

    // 1. Preferences (small; written only when changed)
    const next = prefsFromState(state, this.prefs);
    const json = JSON.stringify(next);
    if (json !== this.lastPrefsJson) {
      this.prefs = next;
      savePrefs(next, this.deps.prefsStorage);
      this.lastPrefsJson = json;
    }

    // 2. Photos
    const photos = this.deps.photos;
    if (!photos || !this.prefs.rememberLibrary) return;

    if (state.items.length === 0) {
      if (this.cached.size > 0) {
        await photos.clear();
        this.cached.clear();
      }
      this.quotaHit = false;
      this.refreshCounts();
      return;
    }

    const library = state.items.filter((i) => i.file).map((i) => ({ id: i.id, bytes: i.file!.size }));
    const cached = [...this.cached].map(([id, bytes]) => ({ id, bytes }));
    const plan = planCacheSync(library, cached, await this.deps.freeQuota());

    for (const id of plan.toDelete) {
      await photos.delete(id);
      this.cached.delete(id);
    }
    for (const id of plan.toPut) {
      const item = state.items.find((i) => i.id === id);
      const rec = item ? toCachedPhoto(item) : null;
      if (!rec) continue;
      try {
        await photos.put(rec);
        this.cached.set(id, rec.blob.size);
      } catch {
        // QuotaExceededError and friends: keep what fits, say so
        this.quotaHit = true;
        break;
      }
    }

    const kept = new Set(this.cached.keys());
    const meta: CacheMeta = {
      order: state.items.map((i) => i.id).filter((id) => kept.has(id)),
      selectedId: state.selectedItemId && kept.has(state.selectedItemId) ? state.selectedItemId : null,
      edits: Object.fromEntries(Object.entries(state.edits).filter(([id]) => kept.has(id))),
      cellTransforms: Object.fromEntries(Object.entries(state.storyLayout.cellTransforms).filter(([id]) => kept.has(id))),
    };
    try {
      await photos.putMeta(meta);
    } catch {
      this.quotaHit = true;
    }
    // Photos in the library that are not kept (cap, quota, or no original file)
    this.refreshCounts(state.items.length - state.items.filter((i) => kept.has(i.id)).length);
  }

  private refreshCounts(skipped = 0) {
    let bytes = 0;
    this.cached.forEach((b) => (bytes += b));
    const state: LibraryKeepStatus = !this.deps.photos
      ? 'unavailable'
      : !this.prefs.rememberLibrary
        ? 'off'
        : this.quotaHit
          ? 'full'
          : skipped > 0
            ? 'partial'
            : 'kept';
    this.setStatus({ keptCount: this.cached.size, keptBytes: bytes, skippedCount: skipped, state });
  }
}
