import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { calculateAspectCrop, calculateLetterboxFit, PLATFORM_SPECS } from '../lib/export/platform-specs';
import { upscaleLanczos3 } from '../lib/engine/upscale-lanczos';
import { extractColorMetrics, applyHarmonizeSync } from '../lib/engine/harmonize';
import { packageDumpZip } from '../lib/export/zip-packager';
import { studioStore } from '../lib/core/state-machine';

function createSyntheticImageData(width: number, height: number): ImageData {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      buffer[idx] = Math.round((x / width) * 255);
      buffer[idx + 1] = Math.round((y / height) * 255);
      buffer[idx + 2] = 128;
      buffer[idx + 3] = 255;
    }
  }

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

describe('Core Pipeline & Export Math Verification', () => {
  // 1. Crop Math
  describe('Crop math (calculateAspectCrop)', () => {
    it('crops 1920x1080 landscape to 1080x1350 (4:5) correctly', () => {
      const crop = calculateAspectCrop(1920, 1080, 1080, 1350);
      expect(crop.sh).toBe(1080);
      expect(crop.sw).toBe(864); // 1080 * (4/5) = 864
      expect(crop.sx).toBe((1920 - 864) / 2); // 528
      expect(crop.sy).toBe(0);
      expect(crop.sw / crop.sh).toBeCloseTo(4 / 5, 4);
    });

    it('crops 1080x1920 portrait to 1080x1350 (4:5) correctly', () => {
      const crop = calculateAspectCrop(1080, 1920, 1080, 1350);
      expect(crop.sw).toBe(1080);
      expect(crop.sh).toBe(1350); // 1080 / (4/5) = 1350
      expect(crop.sx).toBe(0);
      expect(crop.sy).toBe((1920 - 1350) / 2); // 285
      expect(crop.sw / crop.sh).toBeCloseTo(4 / 5, 4);
    });

    it('crops 1000x1000 square to 1080x1350 (4:5) correctly', () => {
      const crop = calculateAspectCrop(1000, 1000, 1080, 1350);
      expect(crop.sh).toBe(1000);
      expect(crop.sw).toBe(800);
      expect(crop.sx).toBe(100);
      expect(crop.sy).toBe(0);
    });
  });

  // 2. Lanczos Output Dimensions
  describe('Lanczos output dimensions (upscaleLanczos3)', () => {
    it('upscales 40x40 synthetic image by 2x to exact 80x80', () => {
      const src = createSyntheticImageData(40, 40);
      const upscaled = upscaleLanczos3(src, 2);
      expect(upscaled.width).toBe(80);
      expect(upscaled.height).toBe(80);
      expect(upscaled.data.length).toBe(80 * 80 * 4);
    });

    it('upscales 20x30 synthetic image by 4x to exact 80x120', () => {
      const src = createSyntheticImageData(20, 30);
      const upscaled = upscaleLanczos3(src, 4);
      expect(upscaled.width).toBe(80);
      expect(upscaled.height).toBe(120);
      expect(upscaled.data.length).toBe(80 * 120 * 4);
    });
  });

  // 3. Zip Extension for image/png vs image/jpeg
  describe('Zip extension packaging (packageDumpZip)', () => {
    it('assigns .jpg for image/jpeg and .png for image/png blobs', async () => {
      const jpegBlob = new Blob(['mock_jpeg_bytes'], { type: 'image/jpeg' });
      const pngBlob = new Blob(['mock_png_bytes'], { type: 'image/png' });

      const zipBlob = await packageDumpZip([
        { id: '1', blob: jpegBlob, order: 0 },
        { id: '2', blob: pngBlob, order: 1 },
      ]);

      expect(zipBlob).toBeDefined();
      expect(zipBlob.size).toBeGreaterThan(0);

      // Verify zip entries
      const zipBuffer = await zipBlob.arrayBuffer();
      const zip = await JSZip.loadAsync(zipBuffer);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain('dump_01.jpg');
      expect(fileNames).toContain('dump_02.png');
    });
  });

  // 4. Harmonize Strength within 0.15 - 0.25
  describe('Harmonize strength discipline (0.15 to 0.25)', () => {
    it('maintains default strength at 0.20 in state machine and platform defaults', () => {
      const state = studioStore.getState();
      expect(state.globalHarmonize.strength).toBe(0.20);
      expect(state.globalHarmonize.strength).toBeGreaterThanOrEqual(0.15);
      expect(state.globalHarmonize.strength).toBeLessThanOrEqual(0.25);
    });

    it('applies harmonize cleanly at 0.15 and 0.25 strengths within valid byte range [0, 255]', () => {
      const src = createSyntheticImageData(50, 50);
      const ref = createSyntheticImageData(50, 50);

      // Warm up reference
      for (let i = 0; i < ref.data.length; i += 4) {
        ref.data[i] = Math.min(255, ref.data[i] + 40);
      }
      const refMetrics = extractColorMetrics(ref);

      // Test lower bound 0.15
      const harmonized15 = applyHarmonizeSync(createSyntheticImageData(50, 50), refMetrics, 0.15);
      for (let i = 0; i < harmonized15.data.length; i += 4) {
        expect(harmonized15.data[i]).toBeGreaterThanOrEqual(0);
        expect(harmonized15.data[i]).toBeLessThanOrEqual(255);
        expect(harmonized15.data[i + 3]).toBe(255); // Alpha preserved
      }

      // Test upper bound 0.25
      const harmonized25 = applyHarmonizeSync(createSyntheticImageData(50, 50), refMetrics, 0.25);
      for (let i = 0; i < harmonized25.data.length; i += 4) {
        expect(harmonized25.data[i]).toBeGreaterThanOrEqual(0);
        expect(harmonized25.data[i]).toBeLessThanOrEqual(255);
        expect(harmonized25.data[i + 3]).toBe(255); // Alpha preserved
      }

      // 0.25 should shift red more than 0.15
      const metrics15 = extractColorMetrics(harmonized15);
      const metrics25 = extractColorMetrics(harmonized25);
      expect(metrics25.avgR).toBeGreaterThanOrEqual(metrics15.avgR);
    });
  });

  // 5. Letterbox Math for Fit Mode
  describe('Letterbox & Pillarbox math for fit mode (calculateLetterboxFit)', () => {
    const targetW = PLATFORM_SPECS.ig_post_4_5.width; // 1080
    const targetH = PLATFORM_SPECS.ig_post_4_5.height; // 1350

    it('calculates letterbox for 1920x1080 landscape into 1080x1350', () => {
      const fit = calculateLetterboxFit(1920, 1080, targetW, targetH);
      expect(fit.dw).toBe(1080);
      expect(fit.dh).toBe(608); // Math.round(1080 / (1920/1080)) = 608
      expect(fit.dx).toBe(0);
      expect(fit.dy).toBe(371); // Math.round((1350 - 608) / 2) = 371
      expect(fit.dy * 2 + fit.dh).toBeCloseTo(targetH, 0);
    });

    it('calculates pillarbox for 1080x1920 portrait into 1080x1350', () => {
      const fit = calculateLetterboxFit(1080, 1920, targetW, targetH);
      expect(fit.dh).toBe(1350);
      expect(fit.dw).toBe(759); // Math.round(1350 * (1080/1920)) = 759
      expect(fit.dx).toBe(161); // Math.round((1080 - 759) / 2) = 161
      expect(fit.dy).toBe(0);
      expect(Math.abs(fit.dx * 2 + fit.dw - targetW)).toBeLessThanOrEqual(1);
    });

    it('centers perfectly with 0 offsets when input matches target ratio', () => {
      const fit = calculateLetterboxFit(1080, 1350, targetW, targetH);
      expect(fit.dw).toBe(1080);
      expect(fit.dh).toBe(1350);
      expect(fit.dx).toBe(0);
      expect(fit.dy).toBe(0);
    });
  });
});
