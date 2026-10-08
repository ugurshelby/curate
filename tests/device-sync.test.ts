import { describe, it, expect } from 'vitest';
import { studioStore } from '../lib/core/state-machine';
import type { StudioItem, StudioState } from '../lib/core/types';
import { DEFAULT_PREFS, PREFS_KEY, loadPrefs, sanitizePrefs, savePrefs } from '../lib/core/prefs';
import { CacheMeta, CachedPhoto, PhotoStore, LIBRARY_CACHE_LIMITS, orderRestored, planCacheSync } from '../lib/core/library-cache';
import { DeviceSync, SyncStore } from '../lib/core/device-sync';
import { DEFAULT_EDIT_CROP } from '../lib/engine/edit-geometry';

const PRESETS = ['moody_teal', 'amber_grain'];

class MemStorage {
  data = new Map<string, string>();
  writes = 0;
  failWrites = false;
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.writes++;
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

class MemPhotos implements PhotoStore {
  photos = new Map<string, CachedPhoto>();
  meta: CacheMeta | null = null;
  maxBytes = Infinity;
  async getAll() {
    return [...this.photos.values()];
  }
  async getMeta() {
    return this.meta;
  }
  async put(p: CachedPhoto) {
    const used = [...this.photos.values()].reduce((s, x) => s + x.blob.size, 0);
    if (used + p.blob.size > this.maxBytes) throw new Error('QuotaExceededError');
    this.photos.set(p.id, p);
  }
  async putMeta(m: CacheMeta) {
    this.meta = m;
  }
  async delete(id: string) {
    this.photos.delete(id);
  }
  async clear() {
    this.photos.clear();
    this.meta = null;
  }
}

function makeStore(): SyncStore & { state: StudioState } {
  const listeners = new Set<(s: StudioState) => void>();
  const s = {
    state: structuredClone(studioStore.getState()) as StudioState,
    getState: () => s.state,
    setState(p: Partial<StudioState>) {
      s.state = { ...s.state, ...p };
      listeners.forEach((l) => l(s.state));
    },
    subscribe(l: (st: StudioState) => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    addItems(items: StudioItem[]) {
      s.setState({
        items: [...s.state.items, ...items].map((it, i) => ({ ...it, order: i })),
        selectedItemId: s.state.selectedItemId ?? items[0]?.id ?? null,
      });
    },
  };
  return s;
}

function fakeItem(file: File, index: number, restore?: { id: string; createdAt: number }): StudioItem {
  return {
    id: restore?.id ?? `p${index}_${file.name}`,
    file,
    name: file.name,
    originalUrl: 'blob:x',
    proxyUrl: 'blob:x',
    dimensions: { width: 10, height: 10, aspectRatio: 1 },
    proxyDimensions: { width: 10, height: 10, aspectRatio: 1 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: index,
    createdAt: restore?.createdAt ?? index,
  };
}

const file = (name: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });

function setup(opts: { photos?: MemPhotos | null; storage?: MemStorage; quota?: number | null } = {}) {
  const store = makeStore();
  const photos = opts.photos === undefined ? new MemPhotos() : opts.photos;
  const storage = opts.storage ?? new MemStorage();
  const sync = new DeviceSync({
    store,
    photos,
    prefsStorage: storage,
    freeQuota: async () => (opts.quota === undefined ? null : opts.quota),
    createItem: fakeItem,
    knownPresetIds: PRESETS,
    debounceMs: 0,
  });
  return { store, photos, storage, sync };
}

describe('prefs (localStorage)', () => {
  it('falls back to defaults for missing, corrupt or old data', () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ v: 2 })).toEqual(DEFAULT_PREFS);
    const s = new MemStorage();
    s.data.set(PREFS_KEY, '{not json');
    expect(loadPrefs(PRESETS, s)).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(PRESETS, null)).toEqual(DEFAULT_PREFS);
  });

  it('clamps values and drops unknown presets', () => {
    const p = sanitizePrefs(
      {
        v: 1,
        carouselView: { target: 'tiktok', fitMode: 'zoom', showOverlay: 'yes' },
        globalPreset: { id: 'moody_teal', intensity: 7 },
        story: { spacing: 99, backgroundMode: 'pink' },
        frame: { frameType: 'matte', borderWidth: -5, borderRadius: 10.6, showTimestamp: false },
        upscale: { scaleFactor: 8 },
        rememberLibrary: false,
        favorites: ['amber_grain', 'nope', 3],
      },
      PRESETS,
    );
    expect(p.carouselView).toEqual({ target: 'tiktok', fitMode: 'fill', showOverlay: true });
    expect(p.globalPreset).toEqual({ id: 'moody_teal', intensity: 1 });
    expect(p.story).toEqual({ spacing: 32, backgroundMode: 'adaptive-gradient' });
    expect(p.frame).toEqual({ frameType: 'matte', borderWidth: 0, borderRadius: 11, showTimestamp: false, size: '4_5', resolution: 'standard' });
    expect(p.upscale.scaleFactor).toBe(2);
    expect(p.rememberLibrary).toBe(false);
    expect(p.favorites).toEqual(['amber_grain']);
    expect(sanitizePrefs({ v: 1, globalPreset: { id: 'gone', intensity: 1 } }, PRESETS).globalPreset).toBeNull();
  });

  it('a refusing storage (private mode, full) is not an error', () => {
    const s = new MemStorage();
    s.failWrites = true;
    expect(savePrefs(DEFAULT_PREFS, s)).toBe(false);
    expect(savePrefs(DEFAULT_PREFS, null)).toBe(false);
  });
});

