// Küçültülmüş kareden (≈160 px) yalnız sayılar: parlaklık, renk oranı, histogram özeti, keskinlik.
// Görüntü saklanmaz; luma ızgarası yalnız bellekte kare farkı için tutulur ve rapora yazılmaz.
import { round } from './schema';

export interface FrameStats {
  /** Ortalama luma 0–255 (Rec. 601) */
  parlaklık: number;
  r: number;
  g: number;
  b: number;
  /** R/G ve B/G (beyaz dengesi göstergesi) */
  rOran: number;
  bOran: number;
  /** Ortalama mutlak Laplace (odak göstergesi) */
  keskinlik: number;
  /** Sol-üst ve sağ-alt çeyreklerin ortalama lumasi */
  solÜst: number;
  sağAlt: number;
  p5: number;
  p50: number;
  p95: number;
  /** luma < 16 ve > 239 piksel yüzdesi */
  karanlıkYüzde: number;
  patlakYüzde: number;
}

export interface FrameSample {
  stats: FrameStats;
  luma: Uint8Array;
  w: number;
  h: number;
}

/** RGBA tampondan istatistik (saf fonksiyon, Vitest ile sınanır) */
export function frameStats(data: Uint8ClampedArray | Uint8Array, w: number, h: number): FrameSample {
  const n = w * h;
  const luma = new Uint8Array(n);
  const hist = new Uint32Array(256);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sl = 0;
  let tl = 0;
  let tlN = 0;
  let br = 0;
  let brN = 0;
  const hw = w >> 1;
  const hh = h >> 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      luma[i] = l;
      hist[l]++;
      sr += r;
      sg += g;
      sb += b;
      sl += l;
      if (x < hw && y < hh) {
        tl += l;
        tlN++;
      } else if (x >= w - hw && y >= h - hh) {
        br += l;
        brN++;
      }
    }
  }
  const pct = (q: number) => {
    const target = q * n;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= target) return v;
    }
    return 255;
  };
  let dark = 0;
  let clip = 0;
  for (let v = 0; v < 16; v++) dark += hist[v];
  for (let v = 240; v < 256; v++) clip += hist[v];

  let lap = 0;
  let lapN = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      lap += Math.abs(4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w]);
      lapN++;
    }
  }
  const mr = sr / n;
  const mg = sg / n;
  const mb = sb / n;
  const safeG = Math.max(mg, 1);
  return {
    stats: {
      parlaklık: round(sl / n),
      r: round(mr),
      g: round(mg),
      b: round(mb),
      rOran: round(mr / safeG, 3),
      bOran: round(mb / safeG, 3),
      keskinlik: round(lapN ? lap / lapN : 0, 3),
      solÜst: round(tlN ? tl / tlN : 0),
      sağAlt: round(brN ? br / brN : 0),
      p5: pct(0.05),
      p50: pct(0.5),
      p95: pct(0.95),
      karanlıkYüzde: round((dark / n) * 100, 1),
      patlakYüzde: round((clip / n) * 100, 1),
    },
    luma,
    w,
    h,
  };
}

/** İki luma ızgarası arasındaki ortalama mutlak fark (aynı boyut değilse NaN) */
export function lumaDiff(a: FrameSample, b: FrameSample): number {
  if (a.w !== b.w || a.h !== b.h) return NaN;
  let s = 0;
  for (let i = 0; i < a.luma.length; i++) s += Math.abs(a.luma[i] - b.luma[i]);
  return round(s / a.luma.length);
}

/** Birden çok örneğin ortalaması (gürültüyü azaltmak için) */
export function meanStats(list: FrameStats[]): FrameStats {
  const keys = Object.keys(list[0]) as (keyof FrameStats)[];
  const out = {} as FrameStats;
  for (const k of keys) out[k] = round(list.reduce((a, s) => a + s[k], 0) / list.length, 3);
  return out;
}

/** Renk sıcaklığı (K) → sRGB bayt (Tanner Helland yaklaşımı, 1000–40000 K). Dolgu ışığı için. */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)];
}
