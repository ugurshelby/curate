/**
 * Düzenle → Düzeltme (Faz D2, spec §4.5 E3/E10): local, deterministic improvements. They only improve;
 * they never invent detail. Fixed order: shadows/highlights → haze → noise → edge colour → edge sharpness
 * (the preset look runs after, in carousel-render.ts). Preview and export call applyCorrections with the
 * same parameters; radii are defined in export pixels and scaled by `scale` (export px per render px).
 */

export type CorrectionId = 'shadows' | 'highlights' | 'dehaze' | 'noise' | 'edgeColor' | 'edgeSharp';

/** UI order (rows) */
export const CORRECTION_IDS: CorrectionId[] = ['noise', 'edgeSharp', 'edgeColor', 'shadows', 'highlights', 'dehaze'];

/** Processing order (spec: Gölge/Parlak → Pus → Noise → Kenar Renk → Kenar Netliği → Preset) */
export const CORRECTION_ORDER: CorrectionId[] = ['shadows', 'highlights', 'dehaze', 'noise', 'edgeColor', 'edgeSharp'];

export interface CorrectionRow {
  on: boolean;
  /** 0–100 */
  strength: number;
}

export type CorrectionParams = Record<CorrectionId, CorrectionRow>;

/** Strength used when a row is switched on by hand (Otomatik sets its own) */
export const MANUAL_STRENGTH = 50;

export const DEFAULT_CORRECTIONS: CorrectionParams = {
  shadows: { on: false, strength: MANUAL_STRENGTH },
  highlights: { on: false, strength: MANUAL_STRENGTH },
  dehaze: { on: false, strength: MANUAL_STRENGTH },
  noise: { on: false, strength: MANUAL_STRENGTH },
  edgeColor: { on: false, strength: MANUAL_STRENGTH },
  edgeSharp: { on: false, strength: MANUAL_STRENGTH },
};

export function correctionsActive(p: CorrectionParams | null | undefined): boolean {
  return !!p && CORRECTION_ORDER.some((id) => p[id].on && p[id].strength > 0);
}

/** Cache key (only active rows matter) */
export function correctionsKey(p: CorrectionParams | null | undefined): string {
  if (!correctionsActive(p)) return 'none';
  return CORRECTION_ORDER.filter((id) => p![id].on && p![id].strength > 0)
    .map((id) => `${id}:${Math.round(p![id].strength)}`)
    .join(',');
}

/** Shadow lift raises noise: the effective noise strength follows it (spec §8.2) */
export function effectiveNoiseStrength(p: CorrectionParams): number {
  const own = p.noise.on ? p.noise.strength : 0;
  const lift = p.shadows.on ? p.shadows.strength * 0.35 : 0;
  return Math.min(100, own + lift);
}

// --- helpers ---------------------------------------------------------------------------------

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Separable box blur with clamped edges, O(n) per pass */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * norm;
      const add = src[row + Math.min(w - 1, x + r + 1)];
      const sub = src[row + Math.max(0, x - r)];
      acc += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * norm;
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x];
      acc += add - sub;
    }
  }
  return out;
}

/** Separable min filter (monotonic deque), clamped edges */
export function minFilter(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  const pass = (input: Float32Array, out: Float32Array, len: number, count: number, idx: (line: number, i: number) => number) => {
    const dq = new Int32Array(len + 2 * r + 1);
    for (let line = 0; line < count; line++) {
      let head = 0;
      let tail = 0;
      // window [i - r, i + r], indices clamped
      let next = -r;
      for (let i = 0; i < len; i++) {
        while (next <= i + r) {
          const j = Math.min(len - 1, Math.max(0, next));
          const v = input[idx(line, j)];
          while (tail > head && input[idx(line, Math.min(len - 1, Math.max(0, dq[tail - 1])))] >= v) tail--;
          dq[tail++] = next;
          next++;
        }
        while (dq[head] < i - r) head++;
        out[idx(line, i)] = input[idx(line, Math.min(len - 1, Math.max(0, dq[head])))];
      }
    }
  };
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  pass(src, tmp, w, h, (line, i) => line * w + i);
  pass(tmp, out, h, w, (line, i) => i * w + line);
  return out;
}

