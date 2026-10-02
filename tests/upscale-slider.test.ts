import { describe, it, expect } from 'vitest';
import { calculateUpscaleSplitPos, stepUpscaleSplitPos } from '../lib/engine/upscale-slider';

describe('Bug B: Upscale slider position calculations and accessibility', () => {
  it('calculates percentage position correctly and clamps within [0, 100]', () => {
    expect(calculateUpscaleSplitPos(150, 100, 200)).toBe(25);
    expect(calculateUpscaleSplitPos(200, 100, 200)).toBe(50);
    expect(calculateUpscaleSplitPos(300, 100, 200)).toBe(100);
    // Below bounds clamped to 0
    expect(calculateUpscaleSplitPos(50, 100, 200)).toBe(0);
    // Above bounds clamped to 100
    expect(calculateUpscaleSplitPos(350, 100, 200)).toBe(100);
  });

  it('steps position correctly with keyboard navigation', () => {
    expect(stepUpscaleSplitPos(50, 'left', 5)).toBe(45);
    expect(stepUpscaleSplitPos(50, 'right', 5)).toBe(55);
    expect(stepUpscaleSplitPos(2, 'left', 5)).toBe(0); // clamped at 0
    expect(stepUpscaleSplitPos(98, 'right', 5)).toBe(100); // clamped at 100
    expect(stepUpscaleSplitPos(50, 'home')).toBe(0);
    expect(stepUpscaleSplitPos(50, 'end')).toBe(100);
  });
});
