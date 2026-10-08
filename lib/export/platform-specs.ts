/**
 * Curate Export — Platform Standards & Dimension Matrices
 * Export targets as data (spec §4.4 K1, S-b).
 */

import { ExportPlatform, ExportSpec, FrameResolution, FrameSizeId } from '../core/types';

/** Platform dosya sınırı (sahip kararı, Faz S): aşılırsa JPEG kalitesi kademeli düşer */
export const MAX_EXPORT_BYTES = 8 * 1024 * 1024;
/** Varsayılan en yüksek kalite ve düşüş basamakları */
export const JPEG_QUALITY_STEPS = [0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76];

export const PLATFORM_SPECS: Record<ExportPlatform, ExportSpec> = {
  ig_post_4_5: {
    id: 'ig_post_4_5',
    name: 'Instagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    quality: JPEG_QUALITY_STEPS[0],
    filePrefix: 'dump',
    maxBytes: MAX_EXPORT_BYTES,
    verified: true,
  },
  ig_story_9_16: {
    id: 'ig_story_9_16',
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    quality: JPEG_QUALITY_STEPS[0],
    filePrefix: 'story',
    maxBytes: MAX_EXPORT_BYTES,
    verified: true,
  },
  // VARSAYIM (spec §4.4 K1): 1080×1920 telefonda doğrulanmadı
  tiktok_9_16: {
    id: 'tiktok_9_16',
    name: 'TikTok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    quality: JPEG_QUALITY_STEPS[0],
    filePrefix: 'tiktok',
    maxBytes: MAX_EXPORT_BYTES,
    verified: false,
  },
  // Düzenle: kırpımın kendi çözünürlüğü, uzun kenar en çok 4096 (spec §4.5 E4, VARSAYIM)
  edit: {
    id: 'edit',
    name: 'Düzenle',
    width: 0,
    height: 0,
    aspectRatio: 'kırpım',
    quality: JPEG_QUALITY_STEPS[0],
    filePrefix: 'duzenle',
    maxBytes: MAX_EXPORT_BYTES,
    verified: true,
  },
  // Upscale: boyut kaynağa bağlı; platform hedefi olmadığı için 8 MB sınırı uygulanmaz
  original: {
    id: 'original',
    name: 'Orijinal boyut',
    width: 0,
    height: 0,
    aspectRatio: 'original',
    quality: JPEG_QUALITY_STEPS[0],
    filePrefix: 'upscale',
    verified: true,
  },
};

/**
 * Çerçeve standart boyutları (sahip kararı 2026-10-08, D29). Boyutlar kısa kenarı 1080 olan
 * standart çıktıdır; 'high' çözünürlükte iki katı (kısa kenar 2160, 16:9'da 3840×2160 = 4K UHD).
 * Sıra: en çok kullanılan önce. Instagram 1.91:1 yatay 1080×566.
 */
export interface FrameSizeSpec {
  id: FrameSizeId;
  /** Oran etiketi (sayı, çeviri gerekmez) */
  ratio: string;
  width: number;
  height: number;
}

export const FRAME_SIZES: readonly FrameSizeSpec[] = [
  { id: '4_5', ratio: '4:5', width: 1080, height: 1350 },
  { id: '1_1', ratio: '1:1', width: 1080, height: 1080 },
  { id: '9_16', ratio: '9:16', width: 1080, height: 1920 },
  { id: '3_4', ratio: '3:4', width: 1080, height: 1440 },
  { id: '2_3', ratio: '2:3', width: 1080, height: 1620 },
  { id: '5_4', ratio: '5:4', width: 1350, height: 1080 },
  { id: '4_3', ratio: '4:3', width: 1440, height: 1080 },
  { id: '3_2', ratio: '3:2', width: 1620, height: 1080 },
  { id: '16_9', ratio: '16:9', width: 1920, height: 1080 },
  { id: '191_1', ratio: '1.91:1', width: 1080, height: 566 },
];

export const FRAME_SIZE_IDS = FRAME_SIZES.map((s) => s.id) as readonly FrameSizeId[];

export const FRAME_RESOLUTION_SCALE: Record<FrameResolution, number> = { standard: 1, high: 2 };

/** Çıktı boyutu: oran + çözünürlük */
export function frameOutputSize(size: FrameSizeId, resolution: FrameResolution): FrameSizeSpec {
  const spec = FRAME_SIZES.find((s) => s.id === size) ?? FRAME_SIZES[0];
  const k = FRAME_RESOLUTION_SCALE[resolution] ?? 1;
  return { ...spec, width: spec.width * k, height: spec.height * k };
}

/**
 * Calculates crop dimensions for centering and fitting into target aspect ratio (cover mode)
 */
export function calculateAspectCrop(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { sx: number; sy: number; sw: number; sh: number } {
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  let sw = srcWidth;
  let sh = srcHeight;
  let sx = 0;
  let sy = 0;

  if (srcRatio > targetRatio) {
    // Source is wider than target -> crop left/right
    sw = srcHeight * targetRatio;
    sx = (srcWidth - sw) / 2;
  } else {
    // Source is taller than target -> crop top/bottom
    sh = srcWidth / targetRatio;
    sy = (srcHeight - sh) / 2;
  }

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(sw),
    sh: Math.round(sh),
  };
}

/**
 * Calculates letterbox/pillarbox destination dimensions and offsets for fit mode
 */
export function calculateLetterboxFit(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { dx: number; dy: number; dw: number; dh: number } {
  const targetAspect = targetWidth / targetHeight;
  const imgAspect = srcWidth / srcHeight;

  let dw = targetWidth;
  let dh = targetHeight;
  let dx = 0;
  let dy = 0;

  if (imgAspect > targetAspect) {
    // Landscape relative to target -> letterbox (bars top/bottom)
    dw = targetWidth;
    dh = Math.round(targetWidth / imgAspect);
    dy = Math.round((targetHeight - dh) / 2);
  } else {
    // Portrait narrower than target -> pillarbox (bars left/right)
    dh = targetHeight;
    dw = Math.round(targetHeight * imgAspect);
    dx = Math.round((targetWidth - dw) / 2);
  }

  return { dx, dy, dw, dh };
}

