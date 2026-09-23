import { FilmPreset } from "../types";

export const FILM_PRESETS: FilmPreset[] = [
  {
    id: "kodak-portra-400",
    name: "Kodak Portra 400",
    filmType: "color-negative",
    tag: "Doğal & Sıcak Pastel",
    description: "Sıcak pastel ten tonları, yumuşak kontrast ve editoryal moda renk dengesi.",
    contrast: 12,
    saturation: 4,
    warmth: 14,
    tint: 3,
    fade: 8,
    highlightsTint: [12, 6, -4],
    shadowsTint: [4, 0, -2],
    grainBase: 20,
  },
  {
    id: "cinestill-800t",
    name: "CineStill 800T",
    filmType: "color-negative",
    tag: "Tungsten Sinematik Gece",
    description: "Gece ışıklarında cyan/teal gölgeler, sıcak neon parıltısı ve sinematik 35mm estetiği.",
    contrast: 18,
    saturation: 10,
    warmth: -8,
    tint: 6,
    fade: 12,
    highlightsTint: [18, 6, -8],
    shadowsTint: [-10, 4, 14],
    grainBase: 28,
  },
  {
    id: "fuji-pro-400h",
    name: "Fujifilm Pro 400H",
    filmType: "color-negative",
    tag: "Ferah Pastel Yeşiller",
    description: "Japon editoryal stili, serin nane yeşili tonlar, açık gölgeler ve dingin atmosfer.",
    contrast: 8,
    saturation: -4,
    warmth: -12,
    tint: -8,
    fade: 10,
    highlightsTint: [-4, 6, 4],
    shadowsTint: [-6, 10, 8],
    grainBase: 18,
  },
  {
    id: "kodak-gold-200",
    name: "Kodak Gold 200",
    filmType: "color-negative",
    tag: "90'lar Altın Yaz",
    description: "Nostaljik altın sarısı sıcaklık, canlı doygunluk ve vintage aile albümü dokusu.",
    contrast: 16,
    saturation: 18,
    warmth: 24,
    tint: 8,
    fade: 6,
    highlightsTint: [16, 12, -10],
    shadowsTint: [10, 4, -8],
    grainBase: 24,
  },
  {
    id: "kodak-tri-x-400",
    name: "Kodak Tri-X 400",
    filmType: "black-white",
    tag: "İkonik Sokak S/B",
    description: "Derin kömür siyahları, yüksek kontrastlı dramatik geçişler ve klasik analog sokak ruhu.",
    contrast: 34,
    saturation: -100,
    warmth: 0,
    tint: 0,
    fade: 4,
    grainBase: 36,
  },
  {
    id: "ilford-hp5",
    name: "Ilford HP5 Plus",
    filmType: "black-white",
    tag: "Pürüzsüz Gri Tonlama",
    description: "Geniş dinamik aralık, ipeksi orta tonlar ve zamansız editoryal monokrom.",
    contrast: 14,
    saturation: -100,
    warmth: 2,
    tint: 0,
    fade: 8,
    grainBase: 26,
  },
  {
    id: "polaroid-600",
    name: "Polaroid 600 Vintage",
    filmType: "instant",
    tag: "Soluk Anlık Baskı",
    description: "Yükseltilmiş soluk siyahlar, hafif yeşilimsi gölge tonları ve retro anlık film büyüsü.",
    contrast: -6,
    saturation: -10,
    warmth: 6,
    tint: -4,
    fade: 24,
    highlightsTint: [8, 8, -4],
    shadowsTint: [-4, 8, 4],
    grainBase: 22,
  },
  {
    id: "fuji-velvia-50",
    name: "Fujifilm Velvia 50",
    filmType: "color-reversal",
    tag: "Canlı Doğa & Dia",
    description: "Efsanevi dia slayt filmi: derin gökyüzü mavileri, ultra canlı kırmızılar ve yüksek kontrast.",
    contrast: 28,
    saturation: 32,
    warmth: -4,
    tint: 4,
    fade: 2,
    highlightsTint: [6, 4, 8],
    shadowsTint: [-8, -4, 10],
    grainBase: 14,
  },
  {
    id: "agfa-vista-200",
    name: "Agfa Vista 200",
    filmType: "color-negative",
    tag: "Canlı Kırmızı & Lomo",
    description: "Sıcak canlı kırmızılar, karakteristik sarı/mavi kontrastı ve eğlenceli sokak dump estetiği.",
    contrast: 22,
    saturation: 20,
    warmth: 12,
    tint: 14,
    fade: 10,
    highlightsTint: [14, 2, -6],
    shadowsTint: [4, 0, 8],
    grainBase: 22,
  },
  {
    id: "leica-monochrom",
    name: "Leica M Monochrom",
    filmType: "black-white",
    tag: "Prestijli Mat S/B",
    description: "Saf ışık yakalama, zengin gölge ayrıntısı ve mat lüks Leica ton skalası.",
    contrast: 20,
    saturation: -100,
    warmth: -2,
    tint: 0,
    fade: 14,
    grainBase: 16,
  },
];

