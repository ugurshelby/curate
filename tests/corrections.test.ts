import { describe, it, expect } from 'vitest';
import {
  CorrectionParams,
  DEFAULT_CORRECTIONS,
  applyCorrections,
  boxBlur,
  minFilter,
  correctionsActive,
  correctionsKey,
  effectiveNoiseStrength,
  estimateNoiseSigma,
  measureCorrections,
  suggestCorrections,
} from '../lib/engine/corrections';

type Img = { width: number; height: number; data: Uint8ClampedArray };
const W = 160;
const H = 120;

function make(fn: (x: number, y: number) => [number, number, number], w = W, h = H): Img {
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
const clone = (img: Img): Img => ({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
const run = (img: Img, p: CorrectionParams, scale = 1) => applyCorrections(clone(img) as unknown as ImageData, p, scale) as unknown as Img;
const only = (id: keyof CorrectionParams, strength = 70): CorrectionParams => ({ ...DEFAULT_CORRECTIONS, [id]: { on: true, strength } });

/** deterministic noise */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

const lumAt = (img: Img, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};
function regionMean(img: Img, x0: number, y0: number, x1: number, y1: number) {
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++, n++) s += lumAt(img, x, y);
  return s / n;
}
function regionStd(img: Img, x0: number, y0: number, x1: number, y1: number) {
  const m = regionMean(img, x0, y0, x1, y1);
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++, n++) s += (lumAt(img, x, y) - m) ** 2;
  return Math.sqrt(s / n);
}
const count = (img: Img, pred: (v: number) => boolean) => {
  let c = 0;
  for (let i = 0; i < img.data.length; i += 4) if (pred(img.data[i]) || pred(img.data[i + 1]) || pred(img.data[i + 2])) c++;
  return c;
};

/** flat 128 gray with a lens-like falloff (corners ~35% darker) and a slight blue shift */
const vignetted = make((x, y) => {
  const r = Math.hypot(x - (W - 1) / 2, y - (H - 1) / 2) / Math.hypot((W - 1) / 2, (H - 1) / 2);
  const f = 1 - 0.35 * r * r;
  return [128 * f, 128 * f, 128 * f * (1 - 0.06 * r)];
});

/** flat gray with Gaussian noise, plus a vertical step edge in the middle */
const noisy = (() => {
  const r = rng(7);
  return make((x) => {
    const base = x < W / 2 ? 90 : 170;
    const n = gauss(r) * 8;
    return [base + n, base + n + gauss(r) * 6, base + n + gauss(r) * 6];
  });
})();

describe('Düzeltme engine (Faz D2): measurable acceptance on synthetic images', () => {
  it('helpers: box blur keeps a flat field, min filter takes the window minimum', () => {
    const flat = new Float32Array(25).fill(9);
    expect([...boxBlur(flat, 5, 5, 2)].every((v) => Math.abs(v - 9) < 1e-5)).toBe(true);
    const a = new Float32Array([5, 4, 9, 9, 9, 1, 9, 9]);
    expect([...minFilter(a, 8, 1, 1)]).toEqual([4, 4, 4, 9, 1, 1, 1, 9]);
  });

  it('nothing on → pixels untouched', () => {
    expect(correctionsActive(DEFAULT_CORRECTIONS)).toBe(false);
    expect(correctionsKey(DEFAULT_CORRECTIONS)).toBe('none');
    expect(run(noisy, DEFAULT_CORRECTIONS).data).toEqual(noisy.data);
  });

  it('Kenar Renk Düzelt: centre–edge difference drops on a vignetted flat gray', () => {
    const before = regionMean(vignetted, 70, 50, 90, 70) - regionMean(vignetted, 0, 0, 12, 12);
    const out = run(vignetted, only('edgeColor', 100));
    const after = regionMean(out, 70, 50, 90, 70) - regionMean(out, 0, 0, 12, 12);
    expect(before).toBeGreaterThan(25);
    expect(after).toBeLessThan(before * 0.4);
    // centre stays where it was (correction, not a brightness change)
    expect(Math.abs(regionMean(out, 70, 50, 90, 70) - regionMean(vignetted, 70, 50, 90, 70))).toBeLessThan(1.5);
    // colour shift at the corner shrinks too (blue/red ratio towards 1)
    const ratio = (img: Img) => img.data[2] / Math.max(1, img.data[0]);
    expect(Math.abs(1 - ratio(out))).toBeLessThan(Math.abs(1 - ratio(vignetted)));
  });

  it('Kenar Renk Düzelt never adds a vignette (uniform image stays uniform)', () => {
    const flat = make(() => [120, 120, 120]);
    const out = run(flat, only('edgeColor', 100));
    expect(out.data).toEqual(flat.data);
  });

  it('Noise Azalt: flat-area std drops, the step edge stays sharp (no plastic smear)', () => {
    const out = run(noisy, only('noise', 70));
    const sdBefore = regionStd(noisy, 10, 10, 60, 110);
    const sdAfter = regionStd(out, 10, 10, 60, 110);
    expect(sdAfter).toBeLessThan(sdBefore * 0.7);
    // detail kept: not flattened to nothing
    expect(sdAfter).toBeGreaterThan(sdBefore * 0.1);
    const edge = (img: Img) => regionMean(img, 82, 10, 86, 110) - regionMean(img, 74, 10, 78, 110);
    expect(edge(out)).toBeGreaterThan(edge(noisy) * 0.85);
  });

  it('noise estimator separates clean from noisy', () => {
    const clean = make((x) => [x, x, x]);
    const Y = (img: Img) => Float32Array.from({ length: img.width * img.height }, (_, p) => lumAt(img, p % img.width, Math.floor(p / img.width)));
    expect(estimateNoiseSigma(Y(clean), W, H)).toBeLessThan(0.5);
    expect(estimateNoiseSigma(Y(noisy), W, H)).toBeGreaterThan(4);
  });

  it('Gölge Aç lifts dark areas, leaves bright ones, never adds clipping; it raises effective noise strength', () => {
    const scene = make((x, y) => (x < W / 2 ? [25, 25, 28] : [200, 200, 200]));
    const out = run(scene, only('shadows', 80));
    expect(regionMean(out, 20, 40, 40, 80)).toBeGreaterThan(regionMean(scene, 20, 40, 40, 80) + 8);
    expect(Math.abs(regionMean(out, 130, 40, 150, 80) - regionMean(scene, 130, 40, 150, 80))).toBeLessThan(2);
    expect(count(out, (v) => v >= 255)).toBeLessThanOrEqual(count(scene, (v) => v >= 255));
    const p = only('shadows', 80);
    expect(effectiveNoiseStrength(p)).toBeGreaterThan(0);
    expect(effectiveNoiseStrength({ ...p, noise: { on: true, strength: 40 } })).toBeGreaterThan(40);
  });

  it('Parlak Alan Kurtar compresses bright areas, leaves clipped white alone, does not crush blacks', () => {
    const scene = make((x, y) => (y < H / 3 ? [235, 230, 225] : y < (2 * H) / 3 ? [255, 255, 255] : [8, 8, 8]));
    const out = run(scene, only('highlights', 100));
    expect(regionMean(out, 20, 10, 140, 30)).toBeLessThan(regionMean(scene, 20, 10, 140, 30) - 10);
    // clipped band (no information): untouched in its core
    expect(lumAt(out, 80, 60)).toBe(lumAt(scene, 80, 60));
    expect(count(out, (v) => v === 0)).toBeLessThanOrEqual(count(scene, (v) => v === 0));
  });

  it('Pus Gider raises contrast of a hazy scene without clipping it', () => {
    const clear = make((x, y) => [40 + (x / W) * 150, 60 + (y / H) * 120, 90 + ((x + y) / (W + H)) * 100]);
    const haze = make((x, y) => {
      const i = (y * W + x) * 4;
      const t = 0.5;
      return [clear.data[i] * t + 210 * (1 - t), clear.data[i + 1] * t + 215 * (1 - t), clear.data[i + 2] * t + 220 * (1 - t)];
    });
    const out = run(haze, only('dehaze', 100));
    expect(suggestCorrections(measureCorrections(haze as unknown as ImageData)).dehaze.on).toBe(true);
    expect(regionStd(out, 0, 0, W, H)).toBeGreaterThan(regionStd(haze, 0, 0, W, H) * 1.2);
    expect(count(out, (v) => v >= 255)).toBeLessThan(W * H * 0.02);
  });

  it('Kenar Netliği sharpens corners more than the centre and never overshoots (no halo)', () => {
    // soft step edges at the centre and in a corner
    const soft = make((x, y) => {
      const c = 1 / (1 + Math.exp(-(x - 80) / 1.6)); // centre edge
      const e = 1 / (1 + Math.exp(-(x - 14) / 1.6)); // corner edge (near left border)
      const v = y < 20 ? 60 + 120 * e : 60 + 120 * c;
      return [v, v, v];
    });
    const out = run(soft, only('edgeSharp', 100));
    const grad = (img: Img, x: number, y: number) => lumAt(img, x + 1, y) - lumAt(img, x - 1, y);
    const gainCorner = grad(out, 14, 5) / grad(soft, 14, 5);
    const gainCentre = grad(out, 80, 60) / grad(soft, 80, 60);
    expect(gainCorner).toBeGreaterThan(1.05);
    expect(gainCorner).toBeGreaterThan(gainCentre);
    // halo check: no value outside the original range
    let lo = 255;
    let hi = 0;
    for (let i = 0; i < soft.data.length; i += 4) {
      lo = Math.min(lo, soft.data[i]);
      hi = Math.max(hi, soft.data[i]);
    }
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBeGreaterThanOrEqual(lo - 1);
      expect(out.data[i]).toBeLessThanOrEqual(hi + 1);
    }
  });

  it('preview scale runs with smaller radii and keeps the same direction of change', () => {
    const half = run(noisy, only('noise', 70), 2);
    expect(regionStd(half, 10, 10, 60, 110)).toBeLessThan(regionStd(noisy, 10, 10, 60, 110));
  });

  it('Otomatik: turns on what the statistics call for, and nothing on a clean frame', () => {
    const clean = make((x, y) => [80 + (x / W) * 90, 90 + (y / H) * 70, 100]);
    const none = suggestCorrections(measureCorrections(clean as unknown as ImageData));
    expect(Object.values(none).filter((r) => r.on)).toEqual([]);
    const n = suggestCorrections(measureCorrections(noisy as unknown as ImageData));
    expect(n.noise.on).toBe(true);
    expect(n.noise.strength).toBeGreaterThanOrEqual(20);
    const v = suggestCorrections(measureCorrections(vignetted as unknown as ImageData));
    expect(v.edgeColor.on).toBe(true);
  });

  it('Otomatik keeps silhouettes dark and does not treat a dark corner of the scene as lens falloff', () => {
    // backlit silhouette: bright sky top, dark subject bottom
    const sil = make((x, y) => (y < H * 0.45 ? [235, 200, 150] : [8, 6, 6]));
    expect(suggestCorrections(measureCorrections(sil as unknown as ImageData)).shadows.on).toBe(false);
    // one dark corner (content), the other three bright
    const corner = make((x, y) => (x < 40 && y < 30 ? [20, 20, 20] : [150, 150, 150]));
    expect(suggestCorrections(measureCorrections(corner as unknown as ImageData)).edgeColor.on).toBe(false);
  });

  it('Otomatik limits the shadow lift on very dark frames', () => {
    const night = make(() => [6, 6, 8]);
    const s = suggestCorrections(measureCorrections(night as unknown as ImageData));
    expect(s.shadows.on).toBe(true);
    expect(s.shadows.strength).toBeLessThanOrEqual(30);
  });

  it('is fast enough for a worker at preview size (0.5 MP, all rows) — desktop CPU', () => {
    const big = make((x, y) => [((x * 7) ^ (y * 3)) & 255, (x + y) & 255, (x * y) & 255], 800, 640);
    const all: CorrectionParams = Object.fromEntries(Object.keys(DEFAULT_CORRECTIONS).map((k) => [k, { on: true, strength: 60 }])) as CorrectionParams;
    const t0 = performance.now();
    run(big, all);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500);
  });
});

describe('Düzeltme tiling (large exports on phones)', () => {
  it('tiled processing equals whole-image processing (tiles share global measurements)', () => {
    const r = rng(3);
    const img = make((x, y) => {
      const f = 1 - 0.3 * (Math.hypot(x - 150, y - 100) / 180) ** 2;
      const n = gauss(r) * 6;
      return [(60 + x * 0.5) * f + n, (40 + y * 0.6) * f + n, 120 * f + n];
    }, 300, 200);
    const all: CorrectionParams = Object.fromEntries(Object.keys(DEFAULT_CORRECTIONS).map((k) => [k, { on: true, strength: 60 }])) as CorrectionParams;
    const whole = applyCorrections(clone(img) as unknown as ImageData, all, 1, 1e9) as unknown as Img;
    const tiled = applyCorrections(clone(img) as unknown as ImageData, all, 1, 120 * 120) as unknown as Img;
    let off = 0;
    for (let i = 0; i < whole.data.length; i++) if (Math.abs(whole.data[i] - tiled.data[i]) > 1) off++;
    expect(off).toBe(0);
  });
});