describe('library cache plan (IndexedDB)', () => {
  const lim = { maxItems: 3, maxBytes: 100, quotaShare: 0.5 };

  it('keeps photos in library order up to the item and byte caps', () => {
    const lib = [{ id: 'a', bytes: 40 }, { id: 'b', bytes: 40 }, { id: 'c', bytes: 40 }, { id: 'd', bytes: 10 }];
    const plan = planCacheSync(lib, [], null, lim);
    expect(plan.toPut).toEqual(['a', 'b', 'd']);
    expect(plan.skipped).toEqual(['c']);
  });

  it('only new photos need free quota; removed photos are deleted', () => {
    const plan = planCacheSync([{ id: 'a', bytes: 30 }, { id: 'b', bytes: 30 }], [{ id: 'a', bytes: 30 }, { id: 'x', bytes: 5 }], 40, lim);
    expect(plan.toDelete).toEqual(['x']);
    expect(plan.toPut).toEqual([]); // b needs 30 > 40 × 0.5
    expect(plan.skipped).toEqual(['b']);
  });

  it('a kept photo pushed past the cap by reordering leaves the cache', () => {
    const cached = [{ id: 'a', bytes: 10 }, { id: 'b', bytes: 10 }, { id: 'c', bytes: 10 }];
    const lib = [{ id: 'n', bytes: 10 }, { id: 'a', bytes: 10 }, { id: 'b', bytes: 10 }, { id: 'c', bytes: 10 }];
    const plan = planCacheSync(lib, cached, null, lim);
    expect(plan.toPut).toEqual(['n']);
    expect(plan.toDelete).toEqual(['c']);
  });

  it('restores in saved order, unknown ones last by date', () => {
    const p = (id: string, createdAt: number) => ({ id, createdAt }) as CachedPhoto;
    const out = orderRestored([p('a', 1), p('b', 2), p('c', 0), p('d', 5)], { order: ['b', 'a'], selectedId: null, edits: {}, cellTransforms: {} });
    expect(out.map((x) => x.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('caps are sane for a phone', () => {
    expect(LIBRARY_CACHE_LIMITS.maxItems).toBeGreaterThanOrEqual(13);
    expect(LIBRARY_CACHE_LIMITS.maxBytes).toBeLessThanOrEqual(512 * 1024 * 1024);
  });
});

describe('DeviceSync', () => {
  it('applies saved prefs on start and writes prefs only when they change', async () => {
    const storage = new MemStorage();
    storage.data.set(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, carouselView: { target: 'tiktok', fitMode: 'fit', showOverlay: false } }));
    const { store, sync } = setup({ storage });
    await sync.start();
    expect(store.state.carouselView).toEqual({ target: 'tiktok', fitMode: 'fit', showOverlay: false });
    await sync.flushNow();
    const before = storage.writes;
    store.setState({ selectedItemId: null });
    await sync.flushNow();
    expect(storage.writes).toBe(before);
    store.setState({ frameConfig: { ...store.state.frameConfig, borderWidth: 40 } });
    await sync.flushNow();
    expect(storage.writes).toBe(before + 1);
    expect(JSON.parse(storage.data.get(PREFS_KEY)!).frame.borderWidth).toBe(40);
    sync.stop();
  });

  it('keeps added photos, deletes removed ones and clears with the library', async () => {
    const { store, photos, sync } = setup();
    await sync.start();
    store.addItems([fakeItem(file('a.jpg', 10), 0), fakeItem(file('b.jpg', 20), 1)]);
    await sync.flushNow();
    expect([...photos!.photos.keys()]).toEqual(['p0_a.jpg', 'p1_b.jpg']);
    expect(sync.status).toMatchObject({ keptCount: 2, keptBytes: 30, state: 'kept' });

    store.setState({ items: store.state.items.filter((i) => i.id !== 'p0_a.jpg') });
    await sync.flushNow();
    expect([...photos!.photos.keys()]).toEqual(['p1_b.jpg']);

    store.setState({ items: [], selectedItemId: null });
    await sync.flushNow();
    expect(photos!.photos.size).toBe(0);
    expect(photos!.meta).toBeNull();
    sync.stop();
  });

  it('restores kept photos with the same ids, order, selection and settings', async () => {
    const first = setup();
    await first.sync.start();
    const a = fakeItem(file('a.jpg', 10), 0);
    const b = { ...fakeItem(file('b.jpg', 10), 1), sourceId: a.id, derivedBy: 'upscale' as const };
    first.store.addItems([a, b]);
    first.store.setState({
      items: [first.store.state.items[1], first.store.state.items[0]],
      selectedItemId: b.id,
      edits: { [a.id]: { presetId: 'amber_grain', intensity: 0.5, crop: DEFAULT_EDIT_CROP } },
    });
    await first.sync.flushNow();
    first.sync.stop();

    const second = setup({ photos: first.photos, storage: first.storage });
    await second.sync.start();
    expect(second.store.state.items.map((i) => i.id)).toEqual([b.id, a.id]);
    expect(second.store.state.items[0]).toMatchObject({ sourceId: a.id, derivedBy: 'upscale' });
    expect(second.store.state.selectedItemId).toBe(b.id);
    expect(second.store.state.edits[a.id]?.presetId).toBe('amber_grain');
    second.sync.stop();
  });

  it('turning the memory off deletes kept photos; nothing is restored next time', async () => {
    const { store, photos, storage, sync } = setup();
    await sync.start();
    store.addItems([fakeItem(file('a.jpg', 10), 0)]);
    await sync.flushNow();
    await sync.setRemember(false);
    expect(photos!.photos.size).toBe(0);
    expect(sync.status.state).toBe('off');
    store.addItems([fakeItem(file('b.jpg', 10), 1)]);
    await sync.flushNow();
    expect(photos!.photos.size).toBe(0);
    sync.stop();

    const again = setup({ photos, storage });
    await again.sync.start();
    expect(again.store.state.items).toEqual([]);
    again.sync.stop();
  });

  it('a full quota keeps what fits and says so; the app keeps working', async () => {
    const photos = new MemPhotos();
    photos.maxBytes = 15;
    const { store, sync } = setup({ photos });
    await sync.start();
    store.addItems([fakeItem(file('a.jpg', 10), 0), fakeItem(file('b.jpg', 10), 1)]);
    await sync.flushNow();
    expect(photos.photos.size).toBe(1);
    expect(sync.status.state).toBe('full');
    expect(store.state.items).toHaveLength(2);
    sync.stop();
  });

  it('without IndexedDB (private mode) prefs still work and the status says unavailable', async () => {
    const { store, storage, sync } = setup({ photos: null });
    await sync.start();
    expect(sync.status.state).toBe('unavailable');
    store.setState({ upscaleConfig: { scaleFactor: 4 } });
    await sync.flushNow();
    expect(JSON.parse(storage.data.get(PREFS_KEY)!).upscale.scaleFactor).toBe(4);
    sync.stop();
  });
});
