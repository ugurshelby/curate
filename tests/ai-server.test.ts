import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  AI_TASKS,
  AI_MODELS,
  AI_KEEP,
  AI_MAX_INPUT_BYTES,
  AI_MAX_RESPONSE_BYTES,
  AI_RETRY_WAIT_MS,
  aiModelId,
  aiPrompt,
  aiInputSize,
  buildVertexBody,
  nearestAspectRatio,
} from '../lib/ai/config';
import { handleAiPost, handleAiStatus, encodeResponseJpeg, extractImage, AiDeps, readAiConfig } from '../lib/ai/server';
import { MemoryCounterStore, UpstashCounterStore, counterStoreFromEnv, istanbulDay, redisEnv } from '../lib/ai/quota';

const KEY = 'test-key-not-real-0123456789';
const PW = 'şifre-Ğ1';

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 90, g: 120, b: 160 } } }).jpeg({ quality: 90 }).toBuffer();
}

async function pngBase64(width: number, height: number): Promise<string> {
  const b = await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 150, b: 100 } } }).png().toBuffer();
  return b.toString('base64');
}

function vertexOk(data: string) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'here' }, { inlineData: { mimeType: 'image/png', data } }] } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function makeDeps(over: Partial<AiDeps> & { env?: Record<string, string> } = {}) {
  const logs: Record<string, unknown>[] = [];
  const sleep = vi.fn(async () => {});
  const deps: AiDeps = {
    config: readAiConfig({ VERTEX_API_KEY: KEY, CURATE_AI_PASSWORD: PW, ...(over.env ?? {}) }),
    counter: new MemoryCounterStore(),
    fetchFn: vi.fn(async () => vertexOk(await pngBase64(64, 48))) as unknown as typeof fetch,
    now: () => Date.parse('2026-10-03T10:00:00Z'),
    sleep,
    log: (l) => logs.push(l),
    budgetMs: 110_000,
    ...over,
  };
  return { deps, logs, sleep };
}

function post(body: Uint8Array, opts: { task?: string; pw?: string; ip?: string } = {}) {
  return new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: {
      'x-curate-task': opts.task ?? 'B',
      'x-curate-password': encodeURIComponent(opts.pw ?? PW),
      'x-forwarded-for': opts.ip ?? '1.2.3.4',
      'Content-Type': 'image/jpeg',
    },
    body: body as unknown as BodyInit,
  });
}

describe('AI config: one place for models, sizes, prompts', () => {
  it('maps D to pro, A/B/C to flash; A 4K, others 2K', () => {
    expect(aiModelId('D')).toBe(AI_MODELS.pro);
    for (const t of ['A', 'B', 'C'] as const) expect(aiModelId(t)).toBe(AI_MODELS.flash);
    expect(AI_TASKS.A.imageSize).toBe('4K');
    expect([AI_TASKS.B.imageSize, AI_TASKS.C.imageSize, AI_TASKS.D.imageSize]).toEqual(['2K', '2K', '2K']);
    for (const t of ['A', 'B', 'C', 'D'] as const) {
      expect(aiPrompt(t).endsWith(AI_KEEP)).toBe(true);
      expect(aiPrompt(t)).not.toContain('{KEEP}');
    }
  });

  it('model ids appear nowhere else in the source', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (['node_modules', '.next', '.git', 'logs', 'docs', 'design'].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(name) && !p.replace(/\\/g, '/').endsWith('lib/ai/config.ts') && !p.includes('tests')) {
          if (/gemini-|nano.?banana/i.test(readFileSync(p, 'utf8'))) hits.push(p);
        }
      }
    };
    walk(process.cwd());
    expect(hits).toEqual([]);
  });

  it('picks the nearest supported aspect ratio and reports deviation', () => {
    expect(nearestAspectRatio(4032, 3024).ratio).toBe('4:3');
    expect(nearestAspectRatio(3024, 4032).ratio).toBe('3:4');
    expect(nearestAspectRatio(1080, 1350).ratio).toBe('4:5');
    expect(nearestAspectRatio(1920, 1080).ratio).toBe('16:9');
    expect(nearestAspectRatio(6000, 4000).ratio).toBe('3:2');
    expect(nearestAspectRatio(1000, 1000)).toEqual({ ratio: '1:1', deviation: 0 });
    const pano = nearestAspectRatio(3000, 1000);
    expect(pano.ratio).toBe('16:9');
    expect(pano.deviation).toBeGreaterThan(0.03);
  });

  it('client input: long edge ≤ 2048, never enlarged', () => {
    expect(aiInputSize(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(aiInputSize(1000, 800)).toEqual({ width: 1000, height: 800 });
  });

  it('builds the tested Vertex body', () => {
    const body = buildVertexBody('D', 'QUJD', 1080, 1350);
    expect(body.contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } });
    expect(body.contents[0].parts[1]).toEqual({ text: aiPrompt('D') });
    expect(body.generationConfig).toEqual({
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '4:5', imageSize: '2K' },
    });
  });
});

