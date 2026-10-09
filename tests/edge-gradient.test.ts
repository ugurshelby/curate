import { describe, it, expect } from 'vitest';
import {
  buildEdgeGradient,
  chooseGradientAxis,
  chroma,
  deltaE,
  edgeGradientPixels,
  extractEdgeColors,
  gradientColorAt,
  gradientStops,
  hexToLab,
  labToHex,
  paintEdgeGradient,
  simpleGradientSpec,
  srgbToOklab,
  EDGE_L_MAX,
  EDGE_L_MIN,
  type Lab,
} from '../lib/engine/edge-gradient';
import { drawFrame } from '../lib/engine/frame-render';
import { FakeContext, makeImageData } from './helpers/fake-canvas';

type RGB = [number, number, number];
const BLUE: RGB = [20, 60, 220];
const RED: RGB = [220, 30, 30];
const WHITE: RGB = [255, 255, 255];
const ORANGE: RGB = [255, 140, 0];
const NAVY: RGB = [10, 30, 90];

function paint(w: number, h: number, f: (x: number, y: number) => RGB): ImageData {
  const img = makeImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y);
      img.data.set([r, g, b, 255], (y * w + x) * 4);
    }
  return img;
}

const lab = (c: RGB): Lab => srgbToOklab(...c);
const pixelLab = (px: Uint8ClampedArray, w: number, x: number, y: number): Lab => srgbToOklab(px[(y * w + x) * 4], px[(y * w + x) * 4 + 1], px[(y * w + x) * 4 + 2]);

/** Left half blue, right half red, white box in the middle (owner's example) */
const blueRedWhite = () =>
  paint(400, 300, (x, y) => (x > 120 && x < 280 && y > 90 && y < 210 ? WHITE : x < 200 ? BLUE : RED));

/** The old behaviour for comparison: plain mean of all pixels */
function meanColor(img: ImageData): Lab {
  let r = 0, g = 0, b = 0;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    r += img.data[i * 4];
    g += img.data[i * 4 + 1];
    b += img.data[i * 4 + 2];
  }
  return srgbToOklab(r / n, g / n, b / n);
}

describe('smart edge gradient (D33): owner example, left blue / centre white / right red', () => {
  const img = blueRedWhite();
  const colors = extractEdgeColors(img);

  it('edge and centre colours are the dominant colours, not averages', () => {
    expect(deltaE(colors.left, lab(BLUE))).toBeLessThan(0.06);
    expect(deltaE(colors.right, lab(RED))).toBeLessThan(0.06);
    expect(deltaE(colors.center, lab(WHITE))).toBeLessThan(0.07);
  });

  it('axis follows the strongest edge contrast: horizontal here', () => {
    expect(chooseGradientAxis(colors)).toBe('horizontal');
  });

  it('output runs blue → white → red, saturated, and is far from the old average-based colour', () => {
    const W = 540;
    const H = 120;
    const spec = buildEdgeGradient(colors, 'horizontal');
    const px = edgeGradientPixels(W, H, spec);
    const left = pixelLab(px, W, 0, 60);
    const mid = pixelLab(px, W, W / 2, 60);
    const right = pixelLab(px, W, W - 1, 60);
    expect(deltaE(left, lab(BLUE))).toBeLessThan(0.06);
    expect(deltaE(right, lab(RED))).toBeLessThan(0.06);
    expect(deltaE(mid, lab(WHITE))).toBeLessThan(0.07);
    // saturation kept at the ends
    expect(chroma(left)).toBeGreaterThan(0.15);
    expect(chroma(right)).toBeGreaterThan(0.15);
    // the old average colour is a dull purple-grey; the new ends are clearly different
    const old = meanColor(img);
    expect(deltaE(left, old)).toBeGreaterThan(0.2);
    expect(deltaE(right, old)).toBeGreaterThan(0.2);
    // the average-based background had low chroma; every end now beats it by a wide margin
    expect(chroma(left)).toBeGreaterThan(chroma(old) * 1.5);
  });

  it('left half blends blue → centre, right half centre → red (monotone in lightness toward the centre)', () => {
    const spec = buildEdgeGradient(colors, 'horizontal');
    const L = Array.from({ length: 9 }, (_, i) => gradientColorAt(spec, i / 16).L); // left half
    for (let i = 1; i < L.length; i++) expect(L[i]).toBeGreaterThanOrEqual(L[i - 1] - 1e-9);
  });
});

