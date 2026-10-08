import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MATRIX_KEYS,
  PROBE_SCHEMA,
  buildSummary,
  decideEffect,
  probeFileName,
  validateProbeReport,
  type ProbeReport,
  type ProbeTest,
} from '../lib/probe/schema';
import { frameStats, kelvinToRgb, lumaDiff } from '../lib/probe/frame-stats';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');

const t = (id: string, durum: ProbeTest['durum'], ayrıntı = ''): ProbeTest => ({ id, ad: id, durum, ayrıntı, ölçüm: null, süreMs: 0 });

function minimalReport(tests: ProbeTest[]): ProbeReport {
  return {
    schema: PROBE_SCHEMA,
    meta: { zaman: '2026-10-08T10:00:00.000Z', kaynak: 'web', uygulamaSürümü: 'x', süreMs: 1, notlar: [] },
    device: { üretici: null, model: null, androidSürümü: null, ekran: { genişlikPx: 1080, yükseklikPx: 2400, dpr: 2.75 }, çekirdek: 8, ramGb: 8, gpu: null, ek: {} },
    cameras: [{ kimlik: '0', yön: 'arka', etiket: 'camera2 0, facing back', fiziksel: false, özellikler: {} }],
    sensors: {},
    perf: {},
    tests,
    summary: buildSummary(tests),
  };
}

describe('decideEffect: accepted vs effective', () => {
  it('missing capability is yok, an error is hata', () => {
    expect(decideEffect({ supported: false, error: null, delta: 50, noise: 0, minDelta: 8 })).toBe('yok');
    expect(decideEffect({ supported: true, error: 'OverconstrainedError', delta: 50, noise: 0, minDelta: 8 })).toBe('hata');
    expect(decideEffect({ supported: true, error: null, delta: NaN, noise: 0, minDelta: 8 })).toBe('hata');
  });
  it('effective only above the threshold and 3x the noise, otherwise kabul-edildi-etkisiz', () => {
    expect(decideEffect({ supported: true, error: null, delta: 20, noise: 1, minDelta: 8 })).toBe('etkili');
    expect(decideEffect({ supported: true, error: null, delta: 7.9, noise: 0, minDelta: 8 })).toBe('kabul-edildi-etkisiz');
    // Noisy scene: threshold 3 × 5 = 15
    expect(decideEffect({ supported: true, error: null, delta: 12, noise: 5, minDelta: 8 })).toBe('kabul-edildi-etkisiz');
    expect(decideEffect({ supported: true, error: null, delta: 15, noise: 5, minDelta: 8 })).toBe('etkili');
  });
});

describe('buildSummary: counts and the capability matrix', () => {
  it('counts every status and fills every matrix key', () => {
    const s = buildSummary([t('a', 'var'), t('b', 'yok'), t('c', 'hata'), t('d', 'etkili')]);
    expect(s.sayım).toEqual({ var: 1, yok: 1, 'kabul-edildi-etkisiz': 0, etkili: 1, hata: 1, atlandı: 0 });
    expect(Object.keys(s.matris).sort()).toEqual([...MATRIX_KEYS].sort());
    expect(s.matris.torch).toEqual({ durum: 'atlandı', ayrıntı: 'Bu kaynakta ölçülmedi', kaynak: null });
  });
  it('picks the best status across sources (etkili > var > etkisiz > hata > yok)', () => {
    const s = buildSummary([t('etki.exposureTime', 'kabul-edildi-etkisiz', 'süre'), t('etki.iso', 'etkili', 'iso')]);
    expect(s.matris.manuelIsoPozlama).toEqual({ durum: 'etkili', ayrıntı: 'iso', kaynak: 'etki.iso' });
    const n = buildSummary([t('native.braket', 'hata'), t('native.braketBurst', 'etkili')]);
    expect(n.matris.braket.kaynak).toBe('native.braketBurst');
    expect(n.matris.evTelafisi.durum).toBe('hata');
  });
});