/** Radius in render pixels for a radius defined in export pixels */
const rad = (exportPx: number, scale: number) => Math.max(1, Math.round(exportPx / Math.max(scale, 1e-6)));

interface Planes {
  w: number;
  h: number;
  R: Float32Array;
  G: Float32Array;
  B: Float32Array;
}

/** Where a tile sits in the full image (radial maps are relative to the full frame) */
interface Frame {
  fullW: number;
  fullH: number;
  ox: number;
  oy: number;
}

/** Whole-image measurements shared by every tile so tiles agree with each other */
interface Globals {
  sigma: number;
  atmosphere: [number, number, number];
  edgeGains: { bins: number; gains: [Float32Array, Float32Array, Float32Array] };
}

function planesFrom(data: Uint8ClampedArray, imgW: number, x0: number, y0: number, w: number, h: number): Planes {
  const n = w * h;
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    let i = ((y0 + y) * imgW + x0) * 4;
    let p = y * w;
    for (let x = 0; x < w; x++, p++, i += 4) {
      R[p] = data[i];
      G[p] = data[i + 1];
      B[p] = data[i + 2];
    }
  }
  return { w, h, R, G, B };
}

const put8 = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : (v + 0.5) | 0);

function luma(pl: Planes): Float32Array {
  const n = pl.w * pl.h;
  const Y = new Float32Array(n);
  for (let p = 0; p < n; p++) Y[p] = 0.299 * pl.R[p] + 0.587 * pl.G[p] + 0.114 * pl.B[p];
  return Y;
}

/** Noise sigma (8-bit units) of a luminance plane — Immerkær's fast estimator */
export function estimateNoiseSigma(Y: Float32Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const v =
        Y[p - w - 1] - 2 * Y[p - w] + Y[p - w + 1] -
        2 * Y[p - 1] + 4 * Y[p] - 2 * Y[p + 1] +
        Y[p + w - 1] - 2 * Y[p + w] + Y[p + w + 1];
      sum += Math.abs(v);
    }
  }
  return (Math.sqrt(Math.PI / 2) * sum) / (6 * (w - 2) * (h - 2));
}

/** Normalized distance from the full-frame centre (0 centre … 1 corner) for each tile pixel */
function radialMap(w: number, h: number, f: Frame): Float32Array {
  const out = new Float32Array(w * h);
  const cx = (f.fullW - 1) / 2;
  const cy = (f.fullH - 1) / 2;
  const maxD = Math.hypot(cx, cy) || 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = Math.hypot(x + f.ox - cx, y + f.oy - cy) / maxD;
  return out;
}

/** Area-average downscale to at most `longEdge` px (global statistics only) */
function downscalePlanes(data: Uint8ClampedArray, w: number, h: number, longEdge: number): Planes {
  const s = Math.min(1, longEdge / Math.max(w, h));
  if (s >= 1) return planesFrom(data, w, 0, 0, w, h);
  const dw = Math.max(1, Math.round(w * s));
  const dh = Math.max(1, Math.round(h * s));
  const R = new Float32Array(dw * dh);
  const G = new Float32Array(dw * dh);
  const B = new Float32Array(dw * dh);
  const cnt = new Float32Array(dw * dh);
  for (let y = 0; y < h; y++) {
    const ty = Math.min(dh - 1, Math.floor((y * dh) / h));
    for (let x = 0; x < w; x++) {
      const t = ty * dw + Math.min(dw - 1, Math.floor((x * dw) / w));
      const i = (y * w + x) * 4;
      R[t] += data[i];
      G[t] += data[i + 1];
      B[t] += data[i + 2];
      cnt[t]++;
    }
  }
  for (let t = 0; t < R.length; t++) {
    const c = cnt[t] || 1;
    R[t] /= c;
    G[t] /= c;
    B[t] /= c;
  }
  return { w: dw, h: dh, R, G, B };
}

// --- corrections (operate on one tile of planes) -----------------------------------------------