describe('AI proxy: access and limits', () => {
  it('AI_ENABLED=false turns everything off without calling the model', async () => {
    const { deps } = makeDeps({ env: { AI_ENABLED: 'false' } });
    const res = await handleAiPost(post(await jpeg(40, 30)), deps);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('disabled');
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it('wrong password → 401; 10 wrong per IP per day locks only that IP', async () => {
    const { deps } = makeDeps();
    const body = await jpeg(40, 30);
    for (let i = 0; i < 10; i++) {
      const r = await handleAiPost(post(body, { pw: 'yanlış', ip: '9.9.9.9' }), deps);
      expect(r.status).toBe(401);
    }
    const locked = await handleAiPost(post(body, { ip: '9.9.9.9' }), deps);
    expect(locked.status).toBe(429);
    expect((await locked.json()).error).toBe('password_locked');
    // Başka IP (sahip) kilitlenmez: genel sayaç yok
    const owner = await handleAiPost(post(body, { ip: '5.5.5.5' }), deps);
    expect(owner.status).toBe(200);
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('accepts a non-ASCII password sent URI-encoded', async () => {
    const { deps } = makeDeps();
    const res = await handleAiStatus(
      new Request('http://localhost/api/ai', { headers: { 'x-curate-password': encodeURIComponent(PW) } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ enabled: true, remainingDay: 20, remainingMonth: 150, counter: 'memory' });
  });

  it('rejects bodies over 4 MB and non-JPEG input before calling the model', async () => {
    const { deps } = makeDeps();
    const big = await handleAiPost(post(new Uint8Array(AI_MAX_INPUT_BYTES + 1)), deps);
    expect(big.status).toBe(413);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).png().toBuffer();
    const notJpeg = await handleAiPost(post(png), deps);
    expect(notJpeg.status).toBe(415);
    const bad = await handleAiPost(post(await jpeg(10, 10), { task: 'E' }), deps);
    expect(bad.status).toBe(400);
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it('daily quota: counts each model call; over the limit → 429 with a Turkish message', async () => {
    const { deps } = makeDeps({ env: { AI_DAILY_LIMIT: '2' } });
    const body = await jpeg(40, 30);
    const a = await handleAiPost(post(body), deps);
    expect(a.headers.get('x-curate-remaining-day')).toBe('1');
    await handleAiPost(post(body), deps);
    const c = await handleAiPost(post(body), deps);
    expect(c.status).toBe(429);
    expect(await c.json()).toEqual({ error: 'quota_day', message: 'Bugünkü AI hakkı doldu.' });
    expect(deps.fetchFn).toHaveBeenCalledTimes(2);
  });

  it('monthly quota', async () => {
    const { deps } = makeDeps({ env: { AI_MONTHLY_LIMIT: '1' } });
    const body = await jpeg(40, 30);
    expect((await handleAiPost(post(body), deps)).status).toBe(200);
    const r = await handleAiPost(post(body), deps);
    expect((await r.json()).error).toBe('quota_month');
  });
});

describe('AI proxy: model call', () => {
  it('sends the tested request and returns a JPEG within the response limit', async () => {
    const { deps, logs } = makeDeps();
    const res = await handleAiPost(post(await jpeg(400, 300), { task: 'A' }), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');

    const [url, init] = (deps.fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://aiplatform.googleapis.com/v1/publishers/google/models/${AI_MODELS.flash}:generateContent`);
    expect(init.headers['x-goog-api-key']).toBe(KEY);
    const sent = JSON.parse(init.body);
    expect(sent.contents[0].parts[0].inlineData.mimeType).toBe('image/jpeg');
    expect(sent.generationConfig.imageConfig).toEqual({ aspectRatio: '4:3', imageSize: '4K' });

    const out = Buffer.from(await res.arrayBuffer());
    expect(out.length).toBeLessThanOrEqual(AI_MAX_RESPONSE_BYTES);
    expect((await sharp(out).metadata()).format).toBe('jpeg');

    // Log: görev, süre, boyut, maliyet — görsel ve anahtar yok
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ task: 'A', model: AI_MODELS.flash, status: 'ok', costTry: 8, attempts: 1 });
    const line = JSON.stringify(logs);
    expect(line).not.toContain(KEY);
    expect(line.length).toBeLessThan(500);
  });

  it('D uses the pro model', async () => {
    const { deps } = makeDeps();
    await handleAiPost(post(await jpeg(40, 30), { task: 'D' }), deps);
    const [url] = (deps.fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain(AI_MODELS.pro);
  });

  it('no image in the response → no_image, no retry', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'no' }] } }] })));
    const { deps } = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });
    const res = await handleAiPost(post(await jpeg(40, 30)), deps);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'no_image', message: 'Model görsel döndürmedi.' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('503 once → one waited retry; 503 twice → model_busy; 400 → no retry', async () => {
    const data = await pngBase64(20, 20);
    const once = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(vertexOk(data));
    const a = makeDeps({ fetchFn: once as unknown as typeof fetch });
    expect((await handleAiPost(post(await jpeg(40, 30)), a.deps)).status).toBe(200);
    expect(once).toHaveBeenCalledTimes(2);
    expect(a.sleep).toHaveBeenCalledWith(AI_RETRY_WAIT_MS);

    const twice = vi.fn(async () => new Response('', { status: 503 }));
    const b = makeDeps({ fetchFn: twice as unknown as typeof fetch });
    const rb = await handleAiPost(post(await jpeg(40, 30)), b.deps);
    expect((await rb.json()).error).toBe('model_busy');
    expect(twice).toHaveBeenCalledTimes(2);

    const bad = vi.fn(async () => new Response('', { status: 400 }));
    const c = makeDeps({ fetchFn: bad as unknown as typeof fetch });
    const rc = await handleAiPost(post(await jpeg(40, 30)), c.deps);
    expect((await rc.json()).error).toBe('model_error');
    expect(bad).toHaveBeenCalledTimes(1);
  });

  it('no retry when the remaining time cannot fit another call', async () => {
    const f = vi.fn(async () => new Response('', { status: 429 }));
    const { deps } = makeDeps({ fetchFn: f as unknown as typeof fetch, budgetMs: 15_000 });
    await handleAiPost(post(await jpeg(40, 30)), deps);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('reads inline_data (snake case) too', () => {
    expect(extractImage({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'x' } }] } }] })).toEqual({
      mimeType: 'image/png',
      data: 'x',
    });
    expect(extractImage({})).toBeNull();
  });

  it('a large 4K output is stepped down below the 4.3 MB response limit', async () => {
    const noise = await sharp({
      create: { width: 4096, height: 3072, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 70 } },
    })
      .png({ compressionLevel: 1 })
      .toBuffer();
    const out = await encodeResponseJpeg(noise);
    expect(out.jpeg.length).toBeLessThanOrEqual(AI_MAX_RESPONSE_BYTES);
    expect((await sharp(out.jpeg).metadata()).format).toBe('jpeg');
  }, 60_000);
});