describe('validateProbeReport', () => {
  it('a valid report has no errors', () => {
    expect(validateProbeReport(minimalReport([t('x', 'var')]))).toEqual([]);
  });
  it('catches broken fields', () => {
    const r = minimalReport([t('x', 'var'), t('x', 'var')]) as unknown as Record<string, unknown>;
    (r.meta as Record<string, unknown>).kaynak = 'ios';
    (r.tests as Record<string, unknown>[])[0].durum = 'belki';
    const errors = validateProbeReport(r);
    expect(errors).toContain('meta.kaynak web|native değil');
    expect(errors).toContain('tests[0].durum geçersiz');
    expect(errors).toContain('tests[1].id tekrar: x');
    expect(validateProbeReport(null)).toEqual(['rapor nesne değil']);
  });
  it('the JSON example in docs/probe/SCHEMA.md is valid', () => {
    const md = read('docs/probe/SCHEMA.md');
    const block = md.match(/```json\n([\s\S]*?)\n```/);
    expect(block).not.toBeNull();
    expect(validateProbeReport(JSON.parse(block![1]))).toEqual([]);
  });
});

describe('frameStats (160 px frame summary)', () => {
  const solid = (w: number, h: number, rgb: [number, number, number]) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) d.set([...rgb, 255], i * 4);
    return d;
  };
  it('flat grey: brightness, ratios and zero sharpness', () => {
    const { stats } = frameStats(solid(16, 12, [128, 128, 128]), 16, 12);
    expect(stats.parlaklık).toBe(128);
    expect(stats.rOran).toBe(1);
    expect(stats.bOran).toBe(1);
    expect(stats.keskinlik).toBe(0);
    expect(stats.p50).toBe(128);
  });
  it('warm colour lowers B/G; a checkerboard raises sharpness', () => {
    expect(frameStats(solid(8, 8, [255, 180, 107]), 8, 8).stats.bOran).toBeLessThan(0.7);
    const w = 16;
    const d = new Uint8ClampedArray(w * w * 4);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) d.set((x + y) % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255], (y * w + x) * 4);
    expect(frameStats(d, w, w).stats.keskinlik).toBeGreaterThan(500);
  });
  it('measures top-left and bottom-right quarters; frame difference', () => {
    const w = 10;
    const d = solid(w, w, [0, 0, 0]);
    for (let y = 5; y < 10; y++) for (let x = 5; x < 10; x++) d.set([200, 200, 200, 255], (y * w + x) * 4);
    const a = frameStats(d, w, w);
    expect(a.stats.solÜst).toBe(0);
    expect(a.stats.sağAlt).toBe(200);
    expect(lumaDiff(a, frameStats(solid(w, w, [0, 0, 0]), w, w))).toBe(50);
  });
  it('kelvinToRgb: 6600 K is about white, 3000 K is warm (R > G > B)', () => {
    const [r, g, b] = kelvinToRgb(6600);
    expect(Math.min(r, g, b)).toBeGreaterThan(240);
    const [wr, wg, wb] = kelvinToRgb(3000);
    expect(wr).toBe(255);
    expect(wg).toBeGreaterThan(wb);
    expect(wb).toBeLessThan(160);
  });
});

describe('probe/v1 helpers', () => {
  it('file name curate-probe-<source>-YYYYMMDD-HHMM.json', () => {
    expect(probeFileName('web', new Date(2026, 9, 8, 9, 5))).toBe('curate-probe-web-20261008-0905.json');
    expect(probeFileName('native', new Date(2026, 0, 2, 23, 59))).toBe('curate-probe-native-20260102-2359.json');
  });
  it('the native copy (probe-apk/src/probe-schema.ts) equals the web schema in the shared body', () => {
    const body = (p: string) => read(p).split('// --- shared body ---')[1];
    const web = body('lib/probe/schema.ts');
    expect(web.length).toBeGreaterThan(1000);
    expect(body('probe-apk/src/probe-schema.ts')).toBe(web);
  });
  it('Kotlin thresholds equal EFFECT_MIN', () => {
    const kt = read('probe-apk/modules/curate-probe/android/src/main/java/app/curate/probe/module/CaptureProbe.kt');
    expect(kt).toMatch(/MIN_LUMA_DELTA = 8\.0/);
    expect(kt).toMatch(/MIN_RATIO_DELTA = 0\.06/);
    expect(kt).toMatch(/MIN_SHARP_REL = 0\.2/);
  });
});
