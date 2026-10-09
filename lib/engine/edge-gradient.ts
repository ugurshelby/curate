/**
 * Smart edge gradient for Çerçeve (frame) and Story backgrounds (owner decision D33, 2026-10-08).
 *
 * The background is built from the photo's EDGE colours, not its average: the end nearest to each photo edge takes
 * that edge's dominant colour, the middle takes the dominant colour of the photo's centre, and the colours are
 * blended in OKLab with an eased, dithered ramp (iOS-like, no banding, saturation kept).
 *
 * One code path for preview and export: `edgeGradientPixels` is a pure function of (W, H, spec); both the live
 * preview and the export call `paintEdgeGradient`. Frame and Story share it.
 */

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export interface EdgeColors {
  top: Lab;
  bottom: Lab;
  left: Lab;
  right: Lab;
  center: Lab;
}

export type GradientAxis = 'horizontal' | 'vertical';

/** start = left or top end, end = right or bottom end */
export interface EdgeGradientSpec {
  axis: GradientAxis;
  start: Lab;
  center: Lab;
  end: Lab;
}

/** Outer band of each edge that is sampled (fraction of the short side, corners included) */
export const EDGE_BAND = 0.06;
/** Centre box (fraction of width and height) sampled for the middle colour */
export const CENTER_BOX = 0.4;
/** Lightness limits: no near-black or blown-out band (OKLab L 0..1) */
export const EDGE_L_MIN = 0.15;
export const EDGE_L_MAX = 0.95;
/** Number of positions reported by `gradientStops` (≥ 5 required) */
export const GRADIENT_STOPS = 9;
/** At most this many pixels are read per sampled region (stride sampling) */
const MAX_SAMPLES_PER_REGION = 6000;

// --- OKLab (Björn Ottosson) ---

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055;
  return c * 255;
};

export function srgbToOklab(r: number, g: number, b: number): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Float sRGB 0..255 (clamped, not rounded) */
export function oklabToSrgbFloat(c: Lab): [number, number, number] {
  const l = (c.L + 0.3963377774 * c.a + 0.2158037573 * c.b) ** 3;
  const m = (c.L - 0.1055613458 * c.a - 0.0638541728 * c.b) ** 3;
  const s = (c.L - 0.0894841775 * c.a - 1.291485548 * c.b) ** 3;
  const clamp = (v: number) => Math.min(255, Math.max(0, fromLinear(v)));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function labToHex(c: Lab): string {
  const [r, g, b] = oklabToSrgbFloat(c).map((v) => Math.round(v));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToLab(hex: string): Lab {
  const h = hex.replace('#', '');
  return srgbToOklab(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/** Euclidean distance in OKLab (≈ 0.02 is just noticeable, 0.2 is a clearly different colour) */
export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

export const chroma = (c: Lab) => Math.hypot(c.a, c.b);

function clampLightness(c: Lab): Lab {
  return { L: Math.min(EDGE_L_MAX, Math.max(EDGE_L_MIN, c.L)), a: c.a, b: c.b };
}

// --- Dominant colour ---

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const L_BIN = 0.08;
const AB_BIN = 0.04;

/**
 * Dominant colour of a region: the fullest OKLab bin, not the mean (a mean of blue and orange pixels is grey).
 * More saturated bins get up to about twice the weight, so a coloured edge beats a small grey patch.
 */
export function dominantColor(data: Uint8ClampedArray | Uint8Array, width: number, region: Region): Lab {
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const w = Math.max(1, Math.floor(region.w));
  const h = Math.max(1, Math.floor(region.h));
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / MAX_SAMPLES_PER_REGION)));
  const bins = new Map<number, { weight: number; L: number; a: number; b: number; n: number }>();
  for (let y = y0; y < y0 + h; y += stride) {
    for (let x = x0; x < x0 + w; x += stride) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const lab = srgbToOklab(data[i], data[i + 1], data[i + 2]);
      const key = (Math.floor(lab.L / L_BIN) * 64 + Math.floor((lab.a + 0.5) / AB_BIN)) * 64 + Math.floor((lab.b + 0.5) / AB_BIN);
      const weight = 1 + 4 * Math.min(0.25, chroma(lab));
      const e = bins.get(key);
      if (e) {
        e.weight += weight;
        e.L += lab.L;
        e.a += lab.a;
        e.b += lab.b;
        e.n++;
      } else bins.set(key, { weight, L: lab.L, a: lab.a, b: lab.b, n: 1 });
    }
  }
  let best: { weight: number; L: number; a: number; b: number; n: number } | null = null;
  for (const e of bins.values()) if (!best || e.weight > best.weight) best = e;
  return best ? { L: best.L / best.n, a: best.a / best.n, b: best.b / best.n } : { L: 0, a: 0, b: 0 };
}

/**
 * Edge and centre colours of an image (or of `crop`, the part of it that is actually visible next to the frame).
 * Bands are the outer 6 % of the short side; the centre is the middle 40 %.
 */
export function extractEdgeColors(image: ImageData, crop?: Region): EdgeColors {
  const { width, height, data } = image;
  const c: Region = crop ?? { x: 0, y: 0, w: width, h: height };
  const band = Math.max(1, Math.round(Math.min(c.w, c.h) * EDGE_BAND));
  const lab = (r: Region) => clampLightness(dominantColor(data, width, r));
  return {
    top: lab({ x: c.x, y: c.y, w: c.w, h: band }),
    bottom: lab({ x: c.x, y: c.y + c.h - band, w: c.w, h: band }),
    left: lab({ x: c.x, y: c.y, w: band, h: c.h }),
    right: lab({ x: c.x + c.w - band, y: c.y, w: band, h: c.h }),
    center: lab({ x: c.x + c.w * ((1 - CENTER_BOX) / 2), y: c.y + c.h * ((1 - CENTER_BOX) / 2), w: c.w * CENTER_BOX, h: c.h * CENTER_BOX }),
  };
}

