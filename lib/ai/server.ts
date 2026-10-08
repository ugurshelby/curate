/**
 * "AI ile onar" sunucu proxy'si (yalnız sunucuda çalışır; istemci paketine girmez).
 * Erişim (Faz P1): PIN yeni cihazda bir kez girilir (PUT), sunucu imzalı HttpOnly çerez verir;
 * GET/POST yalnız bu çerezle çalışır. PIN ve Vertex anahtarı tarayıcıya hiç inmez.
 * Akış: AI_ENABLED → yapılandırma → aynı köken → çerez → görev → boyut → kota (atomik) → Vertex → JPEG.
 * Fotoğraf saklanmaz, loglanmaz. Log satırı: görev, model, süre, boyut, tahmini maliyet.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import {
  AI_DEFAULT_DAILY_LIMIT,
  AI_DEFAULT_MONTHLY_LIMIT,
  AI_DEADLINE_MARGIN_MS,
  AI_DEVICE_COOKIE,
  AI_DEVICE_COOKIE_PATH,
  AI_DEVICE_MAX_AGE_S,
  AI_ERRORS,
  AI_HEADER_REMAINING_DAY,
  AI_HEADER_REMAINING_MONTH,
  AI_HEADER_TASK,
  AI_MAX_DURATION_S,
  AI_MAX_INPUT_BYTES,
  AI_MAX_RESPONSE_BYTES,
  AI_OUTPUT_QUALITY_STEPS,
  AI_OUTPUT_SHRINK,
  AI_PIN_FAIL_LIMIT_DAY,
  AI_PIN_FAIL_LIMIT_IP_DAY,
  AI_PIN_FAIL_LIMIT_MONTH,
  AI_PIN_PATTERN,
  AI_RETRY_WAIT_MS,
  AI_TASKS,
  AiErrorCode,
  AiTask,
  aiModelId,
  buildVertexBody,
  isAiTask,
  vertexEndpoint,
} from './config';
import { CounterStore, DAY_TTL_S, MONTH_TTL_S, counterStoreFromEnv, quotaKeys } from './quota';
import { SESSION_COOKIE, sessionCookie, signSession, verifySession } from '../access/session';

type EnvLike = Record<string, string | undefined>;

export interface AiServerConfig {
  enabled: boolean;
  apiKey: string | null;
  /** 4 haneli PIN; biçim tutmazsa null (→ not_configured) */
  pin: string | null;
  dailyLimit: number;
  monthlyLimit: number;
}

function positiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function readAiConfig(env: EnvLike): AiServerConfig {
  const pin = (env.CURATE_AI_PASSWORD ?? '').trim();
  return {
    enabled: (env.AI_ENABLED ?? 'true').trim().toLowerCase() !== 'false',
    apiKey: env.VERTEX_API_KEY || null,
    pin: AI_PIN_PATTERN.test(pin) ? pin : null,
    dailyLimit: positiveInt(env.AI_DAILY_LIMIT, AI_DEFAULT_DAILY_LIMIT),
    monthlyLimit: positiveInt(env.AI_MONTHLY_LIMIT, AI_DEFAULT_MONTHLY_LIMIT),
  };
}

export interface AiDeps {
  config: AiServerConfig;
  counter: CounterStore;
  fetchFn: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: (line: Record<string, unknown>) => void;
  /** İsteğin başladığı andan itibaren kullanılabilir süre (ms) */
  budgetMs: number;
}

export function defaultAiDeps(env: EnvLike = process.env): AiDeps {
  return {
    config: readAiConfig(env),
    counter: counterStoreFromEnv(env),
    fetchFn: fetch,
    now: Date.now,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (line) => console.log(JSON.stringify({ event: 'curate_ai', ...line })),
    budgetMs: AI_MAX_DURATION_S * 1000 - AI_DEADLINE_MARGIN_MS,
  };
}

