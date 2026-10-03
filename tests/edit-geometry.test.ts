import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EDIT_CROP,
  cropGeometry,
  editOutputSize,
  editPreviewSize,
  drawEditGeometry,
  screenDeltaToImage,
  clampEditCrop,
  EDIT_MAX_ZOOM,
} from '../lib/engine/edit-geometry';
import { drawCarouselFrame, CarouselPreviewRenderer, CarouselRenderOptions } from '../lib/engine/carousel-render';
import { upscaleFactorAllowed, UPSCALE_MAX_LONG_EDGE } from '../lib/engine/upscale-lanczos';
import { PLATFORM_SPECS } from '../lib/export/platform-specs';
import { planExportDownload, mimeForFormat } from '../lib/export/export-plan';
import { EditCrop } from '../lib/core/types';
import { FakeContext, FakeImage, makePhoto, asCtx, asImg, countDiff } from './helpers/fake-canvas';

const crop = (patch: Partial<EditCrop>): EditCrop => ({ ...DEFAULT_EDIT_CROP, ...patch });

describe('Düzenle crop math: aspects (spec §4.5 E4, E6)', () => {
  it('gives the largest crop for each aspect at the source resolution', () => {
    const size = (p: Partial<EditCrop>) => editOutputSize(4000, 3000, crop(p));
    expect(size({ aspect: 'original' })).toEqual({ width: 4000, height: 3000 });
    expect(size({ aspect: '1:1' })).toEqual({ width: 3000, height: 3000 });
    expect(size({ aspect: '4:5' })).toEqual({ width: 2400, height: 3000 });
    expect(size({ aspect: '9:16' })).toEqual({ width: 1688, height: 3000 });
    expect(size({ aspect: '16:9' })).toEqual({ width: 4000, height: 2250 });
    expect(size({ aspect: 'free', freeRatio: 2 })).toEqual({ width: 4000, height: 2000 });
    expect(size({ aspect: 'free', freeRatio: 0 })).toEqual({ width: 4000, height: 3000 });
  });

  it('caps the long edge at 4096 and keeps the aspect', () => {
    expect(editOutputSize(6000, 4000, crop({}))).toEqual({ width: 4096, height: 2731 });
    expect(editOutputSize(3000, 8000, crop({ aspect: '9:16' }))).toEqual({ width: 2304, height: 4096 });
  });

  it('zoom shrinks the crop region (lower output size, never upscaled)', () => {
    expect(editOutputSize(4000, 3000, crop({ zoom: 2 }))).toEqual({ width: 2000, height: 1500 });
    expect(clampEditCrop(crop({ zoom: 99 })).zoom).toBe(EDIT_MAX_ZOOM);
    expect(clampEditCrop(crop({ zoom: 0.1 })).zoom).toBe(1);
  });

  it('preview long edge is at most 1350 and never larger than the export', () => {
    expect(editPreviewSize({ width: 4000, height: 3000 })).toEqual({ width: 1350, height: 1013 });
    expect(editPreviewSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });
});

describe('Düzenle crop math: rotation, fine angle, flip', () => {
  it('90° rotation swaps the source axes', () => {
    expect(editOutputSize(4000, 3000, crop({ rotation: 90 }))).toEqual({ width: 3000, height: 4000 });
    expect(editOutputSize(4000, 3000, crop({ rotation: 270, aspect: '4:5' }))).toEqual({ width: 3000, height: 3750 });
    expect(editOutputSize(4000, 3000, crop({ rotation: 180 }))).toEqual({ width: 4000, height: 3000 });
  });

  it('fine angle shrinks the crop so the frame stays fully inside the photo, for any pan', () => {
    for (const angle of [-10, -4.5, 3, 10]) {
      for (const aspect of ['original', '1:1', '9:16', '16:9'] as const) {
        for (const [panX, panY] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0.4, -0.7]]) {
          const g = cropGeometry(4000, 3000, crop({ angle, aspect, panX, panY, zoom: 1.3 }));
          const c = Math.cos(g.theta);
          const s = Math.sin(g.theta);
          // Frame corners (output axes) → image axes: o + R(−θ)·corner
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const x = (sx * g.cw) / 2;
            const y = (sy * g.ch) / 2;
            const ix = g.ox + (x * c + y * s);
            const iy = g.oy + (-x * s + y * c);
            expect(Math.abs(ix)).toBeLessThanOrEqual(g.Wr / 2 + 1e-6);
            expect(Math.abs(iy)).toBeLessThanOrEqual(g.Hr / 2 + 1e-6);
          }
        }
      }
    }
    expect(editOutputSize(4000, 3000, crop({ angle: 10 })).width).toBeLessThan(4000);
  });

  it('screen drag maps into image axes (flip mirrors x, angle rotates)', () => {
    expect(screenDeltaToImage(10, 5, 0, false)).toEqual({ x: 10, y: 5 });
    expect(screenDeltaToImage(10, 5, 0, true)).toEqual({ x: -10, y: 5 });
    const r = screenDeltaToImage(10, 0, Math.PI / 2, false);
    expect(r.x).toBeCloseTo(0, 9);
    expect(r.y).toBeCloseTo(-10, 9);
  });

  // Quadrant photo: TL red, TR green, BL blue, BR white
  function quadrants(w: number, h: number): FakeImage {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const right = x >= w / 2;
        const bottom = y >= h / 2;
        const rgb = !right && !bottom ? [255, 0, 0] : right && !bottom ? [0, 255, 0] : !right ? [0, 0, 255] : [255, 255, 255];
        data.set([...rgb, 255], i);
      }
    }
    return { width: w, height: h, naturalWidth: w, naturalHeight: h, data };
  }
  const px = (c: FakeContext, x: number, y: number) => Array.from(c.buf.subarray((y * c.width + x) * 4, (y * c.width + x) * 4 + 3));

  it('draws 90° rotation clockwise and flip as a horizontal mirror of the output', () => {
    const img = quadrants(40, 20);
    const rot = new FakeContext(20, 40);
    drawEditGeometry(asCtx(rot), asImg(img), 20, 40, crop({ rotation: 90 }));
    // Clockwise: source bottom-left (blue) goes to output top-left
    expect(px(rot, 2, 2)).toEqual([0, 0, 255]);
    expect(px(rot, 17, 2)).toEqual([255, 0, 0]);
    expect(px(rot, 2, 37)).toEqual([255, 255, 255]);

    const plain = new FakeContext(40, 20);
    const flipped = new FakeContext(40, 20);
    drawEditGeometry(asCtx(plain), asImg(img), 40, 20, crop({}));
    drawEditGeometry(asCtx(flipped), asImg(img), 40, 20, crop({ flipH: true }));
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 40; x++) expect(px(flipped, x, y)).toEqual(px(plain, 39 - x, y));
    }
  });
});

