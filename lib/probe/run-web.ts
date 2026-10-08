// Web probe: measures what the phone's browser can get from the camera and hardware (docs/probe/README.md).
// Sends nothing over the network and keeps no image (frames are reduced to numbers at 160 px).
// Not a product feature; deleted once the roadmap decision is made.
import {
  PROBE_SCHEMA,
  EFFECT_MIN,
  buildSummary,
  decideEffect,
  round,
  type ProbeCamera,
  type ProbeMeasure,
  type ProbeReport,
  type ProbeStatus,
  type ProbeTest,
} from './schema';
import { frameStats, lumaDiff, meanStats, type FrameSample, type FrameStats } from './frame-stats';

export const PROBE_WEB_VERSION = 'curate-probe-web 1.0.0';

/** Seven steps reported through onStep(0…6); labels live in lib/i18n/tr.ts (tr.probe.steps) */
export type FillMode = 'off' | 'white' | 'warm';
const FILL_NAME: Record<FillMode, string> = { off: 'kapalı', white: 'beyaz', warm: 'sıcak' };

export interface ProbeHooks {
  video: HTMLVideoElement;
  setFill(mode: FillMode): void;
  onStep(index: number): void;
}

// ---------- small helpers ----------

type Obj = Record<string, unknown>;
type Range = { min: number; max: number; step: number | null };
type RvfcVideo = HTMLVideoElement;
/** requestVideoFrameCallback is not in every browser (the TS type assumes it is) */
const hasRvfc = () => typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
interface ImageCaptureLike {
  takePhoto(settings?: Obj): Promise<Blob>;
  getPhotoCapabilities(): Promise<Obj>;
  getPhotoSettings(): Promise<Obj>;
  grabFrame(): Promise<ImageBitmap>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;
type SensorLike = EventTarget & { start(): void; stop(): void; illuminance?: number };
type SensorCtor = new (opts: { frequency: number }) => SensorLike;

const g = globalThis as unknown as Obj;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const now = () => performance.now();
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const errMsg = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} ${ms} ms içinde bitmedi`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

/** Converts browser objects (capabilities, settings) to JSON-safe values */
function jsonSafe(v: unknown, depth = 0): ProbeMeasure {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? round(v, 4) : null;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (depth > 5) return null;
  if (Array.isArray(v)) return v.slice(0, 64).map((x) => jsonSafe(x, depth + 1));
  if (typeof v === 'object') {
    const out: Record<string, ProbeMeasure> = {};
    for (const k of Object.keys(v as Obj)) {
      if (k === 'deviceId' || k === 'groupId') continue; // identifiers never go into the report
      const x = (v as Obj)[k];
      if (typeof x === 'function') continue;
      out[k] = jsonSafe(x, depth + 1);
    }
    return out;
  }
  return null;
}

const rangeOf = (v: unknown): Range | null =>
  isObj(v) && typeof v.min === 'number' && typeof v.max === 'number'
    ? { min: v.min, max: v.max, step: typeof v.step === 'number' ? v.step : null }
    : null;

const snap = (v: number, r: Range) => {
  const c = Math.min(r.max, Math.max(r.min, v));
  return r.step && r.step > 0 ? Math.min(r.max, r.min + Math.round((c - r.min) / r.step) * r.step) : c;
};

class TestLog {
  list: ProbeTest[] = [];
  add(t: ProbeTest) {
    this.list.push({ ...t, süreMs: Math.round(t.süreMs) });
  }
  async run(
    id: string,
    ad: string,
    fn: () => Promise<{ durum: ProbeStatus; ayrıntı: string; ölçüm: ProbeMeasure }>,
  ): Promise<void> {
    const t0 = now();
    try {
      const r = await fn();
      this.add({ id, ad, ...r, süreMs: now() - t0 });
    } catch (e) {
      this.add({ id, ad, durum: 'hata', ayrıntı: errMsg(e), ölçüm: null, süreMs: now() - t0 });
    }
  }
  skip(id: string, ad: string, ayrıntı: string) {
    this.add({ id, ad, durum: 'atlandı', ayrıntı, ölçüm: null, süreMs: 0 });
  }
}

// ---------- frame measurement ----------

const MEASURE_W = 160;

class Meter {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  constructor(private video: RvfcVideo) {}

  nextFrame(timeoutMs = 600): Promise<void> {
    const v = this.video;
    return new Promise((resolve) => {
      const t = setTimeout(resolve, timeoutMs);
      if (hasRvfc()) v.requestVideoFrameCallback(() => (clearTimeout(t), resolve()));
      else requestAnimationFrame(() => (clearTimeout(t), resolve()));
    });
  }

  /** Downscales the current frame to 160 px and measures it (no wait) */
  sampleNow(): FrameSample {
    const v = this.video;
    const w = MEASURE_W;
    const h = Math.max(1, Math.round((MEASURE_W * (v.videoHeight || 3)) / (v.videoWidth || 4)));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.drawImage(v, 0, 0, w, h);
    return frameStats(this.ctx.getImageData(0, 0, w, h).data, w, h);
  }

  sampleBitmap(src: CanvasImageSource, sw: number, sh: number): FrameSample {
    const w = MEASURE_W;
    const h = Math.max(1, Math.round((MEASURE_W * sh) / sw));
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(src, 0, 0, w, h);
    return frameStats(this.ctx.getImageData(0, 0, w, h).data, w, h);
  }

  /** Two fresh frames: mean statistics plus the last frame's luma grid */
  async measure(frames = 2): Promise<{ stats: FrameStats; sample: FrameSample }> {
    const list: FrameSample[] = [];
    for (let i = 0; i < frames; i++) {
      await this.nextFrame();
      list.push(this.sampleNow());
    }
    return { stats: meanStats(list.map((s) => s.stats)), sample: list[list.length - 1] };
  }
}

/** Background frame counter (requestVideoFrameCallback, else getVideoPlaybackQuality) */
function frameCounter(video: RvfcVideo) {
  let n = 0;
  let on = true;
  const quality = () => (typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality().totalVideoFrames : 0);
  const q0 = quality();
  const rvfc = hasRvfc();
  if (rvfc) {
    const tick = () => {
      if (!on) return;
      n++;
      video.requestVideoFrameCallback(tick);
    };
    video.requestVideoFrameCallback(tick);
  }
  return {
    count: () => (rvfc ? n : quality() - q0),
    stop: () => {
      on = false;
    },
  };
}

async function measureFps(video: RvfcVideo, ms = 1500): Promise<number> {
  const c = frameCounter(video);
  const t0 = now();
  await sleep(ms);
  const n = c.count();
  c.stop();
  return round((n * 1000) / (now() - t0), 1);
}

async function waitDims(video: HTMLVideoElement, ms = 4000) {
  const t0 = now();
  while ((!video.videoWidth || !video.videoHeight) && now() - t0 < ms) await sleep(50);
}

async function openStream(video: HTMLVideoElement, constraints: MediaTrackConstraints) {
  const stream = await withTimeout(
    navigator.mediaDevices.getUserMedia({ video: constraints, audio: false }),
    60000,
    'getUserMedia',
  );
  video.srcObject = stream;
  await video.play().catch(() => undefined);
  await waitDims(video);
  return { stream, track: stream.getVideoTracks()[0] };
}

function stopStream(video: HTMLVideoElement, stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}

const settingsOf = (t: MediaStreamTrack) => t.getSettings() as unknown as Obj;
const capsOf = (t: MediaStreamTrack): Obj =>
  typeof t.getCapabilities === 'function' ? (t.getCapabilities() as unknown as Obj) : {};
const apply = (t: MediaStreamTrack, c: Obj) =>
  withTimeout(t.applyConstraints({ advanced: [c as MediaTrackConstraintSet] }), 4000, 'applyConstraints');

const facingOf = (settings: Obj, label: string): ProbeCamera['yön'] => {
  const f = settings.facingMode;
  if (f === 'environment' || /back|rear|arka/i.test(label)) return 'arka';
  if (f === 'user' || /front|ön/i.test(label)) return 'ön';
  if (f === 'left' || f === 'right') return 'harici';
  return 'bilinmiyor';
};

// ---------- 1. Environment ----------

// Same minimal modules as wasm-feature-detect (SIMD: v128 const; threads: shared memory + atomic)
const WASM_SIMD = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
const WASM_THREADS = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]);

async function probeEnv(log: TestLog, device: ProbeReport['device'], notes: string[]) {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { getHighEntropyValues(h: string[]): Promise<Obj>; platform?: string; mobile?: boolean };
    gpu?: { requestAdapter(): Promise<Obj | null> };
  };
  const ek = device.ek;
  ek.userAgent = nav.userAgent;

  await log.run('ortam.uaCh', 'User-Agent Client Hints', async () => {
    if (!nav.userAgentData) return { durum: 'yok', ayrıntı: 'navigator.userAgentData yok', ölçüm: null };
    const h = await withTimeout(
      nav.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture', 'bitness', 'fullVersionList']),
      3000,
      'UA-CH',
    );
    ek.uaCh = jsonSafe({ platform: nav.userAgentData.platform, mobile: nav.userAgentData.mobile, ...h });
    if (typeof h.model === 'string' && h.model) device.model = h.model;
    const android = (h.platform ?? nav.userAgentData.platform) === 'Android';
    if (android && typeof h.platformVersion === 'string' && h.platformVersion) device.androidSürümü = h.platformVersion;
    return { durum: 'var', ayrıntı: `model ${h.model || '?'}, platform ${h.platformVersion || '?'}`, ölçüm: ek.uaCh };
  });
  if (!device.androidSürümü && /Android/.test(nav.userAgent)) {
    const m = nav.userAgent.match(/Android ([\d.]+)/);
    device.androidSürümü = m ? m[1] : null;
  }
  notes.push('Web üreticiyi okuyamaz (device.üretici null); model UA-CH ile gelir.');

  const dpr = window.devicePixelRatio || 1;
  device.ekran = { genişlikPx: Math.round(screen.width * dpr), yükseklikPx: Math.round(screen.height * dpr), dpr: round(dpr, 3) };
  ek.ekranCss = { genişlik: screen.width, yükseklik: screen.height, pencere: [innerWidth, innerHeight], yön: screen.orientation?.type ?? null };
  device.çekirdek = nav.hardwareConcurrency ?? null;
  device.ramGb = nav.deviceMemory ?? null;
  if (nav.deviceMemory) notes.push('deviceMemory tarayıcıda en çok 8 GB gösterir (yuvarlanmış).');
  const mem = (performance as Performance & { memory?: { jsHeapSizeLimit: number } }).memory;
  ek.jsHeapLimitMb = mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null;
  ek.hdrEkran = matchMedia('(dynamic-range: high)').matches;
  ek.renkGamı = ['rec2020', 'p3', 'srgb'].find((x) => matchMedia(`(color-gamut: ${x})`).matches) ?? null;

  await log.run('ortam.webgl', 'WebGL', async () => {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') as WebGLRenderingContext | null) || c.getContext('webgl');
    if (!gl) return { durum: 'yok', ayrıntı: 'WebGL bağlamı açılmadı', ölçüm: null };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const vendor = String(dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
    const ölçüm = {
      sürüm: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1,
      renderer,
      vendor,
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxRenderbuffer: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      floatRenkTamponu: !!gl.getExtension('EXT_color_buffer_float'),
    };
    device.gpu = renderer;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { durum: 'var', ayrıntı: `WebGL${ölçüm.sürüm} ${renderer}, max doku ${ölçüm.maxTexture}`, ölçüm };
  });

  await log.run('ortam.webgpu', 'WebGPU', async () => {
    if (!nav.gpu) return { durum: 'yok', ayrıntı: 'navigator.gpu yok', ölçüm: null };
    const a = await withTimeout(nav.gpu.requestAdapter(), 3000, 'requestAdapter');
    if (!a) return { durum: 'yok', ayrıntı: 'adaptör yok (null)', ölçüm: null };
    const info = isObj(a.info) ? a.info : {};
    const limits = isObj(a.limits) ? a.limits : {};
    const ölçüm = jsonSafe({ vendor: info.vendor, architecture: info.architecture, maxTexture2D: limits.maxTextureDimension2D });
    return { durum: 'var', ayrıntı: `adaptör ${String(info.vendor || '?')} ${String(info.architecture || '')}`.trim(), ölçüm };
  });

  await log.run('ortam.offscreenCanvas', 'OffscreenCanvas', async () => {
    if (typeof OffscreenCanvas === 'undefined') return { durum: 'yok', ayrıntı: 'OffscreenCanvas yok', ölçüm: null };
    const oc = new OffscreenCanvas(4, 4);
    const ölçüm = { '2d': !!oc.getContext('2d'), webgl2: !!new OffscreenCanvas(4, 4).getContext('webgl2'), convertToBlob: 'convertToBlob' in oc };
    return { durum: 'var', ayrıntı: `2d ${ölçüm['2d'] ? 'var' : 'yok'}, webgl2 ${ölçüm.webgl2 ? 'var' : 'yok'}`, ölçüm };
  });

  await log.run('ortam.webcodecs', 'WebCodecs', async () => {
    const VE = g.VideoEncoder as { isConfigSupported(c: Obj): Promise<{ supported: boolean }> } | undefined;
    const ID = g.ImageDecoder as { isTypeSupported(t: string): Promise<boolean> } | undefined;
    if (!VE && !ID && !g.VideoDecoder) return { durum: 'yok', ayrıntı: 'WebCodecs yok', ölçüm: null };
    const codecs: Record<string, ProbeMeasure> = {};
    if (VE)
      for (const [name, codec] of [['avc', 'avc1.42001f'], ['hevc', 'hvc1.1.6.L120.90'], ['vp9', 'vp09.00.10.08'], ['av1', 'av01.0.08M.08']]) {
        try {
          codecs[name] = (await withTimeout(VE.isConfigSupported({ codec, width: 1920, height: 1080, bitrate: 8e6, framerate: 30 }), 3000, codec)).supported;
        } catch {
          codecs[name] = false;
        }
      }
    const images: Record<string, ProbeMeasure> = {};
    if (ID) for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']) images[t] = await ID.isTypeSupported(t).catch(() => false);
    const ölçüm = { VideoEncoder: !!VE, VideoDecoder: !!g.VideoDecoder, ImageDecoder: !!ID, VideoFrame: !!g.VideoFrame, kodlayıcı1080p: codecs, imageDecoder: images };
    const enc = Object.entries(codecs).filter(([, v]) => v).map(([k]) => k).join(', ') || 'yok';
    return { durum: 'var', ayrıntı: `kodlayıcı (1080p): ${enc}`, ölçüm };
  });

  for (const [id, ad, bytes] of [
    ['ortam.wasmSimd', 'WASM SIMD', WASM_SIMD],
    ['ortam.wasmThreads', 'WASM threads', WASM_THREADS],
  ] as const) {
    await log.run(id, ad, async () => {
      if (typeof WebAssembly === 'undefined') return { durum: 'yok', ayrıntı: 'WebAssembly yok', ölçüm: null };
      const ok = WebAssembly.validate(bytes);
      const sab = typeof SharedArrayBuffer !== 'undefined';
      const ölçüm: ProbeMeasure = id === 'ortam.wasmThreads' ? { doğrulama: ok, sharedArrayBuffer: sab, crossOriginIsolated: !!g.crossOriginIsolated } : { doğrulama: ok };
      const usable = id === 'ortam.wasmThreads' ? ok && sab : ok;
      const ayrıntı = id === 'ortam.wasmThreads' && ok && !sab ? 'Motor destekliyor; sayfa cross-origin-isolated değil (SharedArrayBuffer yok)' : usable ? 'kullanılabilir' : 'yok';
      return { durum: usable ? 'var' : 'yok', ayrıntı, ölçüm };
    });
  }

  await log.run('ortam.depolama', 'Depolama kotası', async () => {
    if (!navigator.storage?.estimate) return { durum: 'yok', ayrıntı: 'StorageManager yok', ölçüm: null };
    const e = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    const ölçüm = { kotaMb: e.quota ? Math.round(e.quota / 1048576) : null, kullanımMb: e.usage ? round(e.usage / 1048576, 1) : 0, kalıcı: persisted };
    return { durum: 'var', ayrıntı: `kota ${ölçüm.kotaMb} MB`, ölçüm };
  });

  await log.run('ortam.pwa', 'PWA display-mode', async () => {
    const mode = ['fullscreen', 'standalone', 'minimal-ui', 'browser'].find((m) => matchMedia(`(display-mode: ${m})`).matches) ?? null;
    return { durum: 'var', ayrıntı: `display-mode: ${mode ?? '?'}`, ölçüm: { displayMode: mode } };
  });

  await log.run('ortam.webShare', 'Web Share', async () => {
    if (!navigator.share) return { durum: 'yok', ayrıntı: 'navigator.share yok', ölçüm: null };
    const can = (f: File) => {
      try {
        return !!navigator.canShare?.({ files: [f] });
      } catch {
        return false;
      }
    };
    const ölçüm = {
      metin: true,
      dosyaJson: can(new File(['{}'], 'a.json', { type: 'application/json' })),
      dosyaTextJson: can(new File(['{}'], 'a.json', { type: 'text/plain' })),
      dosyaTxt: can(new File(['x'], 'a.txt', { type: 'text/plain' })),
      dosyaJpeg: can(new File([new Uint8Array([255, 216, 255, 217])], 'a.jpg', { type: 'image/jpeg' })),
    };
    const files = ölçüm.dosyaJpeg || ölçüm.dosyaTxt;
    return { durum: 'var', ayrıntı: `dosya paylaşımı ${files ? 'var' : 'yok'} (JSON tipi ${ölçüm.dosyaJson ? 'kabul' : 'ret'})`, ölçüm };
  });

  log.add({
    id: 'ortam.imageCapture',
    ad: 'ImageCapture API',
    durum: g.ImageCapture ? 'var' : 'yok',
    ayrıntı: g.ImageCapture ? 'takePhoto / grabFrame / getPhotoCapabilities' : 'ImageCapture yok',
    ölçüm: null,
    süreMs: 0,
  });
  log.add({
    id: 'ortam.trackProcessor',
    ad: 'MediaStreamTrackProcessor (ham kare akışı)',
    durum: g.MediaStreamTrackProcessor ? 'var' : 'yok',
    ayrıntı: g.MediaStreamTrackProcessor ? 'kareler VideoFrame olarak okunabilir' : 'yok',
    ölçüm: null,
    süreMs: 0,
  });
}

// ---------- 2. Sensors ----------

async function probeSensors(log: TestLog, sensors: ProbeReport['sensors'], permission: Promise<string | null>) {
  const perm = await permission;
  if (perm) sensors.izin = perm;
  const ms = 3000;
  const counts = { orientation: 0, motion: 0, motionInterval: null as number | null, accel: false, rot: false, abs: false };
  const onOri = (e: DeviceOrientationEvent) => {
    if (e.alpha !== null || e.beta !== null) counts.orientation++;
    counts.abs = counts.abs || !!e.absolute;
  };
  const onMot = (e: DeviceMotionEvent) => {
    counts.motion++;
    counts.motionInterval = e.interval ?? null;
    counts.accel = counts.accel || !!e.accelerationIncludingGravity?.x;
    counts.rot = counts.rot || e.rotationRate?.alpha !== null;
  };
  window.addEventListener('deviceorientation', onOri);
  window.addEventListener('devicemotion', onMot);

  const generic: Record<string, { n: number; error: string | null; lux: number[] }> = {};
  const started: SensorLike[] = [];
  for (const name of ['AmbientLightSensor', 'Accelerometer', 'Gyroscope', 'LinearAccelerationSensor', 'GravitySensor', 'AbsoluteOrientationSensor', 'Magnetometer']) {
    const C = g[name] as SensorCtor | undefined;
    if (!C) continue;
    const rec = (generic[name] = { n: 0, error: null as string | null, lux: [] as number[] });
    try {
      const s = new C({ frequency: 60 });
      s.addEventListener('reading', () => {
        rec.n++;
        if (typeof s.illuminance === 'number' && rec.lux.length < 400) rec.lux.push(s.illuminance);
      });
      s.addEventListener('error', (e) => {
        const err = (e as Event & { error?: unknown }).error;
        rec.error = errMsg(err ?? e.type);
      });
      s.start();
      started.push(s);
    } catch (e) {
      rec.error = errMsg(e);
    }
  }
  const t0 = now();
  await sleep(ms);
  const el = (now() - t0) / 1000;
  window.removeEventListener('deviceorientation', onOri);
  window.removeEventListener('devicemotion', onMot);
  started.forEach((s) => {
    try {
      s.stop();
    } catch {
      /* zaten durdu */
    }
  });

  const oriHz = round(counts.orientation / el, 1);
  const motHz = round(counts.motion / el, 1);
  sensors.deviceOrientationHz = oriHz;
  sensors.deviceMotionHz = motHz;
  sensors.motionIntervalMs = counts.motionInterval;
  log.add({
    id: 'sensor.deviceOrientation',
    ad: 'DeviceOrientation',
    durum: !('DeviceOrientationEvent' in window) ? 'yok' : oriHz > 0 ? 'var' : 'kabul-edildi-etkisiz',
    ayrıntı: oriHz > 0 ? `${oriHz} Hz ölçüldü${counts.abs ? ', mutlak' : ''}` : 'olay var ama 3 sn içinde veri gelmedi',
    ölçüm: { hz: oriHz, mutlak: counts.abs },
    süreMs: ms,
  });
  log.add({
    id: 'sensor.deviceMotion',
    ad: 'DeviceMotion',
    durum: !('DeviceMotionEvent' in window) ? 'yok' : motHz > 0 ? 'var' : 'kabul-edildi-etkisiz',
    ayrıntı: motHz > 0 ? `${motHz} Hz ölçüldü (bildirilen aralık ${counts.motionInterval ?? '?'} ms)` : 'olay var ama 3 sn içinde veri gelmedi',
    ölçüm: { hz: motHz, ivme: counts.accel, dönüş: counts.rot, aralıkMs: counts.motionInterval },
    süreMs: ms,
  });
  for (const name of ['AmbientLightSensor', 'Accelerometer', 'Gyroscope', 'Magnetometer']) {
    const r = generic[name];
    const hz = r ? round(r.n / el, 1) : 0;
    const lux = r?.lux.length ? { min: Math.min(...r.lux), max: Math.max(...r.lux) } : null;
    sensors[name] = r ? { hz, hata: r.error, lux } : null;
    log.add({
      id: `sensor.${name}`,
      ad: `Generic Sensor: ${name}`,
      durum: !r ? 'yok' : r.error && !r.n ? 'hata' : hz > 0 ? 'var' : 'kabul-edildi-etkisiz',
      ayrıntı: !r ? 'API yok (tarayıcı açmıyor)' : r.error && !r.n ? r.error : `${hz} Hz${lux ? `, ${lux.min}–${lux.max} lux` : ''}`,
      ölçüm: { hz, lux },
      süreMs: ms,
    });
  }
  for (const name of ['LinearAccelerationSensor', 'GravitySensor', 'AbsoluteOrientationSensor']) {
    const r = generic[name];
    sensors[name] = r ? { hz: round(r.n / el, 1), hata: r.error } : null;
  }
}

/** iOS-style permission flow: call inside the tap (the function does not exist on Android Chrome) */
export function requestMotionPermission(): Promise<string | null> {
  const DM = g.DeviceMotionEvent as { requestPermission?: () => Promise<string> } | undefined;
  const DO = g.DeviceOrientationEvent as { requestPermission?: () => Promise<string> } | undefined;
  if (!DM?.requestPermission && !DO?.requestPermission) return Promise.resolve(null);
  return Promise.all([DM?.requestPermission?.().catch(errMsg), DO?.requestPermission?.().catch(errMsg)]).then(
    ([a, b]) => `motion: ${a ?? '-'}, orientation: ${b ?? '-'}`,
  );
}

// ---------- 3. Cameras ----------

interface CamCtx {
  mainIndex: number;
  ids: string[];
}

async function probeCameras(log: TestLog, video: HTMLVideoElement, cameras: ProbeCamera[], device: ProbeReport['device'], notes: string[]): Promise<CamCtx | null> {
  const supported = jsonSafe(navigator.mediaDevices?.getSupportedConstraints?.() ?? null);
  device.ek.desteklenenKısıtlar = supported;
  if (!navigator.mediaDevices?.getUserMedia) {
    log.add({ id: 'kamera.izin', ad: 'Kamera izni', durum: 'yok', ayrıntı: 'getUserMedia yok (HTTPS değil mi?)', ölçüm: null, süreMs: 0 });
    return null;
  }
  let mainDeviceId: string | null = null;
  let ok = false;
  await log.run('kamera.izin', 'Kamera izni', async () => {
    const { stream, track } = await openStream(video, { facingMode: { ideal: 'environment' } });
    mainDeviceId = (settingsOf(track).deviceId as string) ?? null;
    stopStream(video, stream);
    ok = true;
    return { durum: 'var', ayrıntı: 'izin verildi', ölçüm: null };
  });
  if (!ok) return null;

  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const ids = devices.map((d) => d.deviceId);
  let backCount = 0;
  let zoomBelow1: number | null = null;
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    const t0 = now();
    try {
      const { stream, track } = await openStream(video, { deviceId: { exact: d.deviceId }, width: { ideal: 640 } });
      const caps = capsOf(track);
      const settings = settingsOf(track);
      const label = d.label || track.label || '';
      const yön = facingOf(settings, label);
      if (yön === 'arka') backCount++;
      const z = rangeOf(caps.zoom);
      if (z && z.min < 1) zoomBelow1 = Math.min(zoomBelow1 ?? 1, z.min);
      cameras.push({
        kimlik: String(i),
        yön,
        etiket: label,
        fiziksel: false,
        özellikler: { capabilities: jsonSafe(caps), settings: jsonSafe(settings), açılmaMs: Math.round(now() - t0), varsayılanArka: d.deviceId === mainDeviceId },
      });
      stopStream(video, stream);
    } catch (e) {
      cameras.push({ kimlik: String(i), yön: 'bilinmiyor', etiket: d.label, fiziksel: false, özellikler: { hata: errMsg(e) } });
    }
  }
  if (cameras.some((c) => /fake/i.test(c.etiket))) notes.push('Sahte kamera algılandı: kontrol sonuçları gerçek donanımı göstermez.');

  log.add({
    id: 'kamera.liste',
    ad: 'Kamera listesi (enumerateDevices)',
    durum: devices.length ? 'var' : 'yok',
    ayrıntı: `${devices.length} kamera, ${backCount} arka`,
    ölçüm: { toplam: devices.length, arka: backCount, etiketler: cameras.map((c) => c.etiket) },
    süreMs: 0,
  });
  log.add({
    id: 'kamera.ultraGenis',
    ad: 'Ultra geniş erişimi',
    durum: backCount >= 2 || zoomBelow1 !== null ? 'var' : 'yok',
    ayrıntı:
      backCount >= 2
        ? `${backCount} arka kamera ayrı deviceId olarak geliyor${zoomBelow1 !== null ? `; zoom ${zoomBelow1}'e iniyor` : ''}`
        : zoomBelow1 !== null
          ? `tek arka kamera, zoom ${zoomBelow1}'e iniyor`
          : 'yalnız bir arka kamera ve zoom 1 altına inmiyor',
    ölçüm: { arkaKamera: backCount, zoomMin: zoomBelow1 },
    süreMs: 0,
  });
  const mainIndex = Math.max(0, mainDeviceId ? ids.indexOf(mainDeviceId) : cameras.findIndex((c) => c.yön === 'arka'));
  return { mainIndex, ids };
}