describe('smart edge gradient: vertical free space', () => {
  // top edge orange, bottom edge navy, neutral light centre; side edges mix both (same on left and right)
  const img = paint(300, 400, (x, y) => (x > 90 && x < 210 && y > 120 && y < 280 ? [200, 200, 200] : y < 200 ? ORANGE : NAVY));
  const colors = extractEdgeColors(img);

  it('vertical margins pick the vertical axis even if the colour contrast rule would not', () => {
    expect(chooseGradientAxis(colors, { x: 20, y: 500 })).toBe('vertical');
    expect(chooseGradientAxis(colors, { x: 500, y: 20 })).toBe('horizontal');
    // equal margins fall back to contrast: left/right are the same mix, so top/bottom wins
    expect(chooseGradientAxis(colors, { x: 100, y: 100 })).toBe('vertical');
    expect(chooseGradientAxis(colors)).toBe('vertical');
  });

  it('runs orange → centre → dark blue from top to bottom', () => {
    const W = 80;
    const H = 400;
    const px = edgeGradientPixels(W, H, buildEdgeGradient(colors, 'vertical'));
    expect(deltaE(pixelLab(px, W, 40, 0), lab(ORANGE))).toBeLessThan(0.06);
    expect(deltaE(pixelLab(px, W, 40, H - 1), lab(NAVY))).toBeLessThan(0.06);
    expect(deltaE(pixelLab(px, W, 40, H / 2), lab([200, 200, 200]))).toBeLessThan(0.06);
  });
});

describe('smart edge gradient: edge cases', () => {
  it('uniform edges give a flat colour without NaN or steps', () => {
    const img = paint(120, 90, () => [90, 140, 60]);
    const colors = extractEdgeColors(img);
    const px = edgeGradientPixels(64, 64, buildEdgeGradient(colors, chooseGradientAxis(colors)));
    const first = pixelLab(px, 64, 0, 0);
    for (let y = 0; y < 64; y += 9)
      for (let x = 0; x < 64; x += 9) {
        const p = pixelLab(px, 64, x, y);
        expect(Number.isFinite(p.L)).toBe(true);
        expect(deltaE(p, first)).toBeLessThan(0.01);
      }
    expect(deltaE(first, lab([90, 140, 60]))).toBeLessThan(0.02);
  });

  it('lightness is limited: pure black and pure white edges do not make black/blown-out bands', () => {
    const black = extractEdgeColors(paint(60, 60, () => [0, 0, 0]));
    const white = extractEdgeColors(paint(60, 60, () => [255, 255, 255]));
    expect(black.left.L).toBeGreaterThanOrEqual(EDGE_L_MIN - 1e-9);
    expect(white.left.L).toBeLessThanOrEqual(EDGE_L_MAX + 1e-9);
  });

  it('the visible crop is what is sampled (right half of the photo only → red edges)', () => {
    const img = blueRedWhite();
    const c = extractEdgeColors(img, { x: 200, y: 0, w: 200, h: 300 });
    expect(deltaE(c.left, lab(RED))).toBeLessThan(0.06);
    expect(deltaE(c.right, lab(RED))).toBeLessThan(0.06);
  });

  it('hex round trip stays close', () => {
    for (const hex of ['#1c1c1e', '#ff8c00', '#0a84ff', '#e0e0e0']) {
      const back = labToHex(hexToLab(hex));
      expect(deltaE(hexToLab(back), hexToLab(hex))).toBeLessThan(0.005);
    }
  });

  it('simple two-colour fallback uses the same path', () => {
    const spec = simpleGradientSpec('#1c1c1e', '#000000');
    const px = edgeGradientPixels(10, 100, spec);
    expect(pixelLab(px, 10, 5, 0).L).toBeGreaterThan(pixelLab(px, 10, 5, 99).L);
  });
});