// --- Axis and spec ---

/**
 * Gradient direction. If one direction has clearly more free space (≥ 25 % more), the gradient runs along it
 * ("empty space direction"); otherwise it follows the pair of opposite edges that differ most in colour.
 * `margins` = total empty space in px to the left+right (x) and above+below (y) of the photo.
 */
export function chooseGradientAxis(colors: EdgeColors, margins?: { x: number; y: number }): GradientAxis {
  if (margins) {
    if (margins.y > margins.x * 1.25) return 'vertical';
    if (margins.x > margins.y * 1.25) return 'horizontal';
  }
  return deltaE(colors.left, colors.right) > deltaE(colors.top, colors.bottom) ? 'horizontal' : 'vertical';
}

export function buildEdgeGradient(colors: EdgeColors, axis: GradientAxis): EdgeGradientSpec {
  return axis === 'horizontal'
    ? { axis, start: colors.left, center: colors.center, end: colors.right }
    : { axis, start: colors.top, center: colors.center, end: colors.bottom };
}

/** Two-colour fallback (no photo yet): same code path, centre halfway */
export function simpleGradientSpec(startHex: string, endHex: string, axis: GradientAxis = 'vertical'): EdgeGradientSpec {
  const start = hexToLab(startHex);
  const end = hexToLab(endHex);
  return { axis, start, end, center: { L: (start.L + end.L) / 2, a: (start.a + end.a) / 2, b: (start.b + end.b) / 2 } };
}

// --- Ramp ---

/** Ease: half smoothstep, half linear (soft ends without a long flat plateau) */
function ease(t: number): number {
  return 0.5 * t + 0.5 * t * t * (3 - 2 * t);
}

const mix = (a: Lab, b: Lab, t: number): Lab => ({ L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t });

/** Colour at position p ∈ [0,1] along the axis: start → centre → end, each half eased */
export function gradientColorAt(spec: EdgeGradientSpec, p: number): Lab {
  return p <= 0.5 ? mix(spec.start, spec.center, ease(p / 0.5)) : mix(spec.center, spec.end, ease((p - 0.5) / 0.5));
}

/** Evenly spaced stops (≥ 5) for inspection and tests; the painter evaluates the same function per pixel */
export function gradientStops(spec: EdgeGradientSpec, count = GRADIENT_STOPS): { pos: number; color: Lab }[] {
  const n = Math.max(5, count);
  return Array.from({ length: n }, (_, i) => ({ pos: i / (n - 1), color: gradientColorAt(spec, i / (n - 1)) }));
}

const rampCache = new Map<string, Float32Array>();

/** sRGB float ramp, `length` samples along the axis (cached: preview redraws reuse it) */
function ramp(spec: EdgeGradientSpec, length: number): Float32Array {
  const key = [spec.axis, length, ...[spec.start, spec.center, spec.end].map((c) => `${c.L.toFixed(4)},${c.a.toFixed(4)},${c.b.toFixed(4)}`)].join('|');
  const hit = rampCache.get(key);
  if (hit) return hit;
  const out = new Float32Array(length * 3);
  for (let i = 0; i < length; i++) {
    const [r, g, b] = oklabToSrgbFloat(gradientColorAt(spec, length === 1 ? 0.5 : i / (length - 1)));
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  if (rampCache.size >= 6) rampCache.delete(rampCache.keys().next().value as string);
  rampCache.set(key, out);
  return out;
}

/** Triangular dither in [-1, 1] LSB from a coordinate hash: deterministic, so preview and export agree */
function dither(x: number, y: number, c: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(c + 1, 2147483629);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h & 0xffff) + ((h >>> 16) & 0xffff)) / 65536 - 1;
}

/** RGBA pixels of the gradient at W×H (opaque). Pure: same inputs → same bytes. */
export function edgeGradientPixels(W: number, H: number, spec: EdgeGradientSpec): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H * 4);
  const horizontal = spec.axis === 'horizontal';
  const r = ramp(spec, horizontal ? W : H);
  let o = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = (horizontal ? x : y) * 3;
      out[o] = Math.round(r[k] + dither(x, y, 0));
      out[o + 1] = Math.round(r[k + 1] + dither(x, y, 1));
      out[o + 2] = Math.round(r[k + 2] + dither(x, y, 2));
      out[o + 3] = 255;
      o += 4;
    }
  }
  return out;
}

type PaintTarget = {
  createImageData?(w: number, h: number): ImageData;
  putImageData(data: ImageData, dx: number, dy: number): void;
};

/** Paints the gradient over the whole W×H canvas (the one function used by preview and export) */
export function paintEdgeGradient(ctx: PaintTarget, W: number, H: number, spec: EdgeGradientSpec): void {
  const pixels = edgeGradientPixels(W, H, spec);
  const img = ctx.createImageData ? ctx.createImageData(W, H) : ({ width: W, height: H, data: new Uint8ClampedArray(W * H * 4), colorSpace: 'srgb' } as ImageData);
  img.data.set(pixels);
  ctx.putImageData(img, 0, 0);
}

/** Small copy of a photo (long edge ≤ maxEdge) used for edge sampling; cheap to keep and to re-sample */
export function sampleSize(width: number, height: number, maxEdge = 256): { width: number; height: number } {
  const s = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}
