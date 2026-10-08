import { describe, it, expect } from 'vitest';
import {
  validatePlan,
  applyAiPlan,
  planMapping,
  shapeWeight,
  planTone,
  planSafeScale,
  ADJUST_LIMITS,
  SKIN_COLOR_LIMIT,
  type AiLightPlan,
} from '../lib/engine/ai-plan';
import { DEFAULT_EDIT_CROP, cropGeometry } from '../lib/engine/edit-geometry';
import { drawCarouselFrame, CarouselPreviewRenderer, type CarouselRenderOptions } from '../lib/engine/carousel-render';
import { FakeContext, makeImageData, makePhoto, asCtx, asImg, countDiff } from './helpers/fake-canvas';
import type { EditCrop } from '../lib/core/types';

const base = (over: Partial<AiLightPlan> = {}): AiLightPlan => ({
  version: 1,
  scene: { type: 'other', light: 'mixed', issues: [] },
  global: {},
  regions: [],
  ...over,
});
const flat = (w: number, h: number, v: number | [number, number, number]) => {
  const [r, g, b] = typeof v === 'number' ? [v, v, v] : v;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  return makeImageData(w, h, d);
};
const px = (img: ImageData, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const identity = (w: number, h: number) => planMapping({ crop: null, srcW: w, srcH: h }, w, h);

describe('validatePlan', () => {
  it('clamps out-of-range values and tighter colour shifts on skin/subject', () => {
    const v = validatePlan({
      version: 1,
      scene: { type: 'portrait', light: 'neon', issues: ['flat', 'aliens'] },
      global: { exposure: 3, contrast: -1, temperature: 0.9 },
      regions: [
        { label: 'skin', shape: { type: 'radial', cx: 1.4, cy: 0.5, rx: 0.2, ry: 0.3, feather: 2 }, adjust: { temperature: 0.2, tint: -0.2 } },
      ],
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.plan.global).toEqual({ exposure: ADJUST_LIMITS.exposure, contrast: -ADJUST_LIMITS.contrast, temperature: ADJUST_LIMITS.temperature });
    expect(v.plan.scene).toEqual({ type: 'portrait', light: 'mixed', issues: ['flat'] });
    const r = v.plan.regions[0];
    expect(r.adjust).toEqual({ temperature: SKIN_COLOR_LIMIT, tint: -SKIN_COLOR_LIMIT });
    expect(r.shape).toMatchObject({ type: 'radial', cx: 1, feather: 0.6 });
  });

  it('rejects unknown fields, wrong types, wrong version, bad shapes', () => {
    const ok = { version: 1, scene: {}, global: {}, regions: [] };
    expect(validatePlan(ok).ok).toBe(true);
    for (const bad of [
      null,
      'x',
      { ...ok, version: 2 },
      { ...ok, extra: 1 },
      { ...ok, global: { exposure: 'big' } },
      { ...ok, global: { glow: 0.2 } },
      { ...ok, regions: [{ label: 'moon', shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }, adjust: { exposure: 0.1 } }] },
      { ...ok, regions: [{ label: 'sky', shape: { type: 'star' }, adjust: { exposure: 0.1 } }] },
      { ...ok, regions: [{ label: 'sky', shape: { type: 'polygon', points: [[0, 0], [1, 1]] }, adjust: { exposure: 0.1 } }] },
      { ...ok, regions: [{ label: 'sky', shape: { type: 'linear', x0: 0.5, y0: 0, x1: 0.5, y1: 0.4, blur: 1 }, adjust: {} }] },
    ]) {
      expect(validatePlan(bad).ok).toBe(false);
    }
  });

  it('keeps at most 6 regions and 12 polygon points; drops empty regions', () => {
    const region = { label: 'sky', shape: { type: 'linear', x0: 0, y0: 0, x1: 0, y1: 0.5 }, adjust: { exposure: -0.1 } };
    const many = Array.from({ length: 9 }, () => region);
    const poly = { label: 'foreground', shape: { type: 'polygon', points: Array.from({ length: 20 }, (_, i) => [i / 20, (i % 2) * 0.5 + 0.5]) }, adjust: { exposure: 0.1 } };
    const v = validatePlan({ version: 1, global: {}, regions: [...many.slice(0, 5), poly, { ...region, adjust: {} }] });
    expect(v.ok && v.plan.regions.length).toBe(6);
    if (v.ok) expect((v.plan.regions[5].shape as { points: unknown[] }).points.length).toBe(12);
    const v2 = validatePlan({ version: 1, global: {}, regions: many });
    expect(v2.ok && v2.plan.regions.length).toBe(6);
  });

  it('no added vignette: global darkening + big centred brightening is neutralised', () => {
    const v = validatePlan({
      version: 1,
      global: { exposure: -0.4 },
      regions: [{ label: 'subject', shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.45, ry: 0.45, feather: 0.4 }, adjust: { exposure: 0.4 } }],
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.plan.global.exposure).toBeUndefined();
    expect(v.plan.regions.length).toBe(0);
    expect(v.notes).toContain('vignette pattern neutralised');
  });
});

describe('masks', () => {
  it('radial: centre changes, far corner does not', () => {
    const img = flat(40, 40, 100);
    applyAiPlan(img, base({ regions: [{ label: 'subject', shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2, feather: 0.1 }, adjust: { exposure: 0.5 } }] }), 1, identity(40, 40));
    expect(px(img, 20, 20)[0]).toBeGreaterThan(110);
    expect(px(img, 1, 1)[0]).toBe(100);
  });

  it('linear: full at the start, fading to nothing at the end', () => {
    const img = flat(10, 40, 150);
    applyAiPlan(img, base({ regions: [{ label: 'sky', shape: { type: 'linear', x0: 0.5, y0: 0, x1: 0.5, y1: 0.5, feather: 0.1 }, adjust: { exposure: -0.5 } }] }), 1, identity(10, 40));
    const top = px(img, 5, 0)[0];
    const mid = px(img, 5, 10)[0];
    const bottom = px(img, 5, 30)[0];
    expect(top).toBeLessThan(mid);
    expect(mid).toBeLessThan(150);
    expect(bottom).toBe(150);
  });

  it('polygon: inside changes, outside does not', () => {
    const shape = { type: 'polygon' as const, points: [[0, 0.6], [1, 0.6], [1, 1], [0, 1]] as [number, number][], feather: 0.04 };
    expect(shapeWeight(shape, 0.5, 0.9)).toBe(1);
    expect(shapeWeight(shape, 0.5, 0.3)).toBe(0);
    expect(shapeWeight(shape, 0.5, 0.6)).toBeCloseTo(0.5, 5);
  });
});