// ---------- 4. Resolution, fps, ImageCapture ----------

const RES_TARGETS: [number, number][] = [
  [4096, 3072],
  [3840, 2160],
  [1920, 1080],
  [1280, 720],
];

async function decodeSize(blob: Blob): Promise<{ w: number; h: number; bmp: ImageBitmap }> {
  const bmp = await createImageBitmap(blob);
  return { w: bmp.width, h: bmp.height, bmp };
}

async function probeResolution(log: TestLog, video: RvfcVideo, track: MediaStreamTrack, perf: ProbeReport['perf'], meter: Meter) {
  let bestVideo = { w: 0, h: 0 };
  for (const [w, h] of RES_TARGETS) {
    await log.run(`cozunurluk.${w}x${h}`, `Video ${w}×${h}`, async () => {
      await withTimeout(track.applyConstraints({ width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30 } }), 6000, 'applyConstraints');
      await sleep(500);
      await waitDims(video);
      const fps = await measureFps(video, 1500);
      const s = settingsOf(track);
      const gw = video.videoWidth;
      const gh = video.videoHeight;
      const long = Math.max(gw, gh);
      const short = Math.min(gw, gh);
      if (long * short > bestVideo.w * bestVideo.h) bestVideo = { w: long, h: short };
      const full = long >= w * 0.98 && short >= h * 0.98;
      return {
        durum: full ? 'var' : 'yok',
        ayrıntı: `istenen ${w}×${h}, verilen ${gw}×${gh} @ ${fps} fps (ayar ${s.frameRate ?? '?'} fps)`,
        ölçüm: { istenen: [w, h], verilen: [gw, gh], ölçülenFps: fps, ayarFps: jsonSafe(s.frameRate) },
      };
    });
  }
  perf.enBüyükVideo = [bestVideo.w, bestVideo.h];

  const IC = g.ImageCapture as ImageCaptureCtor | undefined;
  if (!IC) {
    log.add({ id: 'cozunurluk.still4k', ad: '4K fotoğraf (takePhoto)', durum: 'yok', ayrıntı: `ImageCapture yok; en büyük video karesi ${bestVideo.w}×${bestVideo.h}`, ölçüm: null, süreMs: 0 });
    return null;
  }
  // Photo tests run with a 1920×1080 preview (real use)
  await withTimeout(track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } }), 6000, 'applyConstraints').catch(() => undefined);
  await sleep(400);
  const ic = new IC(track);
  let photoCaps: Obj = {};
  await log.run('cozunurluk.photoCapabilities', 'getPhotoCapabilities', async () => {
    photoCaps = await withTimeout(ic.getPhotoCapabilities(), 4000, 'getPhotoCapabilities');
    const settings = await withTimeout(ic.getPhotoSettings(), 4000, 'getPhotoSettings').catch(() => null);
    const iw = rangeOf(photoCaps.imageWidth);
    const ih = rangeOf(photoCaps.imageHeight);
    return {
      durum: 'var',
      ayrıntı: `fotoğraf genişliği ${iw ? `${iw.min}–${iw.max}` : '?'}, yükseklik ${ih ? `${ih.min}–${ih.max}` : '?'}; flaş ${JSON.stringify(photoCaps.fillLightMode ?? [])}`,
      ölçüm: { capabilities: jsonSafe(photoCaps), settings: jsonSafe(settings) },
    };
  });

  let maxLong = 0;
  const shoot = async (id: string, ad: string, settings?: Obj) =>
    log.run(id, ad, async () => {
      const counter = frameCounter(video);
      const n0 = counter.count();
      const t0 = now();
      const blob = await withTimeout(ic.takePhoto(settings), 10000, 'takePhoto');
      const ms = now() - t0;
      const frames = counter.count() - n0;
      counter.stop();
      const { w, h, bmp } = await decodeSize(blob);
      const st = meter.sampleBitmap(bmp, w, h).stats;
      bmp.close();
      maxLong = Math.max(maxLong, w, h);
      const frozen = ms > 250 && frames <= 1;
      return {
        durum: 'var',
        ayrıntı: `${w}×${h}, ${Math.round(blob.size / 1024)} KB, ${Math.round(ms)} ms; önizleme ${frozen ? 'dondu' : `${frames} kare akmaya devam etti`}`,
        ölçüm: { boyut: [w, h], bayt: blob.size, tip: blob.type, ms: Math.round(ms), önizlemeKaresi: frames, önizlemeDondu: frozen, parlaklık: st.parlaklık },
      };
    });
  await shoot('cozunurluk.takePhoto', 'takePhoto (varsayılan)');
  const iw = rangeOf(photoCaps.imageWidth);
  const ih = rangeOf(photoCaps.imageHeight);
  if (iw && ih) await shoot('cozunurluk.takePhotoMax', 'takePhoto (en büyük)', { imageWidth: iw.max, imageHeight: ih.max });
  else log.skip('cozunurluk.takePhotoMax', 'takePhoto (en büyük)', 'imageWidth/imageHeight aralığı yok');

  await log.run('cozunurluk.grabFrame', 'grabFrame', async () => {
    const times: number[] = [];
    let size = [0, 0];
    for (let i = 0; i < 3; i++) {
      const t0 = now();
      const bmp = await withTimeout(ic.grabFrame(), 4000, 'grabFrame');
      times.push(now() - t0);
      size = [bmp.width, bmp.height];
      bmp.close();
    }
    const avg = round(times.reduce((a, b) => a + b, 0) / times.length, 1);
    return { durum: 'var', ayrıntı: `${size[0]}×${size[1]}, ortalama ${avg} ms`, ölçüm: { boyut: size, msListe: times.map((t) => round(t, 1)), ortMs: avg } };
  });

  const tp = (log.list.find((t) => t.id === 'cozunurluk.takePhoto')?.ölçüm ?? {}) as Obj;
  const tpMax = (log.list.find((t) => t.id === 'cozunurluk.takePhotoMax')?.ölçüm ?? {}) as Obj;
  perf.takePhotoMs = (tp.ms as number) ?? null;
  perf.takePhotoMaxMs = (tpMax.ms as number) ?? null;
  perf.önizlemeDondu = (tp.önizlemeDondu as boolean) ?? null;
  log.add({
    id: 'perf.onizlemeDonma',
    ad: 'takePhoto sırasında önizleme',
    durum: tp.ms === undefined ? 'atlandı' : tp.önizlemeDondu || tpMax.önizlemeDondu ? 'var' : 'yok',
    ayrıntı: tp.ms === undefined ? 'takePhoto çalışmadı' : tp.önizlemeDondu || tpMax.önizlemeDondu ? 'önizleme donuyor ("var" = donma var)' : 'önizleme donmuyor',
    ölçüm: { varsayılan: (tp.önizlemeKaresi as number) ?? null, enBüyük: (tpMax.önizlemeKaresi as number) ?? null },
    süreMs: 0,
  });
  log.add({
    id: 'cozunurluk.still4k',
    ad: '4K fotoğraf (takePhoto)',
    durum: maxLong >= 3840 ? 'var' : maxLong ? 'yok' : 'hata',
    ayrıntı: maxLong ? `en uzun kenar ${maxLong} px` : 'takePhoto çıktı vermedi',
    ölçüm: { enUzunKenar: maxLong },
    süreMs: 0,
  });
  return ic;
}

