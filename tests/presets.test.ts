import { describe, it, expect } from 'vitest';
import { CURATE_PRESETS, DEFAULT_PRESET_ID, applyPresetToImageData, scaleAdjustments, toneCurve, getPreset } from '../lib/engine/presets';
import { measureScene, suggestScene, suggestSeries } from '../lib/engine/scene';
import { tr } from '../lib/i18n/tr';
import { defaultEditParamsFor } from '../lib/core/state-machine';

type Img = { width: number; height: number; data: Uint8ClampedArray };
function make(w: number, h: number, fn: (x: number, y: number) => [number, number, number]): Img {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  return { width: w, height: h, data };
}
const apply = (img: Img, id: string, t = 1) =>
  applyPresetToImageData({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) } as unknown as ImageData, getPreset(id)!, t) as unknown as Img;

/** gray ramp 0..255 (one pixel per level) */
const ramp = make(256, 1, (x) => [x, x, x]);
/** colour bars incl. saturated primaries and mid tones */
const bars = make(8 * 32, 32, (x) => {
  const c = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
    [0, 255, 255], [255, 0, 255], [200, 120, 60], [60, 120, 200],
  ][Math.floor(x / 32)];
  return c as [number, number, number];
});
/** skin tone patches (light, medium, deep) */
const SKIN: [number, number, number][] = [[232, 190, 160], [198, 134, 103], [141, 85, 54]];

const hue = (r: number, g: number, b: number) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
};
const clippedChannels = (img: Img, v: number) => {
  let c = 0;
  for (let i = 0; i < img.data.length; i += 4) for (let k = 0; k < 3; k++) if (img.data[i + k] === v) c++;
  return c;
};

describe('Preset library v2 (Faz 5): structure', () => {
  it('16 presets in 4 families, unique ids, Turkish UI names and hints for each', () => {
    expect(CURATE_PRESETS).toHaveLength(16);
    expect(new Set(CURATE_PRESETS.map((p) => p.id)).size).toBe(16);
    const fams = new Set(CURATE_PRESETS.map((p) => p.family));
    expect(fams.size).toBeGreaterThanOrEqual(4);
    expect(fams.size).toBeLessThanOrEqual(5);
    for (const p of CURATE_PRESETS) {
      expect(tr.presets.items[p.id]?.name).toBeTruthy();
      expect(tr.presets.items[p.id]?.hint).toBeTruthy();
    }
  });

  it('default is "Doğal" for new photos; derived results start plain (spec E11)', () => {
    expect(DEFAULT_PRESET_ID).toBe('dogal');
    expect(defaultEditParamsFor({ derivedBy: undefined }).presetId).toBe('dogal');
    expect(defaultEditParamsFor({ derivedBy: 'upscale' }).presetId).toBeNull();
    expect(defaultEditParamsFor({ derivedBy: 'ai' }).presetId).toBeNull();
  });

  it('halation and grain only where the owner allowed them (AGENTS.md §4)', () => {
    for (const p of CURATE_PRESETS) {
      if (p.id !== 'night_cinematic') expect(p.adjustments.halation ?? 0).toBe(0);
      if (p.id !== 'amber_grain') expect(p.adjustments.grain ?? 0).toBe(0);
    }
  });
});

