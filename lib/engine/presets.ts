/**
 * Curate Engine — Social & 35mm Clean Preset Profiles & 3D LUT (.CUBE) Engine
 * High-precision non-destructive tone curves and chromatic matrices
 * Applied with linear interpolation (lerp) from 0 to 100% intensity.
 */

import { PresetProfile } from '../core/types';

export const CURATE_PRESETS: PresetProfile[] = [
  {
    id: 'clean_contrast',
    name: 'Clean Contrast',
    category: 'social',
    description: 'Crisp blacks, natural white highlights, subtle punch for modern editorial feeds.',
    adjustments: {
      exposure: 2,
      contrast: 10,
      temperature: -1,
      tint: 0,
      highlights: -6,
      shadows: 4,
      saturation: 2,
    },
  },
  {
    id: 'warm_neutral',
    name: 'Warm Neutral',
    category: 'social',
    description: 'Soft amber undertone, softened highlights, balanced warm street photography look.',
    adjustments: {
      exposure: 1,
      contrast: 6,
      temperature: 8,
      tint: -2,
      highlights: -8,
      shadows: 6,
      saturation: -2,
    },
  },
  {
    id: 'muted_editorial',
    name: 'Muted Editorial',
    category: 'social',
    description: 'Subdued saturation, matte shadow floor, minimalist portrait aesthetic.',
    adjustments: {
      exposure: 0,
      contrast: -2,
      temperature: 2,
      tint: 2,
      highlights: -10,
      shadows: 10,
      saturation: -12,
      fade: 8,
    },
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'social',
    description: 'Rich golden sunlight warmth, lifted shadows and gentle sunset tones.',
    adjustments: {
      exposure: 3,
      contrast: 8,
      temperature: 14,
      tint: -4,
      highlights: -6,
      shadows: 8,
      saturation: 6,
    },
  },
  {
    id: 'film_35mm_subtle',
    name: '35mm Subtle',
    category: 'film',
    description: 'Analog contact sheet nostalgia, balanced emulsion tones and gentle highlight roll-off.',
    adjustments: {
      exposure: 1,
      contrast: 5,
      temperature: 4,
      tint: 2,
      highlights: -10,
      shadows: 8,
      saturation: -4,
      fade: 6,
    },
  },
  {
    id: 'bw_minimal',
    name: 'B&W Minimal',
    category: 'monochrome',
    description: 'Pristine panchromatic monochrome with balanced shadows and silver mids.',
    adjustments: {
      exposure: 1,
      contrast: 14,
      temperature: 0,
      tint: 0,
      highlights: -4,
      shadows: 4,
      saturation: -100,
    },
  },
];

/**
 * 3D LUT Data Interface
 */
export interface CubeLUT {
  title: string;
  size: number;
  data: Float32Array; // Flattened size^3 * 3 RGB values in [0, 1]
}

/**
 * Parses a standard .cube (Adobe 3D LUT) text content into an in-memory 3D LUT
 */
export function parseCubeLUT(content: string, fallbackTitle: string = 'Custom LUT'): CubeLUT {
  const lines = content.split(/\r?\n/);
  let title = fallbackTitle;
  let size = 0;
  const rgbValues: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#')) continue;

    if (rawLine.startsWith('TITLE')) {
      const match = rawLine.match(/TITLE\s+"?([^"]+)"?/i);
      if (match) title = match[1];
      continue;
    }

    if (rawLine.startsWith('LUT_3D_SIZE')) {
      const parts = rawLine.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    // Skip 1D size or domain bounds if present
    if (rawLine.startsWith('LUT_1D_SIZE') || rawLine.startsWith('DOMAIN_')) {
      continue;
    }

    // Data line: 3 floating numbers
    const parts = rawLine.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rgbValues.push(r, g, b);
      }
    }
  }

  if (size === 0) {
    // If size not declared explicitly, infer from cube root
    const entryCount = rgbValues.length / 3;
    const inferredSize = Math.round(Math.cbrt(entryCount));
    if (inferredSize * inferredSize * inferredSize === entryCount) {
      size = inferredSize;
    } else {
      throw new Error('Geçersiz .cube dosyası: 3D LUT boyutu saptanamadı.');
    }
  }

  const expectedEntries = size * size * size * 3;
  if (rgbValues.length < expectedEntries) {
    throw new Error(`Eksik LUT verisi. Beklenen: ${expectedEntries / 3} nokta, Okunan: ${rgbValues.length / 3} nokta.`);
  }

  return {
    title,
    size,
    data: new Float32Array(rgbValues.slice(0, expectedEntries)),
  };
}

/**
 * Applies a 3D LUT to ImageData with trilinear interpolation and intensity blending
 */