const ERROR_STATUS: Record<AiErrorCode, number> = {
  disabled: 503,
  not_configured: 503,
  forbidden: 403,
  pin_required: 401,
  wrong_pin: 401,
  pin_locked_ip: 429,
  pin_locked_day: 429,
  pin_locked_month: 429,
  service_error: 503,
  server_error: 500,
  bad_task: 400,
  too_large: 413,
  bad_image: 415,
  quota_day: 429,
  quota_month: 429,
  timeout: 504,
  model_busy: 503,
  model_error: 502,
  no_image: 502,
  canceled: 499,
  network: 502,
};

/** Extra headers as pairs so a response can carry several Set-Cookie lines */
type HeaderPairs = Record<string, string> | [string, string][];

function jsonHeaders(extra?: HeaderPairs): Headers {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const [k, v] of Array.isArray(extra) ? extra : Object.entries(extra ?? {})) h.append(k, v);
  return h;
}

function errorResponse(code: AiErrorCode, extraHeaders?: HeaderPairs): Response {
  return new Response(JSON.stringify({ error: code, message: AI_ERRORS[code] }), {
    status: ERROR_STATUS[code],
    headers: jsonHeaders(extraHeaders),
  });
}

function jsonResponse(body: unknown, extraHeaders?: HeaderPairs): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders(extraHeaders) });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function sameSecret(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

// --- Cihaz çerezi ---

/** İmza anahtarı: HMAC(VERTEX_API_KEY, PIN). PIN veya anahtar değişince eski çerezler geçersiz olur. */
function deviceKey(config: AiServerConfig): Buffer {
  return createHmac('sha256', config.apiKey as string).update(`curate-device-v1:${config.pin}`, 'utf8').digest();
}

/** Sayaç anahtarlarında PIN'e bağlı kısa etiket (PIN'in kendisinden veya düz özetinden türetilmez) */
function pinTag(config: AiServerConfig): string {
  return createHmac('sha256', deviceKey(config)).update('counter', 'utf8').digest('hex').slice(0, 12);
}

function sign(config: AiServerConfig, payload: string): string {
  return createHmac('sha256', deviceKey(config)).update(payload, 'utf8').digest('base64url');
}

export function issueDeviceToken(config: AiServerConfig, nowMs: number): string {
  const payload = `v1.${Math.floor(nowMs / 1000)}`;
  return `${payload}.${sign(config, payload)}`;
}

export function verifyDeviceToken(config: AiServerConfig, token: string | null, nowMs: number): boolean {
  if (!token) return false;
  const m = /^(v1\.(\d{1,12}))\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  const issued = Number(m[2]);
  const nowS = Math.floor(nowMs / 1000);
  if (issued > nowS + 60 || nowS - issued > AI_DEVICE_MAX_AGE_S) return false;
  const expected = Buffer.from(sign(config, m[1]), 'utf8');
  const got = Buffer.from(m[3], 'utf8');
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

function deviceCookie(token: string, maxAge: number): string {
  return `${AI_DEVICE_COOKIE}=${token}; Path=${AI_DEVICE_COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

/** Clears the app session (D27) and the legacy AI-only cookie */
const CLEAR_COOKIES: [string, string][] = [
  ['Set-Cookie', sessionCookie('', 0)],
  ['Set-Cookie', deviceCookie('', 0)],
];

// --- Kapılar ---

type GateResult = { ok: true } | { ok: false; response: Response };

/** Başka siteden gelen istek (CSRF savunması; SameSite=Strict çerezin yanında ikinci kat) */
function crossSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  return site !== null && site !== 'same-origin' && site !== 'none';
}

/** Açık mı, ayarlı mı, aynı kökenden mi */
function baseGate(req: Request, deps: AiDeps): GateResult {
  const { config } = deps;
  if (!config.enabled) return { ok: false, response: errorResponse('disabled') };
  if (!config.apiKey || !config.pin) return { ok: false, response: errorResponse('not_configured') };
  if (crossSite(req)) return { ok: false, response: errorResponse('forbidden') };
  return { ok: true };
}

/** Configured and same-origin; NOT tied to AI_ENABLED, so the app gate (D27) still pairs a device when AI is off */
function accessGate(req: Request, deps: AiDeps): GateResult {
  const { config } = deps;
  if (!config.apiKey || !config.pin) return { ok: false, response: errorResponse('not_configured') };
  if (crossSite(req)) return { ok: false, response: errorResponse('forbidden') };
  return { ok: true };
}

/** baseGate + a valid device: the app session cookie (D27) or, for one release, the legacy AI cookie */
async function deviceGate(req: Request, deps: AiDeps): Promise<GateResult> {
  const base = baseGate(req, deps);
  if (!base.ok) return base;
  const { config } = deps;
  const session = readCookie(req, SESSION_COOKIE);
  if (session && (await verifySession({ apiKey: config.apiKey as string, pin: config.pin as string }, session, deps.now())).ok) {
    return { ok: true };
  }
  const legacy = readCookie(req, AI_DEVICE_COOKIE);
  if (verifyDeviceToken(config, legacy, deps.now())) return { ok: true };
  // a broken or foreign cookie is cleared so the device starts clean
  return { ok: false, response: errorResponse('pin_required', session || legacy ? CLEAR_COOKIES : undefined) };
}

async function remaining(deps: AiDeps): Promise<{ day: number; month: number }> {
  const now = new Date(deps.now());
  const [d, m] = await Promise.all([deps.counter.get(quotaKeys.day(now)), deps.counter.get(quotaKeys.month(now))]);
  return { day: Math.max(0, deps.config.dailyLimit - d), month: Math.max(0, deps.config.monthlyLimit - m) };
}

/** GET: cihaz eşli mi ve kalan hak (para harcamaz, sayaç artırmaz) */
export async function handleAiStatus(req: Request, deps: AiDeps): Promise<Response> {
  const g = await deviceGate(req, deps);
  if (!g.ok) return g.response;
  try {
    const r = await remaining(deps);
    return jsonResponse({ enabled: true, remainingDay: r.day, remainingMonth: r.month, counter: deps.counter.kind });
  } catch {
    return errorResponse('service_error');
  }
}

const MAX_UNLOCK_BODY = 256;

/**
 * PUT: PIN ile cihaz eşleme. Kaba kuvvete karşı üç sayaç (IP/gün, genel gün, genel ay).
 * Önce kilit okunur, sonra üç sayaç birden ayrılır (INCR); sınırı aşan ayırma geri alınır ve reddedilir.
 * Böylece paralel tahminler de sınırı geçemez. Doğru PIN ayırmayı geri alır ve çerez verir.
 */
export async function handleAiUnlock(req: Request, deps: AiDeps): Promise<Response> {
  const g = accessGate(req, deps);
  if (!g.ok) return g.response;
  const { config, counter } = deps;

  let pin = '';
  try {
    const text = await req.text();
    if (text.length > MAX_UNLOCK_BODY) return errorResponse('wrong_pin');
    const body = JSON.parse(text) as { pin?: unknown };
    pin = typeof body.pin === 'string' ? body.pin : '';
  } catch {
    pin = '';
  }

  const now = new Date(deps.now());
  const tag = pinTag(config);
  const keys = [
    { key: quotaKeys.pinFailIp(tag, clientIp(req), now), limit: AI_PIN_FAIL_LIMIT_IP_DAY, ttl: DAY_TTL_S, code: 'pin_locked_ip' as const },
    { key: quotaKeys.pinFailDay(tag, now), limit: AI_PIN_FAIL_LIMIT_DAY, ttl: DAY_TTL_S, code: 'pin_locked_day' as const },
    { key: quotaKeys.pinFailMonth(tag, now), limit: AI_PIN_FAIL_LIMIT_MONTH, ttl: MONTH_TTL_S, code: 'pin_locked_month' as const },
  ];

  try {
    const current = await Promise.all(keys.map((k) => counter.get(k.key)));
    const lockedNow = keys.find((k, i) => current[i] >= k.limit);
    if (lockedNow) return errorResponse(lockedNow.code);

    const reserved = await Promise.all(keys.map((k) => counter.incr(k.key, k.ttl)));
    const over = keys.find((k, i) => reserved[i] > k.limit);
    const undo = () => Promise.all(keys.map((k) => counter.decr(k.key)));
    if (over) {
      await undo();
      return errorResponse(over.code);
    }

    if (!AI_PIN_PATTERN.test(pin) || !sameSecret(pin, config.pin as string)) {
      deps.log({ status: 'wrong_pin' });
      return errorResponse('wrong_pin');
    }

    await undo();
    deps.log({ status: 'paired' });
    const cookies: [string, string][] = [
      ['Set-Cookie', sessionCookie(await signSession({ apiKey: config.apiKey as string, pin: config.pin as string }, deps.now()))],
      ['Set-Cookie', deviceCookie('', 0)],
    ];
    if (!config.enabled) return jsonResponse({ enabled: false }, cookies);
    const r = await remaining(deps);
    return jsonResponse({ enabled: true, remainingDay: r.day, remainingMonth: r.month, counter: counter.kind }, cookies);
  } catch {
    return errorResponse('service_error');
  }
}

/** DELETE: "Bu cihazı unut" — çerezi siler */
export async function handleAiForget(req: Request): Promise<Response> {
  if (crossSite(req)) return errorResponse('forbidden');
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  for (const [k, v] of CLEAR_COOKIES) headers.append(k, v);
  return new Response(null, { status: 204, headers });
}

/** Vertex yanıtındaki ilk görsel parçası */
export function extractImage(json: unknown): { mimeType: string; data: string } | null {
  const parts = (json as { candidates?: { content?: { parts?: unknown[] } }[] })?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    const inline =
      (p as { inlineData?: { mimeType?: string; data?: string } }).inlineData ??
      (p as { inline_data?: { mime_type?: string; data?: string } }).inline_data;
    const data = inline?.data;
    const mime = (inline as { mimeType?: string })?.mimeType ?? (inline as { mime_type?: string })?.mime_type ?? '';
    if (data && mime.startsWith('image/')) return { mimeType: mime, data };
  }
  return null;
}

/**
 * Ham çıktıyı JPEG'e çevirir: q92'den başlar, 4,3 MB'a sığana kadar kalite düşer,
 * yetmezse uzun kenar küçülür (Vercel yanıt sınırı 4,5 MB).
 */
export async function encodeResponseJpeg(
  input: Buffer,
  maxBytes: number = AI_MAX_RESPONSE_BYTES,
): Promise<{ jpeg: Buffer; quality: number; width: number; height: number }> {
  const meta = await sharp(input).metadata();
  let width = meta.width ?? 0;
  let height = meta.height ?? 0;
  for (let round = 0; round < 6; round++) {
    for (const q of AI_OUTPUT_QUALITY_STEPS) {
      let pipe = sharp(input).rotate();
      if (round > 0) pipe = pipe.resize({ width, height, fit: 'fill' });
      const jpeg = await pipe.jpeg({ quality: q }).toBuffer();
      if (jpeg.length <= maxBytes) return { jpeg, quality: q, width, height };
    }
    width = Math.max(1, Math.round(width * AI_OUTPUT_SHRINK));
    height = Math.max(1, Math.round(height * AI_OUTPUT_SHRINK));
  }
  throw new Error('Çıktı sığdırılamadı');
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

/** POST: tek görsel, tek görev */
export async function handleAiPost(req: Request, deps: AiDeps): Promise<Response> {
  const started = deps.now();
  const g = await deviceGate(req, deps);
  if (!g.ok) return g.response;

  const taskRaw = req.headers.get(AI_HEADER_TASK);
  if (!isAiTask(taskRaw)) return errorResponse('bad_task');
  const task: AiTask = taskRaw;

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > AI_MAX_INPUT_BYTES) return errorResponse('too_large');
  const input = Buffer.from(await req.arrayBuffer());
  if (input.length > AI_MAX_INPUT_BYTES) return errorResponse('too_large');
  if (input.length === 0) return errorResponse('bad_image');

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(input).metadata();
    if (meta.format !== 'jpeg' || !meta.width || !meta.height) return errorResponse('bad_image');
    width = meta.width;
    height = meta.height;
  } catch {
    return errorResponse('bad_image');
  }

  // Kota: model çağrısından önce atomik ayrılır (INCR dönüşü), sınırı aşan ayırma geri alınır.
  // Model çağrısı başarısız olsa da geri alınmaz (Google yine ücretlendirebilir).
  const nowDate = new Date(deps.now());
  const dayKey = quotaKeys.day(nowDate);
  const monthKey = quotaKeys.month(nowDate);
  let usedDay = 0;
  let usedMonth = 0;
  try {
    [usedDay, usedMonth] = await Promise.all([
      deps.counter.incr(dayKey, DAY_TTL_S),
      deps.counter.incr(monthKey, MONTH_TTL_S),
    ]);
    if (usedDay > deps.config.dailyLimit || usedMonth > deps.config.monthlyLimit) {
      await Promise.all([deps.counter.decr(dayKey), deps.counter.decr(monthKey)]);
      return errorResponse(usedDay > deps.config.dailyLimit ? 'quota_day' : 'quota_month');
    }
  } catch {
    return errorResponse('service_error');
  }
  const quotaHeaders = {
    [AI_HEADER_REMAINING_DAY]: String(deps.config.dailyLimit - usedDay),
    [AI_HEADER_REMAINING_MONTH]: String(deps.config.monthlyLimit - usedMonth),
  };

  const cfg = AI_TASKS[task];
  const model = aiModelId(task);
  const body = JSON.stringify(buildVertexBody(task, input.toString('base64'), width, height));
  const logBase = { task, model, inBytes: input.length, inW: width, inH: height, costTry: cfg.costTry };

  const finish = (status: string, extra: Record<string, unknown> = {}) =>
    deps.log({ ...logBase, status, ms: deps.now() - started, ...extra });

  let attempts = 0;
  let vertexRes: Response | null = null;
  while (true) {
    attempts++;
    const left = deps.budgetMs - (deps.now() - started);
    if (left <= 0) {
      finish('timeout', { attempts });
      return errorResponse('timeout', quotaHeaders);
    }
    const timeout = AbortSignal.timeout(left);
    const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    try {
      vertexRes = await deps.fetchFn(vertexEndpoint(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': deps.config.apiKey as string },
        body,
        signal,
        cache: 'no-store',
      });
    } catch (err) {
      if (req.signal?.aborted) {
        finish('canceled', { attempts });
        return errorResponse('canceled', quotaHeaders);
      }
      finish(isAbort(err) ? 'timeout' : 'network', { attempts });
      return errorResponse(isAbort(err) ? 'timeout' : 'network', quotaHeaders);
    }
    const retryable = vertexRes.status === 429 || vertexRes.status === 503;
    // Tek bekleyen deneme; yalnız kalan süre bir çağrıya daha yetiyorsa
    const remainingAfterWait = deps.budgetMs - (deps.now() - started) - AI_RETRY_WAIT_MS;
    if (retryable && attempts === 1 && remainingAfterWait > cfg.estSeconds * 1000) {
      await deps.sleep(AI_RETRY_WAIT_MS);
      continue;
    }
    break;
  }

  if (!vertexRes.ok) {
    const busy = vertexRes.status === 429 || vertexRes.status === 503;
    finish(`vertex_${vertexRes.status}`, { attempts });
    return errorResponse(busy ? 'model_busy' : 'model_error', quotaHeaders);
  }

  let image: { mimeType: string; data: string } | null = null;
  try {
    image = extractImage(await vertexRes.json());
  } catch {
    image = null;
  }
  if (!image) {
    finish('no_image', { attempts });
    return errorResponse('no_image', quotaHeaders);
  }

  const raw = Buffer.from(image.data, 'base64');
  let out: Awaited<ReturnType<typeof encodeResponseJpeg>>;
  try {
    out = await encodeResponseJpeg(raw);
  } catch {
    finish('encode_failed', { attempts, rawBytes: raw.length });
    return errorResponse('no_image', quotaHeaders);
  }

  finish('ok', { attempts, rawBytes: raw.length, outBytes: out.jpeg.length, outW: out.width, outH: out.height, q: out.quality });
  return new Response(new Uint8Array(out.jpeg), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(out.jpeg.length),
      'Cache-Control': 'no-store',
      ...quotaHeaders,
    },
  });
}
