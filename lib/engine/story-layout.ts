/**
 * Curate Engine — Story geometry (spec §4.4 K2, S-a)
 * One geometry for preview and export: cells sit inside the story safe area, each cell has its own
 * position/zoom. The preview places elements with percentages of these export-pixel rectangles.
 */

import { StoryCellTransform } from '../core/types';

export const STORY_W = 1080;
export const STORY_H = 1920;
/**
 * Safe area kept free for platform UI: top = progress bar + account row, bottom = message bar.
 * 250 px (≈%13) each: owner-approved 2026-10-03; not compared against the Instagram UI on a phone.
 */
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 250;
export const STORY_CORNER_RADIUS = 32;
export const STORY_MIN_PHOTOS = 2;
export const STORY_MAX_PHOTOS = 6;
export const STORY_MAX_ZOOM = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DEFAULT_CELL_TRANSFORM: StoryCellTransform = { zoom: 1, panX: 0, panY: 0 };

/** Export gap in px for the spacing slider value (0–32) */
export function storyGap(spacing: number): number {
  return Math.round(spacing * 2.5);
}

/** Cell rectangles for 2–6 photos inside the safe area. Fewer than 2 returns no cells. */
export function computeStoryCells(count: number, spacing: number, W = STORY_W, H = STORY_H): Rect[] {
  if (count < STORY_MIN_PHOTOS) return [];
  const n = Math.min(count, STORY_MAX_PHOTOS);
  const scale = W / STORY_W;
  const top = STORY_SAFE_TOP * scale;
  const usableH = H - (STORY_SAFE_TOP + STORY_SAFE_BOTTOM) * scale;
  const gap = storyGap(spacing) * scale;
  const side = Math.max(28 * scale, gap);
  const usableW = W - side * 2;
  const cells: Rect[] = [];

  if (n === 2 || n === 3) {
    const h = (usableH - gap * (n - 1)) / n;
    for (let r = 0; r < n; r++) cells.push({ x: side, y: top + r * (h + gap), w: usableW, h });
  } else {
    const rows = n === 4 ? 2 : 3;
    const w = (usableW - gap) / 2;
    const h = (usableH - gap * (rows - 1)) / rows;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 2);
      const c = i % 2;
      // 5 fotoğrafta son hücre tam genişlik
      if (n === 5 && i === 4) {
        cells.push({ x: side, y: top + 2 * (h + gap), w: usableW, h });
      } else {
        cells.push({ x: side + c * (w + gap), y: top + r * (h + gap), w, h });
      }
    }
  }
  return cells;
}

export function clampCellTransform(t: StoryCellTransform): StoryCellTransform {
  return {
    zoom: Math.min(STORY_MAX_ZOOM, Math.max(1, t.zoom)),
    panX: Math.min(1, Math.max(-1, t.panX)),
    panY: Math.min(1, Math.max(-1, t.panY)),
  };
}

/** Cover size of the image inside the cell at zoom 1 */
export function coverSize(cell: Rect, imgW: number, imgH: number): { w: number; h: number } {
  const s = Math.max(cell.w / imgW, cell.h / imgH);
  return { w: imgW * s, h: imgH * s };
}

/**
 * Where the image is drawn for a cell: cover size × zoom, centered, shifted by pan × allowed range.
 * pan = ±1 puts the image edge on the cell edge, so the cell is always covered.
 */
export function computeCellDraw(
  cell: Rect,
  imgW: number,
  imgH: number,
  transform: StoryCellTransform = DEFAULT_CELL_TRANSFORM
): { dx: number; dy: number; dw: number; dh: number } {
  const t = clampCellTransform(transform);
  const cover = coverSize(cell, imgW, imgH);
  const dw = cover.w * t.zoom;
  const dh = cover.h * t.zoom;
  const maxX = (dw - cell.w) / 2;
  const maxY = (dh - cell.h) / 2;
  return {
    dx: cell.x + (cell.w - dw) / 2 + t.panX * maxX,
    dy: cell.y + (cell.h - dh) / 2 + t.panY * maxY,
    dw,
    dh,
  };
}

/** Apple rubber-band: progressive resistance past a boundary (apple-design §9) */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** How many of the incoming files Story can take (max 6 in total) */
export function acceptStoryFiles<T>(currentCount: number, incoming: T[]): { accepted: T[]; rejected: number } {
  const room = Math.max(0, STORY_MAX_PHOTOS - currentCount);
  return { accepted: incoming.slice(0, room), rejected: Math.max(0, incoming.length - room) };
}