describe('tone and colour', () => {
  it('tone curve keeps black fixed, white fixed unless exposure darkens, and is monotonic at the limits', () => {
    for (const a of [{ exposure: 0.6 }, { exposure: -0.6 }, { contrast: 0.3 }, { shadows: 0.4 }, { highlights: -0.4 }, { contrast: -0.3, shadows: -0.4 }]) {
      expect(planTone(0, a)).toBeCloseTo(0, 6);
      if ((a as { exposure?: number }).exposure === undefined || (a as { exposure: number }).exposure > 0) expect(planTone(1, a)).toBeCloseTo(1, 6);
      let prev = -1;
      for (let i = 0; i <= 255; i++) {
        const y = planTone(i / 255, a);
        expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = y;
      }
    }
  });

  it('skin hue shift stays ≤ 10° at the strongest allowed warmth', () => {
    const hue = ([r, g, b]: number[]) => {
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      return (60 * (g - b)) / (mx - mn);
    };
    for (const skin of [[224, 172, 140], [198, 134, 98], [141, 85, 60]] as [number, number, number][]) {
      const img = flat(4, 4, skin);
      applyAiPlan(img, base({ global: { temperature: 0.25, tint: 0.25, vibrance: 0.3 } }), 1, identity(4, 4));
      expect(Math.abs(hue(px(img, 1, 1)) - hue(skin))).toBeLessThanOrEqual(10);
    }
  });

  it('safe scale backs off when the plan would blow highlights', () => {
    // the soft shoulder keeps mid-bright tones from clipping; near-white tones still can
    expect(planSafeScale(flat(30, 30, 230), base({ global: { exposure: 0.6, highlights: 0.4 } }))).toBe(1);
    const img = flat(30, 30, 250);
    const hot = base({ global: { exposure: 0.6, contrast: 0.3, highlights: 0.4 } });
    const s = planSafeScale(img, hot);
    expect(s).toBeLessThan(1);
    const gentle = base({ global: { exposure: 0.05 } });
    expect(planSafeScale(flat(30, 30, 120), gentle)).toBe(1);
  });

  it('strength 0 leaves the photo untouched', () => {
    const img = flat(8, 8, 90);
    applyAiPlan(img, base({ global: { exposure: 0.5 } }), 0, identity(8, 8));
    expect(px(img, 3, 3)).toEqual([90, 90, 90]);
  });
});

