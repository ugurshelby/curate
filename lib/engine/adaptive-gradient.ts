/**
 * Curate Engine — Adaptive Edge Gradient Generator
 * Samples 5px deep peripheral pixels from 4 boundaries of an image
 * to calculate harmonious organic background gradients for Story & Polaroid modes.
 */

import { AdaptiveGradientResult } from '../core/types';
import { EXPORT_COLORS } from '../ui/colors';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates average RGB from a region of ImageData
 */
function sampleAverageRGB(
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  regionW: number,
  regionH: number
): { r: number; g: number; b: number } {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let y = startY; y < startY + regionH; y++) {
    for (let x = startX; x < startX + regionW; x++) {
      const idx = (y * width + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * Extracts peripheral colors and returns CSS gradient strings
 */
export function extractAdaptiveGradient(imageData: ImageData): AdaptiveGradientResult {
  const { width, height, data } = imageData;
  const depth = Math.min(5, Math.floor(Math.min(width, height) / 4));

  // 1. Top Edge (5px deep across width)
  const top = sampleAverageRGB(data, width, 0, 0, width, depth);

  // 2. Bottom Edge (5px deep across width)
  const bottom = sampleAverageRGB(data, width, 0, height - depth, width, depth);

  // 3. Left Edge (5px deep across height)
  const left = sampleAverageRGB(data, width, 0, 0, depth, height);

  // 4. Right Edge (5px deep across height)
  const right = sampleAverageRGB(data, width, width - depth, 0, depth, height);

  const hexTop = rgbToHex(top.r, top.g, top.b);
  const hexBottom = rgbToHex(bottom.r, bottom.g, bottom.b);
  const hexLeft = rgbToHex(left.r, left.g, left.b);
  const hexRight = rgbToHex(right.r, right.g, right.b);

  // Softened ambient versions for deep background immersion
  const cssLinear = `linear-gradient(180deg, ${hexTop} 0%, ${hexBottom} 100%)`;
  const cssRadial = `radial-gradient(circle at 50% 50%, ${hexTop} 0%, ${hexBottom} 70%, ${EXPORT_COLORS.storyBlack} 100%)`;

  return {
    colorTop: hexTop,
    colorBottom: hexBottom,
    colorLeft: hexLeft,
    colorRight: hexRight,
    dominantColors: [hexTop, hexRight, hexBottom, hexLeft],
    cssLinear,
    cssRadial,
  };
}
