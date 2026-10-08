import { describe, it, expect } from 'vitest';
import { frameLayout, frameStampText, frameCoverCrop, FRAME_UNIT } from '../lib/engine/frame-render';
import { FRAME_SIZES, FRAME_SIZE_IDS, frameOutputSize } from '../lib/export/platform-specs';
import { sanitizePrefs, DEFAULT_PREFS } from '../lib/core/prefs';

const cfg = { frameType: 'polaroid' as const, borderWidth: 24, borderRadius: 12 };

describe('Çerçeve standart boyutları (D29)', () => {
  it('her boyutun oranı etiketiyle eşleşir ve kısa kenar 1080', () => {
    for (const s of FRAME_SIZES) {
      const [a, b] = s.ratio.split(':').map(Number);
      expect(Math.abs(s.width / s.height - a / b)).toBeLessThan(0.005);
      expect(Math.min(s.width, s.height)).toBeLessThanOrEqual(1080);
    }
    expect(new Set(FRAME_SIZE_IDS).size).toBe(FRAME_SIZES.length);
    expect(FRAME_SIZES[0]).toMatchObject({ id: '4_5', width: 1080, height: 1350 });
  });

  it('4K çözünürlük iki katı; 16:9 → 3840×2160', () => {
    expect(frameOutputSize('16_9', 'high')).toMatchObject({ width: 3840, height: 2160 });
    expect(frameOutputSize('4_5', 'standard')).toMatchObject({ width: 1080, height: 1350 });
  });
});

describe('frameLayout', () => {
  it('1080×1350 eski export ile aynı ölçüler', () => {
    const L = frameLayout(1080, 1350, cfg);
    const pad = Math.round(24 * FRAME_UNIT);
    expect(L.photo.x).toBe(pad);
    expect(L.photo.w).toBe(1080 - pad * 2);
    expect(L.photo.h).toBe(1350 - pad - Math.round(24 * 2.2 * FRAME_UNIT));
    expect(L.photo.r).toBe(Math.round(12 * FRAME_UNIT));
  });

  it('ölçeklenir: önizleme boyutu export ile aynı oranları verir', () => {
    for (const s of FRAME_SIZES) {
      const big = frameLayout(s.width, s.height, cfg);
      const small = frameLayout(Math.round(s.width / 3), Math.round(s.height / 3), cfg);
      expect(Math.abs(small.photo.x / (s.width / 3) - big.photo.x / s.width)).toBeLessThan(0.01);
      expect(Math.abs(small.photo.h / (s.height / 3) - big.photo.h / s.height)).toBeLessThan(0.01);
      expect(big.photo.w).toBeGreaterThan(0);
      expect(big.photo.h).toBeGreaterThan(0);
    }
  });

  it('köşe yarıçapı foto penceresini aşmaz', () => {
    const L = frameLayout(1080, 566, { frameType: 'polaroid', borderWidth: 56, borderRadius: 32 });
    expect(L.photo.r).toBeLessThanOrEqual(Math.min(L.photo.w, L.photo.h) / 2);
  });

  it('cover kırpım hedef oranı korur', () => {
    const c = frameCoverCrop(4000, 3000, 900, 1200);
    expect(c.sw / c.sh).toBeCloseTo(0.75, 5);
    expect(c.sx).toBeGreaterThan(0);
  });

  it("damga biçimi 'yy mm dd", () => {
    expect(frameStampText(new Date(2026, 9, 8))).toBe("'26 10 08");
  });
});

describe('Çerçeve tercihleri', () => {
  it('bilinmeyen boyut ve çözünürlük varsayılana döner', () => {
    const p = sanitizePrefs({ v: 1, frame: { size: '7_3', resolution: 'ultra' } });
    expect(p.frame.size).toBe(DEFAULT_PREFS.frame.size);
    expect(p.frame.resolution).toBe('standard');
    const q = sanitizePrefs({ v: 1, frame: { size: '16_9', resolution: 'high' } });
    expect(q.frame).toMatchObject({ size: '16_9', resolution: 'high' });
  });
});
