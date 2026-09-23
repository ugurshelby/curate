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

export interface TimestampState {
  enabled: boolean;
  dateText: string; // e.g. "'26 09 23"
  color: string; // amber '#ff9d00', orange '#ff6b00', red '#ff3b30', green '#34c759'
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  format: "YY MM DD" | "DD MM YY" | "YYYY.MM.DD";
}

export interface BorderState {
  enabled: boolean;
  type: "matte" | "polaroid"; // matte = equal, polaroid = wide bottom margin
  color: string; // #ffffff, #f7f5f0, #000000, etc.
  widthPercent: number; // 2 - 20 %
  radius: number; // 0 - 30 px corner softness
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
  border?: BorderState;
  timestamp?: TimestampState;
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

// Panorama Splitter Types
export interface PanoramaSlice {
  index: number;
  dataUrl: string;
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

// Story Collage Types
export interface CollageSlot {
  id: string;
  imageId: string | null;
  dataUrl: string | null;
  panX: number; // px offset in slot
  panY: number;
  zoom: number; // 1.0 - 3.0
  rect: { x: number; y: number; width: number; height: number }; // normalized 0-1
}

export interface StoryCollageLayout {
  id: string;
  name: string;
  photoCount: number;
  slots: Array<{ x: number; y: number; width: number; height: number }>; // normalized 0-1 coordinates
}