// ---------- 5. Effect tests ----------

type Metric = 'parlaklık' | 'renk' | 'keskinlik' | 'fark';
interface ControlDef {
  id: string;
  ad: string;
  key: string;
  mode?: [string, string];
  metric: Metric;
  log?: boolean;
  /** Upper cap so long exposures do not stall the frame rate (in the control's unit) */
  cap?: number;
}

const CONTROLS: ControlDef[] = [
  { id: 'etki.exposureCompensation', ad: 'EV telafisi', key: 'exposureCompensation', mode: ['exposureMode', 'continuous'], metric: 'parlaklık' },
  // exposureTime unit is 100 µs; 2000 = 200 ms
  { id: 'etki.exposureTime', ad: 'Manuel pozlama süresi', key: 'exposureTime', mode: ['exposureMode', 'manual'], metric: 'parlaklık', log: true, cap: 2000 },
  { id: 'etki.iso', ad: 'Manuel ISO', key: 'iso', mode: ['exposureMode', 'manual'], metric: 'parlaklık', log: true },
  { id: 'etki.colorTemperature', ad: 'Manuel beyaz dengesi (K)', key: 'colorTemperature', mode: ['whiteBalanceMode', 'manual'], metric: 'renk' },
  { id: 'etki.focusDistance', ad: 'Manuel odak mesafesi', key: 'focusDistance', mode: ['focusMode', 'manual'], metric: 'keskinlik' },
  { id: 'etki.zoom', ad: 'Zoom', key: 'zoom', metric: 'fark' },
];

