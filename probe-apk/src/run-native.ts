// Native probe: turns the numbers returned by the Kotlin module into a probe/v1 report (docs/probe/README.md).
// Sends nothing over the network; keeps no image.
import { Dimensions, PermissionsAndroid, PixelRatio } from 'react-native';
import CurateProbe from '../modules/curate-probe/src/CurateProbeModule';
import {
  PROBE_SCHEMA,
  PROBE_STATUSES,
  buildSummary,
  round,
  type ProbeCamera,
  type ProbeMeasure,
  type ProbeReport,
  type ProbeStatus,
  type ProbeTest,
} from './probe-schema';

export const PROBE_NATIVE_VERSION = 'curate-probe-native 1.0.0';
export const NATIVE_STEPS = ['Cihaz', 'Camera2 özellikleri', 'Sensörler', 'Kamera izni', 'Canlı yakalama'] as const;

type Json = Record<string, unknown>;
const errMsg = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
/** JSON-safe: undefined is dropped, NaN/Infinity become null */
const asMeasure = (v: unknown): ProbeMeasure => JSON.parse(JSON.stringify(v ?? null)) as ProbeMeasure;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []);
const longEdge = (sizes: string[]) => Math.max(0, ...sizes.map((s) => Math.max(...s.split('x').map(Number))));

function osLayer(dev: Json): string | null {
  const inc = str(dev.incremental) ?? '';
  const manu = (str(dev.manufacturer) ?? '').toLowerCase();
  if (/^OS\d/.test(inc)) return `HyperOS ${inc}`;
  if (/^V\d/.test(inc) && /xiaomi|redmi|poco/.test(manu)) return `MIUI ${inc}`;
  return null;
}