/** Gölge Aç: local lift of dark regions (up to ~+1 EV), local contrast kept; pure black stays black */
function liftShadows(pl: Planes, k: number, scale: number, f: Frame) {
  const { w, h } = pl;
  const Y = luma(pl);
  const base = boxBlur(Y, w, h, rad(f.fullW * scale * 0.02, scale));
  for (let p = 0; p < Y.length; p++) {
    const b = base[p] / 255;
    const wgt = 1 - smoothstep(0.05, 0.5, b);
    if (wgt <= 0) continue;
    const gain = Math.pow(2, k * wgt);
    pl.R[p] *= gain;
    pl.G[p] *= gain;
    pl.B[p] *= gain;
  }
}

/** Parlak Alan Kurtar: compress bright regions; clipped pixels (no information) are left alone */
function recoverHighlights(pl: Planes, k: number, scale: number, f: Frame) {
  const { w, h } = pl;
  const Y = luma(pl);
  const base = boxBlur(Y, w, h, rad(f.fullW * scale * 0.02, scale));
  for (let p = 0; p < Y.length; p++) {
    const b = base[p] / 255;
    const wgt = smoothstep(0.55, 0.95, b);
    if (wgt <= 0) continue;
    const maxC = Math.max(pl.R[p], pl.G[p], pl.B[p]);
    const keep = 1 - smoothstep(245, 254, maxC); // clipped → no information → untouched
    const gain = 1 - 0.3 * k * wgt * keep;
    pl.R[p] *= gain;
    pl.G[p] *= gain;
    pl.B[p] *= gain;
  }
}

/** Atmospheric light: mean colour of the brightest 0.1% of the (min-filtered) dark channel */
function atmosphericLight(pl: Planes, r: number): [number, number, number] {
  const { w, h } = pl;
  const n = w * h;
  const dark = new Float32Array(n);
  for (let p = 0; p < n; p++) dark[p] = Math.min(pl.R[p], pl.G[p], pl.B[p]);
  const dmin = minFilter(dark, w, h, r);
  const hist = new Uint32Array(256);
  for (let p = 0; p < n; p++) hist[Math.min(255, Math.max(0, dmin[p] | 0))]++;
  const want = Math.max(1, Math.floor(n * 0.001));
  let thr = 255;
  for (let acc = 0; thr > 0; thr--) {
    acc += hist[thr];
    if (acc >= want) break;
  }
  let Ar = 0;
  let Ag = 0;
  let Ab = 0;
  let top = 0;
  for (let p = 0; p < n; p++) {
    if (dmin[p] >= thr) {
      Ar += pl.R[p];
      Ag += pl.G[p];
      Ab += pl.B[p];
      top++;
    }
  }
  top = Math.max(1, top);
  return [Math.max(1, Ar / top), Math.max(1, Ag / top), Math.max(1, Ab / top)];
}

/** Pus Gider: dark channel prior (He et al. 2009) with a conservative strength and a soft transmission floor */
function removeHaze(pl: Planes, k: number, scale: number, f: Frame, A: [number, number, number]) {
  const { w, h } = pl;
  const n = w * h;
  const [Ar, Ag, Ab] = A;
  const r = rad(f.fullW * scale * 0.01, scale);
  const norm = new Float32Array(n);
  for (let p = 0; p < n; p++) norm[p] = Math.min(pl.R[p] / Ar, pl.G[p] / Ag, pl.B[p] / Ab);
  const omega = 0.65 * k;
  const tRaw = minFilter(norm, w, h, r);
  for (let p = 0; p < n; p++) tRaw[p] = 1 - omega * tRaw[p];
  const t = boxBlur(tRaw, w, h, r * 2); // smooth: no blocky halos
  for (let p = 0; p < n; p++) {
    const tt = Math.max(0.35, t[p]);
    pl.R[p] = (pl.R[p] - Ar) / tt + Ar;
    pl.G[p] = (pl.G[p] - Ag) / tt + Ag;
    pl.B[p] = (pl.B[p] - Ab) / tt + Ab;
  }
}

/**
 * Noise Azalt: chroma noise (strong, blurred colour difference) and luma noise (Lee filter, edge-aware)
 * handled separately; 25% of the original luma detail is kept so it never looks plastic.
 */
