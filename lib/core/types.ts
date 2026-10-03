/**
 * Curate Studio Core Types & Data Contracts
 * Headless, client-side, non-destructive image pipeline definitions
 */

export type StudioModule = 'carousel' | 'story' | 'frame' | 'upscale';

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

export interface PresetProfile {
  id: string;
  name: string;
  category: 'editorial' | 'silhouette' | 'cinematic' | 'coastal' | 'film' | 'monochrome' | 'social';
  description: string;
  adjustments: {
    exposure: number;     // -100 to 100
    contrast: number;     // -100 to 100
    temperature: number;  // -100 to 100
    tint: number;         // -100 to 100
    highlights: number;   // -100 to 100
    shadows: number;      // -100 to 100
    saturation: number;   // -100 to 100
    fade?: number;        // 0 to 100 (matte black lift)
    grain?: number;       // 0 to 100 (analog film grain)
    halation?: number;    // 0 to 100 (optical highlight bloom/halation)
  };
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

export interface StoryCellTransform {
  zoom: number; // 1 – 4, cover boyutuna göre
  panX: number; // -1 – 1, izin verilen kaydırma aralığının oranı
  panY: number;
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
}

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
  upscaleConfig: {
    scaleFactor: 2 | 4;
  };
  isProcessing: boolean;
  processingProgress: number; // 0 - 100
  processingStatus: string;
}

export type ExportPlatform = 'ig_post_4_5' | 'ig_story_9_16' | 'tiktok_9_16' | 'original';

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
