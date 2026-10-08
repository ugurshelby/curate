// Probe report schema probe/v1 (docs/probe/SCHEMA.md). Web and native use the same type.
// Native copy: probe-apk/src/probe-schema.ts. Everything after the "shared body" marker must be identical
// in both files (checked by tests/probe-schema.test.ts). This file imports nothing.
// --- shared body ---

export const PROBE_SCHEMA = 'probe/v1' as const;

/** "kabul-edildi-etkisiz": the API accepted the request but the image shows no measurable change. "etkili": a change was measured. */
export type ProbeStatus = 'var' | 'yok' | 'kabul-edildi-etkisiz' | 'etkili' | 'hata' | 'atlandı';
export const PROBE_STATUSES: readonly ProbeStatus[] = ['var', 'yok', 'kabul-edildi-etkisiz', 'etkili', 'hata', 'atlandı'];

export type ProbeMeasure = number | string | boolean | null | ProbeMeasure[] | { [k: string]: ProbeMeasure };

export interface ProbeTest {
  id: string;
  ad: string;
  durum: ProbeStatus;
  ayrıntı: string;
  ölçüm: ProbeMeasure;
  süreMs: number;
}

export interface ProbeCamera {
  /** Web: index ("0", "1"…), never the deviceId. Native: Camera2 id. */
  kimlik: string;
  yön: 'arka' | 'ön' | 'harici' | 'bilinmiyor';
  etiket: string;
  /** Native: physical camera under a logical one, or an id missing from the public list */
  fiziksel: boolean;
  özellikler: { [k: string]: ProbeMeasure };
}

export interface ProbeReport {
  schema: typeof PROBE_SCHEMA;
  meta: {
    zaman: string;
    kaynak: 'web' | 'native';
    uygulamaSürümü: string;
    süreMs: number;
    notlar: string[];
  };
  device: {
    üretici: string | null;
    model: string | null;
    androidSürümü: string | null;
    ekran: { genişlikPx: number; yükseklikPx: number; dpr: number };
    çekirdek: number | null;
    ramGb: number | null;
    gpu: string | null;
    ek: { [k: string]: ProbeMeasure };
  };
  cameras: ProbeCamera[];
  sensors: { [k: string]: ProbeMeasure };
  perf: { [k: string]: ProbeMeasure };
  tests: ProbeTest[];
  summary: ProbeSummary;
}

/** "What is possible" matrix. Each key is derived from one or more test ids. */
export const MATRIX_KEYS = [
  'noktaPozlama',
  'evTelafisi',
  'manuelIsoPozlama',
  'beyazDengesi',
  'odak',
  'zoom',
  'torch',
  'braket',
  'still4k',
  'ultraGenis',
  'raw',
] as const;
export type MatrixKey = (typeof MATRIX_KEYS)[number];

export const MATRIX_LABELS: Record<MatrixKey, string> = {
  noktaPozlama: 'Nokta pozlama',
  evTelafisi: 'EV telafisi',
  manuelIsoPozlama: 'Manuel ISO / pozlama',
  beyazDengesi: 'Beyaz dengesi',
  odak: 'Manuel odak',
  zoom: 'Zoom',
  torch: 'Fener (torch)',
  braket: 'Pozlama braketi',
  still4k: '4K fotoğraf',
  ultraGenis: 'Ultra geniş',
  raw: 'RAW / DNG',
};

/** Matrix key → candidate test ids (web and native). The best status wins. */
export const MATRIX_SOURCES: Record<MatrixKey, string[]> = {
  noktaPozlama: ['etki.pointsOfInterest', 'native.noktaPozlama'],
  evTelafisi: ['etki.exposureCompensation', 'native.braket'],
  manuelIsoPozlama: ['etki.exposureTime', 'etki.iso', 'native.manuel'],
  beyazDengesi: ['etki.colorTemperature', 'native.beyazDengesi'],
  odak: ['etki.focusDistance', 'native.odak'],
  zoom: ['etki.zoom', 'native.zoom'],
  torch: ['etki.torch', 'native.torch'],
  braket: ['perf.braket', 'native.braket', 'native.braketBurst'],
  still4k: ['cozunurluk.still4k', 'native.still4k'],
  ultraGenis: ['kamera.ultraGenis', 'native.ultraGenis'],
  raw: ['web.raw', 'native.raw'],
};

/** Status rank, best first (with several sources the matrix shows the best) */
const RANK: Record<ProbeStatus, number> = {
  etkili: 0,
  var: 1,
  'kabul-edildi-etkisiz': 2,
  hata: 3,
  yok: 4,
  atlandı: 5,
};

export interface ProbeSummary {
  sayım: Record<ProbeStatus, number>;
  matris: Record<MatrixKey, { durum: ProbeStatus; ayrıntı: string; kaynak: string | null }>;
}

export function buildSummary(tests: ProbeTest[]): ProbeSummary {
  const sayım = Object.fromEntries(PROBE_STATUSES.map((s) => [s, 0])) as Record<ProbeStatus, number>;
  for (const t of tests) sayım[t.durum]++;
  const byId = new Map(tests.map((t) => [t.id, t]));
  const matris = {} as ProbeSummary['matris'];
  for (const key of MATRIX_KEYS) {
    const found = MATRIX_SOURCES[key].map((id) => byId.get(id)).filter((t): t is ProbeTest => !!t);
    found.sort((a, b) => RANK[a.durum] - RANK[b.durum]);
    const best = found[0];
    matris[key] = best
      ? { durum: best.durum, ayrıntı: best.ayrıntı, kaynak: best.id }
      : { durum: 'atlandı', ayrıntı: 'Bu kaynakta ölçülmedi', kaynak: null };
  }
  return { sayım, matris };
}