function reduceNoise(pl: Planes, k: number, scale: number, sigma: number) {
  const { w, h } = pl;
  const n = w * h;
  const Y = luma(pl);
  const cmix = Math.min(1, k * 1.2);
  const rc = rad(1 + 3 * k, scale);
  // chroma: reuse arrays to keep memory low on big exports
  const C = new Float32Array(n);
  for (let p = 0; p < n; p++) C[p] = pl.B[p] - Y[p];
  const Cb2 = boxBlur(C, w, h, rc);
  for (let p = 0; p < n; p++) Cb2[p] = C[p] + (Cb2[p] - C[p]) * cmix;
  for (let p = 0; p < n; p++) C[p] = pl.R[p] - Y[p];
  const Cr2 = boxBlur(C, w, h, rc);
  for (let p = 0; p < n; p++) Cr2[p] = C[p] + (Cr2[p] - C[p]) * cmix;

  const nv = (Math.max(1, sigma) * (0.6 + 1.6 * k)) ** 2;
  const rl = rad(1.5, scale);
  const mean = boxBlur(Y, w, h, rl);
  for (let p = 0; p < n; p++) C[p] = Y[p] * Y[p];
  const meanSq = boxBlur(C, w, h, rl);

  for (let p = 0; p < n; p++) {
    const v = Math.max(0, meanSq[p] - mean[p] * mean[p]);
    const gain = v / (v + nv);
    const yLee = mean[p] + gain * (Y[p] - mean[p]);
    const y2 = yLee + 0.25 * (Y[p] - yLee);
    const R = y2 + Cr2[p];
    const B = y2 + Cb2[p];
    pl.R[p] = R;
    pl.B[p] = B;
    pl.G[p] = (y2 - 0.299 * R - 0.114 * B) / 0.587;
  }
}

/**
 * Kenar Renk Düzelt gains: per channel, ring means are compared with the centre (bin 0, r < 0.3);
 * only brightening (gain 1–1.8), monotone outward like a lens falloff. Corrects; never adds a vignette.
 */
export function edgeColorGains(pl: Planes): { bins: number; gains: [Float32Array, Float32Array, Float32Array] } {
  const { w, h } = pl;
  const BINS = 8;
  const rmap = radialMap(w, h, { fullW: w, fullH: h, ox: 0, oy: 0 });
  const sums = [new Float64Array(BINS + 1), new Float64Array(BINS + 1), new Float64Array(BINS + 1)];
  const counts = new Float64Array(BINS + 1);
  for (let p = 0; p < rmap.length; p++) {
    const r = rmap[p];
    const b = r < 0.3 ? 0 : Math.min(BINS, 1 + Math.floor(((r - 0.3) / 0.7) * BINS));
    sums[0][b] += pl.R[p];
    sums[1][b] += pl.G[p];
    sums[2][b] += pl.B[p];
    counts[b]++;
  }
  const gains = [0, 1, 2].map((c) => {
    const g = new Float32Array(BINS + 1);
    const center = sums[c][0] / Math.max(1, counts[0]);
    g[0] = 1;
    for (let b = 1; b <= BINS; b++) {
      const ring = sums[c][b] / Math.max(1, counts[b]);
      g[b] = ring > 1 && counts[b] > 0 ? Math.min(1.8, Math.max(1, center / ring)) : 1;
    }
    for (let b = 2; b <= BINS; b++) g[b] = Math.max(g[b], g[b - 1]);
    return g;
  }) as [Float32Array, Float32Array, Float32Array];
  return { bins: BINS, gains };
}

function correctEdgeColor(pl: Planes, k: number, f: Frame, eg: Globals['edgeGains']) {
  const { w, h } = pl;
  const { bins, gains } = eg;
  const rmap = radialMap(w, h, f);
  const planes = [pl.R, pl.G, pl.B];
  for (let p = 0; p < rmap.length; p++) {
    const r = rmap[p];
    if (r < 0.3) continue;
    const fb = ((r - 0.3) / 0.7) * bins;
    const lo = Math.min(bins, Math.max(1, Math.floor(fb + 0.5)));
    const hi = Math.min(bins, lo + 1);
    const t = clamp01(fb + 0.5 - lo);
    const ramp = smoothstep(0.3, 0.45, r);
    for (let c = 0; c < 3; c++) {
      const g = gains[c][lo] + (gains[c][hi] - gains[c][lo]) * t;
      planes[c][p] *= 1 + k * ramp * (g - 1);
    }
  }
}