const FAVORITES_STORAGE_KEY = "curate_favorite_film_presets";

export function getFavoritePresetIds(): string[] {
  if (typeof window === "undefined") {
    return ["kodak-portra-400", "cinestill-800t", "kodak-gold-200"];
  }
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      const defaultFavs = ["kodak-portra-400", "cinestill-800t", "kodak-gold-200"];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(defaultFavs));
      return defaultFavs;
    }
    return JSON.parse(raw);
  } catch {
    return ["kodak-portra-400", "cinestill-800t", "kodak-gold-200"];
  }
}

export function toggleFavoritePreset(id: string): string[] {
  const current = getFavoritePresetIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

/**
 * Applies film curve transformation directly to pixel data with intensity blend
 */
export function applyFilmPreset(
  imageData: ImageData,
  preset: FilmPreset,
  amount = 100
): ImageData {
  if (amount <= 0) return imageData;

  const blend = Math.max(0, Math.min(100, amount)) / 100;
  const data = imageData.data;
  const len = data.length;

  const isBW = preset.filmType === "black-white" || preset.saturation <= -90;

  // Pre-calculate contrast factor
  // S-curve approximation
  const contrastFactor = (259 * (preset.contrast + 255)) / (255 * (259 - preset.contrast));

  // Saturation factor
  const satFactor = 1 + preset.saturation / 100;

  // Warmth: shifts red/blue channels
  const warmthR = preset.warmth * 0.7;
  const warmthB = -preset.warmth * 0.7;

  // Tint: green vs magenta
  const tintG = -preset.tint * 0.5;
  const tintR = preset.tint * 0.35;
  const tintB = preset.tint * 0.35;

  // Fade: lifted black level
  const liftBlack = preset.fade * 0.65;

  // Split-toning tints
  const hlR = preset.highlightsTint ? preset.highlightsTint[0] : 0;
  const hlG = preset.highlightsTint ? preset.highlightsTint[1] : 0;
  const hlB = preset.highlightsTint ? preset.highlightsTint[2] : 0;

  const shR = preset.shadowsTint ? preset.shadowsTint[0] : 0;
  const shG = preset.shadowsTint ? preset.shadowsTint[1] : 0;
  const shB = preset.shadowsTint ? preset.shadowsTint[2] : 0;

  for (let i = 0; i < len; i += 4) {
    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];

    let r = origR;
    let g = origG;
    let b = origB;

    // 1. Black & White conversion if applicable
    if (isBW) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum;
      g = lum;
      b = lum;
    } else if (satFactor !== 1) {
      // Saturation adjustment
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satFactor;
      g = lum + (g - lum) * satFactor;
      b = lum + (b - lum) * satFactor;
    }

    // 2. Contrast S-curve
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 3. Warmth and Tint
    if (!isBW) {
      r += warmthR + tintR;
      g += tintG;
      b += warmthB + tintB;

      // 4. Split Toning based on luminance
      const lumNorm = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
      const shadowWeight = 1 - lumNorm;
      const highlightWeight = lumNorm;

      r += hlR * highlightWeight + shR * shadowWeight;
      g += hlG * highlightWeight + shG * shadowWeight;
      b += hlB * highlightWeight + shB * shadowWeight;
    }

    // 5. Film Matte Fade (Lift blacks, compress range)
    if (liftBlack > 0) {
      r = liftBlack + r * ((255 - liftBlack) / 255);
      g = liftBlack + g * ((255 - liftBlack) / 255);
      b = liftBlack + b * ((255 - liftBlack) / 255);
    }

    // 6. Clamp
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // 7. Blend with original according to amount
    data[i] = Math.round(origR + (r - origR) * blend);
    data[i + 1] = Math.round(origG + (g - origG) * blend);
    data[i + 2] = Math.round(origB + (b - origB) * blend);
  }

  return imageData;
}
