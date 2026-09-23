export type AspectRatio = "4:5" | "9:16" | "1:1" | "original";

export type CompositionGuide = "none" | "thirds" | "golden" | "frame";

export type SocialOverlay = "none" | "instagram-story" | "tiktok-story" | "instagram-post";

export type UpscaleMultiplier = 1 | 2 | 4;

export interface CropState {
  aspectRatio: AspectRatio;
  zoom: number; // 1.0 - 3.0
  panX: number; // normalized or px offset
  panY: number;
}

export interface FilterState {
  // Reinhard Color Match
  reinhardEnabled: boolean;
  reinhardStrength: number; // 0 - 100
  referenceImageId: string | null;

  // Luminance-aware organic film grain
  grainEnabled: boolean;
  grainAmount: number; // 0 - 100
  grainSize: number; // 1 - 4

  // Halation
  halationEnabled: boolean;
  halationRadius: number; // 2 - 30 px
  halationTemp: number; // 0 (warm amber) - 100 (deep cinematic red)
  halationThreshold: number; // 0.70 - 0.95 luminance threshold
}

export interface CurateImage {
  id: string;
  name: string;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number; // originalWidth / originalHeight
  dataUrl: string; // for rendering
  crop: CropState;
  filters: FilterState;
  upscaleFactor: UpscaleMultiplier; // 1x, 2x, 4x
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  targetWidth?: number;
  targetHeight?: number;
  scaleMultiplier?: UpscaleMultiplier;
  aspectRatio: AspectRatio;
  useLanczos: boolean;
}

export interface ExportProgress {
  isExporting: boolean;
  current: number;
  total: number;
  phase: string;
}
