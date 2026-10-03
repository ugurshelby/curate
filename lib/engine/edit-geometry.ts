/**
 * Curate Engine — Düzenle crop geometry (spec §4.5 E4, E6)
 *
 * Order (output-centric): source → 90° rotation → fine angle under a fixed, axis-aligned frame
 * → crop → horizontal flip of the output. The same math drives the preview (canvas and the CSS
 * transform of the crop view) and the export.
 *
 * Units: source pixels. "Rotated image" = source after the 90° step, centered at the origin.
 */

import { EditAspect, EditCrop, EditParams } from '../core/types';

export const EDIT_MAX_LONG_EDGE = 4096;
export const EDIT_PREVIEW_LONG_EDGE = 1350;
export const EDIT_MAX_ZOOM = 6;
export const EDIT_MAX_ANGLE = 10;

export const EDIT_ASPECTS: { id: EditAspect; label: string; ratio?: number }[] = [
  { id: 'free', label: 'Serbest' },
  { id: 'original', label: 'Orijinal' },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export const DEFAULT_EDIT_CROP: EditCrop = {
  aspect: 'original',
  freeRatio: 0,
  rotation: 0,
  angle: 0,
  flipH: false,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const DEFAULT_EDIT_PARAMS: EditParams = {
  presetId: null,
  intensity: 1,
  crop: DEFAULT_EDIT_CROP,
};

export function rotatedSize(w: number, h: number, rotation: number): { w: number; h: number } {
  return rotation === 90 || rotation === 270 ? { w: h, h: w } : { w, h };
}

/** Output aspect (width / height) of the crop frame */
export function frameRatio(crop: EditCrop, w: number, h: number): number {
  const r = rotatedSize(w, h, crop.rotation);
  if (crop.aspect === 'original') return r.w / r.h;
  if (crop.aspect === 'free') return crop.freeRatio > 0 ? crop.freeRatio : r.w / r.h;
  return EDIT_ASPECTS.find((a) => a.id === crop.aspect)?.ratio ?? r.w / r.h;
}

/** Largest crop width with ratio r that fits inside a Wr×Hr image rotated by theta (radians) */
export function maxCropWidth(Wr: number, Hr: number, r: number, theta: number): number {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  return Math.min(Wr / (c + s / r), Hr / (s + c / r));
}

/** How far the frame center may move (image axes) so all four frame corners stay inside the image */
export function panLimits(Wr: number, Hr: number, cw: number, ch: number, theta: number): { limX: number; limY: number } {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const ex = (cw / 2) * c + (ch / 2) * s;
  const ey = (cw / 2) * s + (ch / 2) * c;
  return { limX: Math.max(0, Wr / 2 - ex), limY: Math.max(0, Hr / 2 - ey) };
}

export interface CropGeometry {
  Wr: number;
  Hr: number;
  ratio: number;
  theta: number;
  cwMax: number;
  cw: number;
  ch: number;
  /** Frame center in rotated-image coordinates */
  ox: number;
  oy: number;
  limX: number;
  limY: number;
}

export function clampEditCrop(crop: EditCrop): EditCrop {
  return {
    ...crop,
    angle: Math.max(-EDIT_MAX_ANGLE, Math.min(EDIT_MAX_ANGLE, crop.angle)),
    zoom: Math.max(1, Math.min(EDIT_MAX_ZOOM, crop.zoom)),
    panX: Math.max(-1, Math.min(1, crop.panX)),
    panY: Math.max(-1, Math.min(1, crop.panY)),
  };
}

export function cropGeometry(w: number, h: number, input: EditCrop): CropGeometry {
  const crop = clampEditCrop(input);
  const { w: Wr, h: Hr } = rotatedSize(w, h, crop.rotation);
  const ratio = frameRatio(crop, w, h);
  const theta = (crop.angle * Math.PI) / 180;
  const cwMax = maxCropWidth(Wr, Hr, ratio, theta);
  const cw = cwMax / crop.zoom;
  const ch = cw / ratio;
  const { limX, limY } = panLimits(Wr, Hr, cw, ch, theta);
  return { Wr, Hr, ratio, theta, cwMax, cw, ch, ox: crop.panX * limX, oy: crop.panY * limY, limX, limY };
}

/** Export size: the crop at its own resolution, long edge at most 4096 */
export function editOutputSize(w: number, h: number, crop: EditCrop, maxLong = EDIT_MAX_LONG_EDGE): { width: number; height: number } {
  const g = cropGeometry(w, h, crop);
  const scale = Math.min(1, maxLong / Math.max(g.cw, g.ch));
  return { width: Math.max(1, Math.round(g.cw * scale)), height: Math.max(1, Math.round(g.ch * scale)) };
}

/** Preview size: same aspect, long edge at most 1350 (never larger than the export) */
export function editPreviewSize(out: { width: number; height: number }, longEdge = EDIT_PREVIEW_LONG_EDGE): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(out.width, out.height));
  return { width: Math.max(1, Math.round(out.width * scale)), height: Math.max(1, Math.round(out.height * scale)) };
}

/** Screen drag (px) → displacement in rotated-image axes (px), undoing output flip and fine angle */
export function screenDeltaToImage(dx: number, dy: number, theta: number, flipH: boolean): { x: number; y: number } {
  const fx = flipH ? -dx : dx;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // inverse rotation R(−θ)
  return { x: fx * c + dy * s, y: -fx * s + dy * c };
}

/** Draws the cropped, rotated, flipped source to fill a TW×TH target (shared by preview and export) */
export function drawEditGeometry(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  TW: number,
  TH: number,
  crop: EditCrop
): void {
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;
  const g = cropGeometry(w, h, crop);
  const s = TW / g.cw;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, TW, TH);
  ctx.translate(TW / 2, TH / 2);
  if (crop.flipH) ctx.scale(-1, 1);
  ctx.scale(s, s);
  ctx.rotate(g.theta);
  ctx.translate(-g.ox, -g.oy);
  ctx.rotate((crop.rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function editCropKey(crop: EditCrop | null | undefined): string {
  if (!crop) return 'nocrop';
  const c = clampEditCrop(crop);
  return [c.aspect, c.freeRatio.toFixed(4), c.rotation, c.angle.toFixed(2), c.flipH ? 1 : 0, c.zoom.toFixed(4), c.panX.toFixed(4), c.panY.toFixed(4)].join(',');
}
