/**
 * Curate Engine — Unified Carousel Render Pipeline
 * Single source of truth for both live preview and export rendering (spec §4.4 M2-a, option A).
 *
 * Two steps, same functions for preview and export:
 *   1. base  = background + crop/fit draw + hero harmonize   (renderCarouselBase)
 *   2. look  = .cube LUT or editorial preset on a copy of base (applyCarouselLook)
 * Export calls drawCarouselFrame (1 + 2 in one go). The preview calls the same two steps through
 * CarouselPreviewRenderer, which caches step 1 so a slider only recomputes step 2.
 */

import { ColorMetrics, CubeLUT, EditCrop } from '../core/types';
import { drawEditGeometry, editCropKey } from './edit-geometry';
import { calculateAspectCrop } from '../export/platform-specs';
import { applyHarmonizeSync, extractColorMetrics } from './harmonize';
import { applyCubeLutToImageData, applyPresetToImageData, CURATE_PRESETS } from './presets';
import { EXPORT_COLORS } from '../ui/colors';

/** Export width the look is calibrated for (grain grid). */
export const CAROUSEL_OUTPUT_WIDTH = 1080;
export const HERO_HARMONIZE_STRENGTH = 0.2;
export const FIT_BACKGROUND = EXPORT_COLORS.fitBackground;

export interface CarouselRenderOptions {
  fitMode: 'fit' | 'fill';
  heroColorMetrics?: ColorMetrics | null;
  customLut?: CubeLUT | null;
  presetId?: string | null;
  presetIntensity?: number;
  /** Export width this render stands for. Defaults to the render width (export). */
  outputWidth?: number;
  /** Düzenle: kırp/döndür/çevir geometrisi. Verilirse fitMode yerine bu çizim kullanılır. */
  crop?: EditCrop | null;
}

export interface CarouselBase {
  /** Harmonized pixels of the image rectangle (before LUT/preset) */
  imageData: ImageData;
  x: number;
  y: number;
  w: number;
  h: number;
}

type CarouselSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

function sourceSize(img: CarouselSource): { w: number; h: number } {
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;
  return { w, h };
}

function cloneImageData(src: ImageData): ImageData {
  const data = new Uint8ClampedArray(src.data);
  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, src.width, src.height);
  }
  return { width: src.width, height: src.height, data, colorSpace: 'srgb' } as ImageData;
}

/** Image rectangle inside the target for the given fit mode. */
export function carouselImageRect(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number,
  fitMode: 'fit' | 'fill'
): { x: number; y: number; w: number; h: number } {
  if (fitMode === 'fill') return { x: 0, y: 0, w: targetW, h: targetH };
  const targetRatio = targetW / targetH;
  const imgRatio = imgW / imgH;
  if (imgRatio > targetRatio) {
    const h = Math.round(targetW / imgRatio);
    return { x: 0, y: Math.round((targetH - h) / 2), w: targetW, h };
  }
  const w = Math.round(targetH * imgRatio);
  return { x: Math.round((targetW - w) / 2), y: 0, w, h: targetH };
}

function paintBackground(ctx: CanvasRenderingContext2D, targetW: number, targetH: number, fitMode: 'fit' | 'fill') {
  if (fitMode === 'fit') {
    ctx.fillStyle = FIT_BACKGROUND;
    ctx.fillRect(0, 0, targetW, targetH);
  }
}

/** Step 1: background + crop/fit draw + hero harmonize. Draws on ctx and returns the harmonized rectangle. */
export function renderCarouselBase(
  ctx: CanvasRenderingContext2D,
  img: CarouselSource,
  targetW: number,
  targetH: number,
  options: Pick<CarouselRenderOptions, 'fitMode' | 'heroColorMetrics' | 'crop'>
): CarouselBase {
  if (options.crop) {
    // Düzenle: aynı taban adımı, çizim kırp geometrisiyle (tüm hedef alanı kaplar)
    drawEditGeometry(ctx, img, targetW, targetH, options.crop);
    let cropped = ctx.getImageData(0, 0, targetW, targetH);
    if (options.heroColorMetrics) {
      cropped = applyHarmonizeSync(cropped, options.heroColorMetrics, HERO_HARMONIZE_STRENGTH);
    }
    return { imageData: cropped, x: 0, y: 0, w: targetW, h: targetH };
  }

  const { w: imgW, h: imgH } = sourceSize(img);
  const rect = carouselImageRect(imgW, imgH, targetW, targetH, options.fitMode);

  paintBackground(ctx, targetW, targetH, options.fitMode);
  if (options.fitMode === 'fit') {
    ctx.drawImage(img, 0, 0, imgW, imgH, rect.x, rect.y, rect.w, rect.h);
  } else {
    const crop = calculateAspectCrop(imgW, imgH, targetW, targetH);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, targetW, targetH);
  }

  let imageData = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  if (options.heroColorMetrics) {
    imageData = applyHarmonizeSync(imageData, options.heroColorMetrics, HERO_HARMONIZE_STRENGTH);
  }
  return { imageData, ...rect };
}

/** Step 2: LUT or preset on a copy of the base. The base is never mutated (it is cached by the preview). */
export function applyCarouselLook(
  base: ImageData,
  options: Pick<CarouselRenderOptions, 'customLut' | 'presetId' | 'presetIntensity'>,
  resolutionScale: number = 1
): ImageData {
  const { customLut, presetId, presetIntensity = 1.0 } = options;
  const out = cloneImageData(base);

  if (customLut && presetId === 'custom_lut') {
    return applyCubeLutToImageData(out, customLut, presetIntensity);
  }
  if (presetId && presetId !== 'custom_lut') {
    const preset = CURATE_PRESETS.find((p) => p.id === presetId);
    if (preset) return applyPresetToImageData(out, preset, presetIntensity, { resolutionScale });
  }
  return out;
}