describe('smart edge gradient: smoothness (no banding)', () => {
  it('has at least 5 stops that start and end on the edge colours', () => {
    const spec = buildEdgeGradient(extractEdgeColors(blueRedWhite()), 'horizontal');
    const stops = gradientStops(spec);
    expect(stops.length).toBeGreaterThanOrEqual(5);
    expect(deltaE(stops[0].color, spec.start)).toBeLessThan(1e-9);
    expect(deltaE(stops[stops.length - 1].color, spec.end)).toBeLessThan(1e-9);
  });

  it('adjacent column means change by less than 1.6 levels on a strong blue → white → red ramp', () => {
    const W = 540;
    const H = 200;
    const spec = buildEdgeGradient(extractEdgeColors(blueRedWhite()), 'horizontal');
    const px = edgeGradientPixels(W, H, spec);
    const mean = (x: number, c: number) => {
      let s = 0;
      for (let y = 0; y < H; y++) s += px[(y * W + x) * 4 + c];
      return s / H;
    };
    for (let c = 0; c < 3; c++) {
      let prev = mean(0, c);
      for (let x = 1; x < W; x++) {
        const m = mean(x, c);
        expect(Math.abs(m - prev)).toBeLessThan(1.6);
        prev = m;
      }
    }
  });

  it('a very gentle ramp (≈ 8 levels over 540 px) is dithered: column means follow the float ramp within 0.3 level', () => {
    const W = 540;
    const H = 400;
    const a = hexToLab('#3a3a3e');
    const b = hexToLab('#424246');
    const spec = { axis: 'horizontal' as const, start: a, center: { L: (a.L + b.L) / 2, a: (a.a + b.a) / 2, b: (a.b + b.b) / 2 }, end: b };
    const px = edgeGradientPixels(W, H, spec);
    for (let x = 0; x < W; x += 20) {
      let s = 0;
      for (let y = 0; y < H; y++) s += px[(y * W + x) * 4];
      const col = spec.axis === 'horizontal' ? x / (W - 1) : 0;
      const ideal = labToFloatR(gradientColorAt(spec, col));
      expect(Math.abs(s / H - ideal)).toBeLessThan(0.3);
    }
  });
});

function labToFloatR(c: Lab): number {
  // same maths as the painter, red channel only
  const l = (c.L + 0.3963377774 * c.a + 0.2158037573 * c.b) ** 3;
  const m = (c.L - 0.1055613458 * c.a - 0.0638541728 * c.b) ** 3;
  const s = (c.L - 0.0894841775 * c.a - 1.291485548 * c.b) ** 3;
  const lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const v = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.max(lin, 0) ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, v * 255));
}

describe('smart edge gradient: one code path for preview and export', () => {
  it('same inputs give identical bytes; paintEdgeGradient equals edgeGradientPixels', () => {
    const spec = buildEdgeGradient(extractEdgeColors(blueRedWhite()), 'horizontal');
    const a = edgeGradientPixels(97, 61, spec);
    const b = edgeGradientPixels(97, 61, spec);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    const ctx = new FakeContext(97, 61);
    paintEdgeGradient(ctx as unknown as CanvasRenderingContext2D, 97, 61, spec);
    expect(Buffer.from(ctx.buf).equals(Buffer.from(a))).toBe(true);
  });

  it('drawFrame in gradient mode paints that gradient behind the border (preview size = export size → equal)', () => {
    const colors = extractEdgeColors(blueRedWhite());
    const cfg = { frameType: 'gradient' as const, borderWidth: 24, borderRadius: 12, showTimestamp: false, size: '4_5' as const, resolution: 'standard' as const };
    const run = () => {
      const ctx = new FakeContext(270, 338);
      drawFrame(ctx as unknown as CanvasRenderingContext2D, null, 270, 338, cfg, colors, '');
      return ctx.buf;
    };
    const a = run();
    const b = run();
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    // top-left pixel is not the old grey average: it is a saturated blue
    expect(chroma(srgbToOklab(a[0], a[1], a[2]))).toBeGreaterThan(0.15);
  });

  it('edge sampling from a 256 px sample is cheap (< 100 ms)', () => {
    const img = paint(256, 192, (x) => (x < 128 ? BLUE : RED));
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) extractEdgeColors(img, { x: 10, y: 10, w: 200, h: 150 });
    expect((performance.now() - t0) / 5).toBeLessThan(100);
  });
});
