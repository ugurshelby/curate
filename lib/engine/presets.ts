/**
 * Curate Engine — preset library v2 (Faz 5).
 *
 * Principles (docs/PHOTO-KNOWLEDGE.md): natural and clean, one "Miktar" slider per preset, skin tones
 * protected, no crushed blacks and no clipped whites (tone curve ends are fixed; brightening uses a soft
 * shoulder). Four families, 16 presets. The six "İmza" presets are the owner's families from spec §5.1,
 * re-expressed on this engine. Applied per pixel with per-channel 256-entry tables (fast enough for the
 * live preview, see docs/ARCHITECTURE.md §2).
 */

import { PresetProfile, PresetAdjustments } from '../core/types';

export const CURATE_PRESETS: PresetProfile[] = [
  // --- Temel: everyday, scene-agnostic ---
  { id: 'dogal', family: 'temel', name: 'Doğal', adjustments: { contrast: 0.12, shadows: 0.08, highlights: -0.12, vibrance: 0.15 } },
  { id: 'canli', family: 'temel', name: 'Canlı', adjustments: { contrast: 0.15, shadows: 0.05, highlights: -0.15, vibrance: 0.35, saturation: 0.05 } },
  { id: 'yumusak', family: 'temel', name: 'Yumuşak', adjustments: { contrast: -0.15, shadows: 0.2, highlights: -0.2, blacks: 0.03, vibrance: 0.05, temperature: 0.05 } },
  { id: 'siyah_beyaz', family: 'temel', name: 'Siyah Beyaz', adjustments: { mono: [0.3, 0.59, 0.11], contrast: 0.2, shadows: 0.05, highlights: -0.1 } },

  // --- Portre: skin first ---
  { id: 'portre', family: 'portre', name: 'Portre', adjustments: { temperature: 0.08, tint: 0.03, contrast: 0.06, shadows: 0.12, highlights: -0.15, vibrance: 0.1, saturation: -0.05 } },
  { id: 'on_kamera', family: 'portre', name: 'Ön Kamera', adjustments: { exposure: 0.1, contrast: -0.05, shadows: 0.1, highlights: -0.2, temperature: 0.05, vibrance: 0.08, saturation: -0.08 } },

  // --- Işık: time of day ---
  { id: 'altin_saat', family: 'isik', name: 'Altın Saat', adjustments: { temperature: 0.22, tint: 0.05, contrast: 0.12, highlights: -0.15, vibrance: 0.15, splitHighlights: [40, 0.25] } },
  { id: 'mavi_saat', family: 'isik', name: 'Mavi Saat', adjustments: { temperature: -0.15, tint: 0.04, contrast: 0.12, shadows: 0.08, vibrance: 0.12, splitShadows: [220, 0.25] } },
  { id: 'sert_gunes', family: 'isik', name: 'Sert Güneş', adjustments: { contrast: -0.05, shadows: 0.25, highlights: -0.35, vibrance: 0.08 } },
  { id: 'gece', family: 'isik', name: 'Gece', adjustments: { contrast: 0.12, highlights: -0.2, temperature: -0.08, saturation: 0.05 } },

  // --- İmza: the owner's six families (spec §5.1), calibrated on this engine ---
  { id: 'moody_teal', family: 'imza', name: 'Moody Teal', adjustments: { contrast: 0.25, shadows: -0.1, highlights: -0.15, temperature: -0.1, saturation: 0.1, vibrance: 0.1, splitShadows: [190, 0.3], splitHighlights: [35, 0.15] } },
  { id: 'warm_silhouette', family: 'imza', name: 'Warm Silhouette', adjustments: { contrast: 0.28, shadows: -0.2, temperature: 0.25, tint: 0.05, vibrance: 0.15, splitHighlights: [25, 0.2] } },
  { id: 'night_cinematic', family: 'imza', name: 'Night Cinematic', adjustments: { exposure: -0.1, contrast: 0.2, highlights: -0.1, temperature: -0.08, saturation: 0.1, splitShadows: [195, 0.3], halation: 0.3 } },
  { id: 'muted_coastal', family: 'imza', name: 'Muted Coastal', adjustments: { contrast: -0.15, shadows: 0.2, highlights: -0.2, saturation: -0.2, blacks: 0.06, temperature: -0.03 } },
  { id: 'amber_grain', family: 'imza', name: 'Amber Grain', adjustments: { temperature: 0.2, contrast: 0.12, blacks: 0.03, highlights: -0.1, vibrance: 0.05, splitHighlights: [38, 0.2], grain: 0.35 } },
  { id: 'monochrome_noir', family: 'imza', name: 'Monochrome Noir', adjustments: { mono: [0.35, 0.5, 0.15], contrast: 0.3, shadows: -0.1, highlights: -0.05 } },
];

