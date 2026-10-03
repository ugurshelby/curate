import { describe, it, expect } from 'vitest';
import {
  computeStoryCells,
  computeCellDraw,
  acceptStoryFiles,
  clampCellTransform,
  rubberband,
  STORY_W,
  STORY_H,
  STORY_SAFE_TOP,
  STORY_SAFE_BOTTOM,
} from '../lib/engine/story-layout';

describe('Story grid follows the photo count (spec §4.4 K2)', () => {
  it('has no cells below 2 photos', () => {
    expect(computeStoryCells(0, 10)).toEqual([]);
    expect(computeStoryCells(1, 10)).toEqual([]);
  });

  it('makes exactly one cell per photo for 2–6, capped at 6', () => {
    for (const n of [2, 3, 4, 5, 6]) expect(computeStoryCells(n, 10)).toHaveLength(n);
    expect(computeStoryCells(9, 10)).toHaveLength(6);
  });

  it('keeps every cell inside the story safe area and the canvas', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      for (const spacing of [0, 10, 32]) {
        for (const c of computeStoryCells(n, spacing)) {
          expect(c.y).toBeGreaterThanOrEqual(STORY_SAFE_TOP - 1e-9);
          expect(c.y + c.h).toBeLessThanOrEqual(STORY_H - STORY_SAFE_BOTTOM + 1e-9);
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.x + c.w).toBeLessThanOrEqual(STORY_W + 1e-9);
        }
      }
    }
  });

  it('5 photos: last cell is full width', () => {
    const cells = computeStoryCells(5, 10);
    expect(cells[4].w).toBeCloseTo(cells[0].w * 2 + 25, 6);
  });

  it('scales with the canvas size (preview percentages = export geometry)', () => {
    const big = computeStoryCells(4, 10);
    const small = computeStoryCells(4, 10, STORY_W / 2, STORY_H / 2);
    big.forEach((c, i) => {
      expect(small[i].x).toBeCloseTo(c.x / 2, 6);
      expect(small[i].w).toBeCloseTo(c.w / 2, 6);
    });
  });
});

describe('Story add limit: at most 6, excess is not taken', () => {
  it('accepts only the free room and counts the rest', () => {
    expect(acceptStoryFiles(0, ['a', 'b'])).toEqual({ accepted: ['a', 'b'], rejected: 0 });
    expect(acceptStoryFiles(4, ['a', 'b', 'c'])).toEqual({ accepted: ['a', 'b'], rejected: 1 });
    expect(acceptStoryFiles(6, ['a'])).toEqual({ accepted: [], rejected: 1 });
    expect(acceptStoryFiles(8, ['a'])).toEqual({ accepted: [], rejected: 1 });
  });
});

describe('Cell position and zoom reach the export 1:1', () => {
  const cell = { x: 100, y: 300, w: 400, h: 500 };

  it('default transform covers the cell, centered', () => {
    const d = computeCellDraw(cell, 2000, 1000);
    expect(d.dh).toBeCloseTo(500, 6); // cover: height limits
    expect(d.dw).toBeCloseTo(1000, 6);
    expect(d.dx + d.dw / 2).toBeCloseTo(cell.x + cell.w / 2, 6);
    expect(d.dy).toBeCloseTo(cell.y, 6);
  });

  it('pan ±1 puts the image edge on the cell edge; the cell stays covered', () => {
    const left = computeCellDraw(cell, 2000, 1000, { zoom: 1, panX: 1, panY: 0 });
    expect(left.dx).toBeCloseTo(cell.x, 6);
    const right = computeCellDraw(cell, 2000, 1000, { zoom: 1, panX: -1, panY: 0 });
    expect(right.dx + right.dw).toBeCloseTo(cell.x + cell.w, 6);
  });

  it('zoom scales the drawn size and keeps coverage at the pan limit', () => {
    const d = computeCellDraw(cell, 1000, 1000, { zoom: 2, panX: 0, panY: 1 });
    expect(d.dw).toBeCloseTo(1000, 6); // cover 500 × zoom 2
    expect(d.dy).toBeCloseTo(cell.y, 6);
    expect(d.dy + d.dh).toBeGreaterThanOrEqual(cell.y + cell.h);
  });

  it('clamps stored transforms to zoom 1–4 and pan −1…1', () => {
    expect(clampCellTransform({ zoom: 9, panX: 3, panY: -2 })).toEqual({ zoom: 4, panX: 1, panY: -1 });
    expect(clampCellTransform({ zoom: 0.2, panX: 0, panY: 0 })).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it('rubber-band resists more the further past the edge', () => {
    const a = rubberband(20, 300);
    const b = rubberband(200, 300);
    expect(a).toBeLessThan(20);
    expect(b).toBeLessThan(200);
    expect(b / 200).toBeLessThan(a / 20);
  });
});