/**
 * Preview canvas size: the export size, capped at what the stage can actually show (CSS box × device pixel ratio).
 * Same draw function and parameters as the export; only the scale differs (CDS §8). Grain stays on the export
 * grid through `outputWidth`. `draft` halves it while a slider is dragged. Never upscales past the export size.
 */
/**
 * Preview pixel density cap. Phones report DPR 2.6–3; at 2 the preview is still crisp at arm's length and
 * costs ~45% fewer pixels than at 2.75 (Faz 5 perf baseline: 4× CPU throttle, 12 MP source). Export is unaffected.
 */
export const PREVIEW_MAX_DPR = 2;

export function previewRenderSize(
  exportW: number,
  exportH: number,
  boxCssW: number,
  boxCssH: number,
  dpr: number,
  draft = false,
): { width: number; height: number } {
  const ratio = exportW / exportH;
  let s = 1;
  if (boxCssW > 0 && boxCssH > 0 && dpr > 0) {
    // the displayed image fits the box keeping the export ratio
    const shownW = Math.min(boxCssW, boxCssH * ratio) * Math.min(dpr, PREVIEW_MAX_DPR);
    s = Math.min(1, shownW / exportW);
  }
  if (draft) s *= 0.5;
  const width = Math.max(1, Math.round(exportW * s));
  return { width, height: Math.max(1, Math.round(width / ratio)) };
}

function resolutionScaleFor(targetW: number, options: CarouselRenderOptions): number {
  return (options.outputWidth ?? targetW) / targetW;
}

/** Export path: step 1 + step 2 in one call. */
export function drawCarouselFrame(
  ctx: CanvasRenderingContext2D,
  img: CarouselSource,
  targetW: number,
  targetH: number,
  options: CarouselRenderOptions
): void {
  const base = renderCarouselBase(ctx, img, targetW, targetH, options);
  const look = applyCarouselLook(base.imageData, options, resolutionScaleFor(targetW, options));
  ctx.putImageData(look, base.x, base.y);
}

/**
 * Hero harmonize reference metrics come from the raw frame (crop/fit only, no harmonize, no LUT/preset).
 * Regression guard for audit finding #5.
 */
export function extractHeroMetrics(
  ctx: CanvasRenderingContext2D,
  img: CarouselSource,
  targetW: number,
  targetH: number,
  fitMode: 'fit' | 'fill'
): ColorMetrics {
  const base = renderCarouselBase(ctx, img, targetW, targetH, { fitMode, heroColorMetrics: null });
  return extractColorMetrics(base.imageData);
}

function metricsKey(m: ColorMetrics | null | undefined): string {
  if (!m) return 'none';
  return [m.avgR, m.avgG, m.avgB, m.luminance].map((v) => v.toFixed(4)).join(',');
}

/**
 * Preview renderer: same steps as drawCarouselFrame, with step 1 cached per (image, size, fit, hero).
 * At the export size its output equals drawCarouselFrame pixel for pixel (tests/carousel-parity.test.ts).
 */
export class CarouselPreviewRenderer {
  private cache = new Map<string, CarouselBase>();
  private imageKey = '';

  render(
    ctx: CanvasRenderingContext2D,
    img: CarouselSource,
    imageKey: string,
    targetW: number,
    targetH: number,
    options: CarouselRenderOptions
  ): void {
    if (imageKey !== this.imageKey) {
      this.cache.clear();
      this.imageKey = imageKey;
    }
    const key = `${targetW}x${targetH}|${options.fitMode}|${metricsKey(options.heroColorMetrics)}|${editCropKey(options.crop)}`;
    let base = this.cache.get(key);
    if (!base) {
      base = renderCarouselBase(ctx, img, targetW, targetH, options);
      // Keep at most the full and the draft size
      if (this.cache.size >= 2) {
        const first = this.cache.keys().next().value;
        if (first !== undefined) this.cache.delete(first);
      }
      this.cache.set(key, base);
    } else if (!options.crop) {
      paintBackground(ctx, targetW, targetH, options.fitMode);
    }
    const look = applyCarouselLook(base.imageData, options, resolutionScaleFor(targetW, options));
    ctx.putImageData(look, base.x, base.y);
  }

  /**
   * Computes and caches step 1 for another size without drawing it (e.g. the draft size while idle),
   * so the first frame of a slider drag does not pay for the downscale of the full source.
   */
  prepareBase(
    ctx: CanvasRenderingContext2D,
    img: CarouselSource,
    imageKey: string,
    targetW: number,
    targetH: number,
    options: CarouselRenderOptions,
  ): void {
    if (imageKey !== this.imageKey) return; // only for the image currently shown
    const key = `${targetW}x${targetH}|${options.fitMode}|${metricsKey(options.heroColorMetrics)}|${editCropKey(options.crop)}`;
    if (this.cache.has(key)) return;
    const base = renderCarouselBase(ctx, img, targetW, targetH, options);
    if (this.cache.size >= 2) {
      const first = this.cache.keys().next().value;
      if (first !== undefined) this.cache.delete(first);
    }
    this.cache.set(key, base);
  }

  reset() {
    this.cache.clear();
    this.imageKey = '';
  }
}
