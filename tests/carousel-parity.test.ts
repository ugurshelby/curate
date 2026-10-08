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

import { FakeContext, FakeImage, makeImageData, makePhoto, asCtx, asImg, countDiff } from './helpers/fake-canvas';

const W = 1080;
const H = 1350;

function exportPixels(img: FakeImage, opts: CarouselRenderOptions): Uint8ClampedArray {
  const ctx = new FakeContext(W, H);
  drawCarouselFrame(asCtx(ctx), asImg(img), W, H, opts);
  return ctx.buf;
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

describe('previewRenderSize (preview at the shown size, never above export)', () => {
  it('caps at the stage box × device pixel ratio and keeps the export ratio', async () => {
    const { previewRenderSize } = await import('../lib/engine/carousel-render');
    // 390 phone: stage 351×439 CSS px, DPR 2.75 → density capped at 2 → 702 px wide
    expect(previewRenderSize(1080, 1350, 351, 439, 2.75)).toEqual({ width: 702, height: 878 });
    expect(previewRenderSize(1080, 1350, 232, 290, 1.5)).toEqual({ width: 348, height: 435 });
    // big box: export size (no upscaling)
    expect(previewRenderSize(1080, 1350, 2000, 2000, 2)).toEqual({ width: 1080, height: 1350 });
    // draft halves
    expect(previewRenderSize(1080, 1350, 2000, 2000, 2, true)).toEqual({ width: 540, height: 675 });
    // unknown box → export size
    expect(previewRenderSize(1080, 1920, 0, 0, 3)).toEqual({ width: 1080, height: 1920 });
    // tall box limited by width
    expect(previewRenderSize(1080, 1920, 300, 1000, 2).width).toBe(600);
  });
});

describe('Düzenle + Düzeltme parity (Faz D2): preview equals export, also through the worker path', () => {
  it('renderer (sync) and the worker-style setBase path both equal the export at the export size', async () => {
    const { DEFAULT_EDIT_CROP } = await import('../lib/engine/edit-geometry');
    const { DEFAULT_CORRECTIONS, applyCorrections } = await import('../lib/engine/corrections');
    const img = makePhoto(900, 700);
    const OW = 600;
    const OH = 600;
    const corrections = {
      ...DEFAULT_CORRECTIONS,
      noise: { on: true, strength: 60 },
      edgeColor: { on: true, strength: 50 },
      edgeSharp: { on: true, strength: 40 },
      shadows: { on: true, strength: 30 },
    };
    const opts: CarouselRenderOptions = {
      fitMode: 'fill',
      crop: { ...DEFAULT_EDIT_CROP, aspect: '1:1' },
      presetId: 'amber_grain',
      presetIntensity: 0.7,
      outputWidth: OW,
      corrections,
    };
    const exp = new FakeContext(OW, OH);
    drawCarouselFrame(asCtx(exp), asImg(img), OW, OH, opts);

    const sync = new FakeContext(OW, OH);
    new CarouselPreviewRenderer().render(asCtx(sync), asImg(img), 'photo', OW, OH, opts);
    expect(countDiff(sync.buf, exp.buf)).toBe(0);

    // worker path: geometry-only base, corrections applied separately, stored with setBase
    const r = new CarouselPreviewRenderer();
    const geo = new FakeContext(OW, OH);
    const base = renderCarouselBase(asCtx(geo), asImg(img), OW, OH, { ...opts, corrections: null });
    applyCorrections(base.imageData, corrections, 1);
    const key = r.baseKey(OW, OH, opts);
    r.setBase('photo', key, base);
    expect(r.hasBase('photo', key)).toBe(true);
    const viaWorker = new FakeContext(OW, OH);
    r.render(asCtx(viaWorker), asImg(img), 'photo', OW, OH, opts);
    expect(countDiff(viaWorker.buf, exp.buf)).toBe(0);
  });
});