const metricMin: Record<Metric, number> = {
  parlaklık: EFFECT_MIN.parlaklık,
  renk: EFFECT_MIN.renkOranı,
  keskinlik: EFFECT_MIN.keskinlikGöreli,
  fark: EFFECT_MIN.kareFarkı,
};

function metricDelta(metric: Metric, rows: { stats: FrameStats; sample: FrameSample }[]): number {
  const a = rows[0];
  const b = rows[rows.length - 1];
  if (metric === 'parlaklık') return round(Math.abs(b.stats.parlaklık - a.stats.parlaklık));
  if (metric === 'renk') return round(Math.max(Math.abs(b.stats.bOran - a.stats.bOran), Math.abs(b.stats.rOran - a.stats.rOran)), 3);
  if (metric === 'keskinlik') {
    const ks = rows.map((r) => r.stats.keskinlik);
    const mean = ks.reduce((x, y) => x + y, 0) / ks.length || 1;
    return round((Math.max(...ks) - Math.min(...ks)) / mean, 3);
  }
  return lumaDiff(a.sample, b.sample);
}

async function probeEffects(log: TestLog, track: MediaStreamTrack, meter: Meter, perf: ProbeReport['perf']) {
  const caps = capsOf(track);
  const original = settingsOf(track);
  const supported = (navigator.mediaDevices.getSupportedConstraints?.() ?? {}) as Obj;

  // Scene noise: three measurements with nothing changed, largest pairwise difference
  await sleep(800);
  const base: { stats: FrameStats; sample: FrameSample }[] = [];
  for (let i = 0; i < 3; i++) {
    if (i) await sleep(500);
    base.push(await meter.measure());
  }
  const noise: Record<Metric, number> = { parlaklık: 0, renk: 0, keskinlik: 0, fark: 0 };
  for (let i = 0; i < base.length; i++)
    for (let j = i + 1; j < base.length; j++) {
      const [a, b] = [base[i], base[j]];
      noise.parlaklık = Math.max(noise.parlaklık, Math.abs(a.stats.parlaklık - b.stats.parlaklık));
      noise.renk = Math.max(noise.renk, Math.abs(a.stats.bOran - b.stats.bOran), Math.abs(a.stats.rOran - b.stats.rOran));
      noise.keskinlik = Math.max(noise.keskinlik, Math.abs(a.stats.keskinlik - b.stats.keskinlik) / ((a.stats.keskinlik + b.stats.keskinlik) / 2 || 1));
      noise.fark = Math.max(noise.fark, lumaDiff(a.sample, b.sample));
    }
  perf.sahneGürültüsü = jsonSafe(noise);
  perf.sahne = jsonSafe(base[base.length - 1].stats);

  for (const c of CONTROLS) {
    const range = rangeOf(caps[c.key]);
    const modes = Array.isArray(caps[c.mode?.[0] ?? '']) ? (caps[c.mode![0]] as string[]) : null;
    if (!range || range.max <= range.min) {
      log.add({ id: c.id, ad: c.ad, durum: 'yok', ayrıntı: `${c.key} yetenek listesinde yok`, ölçüm: null, süreMs: 0 });
      continue;
    }
    if (c.mode && !modes?.includes(c.mode[1])) {
      log.add({ id: c.id, ad: c.ad, durum: 'yok', ayrıntı: `${c.mode[0]} içinde "${c.mode[1]}" yok (${JSON.stringify(modes ?? [])})`, ölçüm: { aralık: jsonSafe(range), modlar: jsonSafe(modes) }, süreMs: 0 });
      continue;
    }
    const top = c.cap ? Math.min(range.max, c.cap) : range.max;
    const mid = c.log && range.min > 0 ? Math.sqrt(range.min * top) : (range.min + top) / 2;
    const values = [range.min, mid, top].map((v) => snap(v, range));
    const t0 = now();
    const rows: { stats: FrameStats; sample: FrameSample }[] = [];
    const table: ProbeMeasure[] = [];
    let error: string | null = null;
    let restored = false;
    try {
      for (const v of values) {
        const cons: Obj = { [c.key]: v };
        if (c.mode) cons[c.mode[0]] = c.mode[1];
        await apply(track, cons);
        await sleep(600);
        const m = await meter.measure();
        rows.push(m);
        table.push({ istenen: round(v, 4), okunan: jsonSafe(settingsOf(track)[c.key]), parlaklık: m.stats.parlaklık, rOran: m.stats.rOran, bOran: m.stats.bOran, keskinlik: m.stats.keskinlik });
      }
    } catch (e) {
      error = errMsg(e);
    } finally {
      const back: Obj = {};
      if (c.mode) back[c.mode[0]] = original[c.mode[0]] ?? 'continuous';
      else if (original[c.key] !== undefined) back[c.key] = original[c.key];
      if (c.key === 'exposureCompensation' && original[c.key] !== undefined) back[c.key] = original[c.key];
      restored = await apply(track, back).then(() => true, () => false);
      await sleep(400);
    }
    const delta = rows.length >= 2 ? metricDelta(c.metric, rows) : NaN;
    const readBack = table.map((r) => (isObj(r) ? r.okunan : null));
    const readChanged = new Set(readBack.map((x) => JSON.stringify(x))).size > 1;
    const durum = decideEffect({ supported: true, error, delta, noise: noise[c.metric], minDelta: metricMin[c.metric] });
    log.add({
      id: c.id,
      ad: c.ad,
      durum,
      ayrıntı: error
        ? error
        : `${c.metric} farkı ${delta} (eşik ${metricMin[c.metric]}, gürültü ${round(noise[c.metric], 3)}); getSettings ${readChanged ? 'değeri izliyor' : 'değişmedi'}`,
      ölçüm: { aralık: jsonSafe(range), değerler: table, fark: Number.isFinite(delta) ? delta : null, metrik: c.metric, geriOkumaDeğişti: readChanged, geriYüklendi: restored },
      süreMs: now() - t0,
    });
  }

  // Torch
  await log.run('etki.torch', 'Fener (torch)', async () => {
    if (caps.torch !== true) return { durum: 'yok', ayrıntı: 'torch yetenek listesinde yok', ölçüm: null };
    let off: FrameStats | null = null;
    let on: FrameStats | null = null;
    let restored = false;
    try {
      off = (await meter.measure()).stats;
      await apply(track, { torch: true });
      await sleep(600);
      on = (await meter.measure()).stats;
    } finally {
      restored = await apply(track, { torch: false }).then(() => true, () => false);
      await sleep(300);
    }
    const delta = round(on.parlaklık - off.parlaklık);
    const durum = decideEffect({ supported: true, error: null, delta, noise: noise.parlaklık, minDelta: EFFECT_MIN.parlaklık });
    return {
      durum,
      ayrıntı: `parlaklık ${off.parlaklık} → ${on.parlaklık} (sahneye yakınlığa bağlı)`,
      ölçüm: { kapalı: off.parlaklık, açık: on.parlaklık, fark: delta, geriYüklendi: restored },
    };
  });

  // Spot metering (pointsOfInterest): top-left and bottom-right metering point
  await log.run('etki.pointsOfInterest', 'Nokta pozlama (pointsOfInterest)', async () => {
    const modes = Array.isArray(caps.exposureMode) ? (caps.exposureMode as string[]) : [];
    if (!supported.pointsOfInterest) return { durum: 'yok', ayrıntı: 'pointsOfInterest desteklenen kısıtlarda yok', ölçüm: null };
    const mode = modes.includes('continuous') ? 'continuous' : modes.includes('single-shot') ? 'single-shot' : null;
    if (!mode) return { durum: 'yok', ayrıntı: `otomatik pozlama modu yok (${JSON.stringify(modes)})`, ölçüm: null };
    const res: Record<string, ProbeMeasure> = {};
    let a: FrameStats | null = null;
    let b: FrameStats | null = null;
    try {
      await apply(track, { exposureMode: mode, pointsOfInterest: [{ x: 0.15, y: 0.15 }] });
      await sleep(900);
      a = (await meter.measure()).stats;
      res.solÜstNokta = { parlaklık: a.parlaklık, solÜst: a.solÜst, sağAlt: a.sağAlt, okunan: jsonSafe(settingsOf(track).pointsOfInterest) };
      await apply(track, { exposureMode: mode, pointsOfInterest: [{ x: 0.85, y: 0.85 }] });
      await sleep(900);
      b = (await meter.measure()).stats;
      res.sağAltNokta = { parlaklık: b.parlaklık, solÜst: b.solÜst, sağAlt: b.sağAlt, okunan: jsonSafe(settingsOf(track).pointsOfInterest) };
    } finally {
      res.geriYüklendi = await apply(track, { exposureMode: original.exposureMode ?? mode, pointsOfInterest: [{ x: 0.5, y: 0.5 }] }).then(() => true, () => false);
      await sleep(400);
    }
    const delta = round(Math.abs(a.parlaklık - b.parlaklık));
    res.fark = delta;
    const durum = decideEffect({ supported: true, error: null, delta, noise: noise.parlaklık, minDelta: EFFECT_MIN.parlaklık });
    return { durum, ayrıntı: `ölçüm noktası sol-üst → sağ-alt: parlaklık ${a.parlaklık} → ${b.parlaklık} (sahnede aydınlık/karanlık bölge gerekir)`, ölçüm: res };
  });
}

