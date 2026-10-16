import { describe, it, expect } from 'vitest';
import {
  isRepairTemplateKey,
  templateFromDirective,
  resolveRepairTemplate,
  schemaForAi,
  interpretImageSemantics,
  generateIntelligentRepairPlan,
  applyPlanInStrips,
  applyAiPlan,
  type ImageTechnicalSchema,
} from '../lib';

describe('intelligent repair pipeline (two-stage)', () => {
  const dummySchema: ImageTechnicalSchema = {
    width: 1200,
    height: 1000,
    meanLuma: 140,
    blownRatio: 0.05,
    crushedRatio: 0.02,
    avgSaturation: 0.4,
    contrastScore: 50,
    colorCast: { warmth: 0.25, tint: -0.05 },
    aspectRatio: 1.2,
    suggestedTemplateKey: 'blownLight',
  };

  it('validates template keys correctly', () => {
    expect(isRepairTemplateKey('blownLight')).toBe(true);
    expect(isRepairTemplateKey('illuminateSubject')).toBe(true);
    expect(isRepairTemplateKey('dehaze')).toBe(true);
    expect(isRepairTemplateKey('neutralizeColor')).toBe(true);
    expect(isRepairTemplateKey('nightClarity')).toBe(true);
    expect(isRepairTemplateKey('unknownKey')).toBe(false);
    expect(isRepairTemplateKey(null)).toBe(false);
  });

  it('extracts correct template from natural language directives (Turkish)', () => {
    expect(templateFromDirective('Gökyüzü çok patlamış, bulutlar bembeyaz')).toBe('blownLight');
    expect(templateFromDirective('Özne ters ışıkta ve yüzü çok karanlık')).toBe('illuminateSubject');
    expect(templateFromDirective('Görsel çok puslu ve soluk renkli')).toBe('dehaze');
    expect(templateFromDirective('Işık sarı ve renk kayması var')).toBe('neutralizeColor');
    expect(templateFromDirective('Gece çekimi düşük ışıkta yapılmış')).toBe('nightClarity');
    expect(templateFromDirective('Sadece güzel bir fotoğraf')).toBe(null);
  });

  it('resolves repair template with strict priority: explicit > directive > schema', () => {
    // 1. Explicit template wins over directive and schema
    expect(resolveRepairTemplate(dummySchema, 'dehaze', 'gökyüzü patlamış')).toBe('dehaze');

    // 2. Directive wins over schema when template is not specified
    expect(resolveRepairTemplate(dummySchema, null, 'özne çok karanlık')).toBe('illuminateSubject');

    // 3. Schema suggestion is fallback
    expect(resolveRepairTemplate(dummySchema, null, 'genel düzenleme')).toBe('blownLight');
  });

  it('formats schema numbers safely for AI model context', () => {
    const aiSchema = schemaForAi(dummySchema);
    expect(aiSchema.meanLuma).toBe(140);
    expect(aiSchema.blownRatio).toBe(0.05);
    expect(aiSchema.warmth).toBe(0.25);
    expect(aiSchema).not.toHaveProperty('aspectRatio'); // dimensions/aspect are not leaked
  });

  it('generates a valid, bounded AiLightPlan', () => {
    const interp = interpretImageSemantics(dummySchema, 'blownLight');
    const plan = generateIntelligentRepairPlan(dummySchema, interp, 'blownLight');

    expect(plan.version).toBe(1);
    expect(plan.global).toBeDefined();
    expect(plan.global.exposure).toBeLessThanOrEqual(0); // blown light pulls exposure down
    expect(plan.regions.length).toBeGreaterThan(0);
  });

  it('applies plan in strips with pixel parity against single-pass execution', () => {
    const W = 64;
    const H = 64;

    const bufA = new Uint8ClampedArray(W * H * 4);
    const bufB = new Uint8ClampedArray(W * H * 4);

    for (let i = 0; i < bufA.length; i += 4) {
      const v = (i / 4) % 256;
      bufA[i] = v;
      bufA[i + 1] = v;
      bufA[i + 2] = v;
      bufA[i + 3] = 255;

      bufB[i] = v;
      bufB[i + 1] = v;
      bufB[i + 2] = v;
      bufB[i + 3] = 255;
    }

    const imgDataA = { data: bufA, width: W, height: H } as ImageData;
    const interp = interpretImageSemantics(dummySchema, 'blownLight');
    const plan = generateIntelligentRepairPlan(dummySchema, interp, 'blownLight');

    // Single pass
    applyAiPlan(imgDataA, plan, 1.0);

    // Strips context mock
    const stripCtx = {
      getImageData(sx: number, sy: number, sw: number, sh: number) {
        const out = new Uint8ClampedArray(sw * sh * 4);
        for (let y = 0; y < sh; y++) {
          const srcIdx = ((sy + y) * W + sx) * 4;
          const dstIdx = y * sw * 4;
          out.set(bufB.subarray(srcIdx, srcIdx + sw * 4), dstIdx);
        }
        return { data: out, width: sw, height: sh } as ImageData;
      },
      putImageData(img: ImageData, dx: number, dy: number) {
        for (let y = 0; y < img.height; y++) {
          const srcIdx = y * img.width * 4;
          const dstIdx = ((dy + y) * W + dx) * 4;
          bufB.set(img.data.subarray(srcIdx, srcIdx + img.width * 4), dstIdx);
        }
      },
    };

    applyPlanInStrips(stripCtx, W, H, plan, 1.0, 16);

    // Assert exact equality between single-pass and strip-pass
    let diffCount = 0;
    for (let i = 0; i < bufA.length; i++) {
      if (Math.abs(bufA[i] - bufB[i]) > 0) diffCount++;
    }
    expect(diffCount).toBe(0);
  });
});
