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
    slotCount: 2 | 3 | 4 | 5 | 6;
    spacing: number; // 0 - 48px
    backgroundMode: 'adaptive-gradient' | 'black' | 'white' | 'charcoal';
  };
  frameConfig: FrameConfig;
  upscaleConfig: {
    scaleFactor: 2 | 4;
  };
  isProcessing: boolean;
  processingProgress: number; // 0 - 100
  processingStatus: string;
}

export type ExportPlatform = 'ig_post_4_5' | 'ig_story_9_16' | 'original';

export interface ExportSpec {
  id: ExportPlatform;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  quality: number; // 0.92 Meta optimum
}

export interface ExportProgress {
  current: number;
  total: number;
  itemPercentage: number;
  status: string;
}
