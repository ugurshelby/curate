import { describe, it, expect } from 'vitest';
import {
  drawCarouselFrame,
  CarouselPreviewRenderer,
  extractHeroMetrics,
  renderCarouselBase,
  CarouselRenderOptions,
} from '../lib/engine/carousel-render';
import { extractColorMetrics } from '../lib/engine/harmonize';
import { applyPresetToImageData, CURATE_PRESETS, parseCubeLUT } from '../lib/engine/presets';

/**
 * Minimal deterministic 2D context (Node has no canvas): RGBA buffer, nearest-neighbour drawImage,
 * fillRect with hex colour, getImageData copy, putImageData write. Both preview and export run on it,
 * so any difference comes from the pipeline, not from the context.
 */
function makeImageData(width: number, height: number, data?: Uint8ClampedArray): ImageData {
  return { width, height, data: data ?? new Uint8ClampedArray(width * height * 4), colorSpace: 'srgb' } as ImageData;
}

class FakeContext {
  fillStyle = '#000000';
  readonly buf: Uint8ClampedArray;
  constructor(public width: number, public height: number) {
    this.buf = new Uint8ClampedArray(width * height * 4);
  }
  fillRect(x: number, y: number, w: number, h: number) {
    const hex = String(this.fillStyle).replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * this.width + xx) * 4;
        this.buf[i] = r;
        this.buf[i + 1] = g;
        this.buf[i + 2] = b;
        this.buf[i + 3] = 255;
      }
    }
  }
  drawImage(img: FakeImage, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const srcX = Math.min(img.width - 1, Math.floor(sx + ((xx + 0.5) * sw) / dw));
        const srcY = Math.min(img.height - 1, Math.floor(sy + ((yy + 0.5) * sh) / dh));
        const si = (srcY * img.width + srcX) * 4;
        const di = ((dy + yy) * this.width + (dx + xx)) * 4;
        this.buf[di] = img.data[si];
        this.buf[di + 1] = img.data[si + 1];
        this.buf[di + 2] = img.data[si + 2];
        this.buf[di + 3] = 255;
      }
    }
  }
  getImageData(x: number, y: number, w: number, h: number): ImageData {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) {
      const start = ((y + yy) * this.width + x) * 4;
      out.set(this.buf.subarray(start, start + w * 4), yy * w * 4);
    }
    return makeImageData(w, h, out);
  }
  putImageData(d: ImageData, x: number, y: number) {
    for (let yy = 0; yy < d.height; yy++) {
      const start = ((y + yy) * this.width + x) * 4;
      this.buf.set(d.data.subarray(yy * d.width * 4, (yy + 1) * d.width * 4), start);
    }
  }
}

interface FakeImage {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  data: Uint8ClampedArray;
}

/** Synthetic photo: gradients plus bright patches (halation) and a dark band (shadows). */
function makePhoto(width: number, height: number): FakeImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const bright = (x % 37 < 6 && y % 29 < 5) ? 250 : 0;
      data[i] = Math.max(bright, Math.round((x / width) * 220));
      data[i + 1] = Math.max(bright, Math.round((y / height) * 200));
      data[i + 2] = Math.max(bright, y > height * 0.8 ? 20 : 140);
      data[i + 3] = 255;
    }
  }
  return { width, height, naturalWidth: width, naturalHeight: height, data };
}

const W = 1080;
const H = 1350;
const asCtx = (c: FakeContext) => c as unknown as CanvasRenderingContext2D;
const asImg = (i: FakeImage) => i as unknown as HTMLImageElement;

function exportPixels(img: FakeImage, opts: CarouselRenderOptions): Uint8ClampedArray {
  const ctx = new FakeContext(W, H);
  drawCarouselFrame(asCtx(ctx), asImg(img), W, H, opts);
  return ctx.buf;
}

function countDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

const hero = { luminance: 140, temperature: 10, tint: -3, avgR: 150, avgG: 135, avgB: 110 };

