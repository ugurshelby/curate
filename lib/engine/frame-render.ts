/**
 * Çerçeve (frame) render: one draw function for the live preview and the export (CDS §8, AGENTS.md §4).
 * Sizes are data (FRAME_SIZES in lib/export/platform-specs.ts). Border and corner values are defined for
 * a 1080 px short edge and scale with the output, so every size looks the same.
 */

import type { FrameConfig } from '../core/types';
import { buildEdgeGradient, chooseGradientAxis, paintEdgeGradient, type EdgeColors } from './edge-gradient';
import { EXPORT_COLORS, FRAME_GRADIENTS, STAMP_FONT_FAMILY } from '../ui/colors';

/** Border/corner slider units → output pixels at a 1080 px short edge */
export const FRAME_UNIT = 2.2;
/** Polaroid bottom border is this many times the side border */
export const POLAROID_BOTTOM = 2.2;

export interface FrameLayout {
  /** px per slider unit for this output size */
  unit: number;
  photo: { x: number; y: number; w: number; h: number; r: number };
  stamp: { x: number; y: number; size: number };
}

/**
 * Calculates canvas pixel size for preview based on container bounds and DPR
 */
export function previewRenderSize(outW: number, outH: number, boxW: number, boxH: number, dpr: number = 1): { width: number; height: number } {
  if (boxW <= 0 || boxH <= 0) return { width: 320, height: 320 };
  const ratio = outW / outH;
  let w = boxW;
  let h = boxW / ratio;
  if (h > boxH) {
    h = boxH;
    w = boxH * ratio;
  }
  return {
    width: Math.max(1, Math.round(w * dpr)),
    height: Math.max(1, Math.round(h * dpr)),
  };
}

export function frameLayout(W: number, H: number, cfg: Pick<FrameConfig, 'frameType' | 'borderWidth' | 'borderRadius'>): FrameLayout {
  const unit = (FRAME_UNIT * Math.min(W, H)) / 1080;
  const pad = Math.round(cfg.borderWidth * unit);
  
  let bottomMultiplier = 1.0;
  if (cfg.frameType === 'polaroid') bottomMultiplier = POLAROID_BOTTOM;
  else if (cfg.frameType === 'polaroid_wide') bottomMultiplier = 2.8;
  else if (cfg.frameType === 'polaroid_square') bottomMultiplier = 1.6;

  const padBottom = bottomMultiplier > 1.0 ? Math.round(cfg.borderWidth * bottomMultiplier * unit) : pad;
  const w = Math.max(1, W - pad * 2);
  const h = Math.max(1, H - pad - padBottom);
  const r = Math.max(Math.round(4 * (unit / FRAME_UNIT)), Math.round(cfg.borderRadius * unit));
  const scale = Math.min(W, H) / 1080;
  const isPolaroid = cfg.frameType.startsWith('polaroid');

  return {
    unit,
    photo: { x: pad, y: pad, w, h, r: Math.min(r, Math.floor(Math.min(w, h) / 2)) },
    stamp: {
      x: W - pad - Math.round(16 * scale),
      y: isPolaroid ? H - Math.round(padBottom / 2) : H - Math.round(24 * scale),
      size: Math.max(1, Math.round(26 * scale)),
    },
  };
}

/** Today's analog stamp, e.g. '26 10 08 */
export function frameStampText(d: Date = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `'${yy} ${mm} ${dd}`;
}

type Source = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.closePath();
}

/** Centre crop of the source that fills the photo window (cover) */
export function frameCoverCrop(srcW: number, srcH: number, w: number, h: number) {
  const target = w / h;
  if (srcW / srcH > target) {
    const sw = srcH * target;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / target;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
}

/**
 * Draws the whole frame (background, photo, matte line, stamp) at W×H.
 * Preview calls it at the chosen size, export at the chosen standard size.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: Source | null,
  W: number,
  H: number,
  cfg: FrameConfig,
  gradient: EdgeColors | null,
  stamp: string,
): FrameLayout {
  const L = frameLayout(W, H, cfg);
  const isPolaroid = cfg.frameType.startsWith('polaroid');

  if (cfg.frameType === 'gradient') {
    if (cfg.gradientMode === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, FRAME_GRADIENTS.sunset[0]);
      grad.addColorStop(0.5, FRAME_GRADIENTS.sunset[1]);
      grad.addColorStop(1, FRAME_GRADIENTS.sunset[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (cfg.gradientMode === 'deep') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, FRAME_GRADIENTS.deep[0]);
      grad.addColorStop(1, FRAME_GRADIENTS.deep[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (cfg.gradientMode === 'subtle') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, FRAME_GRADIENTS.subtle[0]);
      grad.addColorStop(1, FRAME_GRADIENTS.subtle[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (gradient) {
      // Smart adaptive edge gradient (D33)
      const margins = { x: L.photo.x * 2, y: L.photo.y + (H - L.photo.y - L.photo.h) };
      paintEdgeGradient(ctx, W, H, buildEdgeGradient(gradient, chooseGradientAxis(gradient, margins)));
    } else {
      ctx.fillStyle = EXPORT_COLORS.frameMatte;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (isPolaroid) {
    ctx.fillStyle = EXPORT_COLORS.framePolaroid;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Matte frame (custom color or default)
    ctx.fillStyle = cfg.matteColor || EXPORT_COLORS.frameMatte;
    ctx.fillRect(0, 0, W, H);
  }

  const { x, y, w, h, r } = L.photo;
  const srcW = img ? (img as HTMLImageElement).naturalWidth || img.width : 0;
  const srcH = img ? (img as HTMLImageElement).naturalHeight || img.height : 0;
  if (img && srcW && srcH) {
    ctx.save();
    roundedRect(ctx, x, y, w, h, r);
    ctx.clip();
    const c = frameCoverCrop(srcW, srcH, w, h);
    ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, x, y, w, h);
    ctx.restore();

    if (cfg.frameType === 'matte') {
      ctx.save();
      roundedRect(ctx, x, y, w, h, r);
      ctx.strokeStyle = EXPORT_COLORS.frameMatteBorder;
      ctx.lineWidth = Math.max(1, Math.round((2 * Math.min(W, H)) / 1080));
      ctx.stroke();
      ctx.restore();
    }
  }

  if (cfg.showTimestamp && img) {
    ctx.save();
    ctx.font = `bold ${L.stamp.size}px ${STAMP_FONT_FAMILY}`;
    ctx.fillStyle = isPolaroid ? EXPORT_COLORS.stampOnLight : EXPORT_COLORS.stampOnDark;
    ctx.shadowColor = EXPORT_COLORS.stampShadow;
    ctx.shadowBlur = Math.max(2, Math.round((8 * Math.min(W, H)) / 1080));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(stamp, L.stamp.x, L.stamp.y);
    ctx.restore();
  }
  return L;
}