describe('Düzenle preview/export parity at export size (spec §4.5 E5, M2 rules)', () => {
  const photo = makePhoto(1500, 1000);
  const cases: [string, EditCrop, string | null][] = [
    ['4:5 + 90° + angle 7° + flip + zoom/pan + amber_grain', crop({ aspect: '4:5', rotation: 90, angle: 7, flipH: true, zoom: 1.6, panX: 0.5, panY: -0.3 }), 'amber_grain'],
    ['free 1.9 + angle −10° + night_cinematic', crop({ aspect: 'free', freeRatio: 1.9, angle: -10, zoom: 1.2, panX: -1, panY: 1 }), 'night_cinematic'],
    ['original, no preset', crop({}), null],
  ];

  for (const [name, c, presetId] of cases) {
    it(`preview renderer equals export pixel for pixel: ${name}`, () => {
      const out = editOutputSize(photo.width, photo.height, c);
      const opts: CarouselRenderOptions = { fitMode: 'fill', crop: c, presetId, presetIntensity: 0.8, outputWidth: out.width };

      const exported = new FakeContext(out.width, out.height);
      drawCarouselFrame(asCtx(exported), asImg(photo), out.width, out.height, opts);

      const preview = new FakeContext(out.width, out.height);
      const renderer = new CarouselPreviewRenderer();
      renderer.render(asCtx(preview), asImg(photo), 'p', out.width, out.height, { ...opts, presetId: 'monochrome_noir' });
      renderer.render(asCtx(preview), asImg(photo), 'p', out.width, out.height, opts);

      expect(countDiff(preview.buf, exported.buf)).toBe(0);
    });
  }

  it('a crop change invalidates the cached base', () => {
    const a = crop({ aspect: '1:1' });
    const b = crop({ aspect: '1:1', panX: 1 });
    const out = editOutputSize(photo.width, photo.height, a);
    const renderer = new CarouselPreviewRenderer();
    const ctx = new FakeContext(out.width, out.height);
    renderer.render(asCtx(ctx), asImg(photo), 'p', out.width, out.height, { fitMode: 'fill', crop: a });
    renderer.render(asCtx(ctx), asImg(photo), 'p', out.width, out.height, { fitMode: 'fill', crop: b });
    const exp = new FakeContext(out.width, out.height);
    drawCarouselFrame(asCtx(exp), asImg(photo), out.width, out.height, { fitMode: 'fill', crop: b });
    expect(countDiff(ctx.buf, exp.buf)).toBe(0);
  });
});

describe('Düzenle export target and Upscale safe limit (spec §4.5 E8, E9)', () => {
  it('always one direct file named duzenle_01, JPEG 0.97 under 8 MB', () => {
    expect(PLATFORM_SPECS.edit.filePrefix).toBe('duzenle');
    expect(PLATFORM_SPECS.edit.quality).toBe(0.97);
    expect(PLATFORM_SPECS.edit.maxBytes).toBe(8 * 1024 * 1024);
    expect(planExportDownload(1, PLATFORM_SPECS.edit.filePrefix, 'jpeg')).toEqual({ kind: 'single', fileName: 'duzenle_01.jpg' });
    expect(planExportDownload(1, PLATFORM_SPECS.edit.filePrefix, 'png')).toEqual({ kind: 'single', fileName: 'duzenle_01.png' });
    expect(mimeForFormat('jpeg')).toBe('image/jpeg');
  });

  it('Upscale factor is closed when the output long edge would pass 8192', () => {
    expect(UPSCALE_MAX_LONG_EDGE).toBe(8192);
    expect(upscaleFactorAllowed(4096, 3000, 2)).toBe(true);
    expect(upscaleFactorAllowed(4096, 3000, 4)).toBe(false);
    expect(upscaleFactorAllowed(2048, 1536, 4)).toBe(true);
    expect(upscaleFactorAllowed(5000, 3000, 2)).toBe(false);
  });
});