describe('Carousel preview/export parity at 1080×1350 (spec §4.4 M2-a)', () => {
  const landscape = makePhoto(1600, 1000);
  const portrait = makePhoto(900, 1600);

  const cases: [string, FakeImage, CarouselRenderOptions][] = [
    ['fill + amber_grain + hero', landscape, { fitMode: 'fill', presetId: 'amber_grain', presetIntensity: 0.8, heroColorMetrics: hero, outputWidth: W }],
    ['fill + night_cinematic', portrait, { fitMode: 'fill', presetId: 'night_cinematic', presetIntensity: 1, outputWidth: W }],
    ['fit (letterbox) + moody_teal + hero', landscape, { fitMode: 'fit', presetId: 'moody_teal', presetIntensity: 0.6, heroColorMetrics: hero, outputWidth: W }],
    ['fit (pillarbox) + no preset', portrait, { fitMode: 'fit', presetId: null, outputWidth: W }],
  ];

  for (const [name, img, opts] of cases) {
    it(`preview renderer equals export pixel for pixel: ${name}`, () => {
      const exported = exportPixels(img, opts);

      const ctx = new FakeContext(W, H);
      const renderer = new CarouselPreviewRenderer();
      // First call builds the cached base with a different look, second call reuses the cache
      renderer.render(asCtx(ctx), asImg(img), 'photo', W, H, { ...opts, presetId: 'monochrome_noir' });
      renderer.render(asCtx(ctx), asImg(img), 'photo', W, H, opts);

      expect(countDiff(ctx.buf, exported)).toBe(0);
    });
  }

  it('slider sequence (draft 540×675 then full) ends equal to export', () => {
    const opts: CarouselRenderOptions = { fitMode: 'fill', presetId: 'amber_grain', presetIntensity: 0.5, outputWidth: W };
    const renderer = new CarouselPreviewRenderer();
    const draft = new FakeContext(W / 2, H / 2);
    for (const t of [0.2, 0.35, 0.5]) {
      renderer.render(asCtx(draft), asImg(landscape), 'photo', W / 2, H / 2, { ...opts, presetIntensity: t });
    }
    const full = new FakeContext(W, H);
    renderer.render(asCtx(full), asImg(landscape), 'photo', W, H, opts);
    expect(countDiff(full.buf, exportPixels(landscape, opts))).toBe(0);
  });

  it('TikTok target 1080×1920: preview equals export (fill and fit)', () => {
    const TW = 1080;
    const TH = 1920;
    for (const fitMode of ['fill', 'fit'] as const) {
      const opts: CarouselRenderOptions = { fitMode, presetId: 'warm_silhouette', presetIntensity: 0.9, heroColorMetrics: hero, outputWidth: TW };
      const exp = new FakeContext(TW, TH);
      drawCarouselFrame(asCtx(exp), asImg(landscape), TW, TH, opts);
      const prev = new FakeContext(TW, TH);
      const renderer = new CarouselPreviewRenderer();
      renderer.render(asCtx(prev), asImg(landscape), 'photo', TW, TH, { ...opts, presetId: null });
      renderer.render(asCtx(prev), asImg(landscape), 'photo', TW, TH, opts);
      expect(countDiff(prev.buf, exp.buf)).toBe(0);
    }
  });

  it('.cube LUT look is identical in preview and export', () => {
    const lines = ['LUT_3D_SIZE 2'];
    for (let b = 0; b < 2; b++) for (let g = 0; g < 2; g++) for (let r = 0; r < 2; r++) lines.push(`${r * 0.9} ${g} ${b * 0.8}`);
    const lut = parseCubeLUT(lines.join('\n'), 'test');
    const opts: CarouselRenderOptions = { fitMode: 'fill', customLut: lut, presetId: 'custom_lut', presetIntensity: 0.7, outputWidth: W };
    const ctx = new FakeContext(W, H);
    new CarouselPreviewRenderer().render(asCtx(ctx), asImg(portrait), 'p', W, H, opts);
    expect(countDiff(ctx.buf, exportPixels(portrait, opts))).toBe(0);
  });
});

describe('Grain follows the export grid (draft preview stands for export pixels)', () => {
  it('a half-size preview pixel carries the grain of the export pixel it represents', () => {
    const amber = CURATE_PRESETS.find((p) => p.id === 'amber_grain')!;
    const flat = (w: number, h: number) => makeImageData(w, h, new Uint8ClampedArray(w * h * 4).fill(128));
    const big = applyPresetToImageData(flat(16, 20), amber, 1, { resolutionScale: 1 });
    const small = applyPresetToImageData(flat(8, 10), amber, 1, { resolutionScale: 2 });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 8; x++) {
        const si = (y * 8 + x) * 4;
        const bi = (2 * y * 16 + 2 * x) * 4;
        expect(small.data[si]).toBe(big.data[bi]);
      }
    }
  });

  it('resolutionScale 1 keeps the original export grain unchanged', () => {
    const amber = CURATE_PRESETS.find((p) => p.id === 'amber_grain')!;
    const a = applyPresetToImageData(makeImageData(12, 12, new Uint8ClampedArray(576).fill(100)), amber, 1);
    const b = applyPresetToImageData(makeImageData(12, 12, new Uint8ClampedArray(576).fill(100)), amber, 1, { resolutionScale: 1 });
    expect(countDiff(a.data, b.data)).toBe(0);
  });
});

describe('Hero harmonize metrics come from the raw frame (audit finding #5)', () => {
  it('ignores the preset currently shown and equals the metrics of the plain crop', () => {
    const img = makePhoto(1600, 1000);

    // The preview canvas shows a strong preset (what the old code read from)
    const shown = new FakeContext(W, H);
    drawCarouselFrame(asCtx(shown), asImg(img), W, H, { fitMode: 'fill', presetId: 'monochrome_noir', presetIntensity: 1 });
    const filteredMetrics = extractColorMetrics(shown.getImageData(0, 0, W, H));

    const metrics = extractHeroMetrics(asCtx(new FakeContext(W, H)), asImg(img), W, H, 'fill');
    const raw = renderCarouselBase(asCtx(new FakeContext(W, H)), asImg(img), W, H, { fitMode: 'fill', heroColorMetrics: null });

    expect(metrics).toEqual(extractColorMetrics(raw.imageData));
    // Monochrome removes color: the old source would have reported R ≈ G ≈ B
    expect(Math.abs(filteredMetrics.avgR - filteredMetrics.avgB)).toBeLessThan(1);
    expect(Math.abs(metrics.avgR - metrics.avgB)).toBeGreaterThan(5);
  });
});
