import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { studioStore, MAX_DERIVED_PER_SOURCE, derivedLabel } from '../lib/core/state-machine';
import { registerUrl } from '../lib/engine/proxy';
import { DEFAULT_EDIT_CROP } from '../lib/engine/edit-geometry';
import { StudioItem } from '../lib/core/types';

let seq = 0;
function makeItem(id: string): StudioItem {
  seq++;
  const url = registerUrl(`blob:http://localhost:3000/${id}`);
  const proxy = registerUrl(`blob:http://localhost:3000/${id}-proxy`);
  return {
    id,
    name: `${id}.jpg`,
    originalUrl: url,
    proxyUrl: proxy,
    dimensions: { width: 1000, height: 800, aspectRatio: 1.25 },
    proxyDimensions: { width: 1000, height: 800, aspectRatio: 1.25 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: 0,
    createdAt: seq,
  };
}

const ids = () => studioStore.getState().items.map((i) => i.id);
const byId = (id: string) => studioStore.getState().items.find((i) => i.id === id);

describe('Derived photos: shared "add result" path (Büyüt, later AI)', () => {
  let revoked: string[];
  beforeEach(() => {
    revoked = [];
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u: string) => {
      revoked.push(u);
    });
    studioStore.clearItems();
    revoked.length = 0;
    studioStore.setNotice(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the result right after its source, selects it, and starts with empty edit settings', () => {
    studioStore.addItems([makeItem('a'), makeItem('b')]);
    studioStore.setEditParams('a', { presetId: 'amber_grain', intensity: 0.6, crop: { aspect: '1:1' } });

    const evicted = studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');

    expect(evicted).toBeNull();
    expect(ids()).toEqual(['a', 'a1', 'b']);
    expect(studioStore.getState().selectedItemId).toBe('a1');
    expect(byId('a1')).toMatchObject({ sourceId: 'a', derivedBy: 'upscale', order: 1 });
    // Result has no settings (no double preset); the source keeps its own
    expect(studioStore.getState().edits['a1']).toBeUndefined();
    expect(studioStore.getState().edits['a']).toMatchObject({ presetId: 'amber_grain', intensity: 0.6, crop: { ...DEFAULT_EDIT_CROP, aspect: '1:1' } });
    expect(derivedLabel('upscale')).toBe('Büyütülmüş');
  });

  it('"Kaynağa dön" = select the source; its settings are intact', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.setEditParams('a', { presetId: 'moody_teal' });
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');
    const derived = byId('a1')!;

    studioStore.selectItem(derived.sourceId!);

    expect(studioStore.getState().selectedItemId).toBe('a');
    expect(studioStore.getState().edits['a'].presetId).toBe('moody_teal');
  });

  it('deleting a derived photo removes only it and frees its URLs', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');

    studioStore.removeItem('a1');

    expect(ids()).toEqual(['a']);
    expect(revoked.sort()).toEqual(['blob:http://localhost:3000/a1', 'blob:http://localhost:3000/a1-proxy']);
    expect(studioStore.getState().selectedItemId).toBe('a');
  });

  it('deleting the source keeps the derived photos and clears their sourceId; frees only source URLs and settings', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.setEditParams('a', { presetId: 'amber_grain' });
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');
    studioStore.addResultItem(makeItem('a2'), 'a', 'upscale');

    studioStore.removeItem('a');

    expect(ids()).toEqual(['a1', 'a2']);
    expect(byId('a1')!.sourceId).toBeNull();
    expect(byId('a2')!.sourceId).toBeNull();
    expect(byId('a1')!.derivedBy).toBe('upscale'); // badge stays
    expect(studioStore.getState().edits['a']).toBeUndefined();
    expect(revoked.sort()).toEqual(['blob:http://localhost:3000/a', 'blob:http://localhost:3000/a-proxy']);
  });

  it(`keeps at most ${MAX_DERIVED_PER_SOURCE} derived per source: the 3rd evicts the oldest, frees its URLs and sets a notice`, () => {
    expect(MAX_DERIVED_PER_SOURCE).toBe(2);
    studioStore.addItems([makeItem('a'), makeItem('b')]);
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');
    studioStore.addResultItem(makeItem('a2'), 'a', 'upscale');
    studioStore.addResultItem(makeItem('b1'), 'b', 'upscale');
    expect(studioStore.getState().notice).toBeNull();

    const evicted = studioStore.addResultItem(makeItem('a3'), 'a', 'upscale');

    expect(evicted?.id).toBe('a1');
    expect(ids()).toEqual(['a', 'a2', 'a3', 'b', 'b1']);
    expect(studioStore.getState().selectedItemId).toBe('a3');
    expect(revoked.sort()).toEqual(['blob:http://localhost:3000/a1', 'blob:http://localhost:3000/a1-proxy']);
    expect(studioStore.getState().notice).toContain('silindi');
    // other sources are not affected
    expect(studioStore.getState().items.filter((i) => i.sourceId === 'b')).toHaveLength(1);
  });

  it('derived photos count as ordinary photos (e.g. toward the Story limit)', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');
    expect(studioStore.getState().items).toHaveLength(2);
  });

  it('clearing the library frees every URL and all settings', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.setEditParams('a', { presetId: 'amber_grain' });
    studioStore.addResultItem(makeItem('a1'), 'a', 'upscale');

    studioStore.clearItems();

    expect(ids()).toEqual([]);
    expect(studioStore.getState().edits).toEqual({});
    expect(revoked).toHaveLength(4);
  });
});
