/**
 * Akıllı Otomatik (Faz 5, owner brief §8.4): classifies the scene from histogram / colour statistics and
 * suggests a preset and an amount. No AI, no network; deterministic. Runs on a small copy (≤ 256 px).
 */

export type SceneKind =
  | 'night'
  | 'silhouette'
  | 'golden'
  | 'blue_hour'
  | 'harsh_sun'
  | 'portrait'
  | 'flat'
  | 'bw'
  | 'everyday';

export interface SceneStats {
  meanLuma: number;
  p5: number;
  /** 25th percentile: how much of the frame is in deep shadow */
  p25: number;
  p95: number;
  /** 99th percentile: bright light sources in a dark frame */
  p99: number;
  /** mean (R − B) / 255, positive = warm */
  warmth: number;
  /** mean HSV saturation */
  saturation: number;
  /** share of skin-like pixels */
  skinShare: number;
  /** share of clipped highlights */
  clipped: number;
}

export interface SceneSuggestion {
  scene: SceneKind;
  presetId: string;
  /** 0–1 ("Miktar") */
  amount: number;
}

export function measureScene(img: { width: number; height: number; data: Uint8ClampedArray }): SceneStats {
  const d = img.data;
  const n = img.width * img.height;
  const hist = new Uint32Array(256);
  let lum = 0;
  let warm = 0;
  let sat = 0;
  let skin = 0;
  let clipped = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum += y;
    hist[y | 0]++;
    warm += r - b;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const s = mx > 0 ? (mx - mn) / mx : 0;
    sat += s;
    // skin: warm order, moderate saturation, mid brightness, green and blue in the skin band relative to red
    // (golden-hour orange has much less blue, b/r < 0.45)
    if (r > g && g > b && s > 0.15 && s < 0.6 && y > 60 && y < 230 && g > 0.6 * r && g < 0.88 * r && b > 0.45 * r && b < 0.85 * r) skin++;
    if (mx >= 254) clipped++;
  }
  const pct = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= q * n) return v / 255;
    }
    return 1;
  };
  return {
    meanLuma: lum / n / 255,
    p5: pct(0.05),
    p25: pct(0.25),
    p95: pct(0.95),
    p99: pct(0.99),
    warmth: warm / n / 255,
    saturation: sat / n,
    skinShare: skin / n,
    clipped: clipped / n,
  };
}

/** Rules are ordered from most to least specific; first match wins */
export function suggestScene(s: SceneStats): SceneSuggestion {
  if (s.saturation < 0.04) return { scene: 'bw', presetId: 'siyah_beyaz', amount: 0.8 };
  // night: dark frame with real light sources
  if (s.meanLuma < 0.2 && s.p99 > 0.85) return { scene: 'night', presetId: 'gece', amount: 0.8 };
  // silhouette: a quarter of the frame near black against a bright background
  if (s.p5 < 0.04 && s.p25 < 0.1 && s.p95 > 0.82 && s.meanLuma < 0.35) return { scene: 'silhouette', presetId: 'warm_silhouette', amount: 0.6 };
  if (s.skinShare > 0.12) return { scene: 'portrait', presetId: 'portre', amount: 0.8 };
  // golden hour: strongly warm; already very saturated frames get a lighter touch
  if (s.warmth > 0.2 && s.meanLuma > 0.15) return { scene: 'golden', presetId: 'altin_saat', amount: s.saturation > 0.7 ? 0.5 : 0.7 };
  if (s.warmth < -0.08 && s.meanLuma < 0.45) return { scene: 'blue_hour', presetId: 'mavi_saat', amount: 0.7 };
  if (s.p95 > 0.97 && s.clipped > 0.02 && s.p5 < 0.12) return { scene: 'harsh_sun', presetId: 'sert_gunes', amount: 0.8 };
  if (s.p95 - s.p5 < 0.45 && s.saturation < 0.25) return { scene: 'flat', presetId: 'canli', amount: 0.7 };
  return { scene: 'everyday', presetId: 'dogal', amount: 1 };
}

/** Series vote (Carousel): the most common suggestion wins; ties go to the earlier photo; amount is the mean */
export function suggestSeries(list: SceneSuggestion[]): SceneSuggestion | null {
  if (list.length === 0) return null;
  const count = new Map<string, number>();
  list.forEach((s) => count.set(s.presetId, (count.get(s.presetId) ?? 0) + 1));
  let best = list[0];
  for (const s of list) if ((count.get(s.presetId) ?? 0) > (count.get(best.presetId) ?? 0)) best = s;
  const same = list.filter((s) => s.presetId === best.presetId);
  const amount = Math.round((same.reduce((a, s) => a + s.amount, 0) / same.length) * 100) / 100;
  return { ...best, amount };
}