/** Default look for newly added photos (owner brief §8.4: "Varsayılan Doğal olsun") */
export const DEFAULT_PRESET_ID = 'dogal';

export function getPreset(id: string | null | undefined): PresetProfile | null {
  return (id && CURATE_PRESETS.find((p) => p.id === id)) || null;
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

/** Adjustments scaled by the "Miktar" weight t (0 = original). Hue angles and mono weights are not scaled. */
export function scaleAdjustments(a: PresetAdjustments, t: number): PresetAdjustments {
  const k = clamp(t, 0, 1);
  const n = (v: number | undefined) => (v ?? 0) * k;
  return {
    exposure: n(a.exposure),
    contrast: n(a.contrast),
    shadows: n(a.shadows),
    highlights: n(a.highlights),
    blacks: n(a.blacks),
    temperature: n(a.temperature),
    tint: n(a.tint),
    vibrance: n(a.vibrance),
    saturation: n(a.saturation),
    splitShadows: a.splitShadows ? [a.splitShadows[0], a.splitShadows[1] * k] : undefined,
    splitHighlights: a.splitHighlights ? [a.splitHighlights[0], a.splitHighlights[1] * k] : undefined,
    mono: a.mono,
    grain: n(a.grain),
    halation: n(a.halation),
  };
}

/**
 * Tone curve on a gamma-encoded value x (0–1 or slightly above after gains). Ends are fixed (0 → floor,
 * 1 → 1); values above 1 are rolled off with a soft shoulder instead of clipping. Monotone for the
 * documented parameter ranges (tested).
 */
export function toneCurve(x: number, a: PresetAdjustments, maxInput: number): number {
  // soft shoulder: [knee, maxInput] → [knee, 1]; identity when maxInput ≤ 1
  if (maxInput > 1 && x > 0.85) {
    const knee = 0.85;
    const u = Math.min(1, (x - knee) / (maxInput - knee));
    const pw = (maxInput - knee) / (1 - knee);
    x = knee + (1 - knee) * (1 - Math.pow(1 - u, pw));
  }
  x = clamp(x, 0, 1);
  const c = clamp(a.contrast ?? 0, -0.5, 0.6);
  // slope at the ends 1 − 1.5c (toe/shoulder keep shadow and highlight detail), at the middle 1 + 0.75c
  if (c !== 0) x = x + c * x * (1 - x) * (2 * x - 1) * 1.5;
  const sh = clamp(a.shadows ?? 0, -0.4, 1);
  if (sh !== 0) x = x + sh * 2.5 * x * Math.pow(1 - x, 4);
  const hl = clamp(a.highlights ?? 0, -1, 0.4);
  if (hl !== 0) x = x + hl * 2.5 * Math.pow(x, 4) * (1 - x);
  const f = clamp(a.blacks ?? 0, 0, 0.12);
  if (f > 0) x = f + (1 - f) * x;
  return clamp(x, 0, 1);
}

/** Zero-luma colour offset for a hue (sum of components = 0) */
function hueOffset(deg: number): [number, number, number] {
  const h = (deg * Math.PI) / 180;
  return [Math.cos(h), Math.cos(h - (2 * Math.PI) / 3), Math.cos(h - (4 * Math.PI) / 3)];
}

export interface PresetRenderOptions {
  /**
   * Output pixels represented by one pixel of this ImageData (export width / render width).
   * 1 = export resolution. 2 = half-size preview. Grain is sampled on the export-resolution grid,
   * so a preview pixel shows the grain value of the export pixel it stands for.
   */
  resolutionScale?: number;
}

/** Applies a preset with the "Miktar" weight (0–1). Same function for preview and export. */
export function applyPresetToImageData(
  imageData: ImageData,
  preset: PresetProfile,
  intensity: number = 1.0,
  options: PresetRenderOptions = {}
): ImageData {
  const t = clamp(intensity, 0, 1);
  if (t === 0) return imageData;
  const a = scaleAdjustments(preset.adjustments, t);

  // White balance as luminance-neutral gains (gamma space), then exposure
  const T = a.temperature ?? 0;
  const M = a.tint ?? 0;
  let gR = 1 + 0.1 * T;
  let gG = 1 - 0.06 * M;
  let gB = 1 - 0.1 * T;
  const norm = 0.2126 * gR + 0.7152 * gG + 0.0722 * gB;
  gR /= norm;
  gG /= norm;
  gB /= norm;
  const exp = Math.pow(2, (a.exposure ?? 0) / 2.2);
  const maxInput = exp * Math.max(gR, gG, gB, 1);

  const lutR = new Float32Array(256);
  const lutG = new Float32Array(256);
  const lutB = new Float32Array(256);
  const lutY = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    lutR[v] = toneCurve(x * gR * exp, a, maxInput) * 255;
    lutG[v] = toneCurve(x * gG * exp, a, maxInput) * 255;
    lutB[v] = toneCurve(x * gB * exp, a, maxInput) * 255;
    lutY[v] = toneCurve(x * exp, a, maxInput) * 255;
  }

  const mono = a.mono;
  let mr = 0;
  let mg = 0;
  let mb = 0;
  if (mono) {
    const sum = mono[0] + mono[1] + mono[2] || 1;
    mr = mono[0] / sum;
    mg = mono[1] / sum;
    mb = mono[2] / sum;
  }
  const sat = a.saturation ?? 0;
  const vib = a.vibrance ?? 0;
  const doColor = !mono && (sat !== 0 || vib !== 0);
  const sS = a.splitShadows;
  const sH = a.splitHighlights;
  // Split toning as bounded pushes: towards 255 for positive, towards 0 for negative components,
  // so black stays black and white never clips
  const offS = sS && sS[1] > 0 ? hueOffset(sS[0]).map((v) => v * sS[1] * 0.18) : null;
  const offH = sH && sH[1] > 0 ? hueOffset(sH[0]).map((v) => v * sH[1] * 0.18) : null;
  const hal = a.halation ?? 0;
  const grainAmp = (a.grain ?? 0) * 26;

  const data = imageData.data;
  const width = imageData.width;
  const height = Math.floor(data.length / 4 / width);
  const resolutionScale = options.resolutionScale ?? 1;
  const refWidth = Math.round(width * resolutionScale);

  let i = 0;
  for (let y = 0; y < height; y++) {
    const grainRow = resolutionScale === 1 ? 0 : Math.floor(y * resolutionScale) * refWidth;
    for (let x = 0; x < width; x++, i += 4) {
      let r: number;
      let g: number;
      let b: number;
      if (mono) {
        const yy = lutY[(mr * data[i] + mg * data[i + 1] + mb * data[i + 2] + 0.5) | 0];
        r = yy;
        g = yy;
        b = yy;
      } else {
        r = lutR[data[i]];
        g = lutG[data[i + 1]];
        b = lutB[data[i + 2]];
      }

      if (doColor) {
        const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
        const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
        const s0 = mx > 0 ? (mx - mn) / mx : 0;
        // skin-ish: warm order r > g > b with moderate saturation → vibrance spares it (Adobe-style vibrance)
        const skin = r > g && g > b && s0 > 0.12 && s0 < 0.7 ? 1 : 0;
        const f = 1 + sat + vib * (1 - s0) * (1 - 0.7 * skin);
        r = Y + (r - Y) * f;
        g = Y + (g - Y) * f;
        b = Y + (b - Y) * f;
      }

      if (offS || offH) {
        const Yn = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (offS) {
          const w = (1 - Yn) * (1 - Yn);
          r += (offS[0] > 0 ? 255 - r : r) * offS[0] * w;
          g += (offS[1] > 0 ? 255 - g : g) * offS[1] * w;
          b += (offS[2] > 0 ? 255 - b : b) * offS[2] * w;
        }
        if (offH) {
          const w = Yn * Yn;
          r += (offH[0] > 0 ? 255 - r : r) * offH[0] * w;
          g += (offH[1] > 0 ? 255 - g : g) * offH[1] * w;
          b += (offH[2] > 0 ? 255 - b : b) * offH[2] * w;
        }
      }

      if (hal > 0) {
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (L > 165) {
          const h = ((L - 165) / 90) * hal;
          r += 32 * h;
          g += 10 * h;
          b -= 14 * h;
        }
      }

      if (grainAmp > 0) {
        const gi = resolutionScale === 1 ? i : (grainRow + Math.floor(x * resolutionScale)) * 4;
        const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const n = ((((gi * 1664525 + 1013904223) >>> 16) / 65535) - 0.5) * grainAmp * (0.35 + 2.6 * L * (1 - L));
        r += n;
        g += n;
        b += n;
      }

      data[i] = r <= 0 ? 0 : r >= 255 ? 255 : (r + 0.5) | 0;
      data[i + 1] = g <= 0 ? 0 : g >= 255 ? 255 : (g + 0.5) | 0;
      data[i + 2] = b <= 0 ? 0 : b >= 255 ? 255 : (b + 0.5) | 0;
    }
  }

  return imageData;
}
