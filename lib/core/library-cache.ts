/**
 * Library cache on the device (IndexedDB). Owner decision D18: photos never leave the device;
 * this only keeps them between visits. Optional (prefs.rememberLibrary), capped, quota-aware,
 * cleared by the library "clear" action. Errors (private mode, full quota) degrade to "not kept".
 */

import type { EditParams, StoryCellTransform, StudioItem, DerivedKind } from './types';

export const LIBRARY_CACHE_DB = 'curate-library';
export const LIBRARY_CACHE_VERSION = 1;

export const LIBRARY_CACHE_LIMITS = {
  /** Photos kept at most (in library order; later ones are not kept) */
  maxItems: 40,
  /** Total bytes kept at most */
  maxBytes: 400 * 1024 * 1024,
  /** Never use more than this share of the browser's remaining quota */
  quotaShare: 0.5,
};

export interface CachedPhoto {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: number;
  sourceId: string | null;
  derivedBy: DerivedKind | null;
}

/** Small record: order, selection and per-photo settings (crop/preset, Story framing) */
export interface CacheMeta {
  order: string[];
  selectedId: string | null;
  edits: Record<string, EditParams>;
  cellTransforms: Record<string, StoryCellTransform>;
}

export interface PhotoStore {
  getAll(): Promise<CachedPhoto[]>;
  getMeta(): Promise<CacheMeta | null>;
  put(photo: CachedPhoto): Promise<void>;
  putMeta(meta: CacheMeta): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheCandidate {
  id: string;
  bytes: number;
}

export interface CachePlan {
  toPut: string[];
  toDelete: string[];
  /** In the library but not kept (over the item/byte/quota cap) */
  skipped: string[];
}

/**
 * Decides which photos to keep: library order, up to maxItems and maxBytes,
 * and within quotaShare of the free quota (when known). Pure; tested.
 */
export function planCacheSync(
  library: CacheCandidate[],
  cached: CacheCandidate[],
  freeQuotaBytes: number | null,
  limits = LIBRARY_CACHE_LIMITS,
): CachePlan {
  const cachedIds = new Set(cached.map((c) => c.id));
  const libIds = new Set(library.map((c) => c.id));
  const toDelete = cached.filter((c) => !libIds.has(c.id)).map((c) => c.id);

  // Bytes already kept for photos that stay do not need new quota
  let budgetNew = freeQuotaBytes === null ? Infinity : Math.max(0, freeQuotaBytes * limits.quotaShare);
  let total = 0;
  const keep: string[] = [];
  const skipped: string[] = [];
  for (const c of library) {
    const isNew = !cachedIds.has(c.id);
    const fits = keep.length < limits.maxItems && total + c.bytes <= limits.maxBytes && (!isNew || c.bytes <= budgetNew);
    if (fits) {
      keep.push(c.id);
      total += c.bytes;
      if (isNew) budgetNew -= c.bytes;
    } else {
      skipped.push(c.id);
    }
  }
  // A kept photo that falls outside the cap (e.g. reordered) is removed from the cache too
  const keepSet = new Set(keep);
  for (const c of cached) if (libIds.has(c.id) && !keepSet.has(c.id)) toDelete.push(c.id);
  return { toPut: keep.filter((id) => !cachedIds.has(id)), toDelete, skipped };
}

/** Restored photos in saved order; photos missing from the order go last by date */
export function orderRestored(photos: CachedPhoto[], meta: CacheMeta | null): CachedPhoto[] {
  const pos = new Map((meta?.order ?? []).map((id, i) => [id, i]));
  return [...photos].sort((a, b) => {
    const pa = pos.get(a.id);
    const pb = pos.get(b.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return a.createdAt - b.createdAt;
  });
}

/** Cache record for a library item (the original file the user added; never a downscaled copy) */
export function toCachedPhoto(item: StudioItem): CachedPhoto | null {
  if (!item.file) return null;
  return {
    id: item.id,
    name: item.name,
    type: item.file.type || 'image/jpeg',
    blob: item.file,
    createdAt: item.createdAt,
    sourceId: item.sourceId ?? null,
    derivedBy: item.derivedBy ?? null,
  };
}

// --- IndexedDB implementation -------------------------------------------------

const PHOTOS = 'photos';
const META = 'meta';
const META_KEY = 'library';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

class IdbPhotoStore implements PhotoStore {
  constructor(private db: IDBDatabase) {}

  async getAll(): Promise<CachedPhoto[]> {
    return req(this.db.transaction(PHOTOS, 'readonly').objectStore(PHOTOS).getAll()) as Promise<CachedPhoto[]>;
  }

  async getMeta(): Promise<CacheMeta | null> {
    const v = await req(this.db.transaction(META, 'readonly').objectStore(META).get(META_KEY));
    return (v as CacheMeta | undefined) ?? null;
  }

  async put(photo: CachedPhoto): Promise<void> {
    const tx = this.db.transaction(PHOTOS, 'readwrite');
    tx.objectStore(PHOTOS).put(photo);
    await txDone(tx);
  }

  async putMeta(meta: CacheMeta): Promise<void> {
    const tx = this.db.transaction(META, 'readwrite');
    tx.objectStore(META).put(meta, META_KEY);
    await txDone(tx);
  }

  async delete(id: string): Promise<void> {
    const tx = this.db.transaction(PHOTOS, 'readwrite');
    tx.objectStore(PHOTOS).delete(id);
    await txDone(tx);
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction([PHOTOS, META], 'readwrite');
    tx.objectStore(PHOTOS).clear();
    tx.objectStore(META).clear();
    await txDone(tx);
  }
}

/** Opens the cache; null when IndexedDB is unavailable (private mode, blocked storage, old browser) */
export async function openPhotoStore(): Promise<PhotoStore | null> {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const open = indexedDB.open(LIBRARY_CACHE_DB, LIBRARY_CACHE_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    const db = await req(open);
    return new IdbPhotoStore(db);
  } catch {
    return null;
  }
}

/** Free quota in bytes, or null when the browser does not say */
export async function freeQuotaBytes(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est || typeof est.quota !== 'number' || typeof est.usage !== 'number') return null;
    return Math.max(0, est.quota - est.usage);
  } catch {
    return null;
  }
}