/**
 * Kenar Netliği: unsharp mask on luminance, stronger away from the centre (lens corners are softer),
 * overshoot clamped to the 3×3 neighbourhood range so no halo appears; tiny differences (noise) are damped.
 */
function sharpenEdges(pl: Planes, k: number, scale: number, f: Frame) {
  const { w, h } = pl;
  const Y = luma(pl);
  const blur = boxBlur(Y, w, h, rad(1.5, scale));
  const rmap = radialMap(w, h, f);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const detail = Y[p] - blur[p];
      const damp = smoothstep(1.5, 4, Math.abs(detail));
      const amount = k * 1.0 * (0.3 + 0.7 * smoothstep(0.25, 0.95, rmap[p])) * damp;
      if (amount <= 0) continue;
      let lo = Y[p];
      let hi = Y[p];
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const v = Y[yy * w + Math.min(w - 1, Math.max(0, x + dx))];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      const d = Math.min(hi, Math.max(lo, Y[p] + amount * detail)) - Y[p];
      pl.R[p] += d;
      pl.G[p] += d;
      pl.B[p] += d;
    }
  }
}

/** Above this many pixels the image is processed in overlapping tiles (memory on phones) */
export const CORRECTION_TILE_PIXELS = 2_500_000;

function computeGlobals(img: ImageData, p: CorrectionParams, scale: number): Globals {
  const small = downscalePlanes(img.data, img.width, img.height, 768);
  // Noise is measured at full resolution on a centre crop (downscaling would average it away)
  const cw = Math.min(img.width, 512);
  const ch = Math.min(img.height, 512);
  const crop = planesFrom(img.data, img.width, Math.floor((img.width - cw) / 2), Math.floor((img.height - ch) / 2), cw, ch);
  const sigma = effectiveNoiseStrength(p) > 0 ? estimateNoiseSigma(luma(crop), cw, ch) : 0;
  const smallScale = (img.width * scale) / small.w;
  const atmosphere: [number, number, number] =
    p.dehaze.on && p.dehaze.strength > 0 ? atmosphericLight(small, rad(img.width * scale * 0.01, smallScale)) : [255, 255, 255];
  const edgeGains = p.edgeColor.on && p.edgeColor.strength > 0 ? edgeColorGains(small) : { bins: 8, gains: [new Float32Array(9).fill(1), new Float32Array(9).fill(1), new Float32Array(9).fill(1)] as [Float32Array, Float32Array, Float32Array] };
  return { sigma, atmosphere, edgeGains };
}

function processTile(pl: Planes, p: CorrectionParams, scale: number, f: Frame, g: Globals) {
  const k = (id: CorrectionId) => (p[id].on ? clamp01(p[id].strength / 100) : 0);
  if (k('shadows') > 0) liftShadows(pl, k('shadows'), scale, f);
  if (k('highlights') > 0) recoverHighlights(pl, k('highlights'), scale, f);
  if (k('dehaze') > 0) removeHaze(pl, k('dehaze'), scale, f, g.atmosphere);
  const kn = effectiveNoiseStrength(p) / 100;
  if (kn > 0) reduceNoise(pl, kn, scale, g.sigma);
  if (k('edgeColor') > 0) correctEdgeColor(pl, k('edgeColor'), f, g.edgeGains);
  if (k('edgeSharp') > 0) sharpenEdges(pl, k('edgeSharp'), scale, f);
}

/**
 * Applies the active corrections in the fixed order, in place. `scale` = export pixels per render pixel
 * (1 for export; e.g. 2 for a half-size preview). Same function for preview and export. Large images are
 * processed in tiles with a margin wider than every filter chain, sharing whole-image measurements.
 */
