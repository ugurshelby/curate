/**
 * Curate Engine — Subtle Harmonize / Color Sync Module
 * Computes luminance and chromatic balance from a reference frame,
 * applying a non-destructive 15-25% gentle color & exposure balance.
 */

import { ColorMetrics } from '../core/types';

/**
 * Extracts average luminance and color balance metrics from ImageData
 */
export function extractColorMetrics(imageData: ImageData): ColorMetrics {
  const data = imageData.data;
  const len = data.length;
  const pixelCount = len / 4;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalLuminance = 0;

  // Stride-based sampling for high performance (sample every 4th pixel if large)
  const step = pixelCount > 500000 ? 4 : 1;
  let sampleCount = 0;

  for (let i = 0; i < len; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Rec.709 perceived luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    totalR += r;
    totalG += g;
    totalB += b;
    totalLuminance += lum;
    sampleCount++;
  }

  const avgR = totalR / sampleCount;
  const avgG = totalG / sampleCount;
  const avgB = totalB / sampleCount;
  const luminance = totalLuminance / sampleCount;

  // Temperature estimate: Warm (red/yellow) vs Cool (blue)
  // Normalized roughly to -100 (cool) to +100 (warm)
  const temperature = Math.max(-100, Math.min(100, (avgR - avgB) * 1.2));

  // Tint estimate: Magenta vs Green
  const tint = Math.max(-100, Math.min(100, (avgG - (avgR + avgB) / 2) * -2));

  return {
    luminance,
    temperature,
    tint,
    avgR,
    avgG,
    avgB,
  };
}

/**
 * Applies subtle synchronization from reference metrics to target ImageData
 * @param targetImageData Original/target pixels
 * @param refMetrics Reference color metrics
 * @param strength Blend strength, clamped between 0.10 and 0.30 (standard 0.20 / 20%)
 */
export function applyHarmonizeSync(
  targetImageData: ImageData,
  refMetrics: ColorMetrics,
  strength: number = 0.20
): ImageData {
  // Clamp strength strictly to avoid aggressive distortion
  const clampedStrength = Math.max(0.05, Math.min(0.35, strength));

  const targetMetrics = extractColorMetrics(targetImageData);

  // Compute delta between reference and target
  const deltaLum = (refMetrics.luminance - targetMetrics.luminance) * clampedStrength;
  const deltaR = (refMetrics.avgR - targetMetrics.avgR) * clampedStrength;
  const deltaG = (refMetrics.avgG - targetMetrics.avgG) * clampedStrength;
  const deltaB = (refMetrics.avgB - targetMetrics.avgB) * clampedStrength;

  // Clone or mutate
  const data = targetImageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Gentle linear offset + lum lift
    const newR = Math.min(255, Math.max(0, r + deltaR + deltaLum * 0.4));
    const newG = Math.min(255, Math.max(0, g + deltaG + deltaLum * 0.4));
    const newB = Math.min(255, Math.max(0, b + deltaB + deltaLum * 0.4));

    data[i] = Math.round(newR);
    data[i + 1] = Math.round(newG);
    data[i + 2] = Math.round(newB);
    // data[i+3] is alpha, preserve unchanged
  }

  return targetImageData;
}
