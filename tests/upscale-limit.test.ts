import { describe, it, expect } from 'vitest';
import { upscaleFactorAllowed, UPSCALE_MAX_LONG_EDGE, UPSCALE_MAX_PIXELS } from '../lib/engine/upscale-lanczos';

describe('Upscale safe limit: long edge ≤ 8192 AND area ≤ 16 MP (spec §4.5, assumption)', () => {
  it('uses 8192 px and 16,000,000 px', () => {
    expect(UPSCALE_MAX_LONG_EDGE).toBe(8192);
    expect(UPSCALE_MAX_PIXELS).toBe(16_000_000);
  });

  it('area boundary: exactly 16 MP is open, one pixel more is closed', () => {
    // 2x of 2000×2000 → 4000×4000 = 16,000,000
    expect(upscaleFactorAllowed(2000, 2000, 2)).toBe(true);
    // factor 1 isolates the area rule; the smallest rectangles above 16 MP with sides ≤ 8192
    expect(4000 * 4000).toBe(16_000_000);
    expect(upscaleFactorAllowed(4000, 4000, 1)).toBe(true);
    expect(upscaleFactorAllowed(4000, 4001, 1)).toBe(false); // 16,004,000 px
    expect(upscaleFactorAllowed(3200, 5000, 1)).toBe(true); // 16,000,000 px
    expect(upscaleFactorAllowed(3201, 5000, 1)).toBe(false); // 16,005,000 px
  });

  it('long-edge boundary: 8192 is open, 8193 is closed (area under 16 MP)', () => {
    expect(upscaleFactorAllowed(8192, 100, 1)).toBe(true);
    expect(upscaleFactorAllowed(8193, 100, 1)).toBe(false);
    expect(upscaleFactorAllowed(4096, 100, 2)).toBe(true); // 8192 × 200
    expect(upscaleFactorAllowed(4097, 100, 2)).toBe(false); // 8194 × 200
  });

  it('D1 example: 2120×3374 → 2x = 4240×6748 (28.6 MP) is closed, and 4x too', () => {
    expect(4240 * 6748).toBe(28_611_520);
    expect(upscaleFactorAllowed(2120, 3374, 2)).toBe(false);
    expect(upscaleFactorAllowed(2120, 3374, 4)).toBe(false);
  });

  it('typical inputs', () => {
    expect(upscaleFactorAllowed(1080, 1350, 2)).toBe(true); // 2160×2700 = 5.8 MP
    expect(upscaleFactorAllowed(1080, 1350, 4)).toBe(false); // 4320×5400 = 23.3 MP
    expect(upscaleFactorAllowed(1000, 1000, 4)).toBe(true); // 4000×4000 = 16 MP
  });
});