// ---------- 6. Performance ----------

async function probePerf(log: TestLog, video: RvfcVideo, track: MediaStreamTrack, ic: ImageCaptureLike | null, meter: Meter, perf: ProbeReport['perf']) {
  await log.run('perf.histogramDöngüsü', 'Histogram analizi döngüsü (160 px)', async () => {
    let longTasks = 0;
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((l) => (longTasks += l.getEntries().length));
      po.observe({ entryTypes: ['longtask'] });
    } catch {
      po = null;
    }
    // (a) analyse every new frame: work per frame and main-thread load
    let work = 0;
    let frames = 0;
    const t0 = now();
    while (now() - t0 < 2000) {
      await meter.nextFrame(200);
      const s = now();
      meter.sampleNow();
      work += now() - s;
      frames++;
    }
    const el = now() - t0;
    // (b) peak rate without waiting (same frame repeatedly)
    let iters = 0;
    const t1 = now();
    while (now() - t1 < 1000) {
      meter.sampleNow();
      iters++;
    }
    const peak = round((iters * 1000) / (now() - t1), 1);
    po?.disconnect();
    const ölçüm = {
      kareBaşınaAnalizFps: round((frames * 1000) / el, 1),
      ortİşMs: round(work / Math.max(frames, 1), 2),
      anaİşParçacığıYüküYüzde: round((work / el) * 100, 1),
      tepeAnalizPerSn: peak,
      uzunGörev: po ? longTasks : null,
    };
    perf.histogram = ölçüm;
    return { durum: 'var', ayrıntı: `${ölçüm.kareBaşınaAnalizFps} kare/sn analiz, kare başı ${ölçüm.ortİşMs} ms (yük %${ölçüm.anaİşParçacığıYüküYüzde}); tepe ${peak}/sn`, ölçüm };
  });

  await log.run('perf.braket', 'Pozlama braketi (EV −2/0/+2, takePhoto)', async () => {
    if (!ic) return { durum: 'yok', ayrıntı: 'ImageCapture yok', ölçüm: null };
    const caps = capsOf(track);
    const r = rangeOf(caps.exposureCompensation);
    const modes = Array.isArray(caps.exposureMode) ? (caps.exposureMode as string[]) : [];
    if (!r || !modes.includes('continuous')) return { durum: 'yok', ayrıntı: 'exposureCompensation yok', ölçüm: null };
    const original = settingsOf(track).exposureCompensation;
    const evs = [-2, 0, 2].map((v) => snap(v, r));
    const shots: { ev: number; ms: number; bitiş: number; parlaklık: number; boyut: number[] }[] = [];
    const t0 = now();
    try {
      for (const ev of evs) {
        await apply(track, { exposureMode: 'continuous', exposureCompensation: ev });
        const s = now();
        const blob = await withTimeout(ic.takePhoto(), 10000, 'takePhoto');
        const end = now();
        const { w, h, bmp } = await decodeSize(blob);
        const st = meter.sampleBitmap(bmp, w, h).stats;
        bmp.close();
        shots.push({ ev, ms: Math.round(end - s), bitiş: Math.round(end - t0), parlaklık: st.parlaklık, boyut: [w, h] });
      }
    } finally {
      await apply(track, { exposureMode: 'continuous', exposureCompensation: typeof original === 'number' ? original : 0 }).catch(() => undefined);
    }
    const gaps = shots.slice(1).map((s, i) => s.bitiş - shots[i].bitiş);
    const delta = round(Math.abs(shots[shots.length - 1].parlaklık - shots[0].parlaklık));
    const durum = decideEffect({ supported: true, error: null, delta, noise: 0, minDelta: EFFECT_MIN.parlaklık });
    const ölçüm = { kareler: shots, karelerArasıMs: gaps, toplamMs: Math.round(now() - t0), parlaklıkFarkı: delta };
    perf.braket = ölçüm;
    return { durum, ayrıntı: `kareler arası ${gaps.join(' / ')} ms; parlaklık ${shots.map((s) => s.parlaklık).join(' / ')}`, ölçüm };
  });
}

