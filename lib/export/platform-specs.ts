/**
 * Curate Export — Platform Standards & Dimension Matrices
 * Export targets as data (spec §4.4 K1, S-b).
 */

import { ExportPlatform, ExportSpec } from '../core/types';

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