export function applyCorrections(
  img: ImageData,
  params: CorrectionParams | null | undefined,
  scale = 1,
  tilePixels = CORRECTION_TILE_PIXELS,
): ImageData {
  if (!correctionsActive(params)) return img;
  const p = params!;
  const W = img.width;
  const H = img.height;
  const g = computeGlobals(img, p, scale);
  const frame0: Frame = { fullW: W, fullH: H, ox: 0, oy: 0 };

  if (W * H <= tilePixels) {
    const pl = planesFrom(img.data, W, 0, 0, W, H);
    processTile(pl, p, scale, frame0, g);
    writeTile(img, pl, 0, 0, 0, 0, W, H);
    return img;
  }

  // Margin: shadows/highlights base (2%) + haze (min r + blur 2r ≈ 3%) + noise/sharpen (few px)
  const margin = Math.ceil(W * 0.06) + rad(8, scale);
  const core = Math.max(256, Math.floor(Math.sqrt(tilePixels)) - 2 * margin);
  const src = new Uint8ClampedArray(img.data); // tiles read the unprocessed image
  for (let ty = 0; ty < H; ty += core) {
    for (let tx = 0; tx < W; tx += core) {
      const x0 = Math.max(0, tx - margin);
      const y0 = Math.max(0, ty - margin);
      const x1 = Math.min(W, tx + core + margin);
      const y1 = Math.min(H, ty + core + margin);
      const pl = planesFrom(src, W, x0, y0, x1 - x0, y1 - y0);
      processTile(pl, p, scale, { fullW: W, fullH: H, ox: x0, oy: y0 }, g);
      writeTile(img, pl, x0, y0, tx, ty, Math.min(W, tx + core), Math.min(H, ty + core));
    }
  }
  return img;
}

/** Writes the tile's core [cx0,cx1)×[cy0,cy1) (image coords) from planes positioned at (x0, y0) */
function writeTile(img: ImageData, pl: Planes, x0: number, y0: number, cx0: number, cy0: number, cx1: number, cy1: number) {
  const d = img.data;
  for (let y = cy0; y < cy1; y++) {
    let i = (y * img.width + cx0) * 4;
    let p = (y - y0) * pl.w + (cx0 - x0);
    for (let x = cx0; x < cx1; x++, i += 4, p++) {
      d[i] = put8(pl.R[p]);
      d[i + 1] = put8(pl.G[p]);
      d[i + 2] = put8(pl.B[p]);
    }
  }
}

// --- Otomatik: statistics → suggested rows (not AI) -----------------------------------------------

export interface CorrectionStats {
  noiseSigma: number;
  meanLuma: number;
  darkShare: number;
  brightShare: number;
  clippedShare: number;
  hazeLevel: number;
  edgeFalloff: number;
  /** max/min of the four corner means (1 = lens-like even falloff; large = content) */
  cornerSpread: number;
  edgeSoftness: number;
  /** 5th / 95th luminance percentile (0–1) */
  p5: number;
  p95: number;
}

