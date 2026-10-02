import { describe, it, expect, beforeEach } from 'vitest';
import { studioStore, getStudioSelection } from '../lib/core/state-machine';
import { StudioItem } from '../lib/core/types';

describe('Bug A: Selection resolution and stage render conditions', () => {
  beforeEach(() => {
    studioStore.clearItems();
  });

  const createMockItem = (id: string, name: string): StudioItem => ({
    id,
    name,
    originalUrl: `blob:http://localhost:3000/${id}`,
    proxyUrl: `blob:http://localhost:3000/${id}`,
    dimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
    proxyDimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: 0,
    createdAt: Date.now(),
  });

  describe('Store Logic: Selection resolution on addItems', () => {
    it('sets selectedItemId to the first item when adding items from empty state', () => {
      expect(studioStore.getState().items).toHaveLength(0);
      expect(studioStore.getState().selectedItemId).toBeNull();

      const item1 = createMockItem('photo_1', 'first.jpg');
      studioStore.addItems([item1]);

      const state = studioStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.selectedItemId).toBe('photo_1');
    });

    it('re-evaluates selectedItemId if previous selectedItemId is stale/not in items', () => {
      // Simulate state where selectedItemId points to a nonexistent/stale photo
      studioStore.selectItem('stale_nonexistent_id');
      expect(studioStore.getState().selectedItemId).toBe('stale_nonexistent_id');

      const item1 = createMockItem('photo_real_1', 'real.jpg');
      studioStore.addItems([item1]);

      const state = studioStore.getState();
      expect(state.items).toHaveLength(1);
      // Bug reproduction: addItems previously did `prev.selectedItemId || ...`
      // which preserved 'stale_nonexistent_id' even though that item does not exist in items!
      expect(state.selectedItemId).toBe('photo_real_1');
    });

    it('preserves existing selectedItemId if it is actually present in the library', () => {
      const item1 = createMockItem('photo_1', 'first.jpg');
      studioStore.addItems([item1]);
      expect(studioStore.getState().selectedItemId).toBe('photo_1');

      const item2 = createMockItem('photo_2', 'second.jpg');
      studioStore.addItems([item2]);

      const state = studioStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.selectedItemId).toBe('photo_1');
    });
  });

  describe('Render Condition: getStudioSelection single source of truth', () => {
    it('reports hasPhoto: false when items list is empty', () => {
      const res = getStudioSelection([], null);
      expect(res.hasPhoto).toBe(false);
      expect(res.selectedItem).toBeNull();
      expect(res.photoUrl).toBeNull();
    });

    it('reports hasPhoto: true and resolves item when items are present and selection matches', () => {
      const item1 = createMockItem('p1', 'test1.jpg');
      const res = getStudioSelection([item1], 'p1');
      expect(res.hasPhoto).toBe(true);
      expect(res.selectedItem?.id).toBe('p1');
      expect(res.photoUrl).toBe(item1.originalUrl);
    });

    it('recovers gracefully to first item when selectedItemId is stale', () => {
      const item1 = createMockItem('p1', 'test1.jpg');
      const res = getStudioSelection([item1], 'stale_id');
      expect(res.hasPhoto).toBe(true);
      expect(res.selectedItem?.id).toBe('p1');
      expect(res.photoUrl).toBe(item1.originalUrl);
    });
  });
});
