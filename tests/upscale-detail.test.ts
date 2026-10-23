import { describe, expect, it } from 'vitest';
import { clampDetailView, detailOffset, detailSourceRect, visibleResultRect, type PixelRect } from '../lib/engine/upscale-detail';
import { upscaleLanczos3 } from '../lib/engine/upscale-lanczos';

type Img = { width: number; height: number; data: Uint8ClampedArray };

function noise(width: number, height: number, seed = 7): Img {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = seed;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (i & 3) === 3 ? 255 : s & 255;
  }
  return { width, height, data };
}

function crop(src: Img, r: PixelRect): Img {
  const data = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) {
    const from = ((r.y + y) * src.width + r.x) * 4;
    data.set(src.data.subarray(from, from + r.w * 4), y * r.w * 4);
  }
  return { width: r.w, height: r.h, data };
}

describe('Büyüt detail view geometry', () => {
  it('keeps the viewport inside the image and centres a small axis', () => {
    expect(clampDetailView({ cx: 0, cy: 1 }, 400, 300, 2000, 1000)).toEqual({ cx: 0.1, cy: 0.85 });
    expect(clampDetailView({ cx: 0.9, cy: 0.2 }, 400, 300, 300, 1000).cx).toBe(0.5);
  });

  it('maps the centred view to the visible result rectangle', () => {
    const view = { cx: 0.5, cy: 0.5 };
    expect(detailOffset(view, 400, 300, 2000, 1000)).toEqual({ left: -800, top: -350 });
    expect(visibleResultRect(view, 400, 300, 2000, 1000)).toEqual({ x: 800, y: 350, w: 400, h: 300 });
  });

  it('pads the source rectangle and clamps it to the image', () => {
    expect(detailSourceRect({ x: 800, y: 352, w: 400, h: 300 }, 4, 500, 250)).toEqual({ x: 196, y: 84, w: 108, h: 83 });
    expect(detailSourceRect({ x: 0, y: 0, w: 40, h: 40 }, 2, 500, 250)).toEqual({ x: 0, y: 0, w: 24, h: 24 });
  });
});

describe('Büyüt detail parity: Lanczos on a padded crop equals the export upscale', () => {
  for (const scale of [2, 4] as const) {
    it(`${scale}×: every visible pixel matches the full-image result`, () => {
      const src = noise(48, 36);
      const full = upscaleLanczos3(src as ImageData, scale);
      const visible: PixelRect = { x: 37, y: 29, w: 50 * (scale / 2), h: 33 * (scale / 2) };
      const r = detailSourceRect(visible, scale, src.width, src.height);
      const tile = upscaleLanczos3(crop(src, r) as ImageData, scale);
      let diff = 0;
      for (let y = visible.y; y < visible.y + visible.h; y++) {
        for (let x = visible.x; x < visible.x + visible.w; x++) {
          const fi = (y * full.width + x) * 4;
          const ti = ((y - r.y * scale) * tile.width + (x - r.x * scale)) * 4;
          for (let c = 0; c < 4; c++) diff += Math.abs(full.data[fi + c] - tile.data[ti + c]);
        }
      }
      expect(diff).toBe(0);
    });
  }
});
