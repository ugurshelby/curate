/**
 * Curate Engine — Social & 35mm Clean Preset Profiles & 3D LUT (.CUBE) Engine
 * High-precision non-destructive tone curves and chromatic matrices
 * Applied with linear interpolation (lerp) from 0 to 100% intensity.
 */

import { PresetProfile, CubeLUT } from '../core/types';

export const CURATE_PRESETS: PresetProfile[] = [
  {
    id: 'moody_teal',
    name: 'Moody Teal',
    category: 'editorial',
    description: 'Yüksek kontrast, derin mimari gölgeler, doygun teal gökyüzü ve sıcak-soğuk renk dengesi.',
    adjustments: {
      exposure: 2,
      contrast: 18,
      temperature: -10,
      tint: -4,
      highlights: -12,
      shadows: -14,
      saturation: 12,
    },
  },
  {
    id: 'warm_silhouette',
    name: 'Warm Silhouette',
    category: 'silhouette',
    description: 'Derin shadow crush, sıcak turuncu-kırmızı tonlar ve ters ışıkta jilet gibi keskin siluet ayrımı.',
    adjustments: {
      exposure: -2,
      contrast: 24,
      temperature: 22,
      tint: 6,
      highlights: 8,
      shadows: -28,
      saturation: 16,
      fade: 0,
    },
  },
  {
    id: 'night_cinematic',
    name: 'Night Cinematic',
    category: 'cinematic',
    description: 'Düşük anahtar atmosfer, cyan-teal gölgeler, sıcak neon vurgusu ve parlak noktalarda optik halation halesi.',
    adjustments: {
      exposure: -4,
      contrast: 16,
      temperature: -6,
      tint: 4,
      highlights: 14,
      shadows: -16,
      saturation: 14,
      halation: 28,
    },
  },
  {
    id: 'muted_coastal',
    name: 'Muted Coastal',
    category: 'coastal',
    description: 'Düşük kontrast, pastel ve yumuşak geçişler, kremamsı mat zemin (crush yok), ferah kıyı hissi.',
    adjustments: {
      exposure: 4,
      contrast: -8,
      temperature: -2,
      tint: 2,
      highlights: -14,
      shadows: 18,
      saturation: -18,
      fade: 16,
    },
  },
  {
    id: 'amber_grain',
    name: 'Amber Grain',
    category: 'film',
    description: 'Sıcak amber ton eğrisi, dokunsal 35mm analog film greni ve otantik sokak yansıması.',
    adjustments: {
      exposure: 2,
      contrast: 10,
      temperature: 18,
      tint: 4,
      highlights: -8,
      shadows: 8,
      saturation: 8,
      fade: 8,
      grain: 22,
    },
  },
  {
    id: 'monochrome_noir',
    name: 'Monochrome Noir',
    category: 'monochrome',
    description: 'Yüksek kontrast siyah-beyaz, derin ezilmiş koyular, gümüşi orta tonlar ve grafik siluet kompozisyonu.',
    adjustments: {
      exposure: 0,
      contrast: 28,
      temperature: 0,
      tint: 0,
      highlights: 6,
      shadows: -22,
      saturation: -100,
      fade: 0,
    },
  },
];

export type { CubeLUT };

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
export interface PresetRenderOptions {
  /**
   * Output pixels represented by one pixel of this ImageData (export width / render width).
   * 1 = export resolution. 2 = half-size preview. Grain is sampled on the export-resolution grid,
   * so a preview pixel shows the grain value of the export pixel it stands for.
   * Halation is a per-pixel threshold and needs no scaling.
   */
  resolutionScale?: number;
}

export function applyPresetToImageData(
  imageData: ImageData,
  preset: PresetProfile,
  intensity: number = 1.0,
  options: PresetRenderOptions = {}
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
  const effGrain = adj.grain ? lerp(0, adj.grain, t) : 0;
  const effHalation = adj.halation ? lerp(0, adj.halation, t) : 0;

  // Steps 1–3 (exposure, temperature/tint, contrast) are per-channel and linear: one 256-entry table per channel.
  const exposureMul = 1 + effExposure / 100;
  const contrastFactor = (259 * (effContrast * 2.55 + 255)) / (255 * (259 - effContrast * 2.55));
  const tempR = effTemp > 0 ? 1 + (effTemp / 100) * 0.22 : 1;
  const tempB = effTemp < 0 ? 1 + (Math.abs(effTemp) / 100) * 0.22 : 1;
  const tintG = effTint < 0 ? 1 + (Math.abs(effTint) / 100) * 0.12 : 1;
  const tintM = effTint > 0 ? 1 + (effTint / 100) * 0.12 : 1;
  const lutR = new Float32Array(256);
  const lutG = new Float32Array(256);
  const lutB = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    lutR[v] = contrastFactor * (v * exposureMul * tempR * tintM - 128) + 128;
    lutG[v] = contrastFactor * (v * exposureMul * tintG - 128) + 128;
    lutB[v] = contrastFactor * (v * exposureMul * tempB - 128) + 128;
  }

  const hK = (effHighlights / 100) * 26 / 127;
  const sK = (effShadows / 100) * 26 / 128;
  const floor = effFade > 0 ? (effFade / 100) * 24 : 0;
  const satMul = 1 + effSat / 100;
  const halK = effHalation / 100 / 90;
  const grainAmp = effGrain * 0.4;

  const data = imageData.data;
  const width = imageData.width;
  const height = Math.floor(data.length / 4 / width);
  const resolutionScale = options.resolutionScale ?? 1;
  const refWidth = Math.round(width * resolutionScale);

  let i = 0;
  for (let y = 0; y < height; y++) {
    // Grain is sampled on the export-resolution grid (see PresetRenderOptions)
    const grainRow = resolutionScale === 1 ? 0 : Math.floor(y * resolutionScale) * refWidth;
    for (let x = 0; x < width; x++, i += 4) {
      let r = lutR[data[i]];
      let g = lutG[data[i + 1]];
      let b = lutB[data[i + 2]];

      // 4. Highlights & shadows
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > 128) {
        if (hK !== 0) {
          const d = (lum - 128) * hK;
          r += d;
          g += d;
          b += d;
        }
      } else if (sK !== 0) {
        const d = (128 - lum) * sK;
        r += d;
        g += d;
        b += d;
      }

      // 5. Matte fade (floor lift)
      if (floor > 0) {
        if (r < floor) r = floor;
        if (g < floor) g = floor;
        if (b < floor) b = floor;
      }

      // 6. Saturation
      if (effSat !== 0) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * satMul;
        g = gray + (g - gray) * satMul;
        b = gray + (b - gray) * satMul;
      }

      // 7. Optical halation (warm highlight bloom)
      if (halK > 0 && lum > 165) {
        const h = (lum - 165) * halK;
        r += 32 * h;
        g += 10 * h;
        b -= 14 * h;
      }

      // 8. 35mm grain
      if (grainAmp > 0) {
        const gi = resolutionScale === 1 ? i : (grainRow + Math.floor(x * resolutionScale)) * 4;
        const n = ((((gi * 1664525 + 1013904223) >>> 16) / 65535) - 0.5) * grainAmp;
        r += n;
        g += n;
        b += n;
      }

      // Clamp + round half up (same as Math.round for these values)
      data[i] = r <= 0 ? 0 : r >= 255 ? 255 : (r + 0.5) | 0;
      data[i + 1] = g <= 0 ? 0 : g >= 255 ? 255 : (g + 0.5) | 0;
      data[i + 2] = b <= 0 ? 0 : b >= 255 ? 255 : (b + 0.5) | 0;
    }
  }

  return imageData;
}
