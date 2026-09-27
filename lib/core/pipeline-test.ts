/**
 * Curate Core — Headless Pipeline Test Harness
 * Verifies proxy scaling, color extraction, harmonize sync, presets and export specs.
 */

import { extractColorMetrics, applyHarmonizeSync } from '../engine/harmonize';
import { CURATE_PRESETS, applyPresetToImageData } from '../engine/presets';
import { upscaleLanczos3 } from '../engine/upscale-lanczos';
import { extractAdaptiveGradient } from '../engine/adaptive-gradient';
import { PLATFORM_SPECS, calculateAspectCrop } from '../export/platform-specs';
import { packageDumpZip } from '../export/zip-packager';

/**
 * Creates synthetic test ImageData (e.g. 100x100 gradient)
 */
export function createSyntheticImageData(width: number, height: number): ImageData {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      buffer[idx] = Math.round((x / width) * 255);       // R
      buffer[idx + 1] = Math.round((y / height) * 255);  // G
      buffer[idx + 2] = 128;                             // B
      buffer[idx + 3] = 255;                             // A
    }
  }

  // Handle environments where ImageData constructor is standard
  if (typeof ImageData !== 'undefined') {
    return new ImageData(buffer, width, height);
  }

  return {
    width,
    height,
    data: buffer,
    colorSpace: 'srgb',
  } as ImageData;
}

/**
 * Runs a complete headless verification of all core processing modules
 */
export async function runPipelineVerification(): Promise<{
  success: boolean;
  metrics: Record<string, any>;
  errors: string[];
}> {
  const errors: string[] = [];
  const metrics: Record<string, any> = {};

  try {
    // 1. Synthetic Source (120x80)
    const srcImg = createSyntheticImageData(120, 80);
    metrics.source = { width: srcImg.width, height: srcImg.height };

    // 2. Test Color Extraction & Harmonization
    const refImg = createSyntheticImageData(120, 80);
    // Tint reference warmer
    for (let i = 0; i < refImg.data.length; i += 4) {
      refImg.data[i] = Math.min(255, refImg.data[i] + 30);
    }
    const refMetrics = extractColorMetrics(refImg);
    metrics.refMetrics = refMetrics;

    const harmonized = applyHarmonizeSync(srcImg, refMetrics, 0.20);
    metrics.harmonizedPixels = harmonized.data.length;

    // 3. Test Preset Application
    const preset = CURATE_PRESETS[0]; // Clean Contrast
    const presetApplied = applyPresetToImageData(harmonized, preset, 0.85);
    metrics.presetApplied = preset.id;

    // 4. Test Adaptive Edge Gradient
    const gradient = extractAdaptiveGradient(presetApplied);
    metrics.gradient = {
      colorTop: gradient.colorTop,
      colorBottom: gradient.colorBottom,
      cssLinear: gradient.cssLinear,
    };

    // 5. Test Lanczos-3 Upscale (2x from 40x40 for test speed)
    const smallSrc = createSyntheticImageData(40, 40);
    const upscaled = upscaleLanczos3(smallSrc, 2);
    metrics.upscaled = { width: upscaled.width, height: upscaled.height };
    if (upscaled.width !== 80 || upscaled.height !== 80) {
      errors.push(`Lanczos-3 upscale dimension mismatch: got ${upscaled.width}x${upscaled.height}`);
    }

    // 6. Test Platform Crop Calculation (IG Post 1080x1350)
    const cropSpec = calculateAspectCrop(1920, 1080, PLATFORM_SPECS.ig_post_4_5.width, PLATFORM_SPECS.ig_post_4_5.height);
    metrics.cropSpec = cropSpec;
    if (cropSpec.sw <= 0 || cropSpec.sh <= 0) {
      errors.push('Aspect crop calculation failed');
    }

    // 7. Test Zip Packager with synthetic blobs
    if (typeof Blob !== 'undefined') {
      const mockBlob1 = new Blob(['mock_jpeg_1'], { type: 'image/jpeg' });
      const mockBlob2 = new Blob(['mock_jpeg_2'], { type: 'image/jpeg' });
      const zipBlob = await packageDumpZip([
        { id: '1', blob: mockBlob1, order: 0 },
        { id: '2', blob: mockBlob2, order: 1 },
      ]);
      metrics.zipSize = zipBlob.size;
    }

  } catch (err: any) {
    errors.push(err?.message || 'Unknown pipeline verification error');
  }

  return {
    success: errors.length === 0,
    metrics,
    errors,
  };
}