export function measureCorrections(img: ImageData): CorrectionStats {
  const pl = planesFrom(img.data, img.width, 0, 0, img.width, img.height);
  const { w, h } = pl;
  const n = w * h;
  const Y = luma(pl);
  let sum = 0;
  let dark = 0;
  let bright = 0;
  let clipped = 0;
  let darkCh = 0;
  const hist = new Uint32Array(256);
  for (let p = 0; p < n; p++) {
    const y = Y[p];
    sum += y;
    hist[Math.min(255, y | 0)]++;
    if (y < 0.12 * 255) dark++;
    if (y > 0.85 * 255 && y < 0.98 * 255) bright++;
    if (Math.max(pl.R[p], pl.G[p], pl.B[p]) >= 254) clipped++;
    darkCh += Math.min(pl.R[p], pl.G[p], pl.B[p]);
  }
  const meanLuma = sum / n / 255;
  const pct = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= q * n) return v / 255;
    }
    return 1;
  };

  // contrast (std of luma) for haze: hazy = bright dark channel + low contrast
  let varSum = 0;
  for (let p = 0; p < n; p++) varSum += (Y[p] / 255 - meanLuma) ** 2;
  const std = Math.sqrt(varSum / n);
  const darkMean = darkCh / n / 255;
  // a hazy frame has a bright dark channel (everything lifted towards the haze colour) and low contrast
  const hazeLevel = clamp01((darkMean - 0.38) / 0.25) * clamp01((0.2 - std) / 0.1);

  // edge falloff: corner ring vs centre luminance, and how even it is across the four corners
  const { gains } = edgeColorGains(pl);
  const edgeFalloff = (gains[0][8] + gains[1][8] + gains[2][8]) / 3 - 1;
  const cw = Math.max(1, Math.round(w * 0.12));
  const chh = Math.max(1, Math.round(h * 0.12));
  const corner = (x0: number, y0: number) => {
    let s2 = 0;
    for (let y = y0; y < y0 + chh; y++) for (let x = x0; x < x0 + cw; x++) s2 += Y[y * w + x];
    return s2 / (cw * chh) + 1;
  };
  const corners = [corner(0, 0), corner(w - cw, 0), corner(0, h - chh), corner(w - cw, h - chh)];
  const cornerSpread = Math.max(...corners) / Math.min(...corners);

  // softness: gradient energy outer ring vs centre (≥ 0: outer softer)
  const rmap = radialMap(w, h, { fullW: w, fullH: h, ox: 0, oy: 0 });
  let gc = 0;
  let nc = 0;
  let ge = 0;
  let ne = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const g = Math.abs(Y[p + 1] - Y[p - 1]) + Math.abs(Y[p + w] - Y[p - w]);
      if (rmap[p] < 0.35) {
        gc += g;
        nc++;
      } else if (rmap[p] > 0.7) {
        ge += g;
        ne++;
      }
    }
  }
  const centerG = gc / Math.max(1, nc);
  const edgeG = ge / Math.max(1, ne);
  const edgeSoftness = centerG > 2 ? clamp01(1 - edgeG / centerG) : 0;

  return {
    noiseSigma: estimateNoiseSigma(Y, w, h),
    meanLuma,
    darkShare: dark / n,
    brightShare: bright / n,
    clippedShare: clipped / n,
    hazeLevel,
    edgeFalloff,
    cornerSpread,
    edgeSoftness,
    p5: pct(0.05),
    p95: pct(0.95),
  };
}

const strengthFrom = (x: number, lo: number, hi: number, min = 20, max = 60) =>
  Math.round(min + (max - min) * clamp01((x - lo) / (hi - lo)));

/**
 * Otomatik: conservative on purpose (natural, never a "look"). Turns a row on only when the statistics are
 * unambiguous, and keeps suggested strengths moderate:
 * - Kenar Renk: all four corners darker by a similar amount (lens falloff), not a dark corner of the scene.
 * - Gölge Aç: dark, low-key frames, but not backlit/silhouette frames (bright areas present) — those stay dark.
 * - Kenar Netliği: only a clear centre-sharp / edges-soft difference; capped (edges may be soft on purpose).
 */
export function suggestCorrections(s: CorrectionStats): CorrectionParams {
  const row = (on: boolean, strength: number): CorrectionRow => ({ on, strength: on ? strength : MANUAL_STRENGTH });
  const veryDark = s.meanLuma < 0.08;
  const backlit = s.p95 > 0.8 && s.p5 < 0.08; // silhouette / strong contrast: keep the shadows deep
  const lensFalloff = s.edgeFalloff > 0.18 && s.cornerSpread < 1.35;
  return {
    noise: row(s.noiseSigma > 2.2, strengthFrom(s.noiseSigma, 2.2, 8, 25, 70)),
    edgeSharp: row(s.edgeSoftness > 0.55 && s.noiseSigma < 4, strengthFrom(s.edgeSoftness, 0.55, 0.85, 20, 40)),
    edgeColor: row(lensFalloff, strengthFrom(s.edgeFalloff, 0.18, 0.5, 25, 45)),
    // very dark frames: limited lift (spec: "Çok karanlık karelerde sınırlıdır")
    shadows: row(s.darkShare > 0.35 && s.meanLuma < 0.3 && !backlit, veryDark ? 30 : strengthFrom(s.darkShare, 0.35, 0.7, 20, 45)),
    highlights: row(s.brightShare > 0.12 && s.clippedShare < 0.2, strengthFrom(s.brightShare, 0.12, 0.35, 20, 50)),
    dehaze: row(s.hazeLevel > 0.3, strengthFrom(s.hazeLevel, 0.3, 0.9, 20, 50)),
  };
}
