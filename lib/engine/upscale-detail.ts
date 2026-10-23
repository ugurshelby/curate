/**
 * Büyüt "Yakından bak" (100% detail view) geometry. Pure helpers; the UI and tests share them.
 * Result space = the upscaled image (target width × height). One result pixel = one CSS pixel on screen.
 */

export interface DetailView {
  /** Viewport centre in normalized result coordinates (0..1) */
  cx: number;
  cy: number;
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Source pixels the Lanczos-3 kernel needs around a crop. Radius 3 plus one for the
 * rounding of the sample centre: interior output pixels then match a full-image upscale exactly.
 */
export const DETAIL_SOURCE_PAD = 4;

/** Keeps the viewport inside the image; an axis smaller than the viewport is centred */
export function clampDetailView(view: DetailView, stageW: number, stageH: number, resW: number, resH: number): DetailView {
  const clampAxis = (c: number, stage: number, res: number) => {
    if (res <= stage) return 0.5;
    const half = stage / 2 / res;
    return Math.min(1 - half, Math.max(half, c));
  };
  return { cx: clampAxis(view.cx, stageW, resW), cy: clampAxis(view.cy, stageH, resH) };
}

/** Top-left of the result image on the stage, in CSS pixels */
export function detailOffset(view: DetailView, stageW: number, stageH: number, resW: number, resH: number): { left: number; top: number } {
  return { left: Math.round(stageW / 2 - view.cx * resW), top: Math.round(stageH / 2 - view.cy * resH) };
}

/** The visible part of the result image, in result pixels */
export function visibleResultRect(view: DetailView, stageW: number, stageH: number, resW: number, resH: number): PixelRect {
  const { left, top } = detailOffset(view, stageW, stageH, resW, resH);
  const x = Math.max(0, -left);
  const y = Math.max(0, -top);
  return { x, y, w: Math.min(resW, stageW - left) - x, h: Math.min(resH, stageH - top) - y };
}

/** Integer source rectangle (with kernel padding) that covers a visible result rectangle at an integer scale */
export function detailSourceRect(visible: PixelRect, scale: number, srcW: number, srcH: number, pad = DETAIL_SOURCE_PAD): PixelRect {
  const x0 = Math.max(0, Math.floor(visible.x / scale) - pad);
  const y0 = Math.max(0, Math.floor(visible.y / scale) - pad);
  const x1 = Math.min(srcW, Math.ceil((visible.x + visible.w) / scale) + pad);
  const y1 = Math.min(srcH, Math.ceil((visible.y + visible.h) / scale) + pad);
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
