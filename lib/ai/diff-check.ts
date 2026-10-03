/**
 * Hafif "buraya dikkatli bak" işareti (sahip onayı, AI1 öneri 6). KESİN TESPİT DEĞİL:
 * yanlış alarm (ör. D görevi parlak alanları bilerek değiştirir) ve kaçırma olabilir.
 * İki görsel aynı küçük boyutta (uzun kenar ~256) gelir; genel parlaklık/renk farkı kanal başına
 * ortalama ve sapma eşlenerek çıkarılır, sonra 32×32 bloklarda yerel fark ölçülür.
 */

export interface PixelsLike {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface SuspectRegion {
  /** 0..1 göreli dikdörtgen */
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

export const DIFF_SIDE = 256;
export const DIFF_BLOCK = 32;
/** Blok skoru en az bu kadar sapma (z) ile ayrışmalı */
export const DIFF_Z = 3;
/** ...ve mutlak olarak en az bu kadar (0..255 ölçeğinde ortalama mutlak fark) */
export const DIFF_FLOOR = 18;

/** Karşılaştırma boyutu: uzun kenar 256 */
export function diffSize(width: number, height: number): { width: number; height: number } {
  const s = DIFF_SIDE / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}

function channelStats(p: PixelsLike) {
  const n = p.width * p.height;
  const mean = [0, 0, 0];
  const sq = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      const v = p.data[i * 4 + c];
      mean[c] += v;
      sq[c] += v * v;
    }
  }
  const std = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    mean[c] /= n;
    std[c] = Math.sqrt(Math.max(1e-6, sq[c] / n - mean[c] * mean[c]));
  }
  return { mean, std };
}

/** En şüpheli tek bölge; eşik geçilmezse null */
export function findSuspectRegion(original: PixelsLike, result: PixelsLike): SuspectRegion | null {
  if (original.width !== result.width || original.height !== result.height) {
    throw new Error('Boyutlar eşit olmalı');
  }
  const { width: W, height: H } = original;
  const a = channelStats(original);
  const b = channelStats(result);

  const bx = Math.ceil(W / DIFF_BLOCK);
  const by = Math.ceil(H / DIFF_BLOCK);
  const sum = new Float64Array(bx * by);
  const cnt = new Float64Array(bx * by);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let d = 0;
      for (let c = 0; c < 3; c++) {
        // Sonucu orijinalin genel tonuna eşle: (v - μb) / σb · σa + μa
        const norm = ((result.data[i + c] - b.mean[c]) / b.std[c]) * a.std[c] + a.mean[c];
        d += Math.abs(norm - original.data[i + c]);
      }
      const k = Math.floor(y / DIFF_BLOCK) * bx + Math.floor(x / DIFF_BLOCK);
      sum[k] += d / 3;
      cnt[k] += 1;
    }
  }

  const scores = Array.from(sum, (s, k) => s / Math.max(1, cnt[k]));
  if (scores.length < 4) return null;
  let best = 0;
  for (let k = 1; k < scores.length; k++) if (scores[k] > scores[best]) best = k;
  // Ortalama ve sapma en yüksek blok hariç: tek bir aykırı blok kendi eşiğini yükseltmesin
  const rest = scores.filter((_, k) => k !== best);
  const mean = rest.reduce((s, v) => s + v, 0) / rest.length;
  const std = Math.sqrt(rest.reduce((s, v) => s + (v - mean) * (v - mean), 0) / rest.length);
  const top = scores[best];
  if (top < DIFF_FLOOR || top < mean + DIFF_Z * Math.max(std, 1)) return null;

  const gx = best % bx;
  const gy = Math.floor(best / bx);
  const x0 = gx * DIFF_BLOCK;
  const y0 = gy * DIFF_BLOCK;
  return {
    x: x0 / W,
    y: y0 / H,
    w: Math.min(DIFF_BLOCK, W - x0) / W,
    h: Math.min(DIFF_BLOCK, H - y0) / H,
    score: top,
  };
}

/** Tarayıcı: iki görseli aynı küçük boyuta çizip karşılaştırır */
export function suspectRegionFromImages(
  original: CanvasImageSource,
  result: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
): SuspectRegion | null {
  const { width, height } = diffSize(result.naturalWidth, result.naturalHeight);
  const read = (img: CanvasImageSource): ImageData | null => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  };
  const a = read(original);
  const b = read(result);
  return a && b ? findSuspectRegion(a, b) : null;
}