export function applyCubeLutToImageData(
  imageData: ImageData,
  lut: CubeLUT,
  intensity: number = 1.0
): ImageData {
  const t = Math.max(0, Math.min(1, intensity));
  if (t === 0) return imageData;

  const { size, data: lutData } = lut;
  const sizeMinusOne = size - 1;
  const pixels = imageData.data;
  const len = pixels.length;

  for (let i = 0; i < len; i += 4) {
    const origR = pixels[i];
    const origG = pixels[i + 1];
    const origB = pixels[i + 2];

    // Normalized coordinates [0, size - 1]
    const x = (origR / 255) * sizeMinusOne;
    const y = (origG / 255) * sizeMinusOne;
    const z = (origB / 255) * sizeMinusOne;

    const x0 = Math.floor(x);
    const x1 = Math.min(sizeMinusOne, x0 + 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(sizeMinusOne, y0 + 1);
    const z0 = Math.floor(z);
    const z1 = Math.min(sizeMinusOne, z0 + 1);

    const fx = x - x0;
    const fy = y - y0;
    const fz = z - z0;

    // Helper to fetch RGB from LUT
    // Standard .cube indexing: r is fastest, then g, then b
    const getLutRGB = (ix: number, iy: number, iz: number): [number, number, number] => {
      const idx = (ix + iy * size + iz * size * size) * 3;
      return [lutData[idx] * 255, lutData[idx + 1] * 255, lutData[idx + 2] * 255];
    };

    const c000 = getLutRGB(x0, y0, z0);
    const c100 = getLutRGB(x1, y0, z0);
    const c010 = getLutRGB(x0, y1, z0);
    const c110 = getLutRGB(x1, y1, z0);
    const c001 = getLutRGB(x0, y0, z1);
    const c101 = getLutRGB(x1, y0, z1);
    const c011 = getLutRGB(x0, y1, z1);
    const c111 = getLutRGB(x1, y1, z1);

    // Trilinear interpolation for R, G, B
    let newR = 0;
    let newG = 0;
    let newB = 0;

    for (let c = 0; c < 3; c++) {
      const v00 = c000[c] * (1 - fx) + c100[c] * fx;
      const v01 = c001[c] * (1 - fx) + c101[c] * fx;
      const v10 = c010[c] * (1 - fx) + c110[c] * fx;
      const v11 = c011[c] * (1 - fx) + c111[c] * fx;

      const v0 = v00 * (1 - fy) + v10 * fy;
      const v1 = v01 * (1 - fy) + v11 * fy;

      const val = v0 * (1 - fz) + v1 * fz;
      if (c === 0) newR = val;
      else if (c === 1) newG = val;
      else newB = val;
    }

    // Blend with original using intensity
    pixels[i] = Math.min(255, Math.max(0, Math.round(origR + (newR - origR) * t)));
    pixels[i + 1] = Math.min(255, Math.max(0, Math.round(origG + (newG - origG) * t)));
    pixels[i + 2] = Math.min(255, Math.max(0, Math.round(origB + (newB - origB) * t)));
  }

  return imageData;
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Applies a preset to ImageData with intensity interpolation (0.0 to 1.0)
 */
export function applyPresetToImageData(
  imageData: ImageData,
  preset: PresetProfile,
  intensity: number = 1.0
): ImageData {
  const t = Math.max(0, Math.min(1, intensity));
  if (t === 0) return imageData; // No change if intensity is 0

  const adj = preset.adjustments;
  const effExposure = lerp(0, adj.exposure, t);
  const effContrast = lerp(0, adj.contrast, t);
  const effTemp = lerp(0, adj.temperature, t);
  const effTint = lerp(0, adj.tint, t);
  const effHighlights = lerp(0, adj.highlights, t);
  const effShadows = lerp(0, adj.shadows, t);
  const effSat = lerp(0, adj.saturation, t);
  const effFade = adj.fade ? lerp(0, adj.fade, t) : 0;

  // Pre-calculate factors
  const exposureMul = 1 + effExposure / 100;
  const contrastFactor = (259 * (effContrast * 2.55 + 255)) / (255 * (259 - effContrast * 2.55));
  const tempR = effTemp > 0 ? 1 + (effTemp / 100) * 0.22 : 1;
  const tempB = effTemp < 0 ? 1 + (Math.abs(effTemp) / 100) * 0.22 : 1;
  const tintG = effTint < 0 ? 1 + (Math.abs(effTint) / 100) * 0.12 : 1;
  const tintM = effTint > 0 ? 1 + (effTint / 100) * 0.12 : 1;

  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure
    r *= exposureMul;
    g *= exposureMul;
    b *= exposureMul;

    // 2. Temperature & Tint
    r *= tempR * tintM;
    g *= tintG;
    b *= tempB;

    // 3. Contrast around mid-gray 128
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 4. Highlights & Shadows adjustments
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 128 && effHighlights !== 0) {
      const hWeight = (lum - 128) / 127;
      const hDelta = (effHighlights / 100) * 26 * hWeight;
      r += hDelta;
      g += hDelta;
      b += hDelta;
    } else if (lum <= 128 && effShadows !== 0) {
      const sWeight = (128 - lum) / 128;
      const sDelta = (effShadows / 100) * 26 * sWeight;
      r += sDelta;
      g += sDelta;
      b += sDelta;
    }

    // 5. Matte Fade (Floor lift)
    if (effFade > 0) {
      const floor = (effFade / 100) * 24;
      r = Math.max(floor, r);
      g = Math.max(floor, g);
      b = Math.max(floor, b);
    }

    // 6. Saturation adjustment
    if (effSat !== 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const satMul = 1 + effSat / 100;
      r = gray + (r - gray) * satMul;
      g = gray + (g - gray) * satMul;
      b = gray + (b - gray) * satMul;
    }

    // Clamp
    data[i] = Math.min(255, Math.max(0, Math.round(r)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
  }

  return imageData;
}