// ---------- 7. Screen fill light ----------

async function probeFill(log: TestLog, hooks: ProbeHooks, meter: Meter, sensors: ProbeReport['sensors'], hasFront: boolean) {
  let stream: MediaStream | null = null;
  const AL = g.AmbientLightSensor as SensorCtor | undefined;
  let lux: number | null = null;
  let als: SensorLike | null = null;
  const t0 = now();
  try {
    if (AL) {
      try {
        als = new AL({ frequency: 10 });
        als.addEventListener('reading', () => (lux = als?.illuminance ?? null));
        als.start();
      } catch {
        als = null;
      }
    }
    // Without a listed front camera (e.g. the fake camera) the default camera is measured and this is noted
    const opened = await openStream(hooks.video, hasFront ? { facingMode: { exact: 'user' }, width: { ideal: 640 } } : { width: { ideal: 640 } }).catch((e) => {
      throw new Error(`ön kamera açılmadı: ${errMsg(e)}`);
    });
    stream = opened.stream;
    const track = opened.track;
    await sleep(1000);
    const caps = capsOf(track);
    const lock: Obj = {};
    if (Array.isArray(caps.exposureMode) && (caps.exposureMode as string[]).includes('manual')) lock.exposureMode = 'manual';
    if (Array.isArray(caps.whiteBalanceMode) && (caps.whiteBalanceMode as string[]).includes('manual')) lock.whiteBalanceMode = 'manual';
    const locked = Object.keys(lock).length ? await apply(track, lock).then(() => true, () => false) : false;
    const rows: Record<string, ProbeMeasure> = {};
    const stats: Partial<Record<FillMode, FrameStats>> = {};
    for (const mode of ['off', 'white', 'warm'] as FillMode[]) {
      hooks.setFill(mode);
      await sleep(1200);
      const st = (await meter.measure(3)).stats;
      stats[mode] = st;
      rows[FILL_NAME[mode]] = { parlaklık: st.parlaklık, rOran: st.rOran, bOran: st.bOran, lux };
    }
    const d = round(stats.white!.parlaklık - stats.off!.parlaklık);
    const warmShift = round(stats.white!.bOran - stats.warm!.bOran, 3);
    sensors.dolguIşığı = rows;
    log.add({
      id: 'dolgu.onKamera',
      ad: 'Ekran dolgu ışığı (ön kamera)',
      durum: decideEffect({ supported: true, error: null, delta: d, noise: 0, minDelta: EFFECT_MIN.parlaklık }),
      ayrıntı: `${hasFront ? '' : 'ön kamera yok, varsayılan kamerayla ölçüldü; '}parlaklık kapalı ${stats.off!.parlaklık} → beyaz ${stats.white!.parlaklık}; sıcak beyazda B/G ${warmShift} düştü; pozlama kilidi ${locked ? 'var' : 'yok (otomatik pozlama farkı bastırabilir)'}`,
      ölçüm: { ...rows, fark: d, sıcakBGFarkı: warmShift, pozlamaKilidi: locked, önKamera: hasFront },
      süreMs: now() - t0,
    });
    const luxVals = Object.values(rows).map((r) => (isObj(r) ? r.lux : null));
    log.add({
      id: 'dolgu.isikSensoru',
      ad: 'Dolgu ışığı: ortam ışığı sensörü',
      durum: als && luxVals.some((v) => typeof v === 'number') ? 'var' : 'yok',
      ayrıntı: als && luxVals.some((v) => typeof v === 'number') ? `lux ${luxVals.join(' / ')}` : 'ölçülemedi: AmbientLightSensor yok ya da veri vermedi',
      ölçüm: { lux: luxVals },
      süreMs: 0,
    });
  } catch (e) {
    log.add({ id: 'dolgu.onKamera', ad: 'Ekran dolgu ışığı (ön kamera)', durum: 'hata', ayrıntı: errMsg(e), ölçüm: null, süreMs: now() - t0 });
    log.add({ id: 'dolgu.isikSensoru', ad: 'Dolgu ışığı: ortam ışığı sensörü', durum: 'atlandı', ayrıntı: 'ön kamera testi çalışmadı', ölçüm: null, süreMs: 0 });
  } finally {
    hooks.setFill('off');
    try {
      als?.stop();
    } catch {
      /* zaten durdu */
    }
    stopStream(hooks.video, stream);
  }
}

