/**
 * Curate Export — Platform Standards & Dimension Matrices
 * Hard-locked to Meta & TikTok optimum dimensions.
 */

import { ExportPlatform, ExportSpec } from '../core/types';

export const PLATFORM_SPECS: Record<ExportPlatform, ExportSpec> = {
  ig_post_4_5: {
    id: 'ig_post_4_5',
    name: 'Instagram Carousel / Post (4:5)',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    quality: 0.92, // Optimal sweet spot avoiding Meta aggressive recompression
  },
  ig_story_9_16: {
    id: 'ig_story_9_16',
    name: 'Instagram / TikTok Story (9:16)',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    quality: 0.92,
  },
  original: {
    id: 'original',
    name: 'Original Resolution Lossless',
    width: 0, // dynamic
    height: 0, // dynamic
    aspectRatio: 'original',
    quality: 0.94,
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
