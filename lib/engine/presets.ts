/**
 * Curate Engine — Social & 35mm Clean Preset Profiles
 * High-precision non-destructive tone curves and chromatic matrices
 * Applied with linear interpolation (lerp) from 0 to 100% intensity.
 */

import { PresetProfile } from '../core/types';

export const CURATE_PRESETS: PresetProfile[] = [
  {
    id: 'clean_contrast',
    name: 'Clean Contrast',
    category: 'social',
    description: 'Crisp blacks, clean white highlights, slight saturation pop for modern editorial feeds.',
    adjustments: {
      exposure: 3,
      contrast: 14,
      temperature: -2,
      tint: 0,
      highlights: -8,
      shadows: 6,
      saturation: 4,
    },
  },
  {
    id: 'warm_neutral',
    name: 'Warm Neutral',
    category: 'social',
    description: 'Soft amber undertone, softened highlights, balanced warm street photography look.',
    adjustments: {
      exposure: 2,
      contrast: 8,
      temperature: 12,
      tint: -2,
      highlights: -12,
      shadows: 8,
      saturation: -4,
    },
  },
  {
    id: 'muted_editorial',
    name: 'Muted Editorial',
    category: 'social',
    description: 'Subdued saturation, matte shadow floor, magazine style minimalist portrait aesthetic.',
    adjustments: {
      exposure: 0,
      contrast: -4,
      temperature: 2,
      tint: 4,
      highlights: -16,
      shadows: 14,
      saturation: -18,
      fade: 12,
    },
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'social',
    description: 'Rich golden sunlight glow, lifted warm shadows and punchy sunset gradients.',
    adjustments: {
      exposure: 4,
      contrast: 10,
      temperature: 22,
      tint: -6,
      highlights: -6,
      shadows: 10,
      saturation: 8,
    },
  },
  {
    id: 'film_35mm_subtle',
    name: '35mm Subtle',
    category: 'film',
    description: 'Analog contact sheet nostalgia, balanced emulsion tones and gentle highlight roll-off.',
    adjustments: {
      exposure: 1,
      contrast: 6,
      temperature: 6,
      tint: 3,
      highlights: -14,
      shadows: 12,
      saturation: -6,
      fade: 8,
    },
  },
  {
    id: 'bw_minimal',
    name: 'B&W Minimal',
    category: 'monochrome',
    description: 'Pristine panchromatic monochrome with deep shadows and sharp silver mids.',
    adjustments: {
      exposure: 2,
      contrast: 20,
      temperature: 0,
      tint: 0,
      highlights: -4,
      shadows: 4,
      saturation: -100, // full desaturation
    },
  },
];

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
  const tempR = effTemp > 0 ? 1 + (effTemp / 100) * 0.25 : 1;
  const tempB = effTemp < 0 ? 1 + (Math.abs(effTemp) / 100) * 0.25 : 1;
  const tintG = effTint < 0 ? 1 + (Math.abs(effTint) / 100) * 0.15 : 1;
  const tintM = effTint > 0 ? 1 + (effTint / 100) * 0.15 : 1;

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
      const hDelta = (effHighlights / 100) * 30 * hWeight;
      r += hDelta;
      g += hDelta;
      b += hDelta;
    } else if (lum <= 128 && effShadows !== 0) {
      const sWeight = (128 - lum) / 128;
      const sDelta = (effShadows / 100) * 30 * sWeight;
      r += sDelta;
      g += sDelta;
      b += sDelta;
    }

    // 5. Matte Fade (Floor lift)
    if (effFade > 0) {
      const floor = (effFade / 100) * 28;
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
