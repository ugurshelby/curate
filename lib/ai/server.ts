/**
 * "AI ile onar" sunucu proxy'si (yalnız sunucuda çalışır; istemci paketine girmez).
 * Akış: AI_ENABLED → şifre (IP başına yanlış şifre sınırı) → görev → boyut → kota → Vertex → JPEG.
 * Fotoğraf saklanmaz, loglanmaz. Log satırı: görev, model, süre, boyut, tahmini maliyet.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import {
  AI_DEFAULT_DAILY_LIMIT,
  AI_DEFAULT_MONTHLY_LIMIT,
  AI_DEADLINE_MARGIN_MS,
  AI_ERRORS,
  AI_HEADER_PASSWORD,
  AI_HEADER_REMAINING_DAY,
  AI_HEADER_REMAINING_MONTH,
  AI_HEADER_TASK,
  AI_MAX_DURATION_S,
  AI_MAX_INPUT_BYTES,
  AI_MAX_RESPONSE_BYTES,
  AI_OUTPUT_QUALITY_STEPS,
  AI_OUTPUT_SHRINK,
  AI_RETRY_WAIT_MS,
  AI_TASKS,
  AI_WRONG_PASSWORD_LIMIT,
  AiErrorCode,
  AiTask,
  aiModelId,
  buildVertexBody,
  isAiTask,
  vertexEndpoint,
} from './config';
import { CounterStore, DAY_TTL_S, MONTH_TTL_S, counterStoreFromEnv, quotaKeys } from './quota';

type EnvLike = Record<string, string | undefined>;

export interface AiServerConfig {
  enabled: boolean;
  apiKey: string | null;
  password: string | null;
  dailyLimit: number;
  monthlyLimit: number;
}

function positiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function readAiConfig(env: EnvLike): AiServerConfig {
  return {
    enabled: (env.AI_ENABLED ?? 'true').trim().toLowerCase() !== 'false',
    apiKey: env.VERTEX_API_KEY || null,
    password: env.CURATE_AI_PASSWORD || null,
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
  wrong_password: 401,
  password_locked: 429,
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

function errorResponse(code: AiErrorCode, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: code, message: AI_ERRORS[code] }), {
    status: ERROR_STATUS[code],
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Başlıktaki şifre encodeURIComponent ile gelir (Türkçe karakterler başlıkta güvenli değil) */
function readPassword(req: Request): string {
  const raw = req.headers.get(AI_HEADER_PASSWORD) ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function sameSecret(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

type GateResult = { ok: true } | { ok: false; response: Response };

/** Ortak kapı: açık mı, ayarlı mı, şifre doğru mu (yanlışlar IP başına sayılır) */
async function gate(req: Request, deps: AiDeps): Promise<GateResult> {
  const { config, counter } = deps;
  if (!config.enabled) return { ok: false, response: errorResponse('disabled') };
  if (!config.apiKey || !config.password) return { ok: false, response: errorResponse('not_configured') };

  const now = new Date(deps.now());
  const failKey = quotaKeys.wrongPassword(clientIp(req), now);
  if ((await counter.get(failKey)) >= AI_WRONG_PASSWORD_LIMIT) {
    return { ok: false, response: errorResponse('password_locked') };
  }
  if (!sameSecret(readPassword(req), config.password)) {
    await counter.incr(failKey, DAY_TTL_S);
    return { ok: false, response: errorResponse('wrong_password') };
  }
  return { ok: true };
}

async function remaining(deps: AiDeps): Promise<{ day: number; month: number }> {
  const now = new Date(deps.now());
  const [d, m] = await Promise.all([deps.counter.get(quotaKeys.day(now)), deps.counter.get(quotaKeys.month(now))]);
  return { day: Math.max(0, deps.config.dailyLimit - d), month: Math.max(0, deps.config.monthlyLimit - m) };
}

/** GET: durum ve kalan hak (şifre doğrulaması da buradan; para harcamaz) */
export async function handleAiStatus(req: Request, deps: AiDeps): Promise<Response> {
  const g = await gate(req, deps);
  if (!g.ok) return g.response;
  const r = await remaining(deps);
  return new Response(
    JSON.stringify({ enabled: true, remainingDay: r.day, remainingMonth: r.month, counter: deps.counter.kind }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
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
  const g = await gate(req, deps);
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

  // Kota: model çağrısından önce sayılır, başarısızlıkta geri alınmaz (Google yine ücretlendirebilir)
  const nowDate = new Date(deps.now());
  const left = await remaining(deps);
  if (left.day <= 0) return errorResponse('quota_day');
  if (left.month <= 0) return errorResponse('quota_month');
  await Promise.all([
    deps.counter.incr(quotaKeys.day(nowDate), DAY_TTL_S),
    deps.counter.incr(quotaKeys.month(nowDate), MONTH_TTL_S),
  ]);
  const quotaHeaders = {
    [AI_HEADER_REMAINING_DAY]: String(left.day - 1),
    [AI_HEADER_REMAINING_MONTH]: String(left.month - 1),
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