describe('AI quota store', () => {
  it('memory counter expires', async () => {
    let t = 0;
    const m = new MemoryCounterStore(() => t);
    expect(await m.incr('k', 10)).toBe(1);
    expect(await m.incr('k', 10)).toBe(2);
    t = 11_000;
    expect(await m.get('k')).toBe(0);
  });

  it('accepts both Upstash and Vercel KV variable names', () => {
    expect(redisEnv({ UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual({ url: 'https://u', token: 't' });
    expect(redisEnv({ KV_REST_API_URL: 'https://k', KV_REST_API_TOKEN: 't2' })).toEqual({ url: 'https://k', token: 't2' });
    expect(redisEnv({})).toBeNull();
    expect(counterStoreFromEnv({}).kind).toBe('memory');
    expect(counterStoreFromEnv({ KV_REST_API_URL: 'https://k', KV_REST_API_TOKEN: 't' }).kind).toBe('redis');
  });

  it('Upstash: INCR + EXPIRE in one REST pipeline call', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify([{ result: 3 }, { result: 1 }])));
    const s = new UpstashCounterStore('https://x.upstash.io/', 'tok', f as unknown as typeof fetch);
    expect(await s.incr('curate:ai:day:2026-10-03', 100)).toBe(3);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.upstash.io/pipeline');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual([
      ['INCR', 'curate:ai:day:2026-10-03'],
      ['EXPIRE', 'curate:ai:day:2026-10-03', 100],
    ]);
  });

  it('day boundary is Europe/Istanbul', () => {
    expect(istanbulDay(new Date('2026-10-02T21:30:00Z'))).toBe('2026-10-03');
    expect(istanbulDay(new Date('2026-10-02T20:30:00Z'))).toBe('2026-10-02');
  });
});