describe('geometry: plan coordinates live on the original photo', () => {
  /** forward transform of drawEditGeometry for an original-photo point (u, v) → output pixel */
  const forward = (crop: EditCrop, w: number, h: number, TW: number, u: number, v: number) => {
    const g = cropGeometry(w, h, crop);
    const s = TW / g.cw;
    const TH = TW / g.ratio;
    const r = (crop.rotation * Math.PI) / 180;
    let x = u * w - w / 2;
    let y = v * h - h / 2;
    [x, y] = [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
    x -= g.ox;
    y -= g.oy;
    [x, y] = [x * Math.cos(g.theta) - y * Math.sin(g.theta), x * Math.sin(g.theta) + y * Math.cos(g.theta)];
    x *= s;
    y *= s;
    if (crop.flipH) x = -x;
    return { x: x + TW / 2, y: y + TH / 2, TH };
  };

  it('planMapping inverts the crop/rotate/flip geometry', () => {
    const crops: EditCrop[] = [
      { ...DEFAULT_EDIT_CROP },
      { ...DEFAULT_EDIT_CROP, aspect: '1:1', zoom: 1.6, panX: 0.4, panY: -0.3 },
      { ...DEFAULT_EDIT_CROP, rotation: 90, angle: 7, flipH: true, zoom: 1.2 },
      { ...DEFAULT_EDIT_CROP, rotation: 270, aspect: '4:5', angle: -4, panX: -0.8 },
    ];
    for (const crop of crops) {
      const f = forward(crop, 900, 600, 500, 0.37, 0.61);
      const m = planMapping({ crop, srcW: 900, srcH: 600 }, 500, Math.round(f.TH));
      expect(m.a * f.x + m.b * f.y + m.c).toBeCloseTo(0.37, 2);
      expect(m.d * f.x + m.e * f.y + m.f).toBeCloseTo(0.61, 2);
    }
  });

  it('preview equals export pixel for pixel with an AI plan (same look step)', () => {
    const img = makePhoto(900, 700);
    const OW = 480;
    const OH = 480;
    const crop = { ...DEFAULT_EDIT_CROP, aspect: '1:1' as const, zoom: 1.3, panX: 0.2 };
    const plan = base({
      global: { temperature: 0.1, contrast: 0.1 },
      regions: [
        { label: 'sky', shape: { type: 'linear', x0: 0.5, y0: 0, x1: 0.5, y1: 0.5, feather: 0.1 }, adjust: { exposure: -0.3, saturation: 0.1 } },
        { label: 'subject', shape: { type: 'radial', cx: 0.6, cy: 0.6, rx: 0.2, ry: 0.25, feather: 0.3 }, adjust: { exposure: 0.3, shadows: 0.2 } },
      ],
    });
    const opts: CarouselRenderOptions = {
      fitMode: 'fill',
      crop,
      presetId: 'dogal',
      presetIntensity: 0.8,
      outputWidth: OW,
      aiPlan: { plan, strength: 0.8, geometry: { crop, srcW: 900, srcH: 700 } },
    };
    const exp = new FakeContext(OW, OH);
    drawCarouselFrame(asCtx(exp), asImg(img), OW, OH, opts);
    const prev = new FakeContext(OW, OH);
    new CarouselPreviewRenderer().render(asCtx(prev), asImg(img), 'photo', OW, OH, opts);
    expect(countDiff(prev.buf, exp.buf)).toBe(0);
    // and the plan actually changed something
    const none = new FakeContext(OW, OH);
    drawCarouselFrame(asCtx(none), asImg(img), OW, OH, { ...opts, aiPlan: null });
    expect(countDiff(none.buf, exp.buf)).toBeGreaterThan(1000);
  });
});
