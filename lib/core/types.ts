/**
 * Curate Studio Core Types & Data Contracts
 * Headless, client-side, non-destructive image pipeline definitions
 */

export type StudioModule = 'carousel' | 'story' | 'frame' | 'upscale' | 'edit';

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ColorMetrics {
  luminance: number; // 0 - 255
  temperature: number; // -100 to +100
  tint: number; // -100 to +100
  avgR: number;
  avgG: number;
  avgB: number;
}

export interface HarmonizeSettings {
  enabled: boolean;
  referenceItemId: string | null;
  strength: number; // 0.15 - 0.25 standard subtle sync
  appliedMetrics?: ColorMetrics;
}

export type PresetFamily = 'temel' | 'portre' | 'isik' | 'imza';

/**
 * Preset parameters (Faz 5, preset library v2). All optional; 0/absent = no change. The single
 * "Miktar" slider scales every value from 0 (original) to the listed value (100%).
 * Tone values work on gamma-encoded 0–1 values with fixed curve ends (no crushed blacks, no clipped whites).
 */
export interface PresetAdjustments {
  /** EV-like brightness, −1…+1 (soft shoulder instead of clipping) */
  exposure?: number;
  /** S-curve strength, −0.5…+0.6; ends stay fixed */
  contrast?: number;
  /** +: open shadows, −: deepen (≥ −0.4 keeps the curve monotone) */
  shadows?: number;
  /** −: recover highlights, +: brighten (≤ 0.4) */
  highlights?: number;
  /** Matte floor 0…0.12 (lifts black, never crushes) */
  blacks?: number;
  /** −1 cool … +1 warm (luminance-neutral gains) */
  temperature?: number;
  /** −1 green … +1 magenta */
  tint?: number;
  /** Saturation that spares skin tones and already-saturated colours, −1…+1 */
  vibrance?: number;
  /** Global saturation, −1…+1 */
  saturation?: number;
  /** Colour in the shadows: [hue°, amount 0–1] (internal grading, no manual UI) */
  splitShadows?: [number, number];
  /** Colour in the highlights: [hue°, amount 0–1] */
  splitHighlights?: [number, number];
  /** Black & white with this channel mix (weights, normalized) */
  mono?: [number, number, number];
  /** 35mm grain 0–1 (owner-approved only for Amber Grain) */
  grain?: number;
  /** Warm highlight bloom 0–1 (owner-approved only for Night Cinematic) */
  halation?: number;
}

export interface PresetProfile {
  id: string;
  family: PresetFamily;
  /** Engine-side name (UI names and hints live in lib/i18n/tr.ts) */
  name: string;
  adjustments: PresetAdjustments;
}

export interface ActivePreset {
  id: string;
  intensity: number; // 0.0 to 1.0 (lerp weight)
}

export interface AdaptiveGradientResult {
  colorTop: string;
  colorBottom: string;
  colorLeft: string;
  colorRight: string;
  dominantColors: string[];
  cssLinear: string;
  cssRadial: string;
}

export interface CubeLUT {
  title: string;
  size: number;
  data: Float32Array; // Flattened size^3 * 3 RGB values in [0, 1]
}

export interface FrameConfig {
  frameType: 'polaroid' | 'matte' | 'gradient';
  borderWidth: number;
  borderRadius: number;
  showTimestamp: boolean;
}

export interface CarouselView {
  target: 'instagram' | 'tiktok';
  fitMode: 'fill' | 'fit';
  showOverlay: boolean;
}

export interface StoryCellTransform {
  zoom: number; // 1 – 4, cover boyutuna göre
  panX: number; // -1 – 1, izin verilen kaydırma aralığının oranı
  panY: number;
}

/** Düzenle modülü kırp oranları (spec §4.5 E6) */
export type EditAspect = 'free' | 'original' | '1:1' | '4:5' | '9:16' | '16:9';

export interface EditCrop {
  aspect: EditAspect;
  /** Serbest oranda çıktı oranı (genişlik / yükseklik); 0 = orijinal oran */
  freeRatio: number;
  /** 90° adımlarla döndürme (saat yönü) */
  rotation: 0 | 90 | 180 | 270;
  /** İnce açı düzeltme, derece (−10…+10) */
  angle: number;
  /** Çıktıyı yatay çevir */
  flipH: boolean;
  /** 1 = en büyük kırpım; büyüdükçe daha küçük bölge */
  zoom: number;
  /** −1…1: izin verilen kaydırma aralığının oranı (döndürülmüş görsel ekseninde) */
  panX: number;
  panY: number;
}

export interface EditParams {
  presetId: string | null;
  intensity: number; // 0–1
  crop: EditCrop;
  /** Düzeltme sekmesi (D2); yoksa hepsi kapalı */
  corrections?: import('../engine/corrections').CorrectionParams;
}

export interface StudioItem {
  id: string;
  file?: File;
  name: string;
  originalUrl: string;
  proxyUrl: string;
  dimensions: ImageDimensions;
  proxyDimensions: ImageDimensions;
  preset: ActivePreset | null;
  harmonize: HarmonizeSettings;
  order: number;
  createdAt: number;
  /** Türetilmiş fotoğraf: hangi kayıttan üretildi (kaynak silinirse null) */
  sourceId?: string | null;
  /** Nasıl türetildi; ileride "ai" */
  derivedBy?: DerivedKind;
}

export type DerivedKind = 'upscale' | 'ai';

export interface StudioState {
  activeModule: StudioModule;
  items: StudioItem[];
  selectedItemId: string | null;
  globalPreset: ActivePreset | null;
  customLut: CubeLUT | null;
  heroColorMetrics: ColorMetrics | null;
  globalHarmonize: {
    referenceItemId: string | null;
    strength: number;
  };
  storyLayout: {
    // Grid sayısı fotoğraf sayısından türetilir (2–6), kullanıcı seçmez (spec §4.4 K2)
    spacing: number; // 0 - 32 (export'ta ×2.5 px)
    backgroundMode: 'adaptive-gradient' | 'black' | 'white' | 'charcoal';
    /** Hücre başına konum/yakınlaştırma, fotoğraf kimliğine göre */
    cellTransforms: Record<string, StoryCellTransform>;
  };
  frameConfig: FrameConfig;
  /** Carousel görünüm tercihleri (cihazda hatırlanır, lib/core/prefs.ts) */
  carouselView: CarouselView;
  /** Düzenle modülü ayarları, fotoğraf kimliğine göre */
  edits: Record<string, EditParams>;
  upscaleConfig: {
    scaleFactor: 2 | 4;
  };
  isProcessing: boolean;
  processingProgress: number; // 0 - 100
  processingStatus: string;
  /** Kısa kullanıcı bildirimi (ör. eski türetilmiş fotoğraf silindi); gösterildikten sonra temizlenir */
  notice: string | null;
}

export type ExportPlatform = 'ig_post_4_5' | 'ig_story_9_16' | 'tiktok_9_16' | 'edit' | 'original';

export interface ExportSpec {
  id: ExportPlatform;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  /** Varsayılan JPEG kalitesi (en yüksek; yalnız 8 MB sınırında kademeli düşer) */
  quality: number;
  /** Tekil dosya ve zip içindeki ad öneki: dump_01.jpg, tiktok_01.jpg */
  filePrefix: string;
  /** Platform dosya sınırı; aşılırsa JPEG kalitesi kademeli düşer */
  maxBytes?: number;
  /** false: boyut telefonda doğrulanmadı (sahip doğrulayacak) */
  verified: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  itemPercentage: number;
  status: string;
}
