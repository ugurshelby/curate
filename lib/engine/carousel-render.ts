/**
 * Curate Engine — Unified Carousel Render Pipeline
 * Single source of truth for both live preview and high-res export rendering.
 * Enforces 100% parity between stage display and exported JPEG/PNG files.
 */

import { ColorMetrics, CubeLUT } from '../core/types';
import { calculateAspectCrop } from '../export/platform-specs';
import { applyHarmonizeSync } from './harmonize';
import { applyCubeLutToImageData, applyPresetToImageData, CURATE_PRESETS } from './presets';

export interface CarouselRenderOptions {
  fitMode: 'fit' | 'fill';
  heroColorMetrics?: ColorMetrics | null;
  customLut?: CubeLUT | null;
  presetId?: string | null;
  presetIntensity?: number;
}

export function drawCarouselFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  targetW: number,
  targetH: number,
  options: CarouselRenderOptions
): void {
  const { fitMode, heroColorMetrics, customLut, presetId, presetIntensity = 1.0 } = options;

  let targetX = 0;
  let targetY = 0;
  let targetDrawW = targetW;
  let targetDrawH = targetH;

  const imgW = (img as HTMLImageElement).naturalWidth || img.width;
  const imgH = (img as HTMLImageElement).naturalHeight || img.height;

  if (fitMode === 'fit') {
    // Letterbox / pillarbox background color matching preview
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, targetW, targetH);

    const targetRatio = targetW / targetH;
    const imgRatio = imgW / imgH;

    if (imgRatio > targetRatio) {
      targetDrawW = targetW;
      targetDrawH = Math.round(targetW / imgRatio);
      targetX = 0;
      targetY = Math.round((targetH - targetDrawH) / 2);
    } else {
      targetDrawH = targetH;
      targetDrawW = Math.round(targetH * imgRatio);
      targetX = Math.round((targetW - targetDrawW) / 2);
      targetY = 0;
    }

    ctx.drawImage(img, 0, 0, imgW, imgH, targetX, targetY, targetDrawW, targetDrawH);
  } else {
    // Fill mode: 4:5 aspect cover crop
    const crop = calculateAspectCrop(imgW, imgH, targetW, targetH);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, targetW, targetH);
  }

  // Color pipeline processing
  let imgData = ctx.getImageData(targetX, targetY, targetDrawW, targetDrawH);

  // 1. Hero harmonize sync
  if (heroColorMetrics) {
    imgData = applyHarmonizeSync(imgData, heroColorMetrics, 0.20);
  }

  // 2. Custom 3D LUT (.CUBE)
  if (customLut && presetId === 'custom_lut') {
    imgData = applyCubeLutToImageData(imgData, customLut, presetIntensity);
  }
  // 3. Editorial Preset
  else if (presetId && presetId !== 'custom_lut') {
    const preset = CURATE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      imgData = applyPresetToImageData(imgData, preset, presetIntensity);
    }
  }

  ctx.putImageData(imgData, targetX, targetY);
}