export async function runNativeProbe(onStep: (i: number) => void): Promise<ProbeReport> {
  const t0 = Date.now();
  const tests: ProbeTest[] = [];
  const notes: string[] = [];
  const add = (id: string, ad: string, durum: ProbeStatus, ayrıntı: string, ölçüm: unknown = null, süreMs = 0) =>
    tests.push({ id, ad, durum, ayrıntı, ölçüm: asMeasure(ölçüm), süreMs: Math.round(süreMs) });
  const timed = async <T,>(id: string, ad: string, fn: () => Promise<T>): Promise<T | null> => {
    const s = Date.now();
    try {
      return await fn();
    } catch (e) {
      add(id, ad, 'hata', errMsg(e), null, Date.now() - s);
      return null;
    }
  };

  const screen = Dimensions.get('screen');
  const dpr = PixelRatio.get();
  const report: ProbeReport = {
    schema: PROBE_SCHEMA,
    meta: { zaman: new Date().toISOString(), kaynak: 'native', uygulamaSürümü: PROBE_NATIVE_VERSION, süreMs: 0, notlar: notes },
    device: {
      üretici: null,
      model: null,
      androidSürümü: null,
      ekran: { genişlikPx: Math.round(screen.width * dpr), yükseklikPx: Math.round(screen.height * dpr), dpr: round(dpr, 3) },
      çekirdek: null,
      ramGb: null,
      gpu: null,
      ek: {},
    },
    cameras: [],
    sensors: {},
    perf: {},
    tests: [],
    summary: buildSummary([]),
  };

  // 1. Device
  onStep(0);
  const dev = await timed('native.cihaz', 'Cihaz bilgisi', () => CurateProbe.deviceInfo());
  if (dev) {
    const gl = (dev.gl ?? {}) as Json;
    report.device.üretici = str(dev.manufacturer);
    report.device.model = str(dev.model);
    report.device.androidSürümü = `${str(dev.release) ?? '?'} (SDK ${num(dev.sdkInt) ?? '?'})`;
    report.device.çekirdek = num(dev.cores);
    const ram = num(dev.ramBytes);
    report.device.ramGb = ram ? round(ram / 1024 ** 3, 1) : null;
    report.device.gpu = str(gl.renderer);
    const { manufacturer: _m, model: _mo, ...rest } = dev;
    report.device.ek = { ...(asMeasure(rest) as Record<string, ProbeMeasure>), üreticiKatmanı: osLayer(dev) };
    add('native.cihaz', 'Cihaz bilgisi', 'var', `${dev.manufacturer} ${dev.model}, Android ${dev.release}, ${osLayer(dev) ?? 'üretici katmanı ?'}`, null);
  }

  // 2. Camera2 characteristics (no permission needed)
  onStep(1);
  const ch = await timed('native.kameraListesi', 'Camera2 kamera listesi', () => CurateProbe.cameraCharacteristics());
  let mainBack: Json | null = null;
  if (ch) {
    const cams = ch.kameralar;
    report.cameras = cams.map((c): ProbeCamera => {
      const { kimlik, yön, kaynak, ...rest } = c;
      const y = yön === 'arka' || yön === 'ön' || yön === 'harici' ? yön : 'bilinmiyor';
      return { kimlik: String(kimlik), yön: y, etiket: `Camera2 ${kimlik} (${kaynak})`, fiziksel: kaynak !== 'liste', özellikler: asMeasure({ kaynak, ...rest }) as Record<string, ProbeMeasure> };
    });
    const listedBack = cams.filter((c) => c.kaynak === 'liste' && c.yön === 'arka');
    const otherBack = cams.filter((c) => c.kaynak !== 'liste' && c.yön === 'arka');
    mainBack = listedBack[0] ?? null;
    add(
      'native.kameraListesi',
      'Camera2 kamera listesi',
      ch.listelenen.length ? 'var' : 'yok',
      `listede ${ch.listelenen.length} kamera (${listedBack.length} arka); fiziksel alt kamera ${cams.filter((c) => String(c.kaynak).startsWith('fiziksel')).length}; listede olmayıp okunabilen ${ch.gizli.length}`,
      { listelenen: ch.listelenen, gizli: ch.gizli },
    );
    const m = mainBack;
    if (m) {
      const caps = strs(m.yetenekler);
      add('native.donanimSeviyesi', 'Arka ana kamera donanım seviyesi', 'var', `${m.donanımSeviyesi ?? '?'}; yetenekler: ${caps.join(', ')}`, { seviye: m.donanımSeviyesi ?? null, yetenekler: caps });
      add('native.yetenek.manuelSensor', 'MANUAL_SENSOR yeteneği', caps.includes('MANUAL_SENSOR') ? 'var' : 'yok', `ISO ${JSON.stringify(m.isoAralığı ?? null)}, pozlama ns ${JSON.stringify(m.pozlamaAralığıNs ?? null)}`);
      add('native.yetenek.raw', 'RAW yeteneği', caps.includes('RAW') ? 'var' : 'yok', `RAW boyutları: ${strs(m.rawBoyutları).slice(0, 3).join(', ') || 'yok'}`);

      const focal = Math.min(...nums(m.odakUzunluklarıMm));
      const zr = nums(m.zoomOranıAralığı);
      const wider = [...listedBack.slice(1), ...otherBack].filter((c) => Math.min(...nums(c.odakUzunluklarıMm)) < focal * 0.8);
      const widerListed = wider.filter((c) => c.kaynak === 'liste');
      const uwByZoom = zr.length === 2 && zr[0] < 1;
      add(
        'native.ultraGenis',
        'Ultra geniş erişimi',
        widerListed.length || uwByZoom ? 'var' : 'yok',
        widerListed.length
          ? `listede daha geniş arka kamera: ${widerListed.map((c) => `${c.kimlik} (${nums(c.odakUzunluklarıMm)[0]} mm)`).join(', ')}`
          : uwByZoom
            ? `ana kamera zoom oranı ${zr[0]}'e iniyor (mantıksal kamera)`
            : wider.length
              ? `donanımda var (${wider.map((c) => `${c.kimlik}/${c.kaynak}`).join(', ')}) ama uygulamaya listelenmiyor`
              : 'daha geniş arka kamera bulunamadı',
        { anaOdakMm: Number.isFinite(focal) ? focal : null, zoomOranı: zr, adaylar: wider.map((c) => ({ kimlik: c.kimlik, kaynak: c.kaynak, odakMm: c.odakUzunluklarıMm ?? null })) },
      );
      const maxZoom = num(m.maxDijitalZoom) ?? 1;
      add('native.zoom', 'Zoom', maxZoom > 1 || (zr[1] ?? 1) > 1 ? 'var' : 'yok', `max dijital zoom ${maxZoom}, zoom oranı ${JSON.stringify(zr)} (özellikten okundu, görüntüde ölçülmedi)`);
      add('native.torch', 'Fener (torch)', m.flaş === true ? 'var' : 'yok', m.flaş === true ? 'flaş birimi var (özellikten okundu, ölçülmedi)' : 'flaş birimi yok');
      const jpegMax = longEdge([...strs(m.jpegBoyutları), ...strs(m.jpegYüksekÇözünürlük)]);
      const jpegUhr = longEdge(strs(m.jpegMaksimumÇözünürlük));
      add(
        'native.still4k',
        '4K fotoğraf (JPEG çıktı boyutu)',
        jpegMax >= 3840 ? 'var' : 'yok',
        `en büyük JPEG uzun kenarı ${jpegMax} px${jpegUhr ? `; maksimum çözünürlük haritasında ${jpegUhr} px (ULTRA_HIGH_RESOLUTION isteği gerekir)` : ''}`,
        { enUzunKenar: jpegMax, maksimumÇözünürlük: jpegUhr || null },
      );
      const ext = strs(m.uzantılar);
      add('native.uzantilar', 'Camera2 uzantıları (Night/HDR/Bokeh)', ext.length ? 'var' : 'yok', ext.length ? ext.join(', ') : 'uzantı yok ya da Android < 12');
    } else {
      add('native.donanimSeviyesi', 'Arka ana kamera donanım seviyesi', 'yok', 'listede arka kamera yok');
    }
  }

  // 3. Sensors
  onStep(2);
  const sens = await timed('native.sensorler', 'Sensörler', () => CurateProbe.sampleSensors(3000));
  if (sens) {
    report.sensors = asMeasure({ liste: sens.liste, ölçüm: sens.ölçüm, süreSn: sens.süreSn }) as Record<string, ProbeMeasure>;
    for (const [name, r] of Object.entries(sens.ölçüm)) {
      const ok = r.var === true;
      const hz = num(r.hz);
      add(
        `native.sensor.${name}`,
        `Sensör: ${name}`,
        ok ? 'var' : 'yok',
        ok ? `${r.ad}: ${hz} Hz${r.değişimdeBildirir ? ' (yalnız değişince bildirir; Hz sahneye bağlı)' : ''}${num(r.minDeğer) !== null ? `, ${r.minDeğer}–${r.maxDeğer}` : ''}` : 'sensör yok',
        r,
      );
    }
    notes.push('Android 12+ sensör hızı HIGH_SAMPLING_RATE_SENSORS izni olmadan 200 Hz ile sınırlıdır (izin manifestte var).');
  }

  // 4. Camera permission (camera only; no microphone or location)
  onStep(3);
  const perm = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Kamera izni',
    message: 'Canlı yakalama testi için kamera gerekir. Görüntü kaydedilmez, hiçbir yere gönderilmez.',
    buttonPositive: 'İzin ver',
    buttonNegative: 'Vazgeç',
  }).catch((e: unknown) => errMsg(e));
  const granted = perm === PermissionsAndroid.RESULTS.GRANTED;
  add('native.izin', 'Kamera izni', granted ? 'var' : 'hata', granted ? 'izin verildi' : `izin yok (${perm})`);

  // 5. Live capture
  onStep(4);
  if (granted) {
    const cap = await timed('native.oturum', 'Camera2 oturumu (arka ana kamera)', () => CurateProbe.captureTests());
    if (cap) {
      for (const t of cap.tests) {
        const durum = PROBE_STATUSES.includes(t.durum as ProbeStatus) ? (t.durum as ProbeStatus) : 'hata';
        add(String(t.id), String(t.ad), durum, String(t.ayrıntı ?? ''), t.ölçüm, num(t.süreMs) ?? 0);
      }
      report.perf.yakalamaEk = asMeasure(cap.ek);
    }
  } else {
    add('native.oturum', 'Camera2 oturumu (arka ana kamera)', 'atlandı', 'kamera izni yok');
  }

  // Vendor restriction: does a third-party app get manual/RAW, and if not, at which step it stops
  const byId = new Map(tests.map((t) => [t.id, t]));
  const caps = strs(mainBack?.yetenekler);
  const manual = byId.get('native.manuel');
  const raw = byId.get('native.raw');
  const lines: string[] = [];
  let kisit: ProbeStatus = 'var';
  if (!mainBack) {
    kisit = 'hata';
    lines.push('arka ana kamera okunamadı');
  } else {
    lines.push(`donanım seviyesi ${mainBack.donanımSeviyesi ?? '?'}`);
    if (!caps.includes('MANUAL_SENSOR')) {
      kisit = 'yok';
      lines.push('MANUAL_SENSOR yetenek listesinde yok (adım: CameraCharacteristics)');
    } else lines.push(`manuel çekim: ${manual?.durum ?? 'ölçülmedi'}${manual && manual.durum !== 'etkili' ? ` (adım: native.manuel — ${manual.ayrıntı})` : ''}`);
    if (!caps.includes('RAW')) {
      if (kisit === 'var') kisit = 'yok';
      lines.push('RAW yetenek listesinde yok (adım: CameraCharacteristics)');
    } else lines.push(`RAW çekim: ${raw?.durum ?? 'ölçülmedi'}${raw && raw.durum !== 'var' ? ` (adım: native.raw — ${raw.ayrıntı})` : ''}`);
    if (kisit === 'var' && (manual?.durum === 'hata' || raw?.durum === 'hata')) kisit = 'hata';
    else if (kisit === 'var' && manual?.durum === 'kabul-edildi-etkisiz') kisit = 'kabul-edildi-etkisiz';
    const hidden = report.cameras.filter((c) => c.etiket.includes('(gizli)')).length;
    if (hidden) lines.push(`listede olmayan ${hidden} kamera kimliğinin özellikleri okunabiliyor (üretici bazı kameraları üçüncü taraf listesinden gizliyor)`);
  }
  add('native.ureticiKisiti', 'Üçüncü taraf uygulamaya manuel/RAW erişimi', kisit, lines.join('; '), { yetenekler: caps });

  // Performance summary (from the capture tests)
  const m = (id: string) => (byId.get(id)?.ölçüm ?? null) as Record<string, ProbeMeasure> | null;
  report.perf = {
    ...report.perf,
    otomatikÇekimMs: m('native.otomatik')?.ms ?? null,
    braketKarelerArasıMs: m('native.braket')?.karelerArasıMs ?? null,
    burstKareArasıMs: m('native.braketBurst')?.kareArasıMs ?? null,
    rawMs: m('native.raw')?.ms ?? null,
    dngMs: m('native.raw')?.dngMs ?? null,
  };
  notes.push('Etki eşikleri Kotlin tarafında EFFECT_MIN ile aynı (parlaklık 8, renk oranı 0,06, göreli keskinlik 0,2).');
  notes.push('Görüntüler kaydedilmez; RAW/DNG yalnız bellekte oluşturulup boyutu ölçülür.');

  report.tests = tests;
  report.summary = buildSummary(tests);
  report.meta.süreMs = Date.now() - t0;
  return report;
}