// ---------- main flow ----------

/** Runs the probe. `motionPermission` must come from requestMotionPermission() inside the button tap. */
export async function runWebProbe(hooks: ProbeHooks, motionPermission: Promise<string | null>): Promise<ProbeReport> {
  const t0 = now();
  const log = new TestLog();
  const notes: string[] = [];
  const report: ProbeReport = {
    schema: PROBE_SCHEMA,
    meta: { zaman: new Date().toISOString(), kaynak: 'web', uygulamaSürümü: PROBE_WEB_VERSION, süreMs: 0, notlar: notes },
    device: { üretici: null, model: null, androidSürümü: null, ekran: { genişlikPx: 0, yükseklikPx: 0, dpr: 1 }, çekirdek: null, ramGb: null, gpu: null, ek: {} },
    cameras: [],
    sensors: {},
    perf: {},
    tests: [],
    summary: buildSummary([]),
  };
  const video = hooks.video as RvfcVideo;
  const meter = new Meter(video);

  let wake: { release(): Promise<void> } | null = null;
  try {
    wake = await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
    log.add({ id: 'ortam.wakeLock', ad: 'Wake Lock (ekranı açık tut)', durum: wake ? 'etkili' : 'yok', ayrıntı: wake ? 'ekran kilidi alındı' : 'navigator.wakeLock yok', ölçüm: null, süreMs: 0 });
  } catch (e) {
    log.add({ id: 'ortam.wakeLock', ad: 'Wake Lock (ekranı açık tut)', durum: 'hata', ayrıntı: errMsg(e), ölçüm: null, süreMs: 0 });
  }

  let stream: MediaStream | null = null;
  try {
    hooks.onStep(0);
    await probeEnv(log, report.device, notes);

    hooks.onStep(1);
    await probeSensors(log, report.sensors, motionPermission);

    hooks.onStep(2);
    const cam = await probeCameras(log, video, report.cameras, report.device, notes);

    if (cam) {
      hooks.onStep(3);
      const opened = await openStream(video, { deviceId: { exact: cam.ids[cam.mainIndex] }, width: { ideal: 1920 }, height: { ideal: 1080 } });
      stream = opened.stream;
      const ic = await probeResolution(log, video, opened.track, report.perf, meter).catch((e) => {
        log.add({ id: 'cozunurluk.genel', ad: 'Çözünürlük testi', durum: 'hata', ayrıntı: errMsg(e), ölçüm: null, süreMs: 0 });
        return null;
      });
      await withTimeout(opened.track.applyConstraints({ width: { ideal: 1280 }, height: { ideal: 720 } }), 6000, 'applyConstraints').catch(() => undefined);

      hooks.onStep(4);
      await probeEffects(log, opened.track, meter, report.perf).catch((e) =>
        log.add({ id: 'etki.genel', ad: 'Etki testleri', durum: 'hata', ayrıntı: errMsg(e), ölçüm: null, süreMs: 0 }),
      );

      hooks.onStep(5);
      await probePerf(log, video, opened.track, ic, meter, report.perf);
      stopStream(video, stream);
      stream = null;

      hooks.onStep(6);
      await probeFill(log, hooks, meter, report.sensors, report.cameras.some((c) => c.yön === 'ön'));
    } else {
      for (const id of ['cozunurluk', 'etki', 'perf', 'dolgu']) log.skip(`${id}.izinYok`, `${id} testleri`, 'kamera izni yok ya da kamera açılmadı');
    }
    log.add({ id: 'web.raw', ad: 'RAW / DNG', durum: 'yok', ayrıntı: 'tarayıcıda RAW/DNG yakalama API’si yok', ölçüm: null, süreMs: 0 });
  } finally {
    stopStream(video, stream);
    hooks.setFill('off');
    await wake?.release().catch(() => undefined);
  }

  report.tests = log.list;
  report.summary = buildSummary(log.list);
  report.meta.süreMs = Math.round(now() - t0);
  return report;
}
