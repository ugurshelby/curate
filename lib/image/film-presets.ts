import { FilmPreset, FilterState } from "../types";

/**
 * Uğur'un Kişisel Estetik İmzası — 5 Temel Preset Ailesi
 * Kaynak: curate-preset-spec.md
 */
export const SIGNATURE_PRESETS: FilmPreset[] = [
  {
    id: "moody-teal",
    name: "Moody Teal",
    filmType: "color-negative",
    tag: "Mimari & Gökyüzü",
    contextNote: "Viyana/Budapeşte serisi, dramatik gökyüzü/bina kontrastı, soğuk teal-orange dengesi.",
    description: "Dramatik gökyüzü, net mimari hatlar, cyan-teal highlight'lar ve serin gölge tonları.",
    contrast: 25,
    saturation: 15,
    warmth: -8, // Soğuk yönde
    tint: 4, // Yeşil-cyan yönde
    fade: 0,
    highlightsTint: [-4, 8, 12], // Cyan/teal hafif
    shadowsTint: [-2, 0, 8], // Nötr-hafif mavi
    grainBase: 8,
    isSignature: true,
    category: "signature",
    analogDefaults: {
      grain: 8,
      halation: 5,
      vignette: 10,
      lightLeak: { enabled: false, type: "subtle", amount: 0 },
    },
  },
  {
    id: "warm-silhouette",
    name: "Warm Silhouette",
    filmType: "color-negative",
    tag: "Ters Işık & Gün Batımı",
    contextNote: "Ters ışık, figür silüetleri, shadow crush & zengin gün batımı parıltısı.",
    description: "Ters ışık ve figür silüetleri için derin ezilmiş siyahlar, zengin turuncu-kırmızı gökyüzü ve sıcak halation.",
    contrast: 35, // Yüksek - shadow crush
    saturation: 20,
    warmth: 15, // Sıcak yönde
    tint: 5, // Kırmızı-magenta yönde
    fade: 0,
    highlightsTint: [18, 10, -8], // Sıcak turuncu, orta-güçlü
    shadowsTint: [0, 0, 0], // Nötr derin siyah
    grainBase: 12,
    isSignature: true,
    category: "signature",
    analogDefaults: {
      grain: 12,
      halation: 15,
      vignette: 15,
      lightLeak: { enabled: false, type: "warm-side", amount: 0 },
    },
  },
  {
    id: "night-cinematic",
    name: "Night Cinematic",
    filmType: "color-negative",
    tag: "Gece & Neon Işık",
    contextNote: "Gece, iç mekan, tek renkli neon ışığı, milky black & imza halation.",
    description: "Düşük doygunluk, sinematik milky black, soğuk gölgeler ve ışık kaynağı etrafında güçlü taşan imza halation.",
    contrast: 20,
    saturation: -10,
    warmth: 0, // Nötr varsayılan
    tint: 0,
    fade: 5, // Çok hafif milky black
    highlightsTint: [2, 2, -2],
    shadowsTint: [-6, 2, 12], // Soğuk mavi-mor
    grainBase: 20,
    isSignature: true,
    category: "signature",
    analogDefaults: {
      grain: 20,
      halation: 20,
      vignette: 20,
      lightLeak: { enabled: false, type: "subtle", amount: 0 },
    },
  },
  {
    id: "muted-coastal",
    name: "Muted Coastal",
    filmType: "color-negative",
    tag: "Sakin Sahil & Pastel",
    contextNote: "Sakin anlar, deniz, açık alan; crush YOK, yumuşak geçişler ve pastel matlık.",
    description: "Düşük kontrast, belirgin pastel düşük doygunluk, açık gölgeler ve yumuşak film matlığı.",
    contrast: 5, // Çok hafif
    saturation: -20, // Belirgin düşük pastel
    warmth: -3,
    tint: 0,
    fade: 15, // Belirgin yumuşak film
    grainBase: 5,
    isSignature: true,
    category: "signature",
    analogDefaults: {
      grain: 5,
      halation: 0,
      vignette: 5,
      lightLeak: { enabled: false, type: "subtle", amount: 0 },
    },
  },
  {
    id: "amber-grain",
    name: "Amber Grain",
    filmType: "color-negative",
    tag: "Sokak & Amber Doku",
    contextNote: "Sokak, yansıma ve detay kareleri; sıcak amber ton, yoğun gren & hafif ışık sızması.",
    description: "Sıcak amber renk kimliği, hafif yıpranmış film dokusu, imza yoğun gren ve hafif analog sızma.",
    contrast: 15,
    saturation: 10,
    warmth: 10,
    tint: 8,
    fade: 10,
    highlightsTint: [14, 8, -6],
    shadowsTint: [8, 4, -4],
    grainBase: 25,
    isSignature: true,
    category: "signature",
    analogDefaults: {
      grain: 25,
      halation: 8,
      vignette: 20,
      lightLeak: { enabled: true, type: "subtle", amount: 25 },
    },
  },
];

export const CLASSIC_FILM_PRESETS: FilmPreset[] = [
  {
    id: "kodak-portra-400",
    name: "Kodak Portra 400",
    filmType: "color-negative",
    tag: "Doğal & Sıcak Pastel",
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
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
    category: "film",
    description: "Saf ışık yakalama, zengin gölge ayrıntısı ve mat lüks Leica ton skalası.",
    contrast: 20,
    saturation: -100,
    warmth: -2,
    tint: 0,
    fade: 14,
    grainBase: 16,
  },
];

/** Tüm presetler: Önce 5 Kişisel Estetik İmzası, ardından 10 Film Preseti */
export const FILM_PRESETS: FilmPreset[] = [
  ...SIGNATURE_PRESETS,
  ...CLASSIC_FILM_PRESETS,
];

/**
 * Tek tıkla preset uygulama motoru:
 * Eğer seçilen preset Uğur'un 5 imza presetinden biriyse,
 * hem renk LUT kalibrasyonunu hem de analog katmanı (grain, halation, vignette, light leak)
 * spec'te belirtilen kalibre edilmiş değerlerle tek hamlede state'e yazar.
 */
export function applySignaturePresetToFilterState(
  preset: FilmPreset
): Partial<FilterState> {
  const next: Partial<FilterState> = {
    activePresetId: preset.id,
    presetAmount: 100,
  };

  if (preset.analogDefaults) {
    const { grain, halation, vignette, lightLeak } = preset.analogDefaults;

    // Grain
    next.grainEnabled = grain > 0;
    next.grainAmount = grain;
    next.grainSize = 1;

    // Halation
    next.halationEnabled = halation > 0;
    next.halationAmount = halation;
    // Night cinematic için daha belirgin parlama yarıçapı
    if (preset.id === "night-cinematic") {
      next.halationRadius = 14;
      next.halationThreshold = 0.76;
      next.halationTemp = 50;
    } else if (preset.id === "warm-silhouette") {
      next.halationRadius = 12;
      next.halationThreshold = 0.8;
      next.halationTemp = 75; // Sıcak amber-kırmızı
    } else {
      next.halationRadius = 10;
      next.halationThreshold = 0.82;
      next.halationTemp = 60;
    }

    // Vignette
    next.vignetteEnabled = vignette > 0;
    next.vignetteAmount = vignette;

    // Light Leak
    if (lightLeak && lightLeak.enabled) {
      next.lightLeakEnabled = true;
      next.lightLeakType = lightLeak.type;
      next.lightLeakAmount = lightLeak.amount;
    } else {
      next.lightLeakEnabled = false;
      next.lightLeakAmount = 0;
    }
  }

  return next;
}

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