/** Effect thresholds: brightness 0–255, B/G or R/G ratio, relative sharpness, frame difference 0–255 */
export const EFFECT_MIN = {
  parlaklık: 8,
  renkOranı: 0.06,
  keskinlikGöreli: 0.2,
  kareFarkı: 8,
} as const;

export interface EffectInput {
  /** Present in the capability list */
  supported: boolean;
  /** Error message from applyConstraints / the capture request, if any */
  error: string | null;
  /** Measured difference between the min and max setting (same unit) */
  delta: number;
  /** Difference between measurements with nothing changed (scene noise) */
  noise: number;
  /** Smallest meaningful difference for this metric (EFFECT_MIN) */
  minDelta: number;
}

/** Accepted vs effective: effective only when the change beats both the threshold and 3× the noise. */
export function decideEffect(i: EffectInput): ProbeStatus {
  if (!i.supported) return 'yok';
  if (i.error) return 'hata';
  if (!Number.isFinite(i.delta)) return 'hata';
  const need = Math.max(i.minDelta, 3 * (Number.isFinite(i.noise) ? i.noise : 0));
  return i.delta >= need ? 'etkili' : 'kabul-edildi-etkisiz';
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNumOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string';

/** Schema validation. Empty array = valid. */
export function validateProbeReport(r: unknown): string[] {
  const e: string[] = [];
  if (!isObj(r)) return ['rapor nesne değil'];
  if (r.schema !== PROBE_SCHEMA) e.push('schema probe/v1 değil');

  const m = r.meta;
  if (!isObj(m)) e.push('meta yok');
  else {
    if (typeof m.zaman !== 'string' || Number.isNaN(Date.parse(m.zaman))) e.push('meta.zaman ISO tarih değil');
    if (m.kaynak !== 'web' && m.kaynak !== 'native') e.push('meta.kaynak web|native değil');
    if (typeof m.uygulamaSürümü !== 'string') e.push('meta.uygulamaSürümü yok');
    if (typeof m.süreMs !== 'number') e.push('meta.süreMs sayı değil');
    if (!Array.isArray(m.notlar)) e.push('meta.notlar dizi değil');
  }

  const d = r.device;
  if (!isObj(d)) e.push('device yok');
  else {
    for (const k of ['üretici', 'model', 'androidSürümü', 'gpu']) if (!isStrOrNull(d[k])) e.push(`device.${k} metin/null değil`);
    for (const k of ['çekirdek', 'ramGb']) if (!isNumOrNull(d[k])) e.push(`device.${k} sayı/null değil`);
    const s = d.ekran;
    if (!isObj(s) || typeof s.genişlikPx !== 'number' || typeof s.yükseklikPx !== 'number' || typeof s.dpr !== 'number')
      e.push('device.ekran eksik');
    if (!isObj(d.ek)) e.push('device.ek nesne değil');
  }

  if (!Array.isArray(r.cameras)) e.push('cameras dizi değil');
  else
    r.cameras.forEach((c, i) => {
      if (!isObj(c) || typeof c.kimlik !== 'string' || typeof c.etiket !== 'string' || !isObj(c.özellikler))
        e.push(`cameras[${i}] eksik`);
      else if (!['arka', 'ön', 'harici', 'bilinmiyor'].includes(c.yön as string)) e.push(`cameras[${i}].yön geçersiz`);
    });

  if (!isObj(r.sensors)) e.push('sensors nesne değil');
  if (!isObj(r.perf)) e.push('perf nesne değil');

  const ids = new Set<string>();
  if (!Array.isArray(r.tests)) e.push('tests dizi değil');
  else
    r.tests.forEach((t, i) => {
      if (!isObj(t)) return void e.push(`tests[${i}] nesne değil`);
      if (typeof t.id !== 'string' || !t.id) e.push(`tests[${i}].id yok`);
      else if (ids.has(t.id)) e.push(`tests[${i}].id tekrar: ${t.id}`);
      else ids.add(t.id);
      if (typeof t.ad !== 'string') e.push(`tests[${i}].ad yok`);
      if (!PROBE_STATUSES.includes(t.durum as ProbeStatus)) e.push(`tests[${i}].durum geçersiz`);
      if (typeof t.ayrıntı !== 'string') e.push(`tests[${i}].ayrıntı yok`);
      if (!('ölçüm' in t)) e.push(`tests[${i}].ölçüm yok`);
      if (typeof t.süreMs !== 'number' || !Number.isFinite(t.süreMs)) e.push(`tests[${i}].süreMs sayı değil`);
    });

  const s = r.summary;
  if (!isObj(s) || !isObj(s.sayım) || !isObj(s.matris)) e.push('summary eksik');
  else {
    for (const k of MATRIX_KEYS) if (!isObj(s.matris[k])) e.push(`summary.matris.${k} yok`);
    if (Array.isArray(r.tests)) {
      const sayım = s.sayım as Record<string, unknown>;
      const total = PROBE_STATUSES.reduce((a, k) => a + (Number(sayım[k]) || 0), 0);
      if (total !== r.tests.length) e.push('summary.sayım test sayısıyla tutmuyor');
    }
  }
  return e;
}

/** File name: curate-probe-<source>-YYYYMMDD-HHMM.json (local time) */
export function probeFileName(kaynak: 'web' | 'native', d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return `curate-probe-${kaynak}-${stamp}.json`;
}

/** Rounds numbers to keep measurements short */
export const round = (v: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};