describe('Preset library v2: calibration bounds (natural, no crush, no clip, skin kept)', () => {
  for (const p of CURATE_PRESETS) {
    it(`${p.id}: tone curve monotone, black and white ends fixed`, () => {
      for (const t of [0.5, 1]) {
        const a = scaleAdjustments(p.adjustments, t);
        let prev = -1;
        for (let v = 0; v <= 255; v++) {
          const y = toneCurve(v / 255, a, 1);
          expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
          prev = y;
        }
        expect(toneCurve(1, a, 1)).toBeCloseTo(1, 6);
        expect(toneCurve(0, a, 1)).toBeCloseTo(a.blacks ?? 0, 6);
      }
    });

    it(`${p.id}: no crushed blacks or clipped whites on a gray ramp; colour bars barely clip`, () => {
      const out = apply(ramp, p.id);
      // only level 0 may stay 0 and only level 255 may reach 255 (grain may jitter one more level).
      // İmza presets with a deliberately deep shadow (spec §5.1: Warm Silhouette, Monochrome Noir): ≤ 4 levels.
      const deep = p.family === 'imza' && (p.adjustments.shadows ?? 0) < 0 ? 4 : 1;
      expect(clippedChannels(out, 0)).toBeLessThanOrEqual(3 * Math.max(deep, p.adjustments.grain ? 3 : 1));
      expect(clippedChannels(out, 255)).toBeLessThanOrEqual(3 * (p.adjustments.grain ? 3 : 1));
      const b = apply(bars, p.id);
      const added = clippedChannels(b, 255) + clippedChannels(b, 0) - (clippedChannels(bars, 255) + clippedChannels(bars, 0));
      expect(added / (bars.width * bars.height * 3)).toBeLessThan(0.05);
    });

    if (!p.adjustments.mono) {
      it(`${p.id}: skin hue stays within 15°`, () => {
        for (const s of SKIN) {
          const img = make(4, 4, () => s);
          const o = apply(img, p.id);
          const dh = Math.abs(hue(o.data[0], o.data[1], o.data[2]) - hue(...s));
          expect(Math.min(dh, 360 - dh)).toBeLessThan(15);
        }
      });
    }
  }

  it('Miktar 0 returns the original pixels', () => {
    const out = apply(bars, 'moody_teal', 0);
    expect(out.data).toEqual(bars.data);
  });

  it('vibrance spares skin compared with a non-skin colour', () => {
    const skin = make(2, 2, () => [198, 134, 103]);
    const teal = make(2, 2, () => [90, 140, 150]);
    const sat = (d: Uint8ClampedArray) => (Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2])) / Math.max(d[0], d[1], d[2]);
    const gainSkin = sat(apply(skin, 'canli').data) / sat(skin.data);
    const gainTeal = sat(apply(teal, 'canli').data) / sat(teal.data);
    expect(gainTeal).toBeGreaterThan(gainSkin);
  });
});

describe('Akıllı Otomatik (scene → preset)', () => {
  it('classifies typical synthetic scenes', () => {
    const night = make(64, 48, (x, y) => (x > 26 && x < 36 && y > 18 && y < 28 ? [250, 220, 180] : [12, 12, 20]));
    expect(suggestScene(measureScene(night)).presetId).toBe('gece');
    const gold = make(64, 48, (x, y) => [230 - y, 150 - y, 60 - y / 2]);
    expect(suggestScene(measureScene(gold)).presetId).toBe('altin_saat');
    const skin = make(64, 48, (x) => (x < 40 ? [198, 140, 110] : [120, 120, 120]));
    expect(suggestScene(measureScene(skin)).presetId).toBe('portre');
    const flat = make(64, 48, (x) => [120 + x / 4, 122, 118]);
    expect(suggestScene(measureScene(flat)).presetId).toBe('canli');
    const sil = make(64, 48, (x, y) => (y < 14 ? [250, 230, 210] : [6, 5, 5]));
    expect(suggestScene(measureScene(sil)).presetId).toBe('warm_silhouette');
    const gray = make(64, 48, (x) => [x * 3, x * 3, x * 3]);
    expect(suggestScene(measureScene(gray)).presetId).toBe('siyah_beyaz');
  });

  it('series vote: most common preset wins, amount is its mean', () => {
    const r = suggestSeries([
      { scene: 'golden', presetId: 'altin_saat', amount: 0.6 },
      { scene: 'everyday', presetId: 'dogal', amount: 1 },
      { scene: 'golden', presetId: 'altin_saat', amount: 0.8 },
    ]);
    expect(r).toMatchObject({ presetId: 'altin_saat', amount: 0.7 });
    expect(suggestSeries([])).toBeNull();
  });
});
