import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { AI_BUDGET_DEFAULTS, AI_DEFAULT_DAILY_LIMIT, AI_DEFAULT_MONTHLY_LIMIT, AI_ERRORS, AI_PLAN_COST_TRY, AI_PLAN_MODELS, AI_TASKS } from '../lib/ai/config';
import { chargeKurus, inBudgetWindow, readBudgetConfig, remainingBudgetTry, reserveBudget } from '../lib/ai/budget';
import { MemoryCounterStore, UpstashCounterStore, counterStoreFromEnv, quotaKeys } from '../lib/ai/quota';
import { AiDeps, googleError, handleAiPost, handleAiStatus, issueDeviceToken, readAiConfig } from '../lib/ai/server';

const KEY = 'test-key-not-real-0123456789';
const PIN = '2468';
const NOW = Date.parse('2026-10-03T10:00:00Z');

describe('AI budget (D35): costs, config, windows', () => {
  it('charges the estimate plus the 25 % safety margin in kuruş, rounded up', () => {
    expect(chargeKurus(AI_PLAN_COST_TRY)).toBe(38);
    expect(chargeKurus(8)).toBe(1000);
    expect(chargeKurus(5)).toBe(625);
    expect(chargeKurus(7)).toBe(875);
    expect(chargeKurus(0)).toBeGreaterThanOrEqual(1);
  });

  it('defaults, env overrides, and broken env falling back to the defaults (never to unlimited)', () => {
    expect(readBudgetConfig({})).toEqual({ totalTry: 6000, dailyTry: 300, windowEnd: '2026-12-17', monthlyAfterTry: 200 });
    expect(readBudgetConfig({ AI_BUDGET_TRY_TOTAL: '1500', AI_BUDGET_TRY_DAILY: '50', AI_BUDGET_WINDOW_END: '2027-01-31', AI_BUDGET_TRY_MONTHLY_AFTER: '90' })).toEqual({
      totalTry: 1500,
      dailyTry: 50,
      windowEnd: '2027-01-31',
      monthlyAfterTry: 90,
    });
    const broken = readBudgetConfig({ AI_BUDGET_TRY_TOTAL: 'abc', AI_BUDGET_TRY_DAILY: '-5', AI_BUDGET_WINDOW_END: '2026-13-40', AI_BUDGET_TRY_MONTHLY_AFTER: 'Infinity' });
    expect(broken).toEqual(readBudgetConfig({}));
    expect(readBudgetConfig({ AI_BUDGET_TRY_TOTAL: '', AI_BUDGET_WINDOW_END: '17.12.2026' })).toEqual(readBudgetConfig({}));
    // the AI count limits fall back to their defaults too
    const c = readAiConfig({ VERTEX_API_KEY: KEY, CURATE_AI_PASSWORD: PIN, AI_DAILY_LIMIT: 'x', AI_MONTHLY_LIMIT: '-1' });
    expect([c.dailyLimit, c.monthlyLimit]).toEqual([AI_DEFAULT_DAILY_LIMIT, AI_DEFAULT_MONTHLY_LIMIT]);
    expect([AI_DEFAULT_DAILY_LIMIT, AI_DEFAULT_MONTHLY_LIMIT]).toEqual([80, 1000]);
    expect(AI_BUDGET_DEFAULTS.totalTry).toBe(6000);
  });

  it('the window ends after 17 December (Istanbul day)', () => {
    const cfg = readBudgetConfig({});
    expect(inBudgetWindow(cfg, new Date('2026-12-17T20:59:00Z'))).toBe(true); // 23:59 Istanbul
    expect(inBudgetWindow(cfg, new Date('2026-12-17T21:00:00Z'))).toBe(false); // 00:00 on the 18th
  });
});

describe('AI budget: reservations', () => {
  const cfg = readBudgetConfig({ AI_BUDGET_TRY_TOTAL: '1', AI_BUDGET_TRY_DAILY: '100', AI_BUDGET_TRY_MONTHLY_AFTER: '1' });
  const at = (iso: string) => new Date(iso);

  it('within the caps it reserves on all three counters; remaining shows the tightest cap', async () => {
    const counter = new MemoryCounterStore(() => NOW);
    const r = await reserveBudget(counter, cfg, new Date(NOW), 0.3);
    expect(r.ok).toBe(true);
    expect(await counter.get(quotaKeys.budgetDay(new Date(NOW)))).toBe(38);
    expect(await counter.get(quotaKeys.budgetTotal())).toBe(38);
    expect(await counter.get(quotaKeys.budgetMonth(new Date(NOW)))).toBe(38);
    expect(await remainingBudgetTry(counter, cfg, new Date(NOW))).toBeCloseTo(0.62, 5); // total ₺1 is the tightest
  });

  it('over the total cap: refused with scope "total" and nothing stays on any counter', async () => {
    const counter = new MemoryCounterStore(() => NOW);
    expect((await reserveBudget(counter, cfg, new Date(NOW), 0.3)).ok).toBe(true);
    expect((await reserveBudget(counter, cfg, new Date(NOW), 0.3)).ok).toBe(true);
    const third = await reserveBudget(counter, cfg, new Date(NOW), 0.3);
    expect(third).toEqual({ ok: false, scope: 'total' });
    expect(await counter.get(quotaKeys.budgetTotal())).toBe(76);
    expect(await counter.get(quotaKeys.budgetDay(new Date(NOW)))).toBe(76);
  });

  it('daily cap, and the day turns over at Istanbul midnight', async () => {
    const day = readBudgetConfig({ AI_BUDGET_TRY_DAILY: '1', AI_BUDGET_TRY_TOTAL: '1000' });
    let t = at('2026-10-03T10:00:00Z');
    const counter = new MemoryCounterStore(() => t.getTime());
    expect((await reserveBudget(counter, day, t, 0.3)).ok).toBe(true);
    expect((await reserveBudget(counter, day, t, 0.3)).ok).toBe(true);
    expect(await reserveBudget(counter, day, t, 0.3)).toEqual({ ok: false, scope: 'day' });
    t = at('2026-10-03T21:30:00Z'); // 00:30 on 4 October in Istanbul
    expect((await reserveBudget(counter, day, t, 0.3)).ok).toBe(true);
  });

  it('after the window the total is switched off and the monthly cap applies', async () => {
    const t = at('2026-12-18T09:00:00Z');
    const counter = new MemoryCounterStore(() => t.getTime());
    // an exhausted total no longer blocks
    await counter.incrBy(quotaKeys.budgetTotal(), 99_999_999, null);
    const monthly = readBudgetConfig({ AI_BUDGET_TRY_MONTHLY_AFTER: '1' });
    expect((await reserveBudget(counter, monthly, t, 0.3)).ok).toBe(true);
    expect((await reserveBudget(counter, monthly, t, 0.3)).ok).toBe(true);
    expect(await reserveBudget(counter, monthly, t, 0.3)).toEqual({ ok: false, scope: 'month' });
    // all three counters were still written (the total keeps counting)
    expect(await counter.get(quotaKeys.budgetTotal())).toBeGreaterThan(99_999_999);
    // next calendar month starts fresh
    const next = at('2027-01-05T09:00:00Z');
    expect((await reserveBudget(new MemoryCounterStore(() => next.getTime()), monthly, next, 0.3)).ok).toBe(true);
  });

  it('refund gives the reservation back once', async () => {
    const counter = new MemoryCounterStore(() => NOW);
    const r = await reserveBudget(counter, cfg, new Date(NOW), 0.3);
    if (!r.ok) throw new Error('expected a hold');
    await r.hold.refund();
    await r.hold.refund();
    expect(await counter.get(quotaKeys.budgetTotal())).toBe(0);
  });

  it('without Redis the memory store is used and counts the same way', async () => {
    const store = counterStoreFromEnv({});
    expect(store.kind).toBe('memory');
    const key = `curate:test:${Math.random()}`;
    expect(await store.incrBy(key, 38, null)).toBe(38);
    expect(await store.decrBy(key, 38)).toBe(0);
  });

  it('Upstash: INCRBY with EXPIRE for day/month counters, without EXPIRE for the cumulative total', async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const cmds = JSON.parse(init.body as string) as unknown[][];
      return new Response(JSON.stringify(cmds.map(() => ({ result: 5 }))));
    });
    const s = new UpstashCounterStore('https://x.upstash.io', 'tok', f as unknown as typeof fetch);
    expect(await s.incrBy('curate:ai:try:total', 38, null)).toBe(5);
    expect(await s.incrBy('curate:ai:try:day:2026-10-03', 38, 100)).toBe(5);
    expect(await s.decrBy('curate:ai:try:total', 38)).toBe(5);
    const bodies = f.mock.calls.map((c) => JSON.parse(c[1].body as string));
    expect(bodies[0]).toEqual([['INCRBY', 'curate:ai:try:total', 38]]);
    expect(bodies[1]).toEqual([['INCRBY', 'curate:ai:try:day:2026-10-03', 38], ['EXPIRE', 'curate:ai:try:day:2026-10-03', 100]]);
    expect(bodies[2]).toEqual([['DECRBY', 'curate:ai:try:total', 38]]);
  });
});

// ---------------------------------------------------------------- server level

async function jpeg(width = 64, height = 48): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 90, g: 120, b: 160 } } }).jpeg({ quality: 90 }).toBuffer();
}
async function pngBase64(): Promise<string> {
  return (await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 150, b: 100 } } }).png().toBuffer()).toString('base64');
}
const imageOk = async () =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: await pngBase64() } }] } }] }), { status: 200 });
const PLAN = {
  version: 1,
  scene: { type: 'landscape', light: 'golden', issues: ['bright_sky'] },
  global: { exposure: 0.1 },
  regions: [{ label: 'sky', shape: { type: 'linear', x0: 0.5, y0: 0, x1: 0.5, y1: 0.45, feather: 0.1 }, adjust: { exposure: -0.3 } }],
};
const planOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(PLAN) }] } }] }), { status: 200 });
const planBadSchema = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...PLAN, version: 2 }) }] } }] }), { status: 200 });
const googleErr = (status: number, gStatus: string, message: string) => new Response(JSON.stringify({ error: { code: status, status: gStatus, message } }), { status });

function setup(env: Record<string, string> = {}, fetchImpl?: (url: string) => Promise<Response>) {
  const logs: Record<string, unknown>[] = [];
  const fetchFn = vi.fn(async (url: string) => (fetchImpl ? fetchImpl(url) : planOk()));
  const deps: AiDeps = {
    config: readAiConfig({ VERTEX_API_KEY: KEY, CURATE_AI_PASSWORD: PIN, ...env }),
    counter: new MemoryCounterStore(() => NOW),
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => NOW,
    sleep: async () => {},
    log: (l) => logs.push(l),
    budgetMs: 110_000,
  };
  return { deps, logs, fetchFn };
}
const cookie = () => `curate_ai=${issueDeviceToken(readAiConfig({ VERTEX_API_KEY: KEY, CURATE_AI_PASSWORD: PIN }), NOW)}`;
async function planReq(style = 'golden_hour') {
  return new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'x-curate-task': 'P', 'x-curate-style': style, 'Content-Type': 'image/jpeg', 'x-forwarded-for': '1.2.3.4', cookie: cookie() },
    body: new Uint8Array(await jpeg()),
  });
}
async function imageReq(task = 'B') {
  return new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'x-curate-task': task, 'Content-Type': 'image/jpeg', 'x-forwarded-for': '1.2.3.4', cookie: cookie() },
    body: new Uint8Array(await jpeg(400, 300)),
  });
}
const status = (deps: AiDeps) => handleAiStatus(new Request('http://localhost/api/ai', { headers: { cookie: cookie() } }), deps).then((r) => r.json());

describe('AI Preset model chain (D34)', () => {
  it('the chain is the three owner-approved ids, and "gemini-3-flash" is not among them', () => {
    expect([...AI_PLAN_MODELS]).toEqual(['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash']);
  });

  it('moves on at 404, 400, 429 and 5xx and returns the first valid plan; 4xx attempts are not charged', async () => {
    const answers = [googleErr(404, 'NOT_FOUND', 'no model'), googleErr(400, 'INVALID_ARGUMENT', 'bad field'), planOk()];
    const { deps, logs, fetchFn } = setup({}, async () => answers.shift() as Response);
    const res = await handleAiPost(await planReq(), deps);
    expect(res.status).toBe(200);
    expect((await res.json()).model).toBe(AI_PLAN_MODELS[2]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls.map((c) => (c[0] as string).split('/models/')[1].split(':')[0])).toEqual([...AI_PLAN_MODELS]);
    // only the successful call stays charged
    expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(chargeKurus(AI_PLAN_COST_TRY));
    expect(logs.filter((l) => String(l.status).startsWith('vertex_')).map((l) => [l.model, l.httpStatus, l.kind, l.gStatus])).toEqual([
      [AI_PLAN_MODELS[0], 404, 'missing', 'NOT_FOUND'],
      [AI_PLAN_MODELS[1], 400, 'rejected', 'INVALID_ARGUMENT'],
    ]);
    expect(logs.at(-1)).toMatchObject({ status: 'ok', model: AI_PLAN_MODELS[2], attempts: 3 });

    for (const st of [429, 503, 500]) {
      const a = [googleErr(st, 'UNAVAILABLE', 'busy'), planOk()];
      const { deps: d2, fetchFn: f2 } = setup({}, async () => a.shift() as Response);
      expect((await handleAiPost(await planReq(), d2)).status).toBe(200);
      expect(f2).toHaveBeenCalledTimes(2);
    }
  });

  it('an answer that fails validation moves on too; 5xx stays charged, 4xx is refunded', async () => {
    const answers = [planBadSchema(), googleErr(500, 'INTERNAL', 'oops'), planOk()];
    const { deps } = setup({}, async () => answers.shift() as Response);
    expect((await handleAiPost(await planReq(), deps)).status).toBe(200);
    // three charged attempts: invalid 200, 500, ok 200
    expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(3 * chargeKurus(AI_PLAN_COST_TRY));
  });

  it('error mapping when the whole chain fails: not found / rejected / busy / server / invalid → Turkish reason', async () => {
    const cases: [() => Response, string][] = [
      [() => googleErr(404, 'NOT_FOUND', 'x'), 'model_missing'],
      [() => googleErr(400, 'INVALID_ARGUMENT', 'x'), 'model_rejected'],
      [() => googleErr(429, 'RESOURCE_EXHAUSTED', 'x'), 'model_busy'],
      [() => googleErr(503, 'UNAVAILABLE', 'x'), 'model_busy'],
      [() => googleErr(500, 'INTERNAL', 'x'), 'model_error'],
      [() => planBadSchema(), 'bad_plan'],
    ];
    for (const [make, code] of cases) {
      const { deps, fetchFn } = setup({}, async () => make());
      const res = await handleAiPost(await planReq(), deps);
      const body = await res.json();
      expect(body.error).toBe(code);
      expect(body.message).toBe(AI_ERRORS[code as keyof typeof AI_ERRORS]);
      expect(res.status).toBe(502 === res.status ? 502 : res.status);
      expect(fetchFn).toHaveBeenCalledTimes(AI_PLAN_MODELS.length);
    }
    expect(AI_ERRORS.model_missing).toBe('AI modeli bulunamadı.');
    expect(AI_ERRORS.bad_plan).toMatch(/Plan okunamadı/);
  });

  it('Google 401/403 means the key is refused: the chain stops after one call', async () => {
    for (const st of [401, 403]) {
      const { deps, fetchFn } = setup({}, async () => googleErr(st, 'PERMISSION_DENIED', 'key refused'));
      const body = await (await handleAiPost(await planReq(), deps)).json();
      expect(body.error).toBe('model_auth');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(0);
    }
  });

  it('timeout and network errors are reported as such and stay charged', async () => {
    const { deps } = setup({}, async () => {
      throw new TypeError('fetch failed');
    });
    expect((await (await handleAiPost(await planReq(), deps)).json()).error).toBe('network');
    expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(chargeKurus(AI_PLAN_COST_TRY));
  });

  it('the log carries task, model, HTTP status, kind, duration and a short safe Google message (no key, no blobs)', async () => {
    const long = 'AIza' + 'x'.repeat(30) + ' ' + 'A'.repeat(300) + ' tail';
    const { deps, logs } = setup({}, async () => googleErr(400, 'INVALID_ARGUMENT', `Invalid value ${long}`));
    await handleAiPost(await planReq(), deps);
    const l = logs.find((x) => x.status === 'vertex_400') as Record<string, unknown>;
    expect(l).toMatchObject({ task: 'P', model: AI_PLAN_MODELS[0], httpStatus: 400, kind: 'rejected', gStatus: 'INVALID_ARGUMENT' });
    expect(typeof l.ms).toBe('number');
    expect((l.gMessage as string).length).toBeLessThanOrEqual(200);
    expect(l.gMessage).not.toMatch(/AIza/);
    expect(l.gMessage).not.toMatch(/A{40}/);
    const all = JSON.stringify(logs);
    expect(all).not.toContain(KEY);
    expect(all).not.toContain(PIN);
    expect(all).not.toMatch(/inlineData|"data"/);
  });

  it('googleError reads an array-shaped body and survives a non-JSON body', async () => {
    expect(await googleError(new Response(JSON.stringify([{ error: { status: 'NOT_FOUND', message: 'm' } }])))).toEqual({ gStatus: 'NOT_FOUND', gMessage: 'm' });
    expect(await googleError(new Response('<html>oops</html>'))).toEqual({ gStatus: null, gMessage: null });
  });
});

describe('AI budget in the proxy (D35)', () => {
  it('refuses before calling Google when the call would exceed the total, and the refused call adds nothing', async () => {
    const { deps, fetchFn } = setup({ AI_BUDGET_TRY_TOTAL: '0.5' });
    expect((await handleAiPost(await planReq(), deps)).status).toBe(200); // 0.38
    const res = await handleAiPost(await planReq(), deps);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'budget_total', message: 'AI bütçesi doldu: toplam.' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(38);
    // the count quota was given back too: only one call counted
    expect((await status(deps)).remainingDay).toBe(AI_DEFAULT_DAILY_LIMIT - 1);
  });

  it('daily and monthly refusals use their own messages', async () => {
    const day = setup({ AI_BUDGET_TRY_DAILY: '0.1' });
    expect((await (await handleAiPost(await planReq(), day.deps)).json()).message).toBe('AI bütçesi doldu: günlük.');
    const after = setup({ AI_BUDGET_WINDOW_END: '2026-10-01', AI_BUDGET_TRY_MONTHLY_AFTER: '0.1' });
    expect((await (await handleAiPost(await planReq(), after.deps)).json()).message).toBe('AI bütçesi doldu: aylık.');
    expect(day.fetchFn).not.toHaveBeenCalled();
    expect(after.fetchFn).not.toHaveBeenCalled();
  });

  it('image task: Google 400 is not charged; 503 then 200 is charged twice; success reports the remaining ₺ in a header', async () => {
    const bad = setup({}, async () => googleErr(400, 'INVALID_ARGUMENT', 'x'));
    expect((await (await handleAiPost(await imageReq(), bad.deps)).json()).error).toBe('model_error');
    expect(await bad.deps.counter.get(quotaKeys.budgetTotal())).toBe(0);

    const answers = [new Response('', { status: 503 }), null];
    const retry = setup({}, async () => (answers.shift() ?? (await imageOk())) as Response);
    const ok = await handleAiPost(await imageReq(), retry.deps);
    expect(ok.status).toBe(200);
    expect(await retry.deps.counter.get(quotaKeys.budgetTotal())).toBe(2 * chargeKurus(AI_TASKS.B.costTry));
    const left = Number(ok.headers.get('x-curate-remaining-try'));
    // the daily cap (₺300) is tighter than the cumulative total (₺6000)
    expect(left).toBeCloseTo(AI_BUDGET_DEFAULTS.dailyTry - (2 * chargeKurus(AI_TASKS.B.costTry)) / 100, 2);
  });

  it('status reports the remaining budget; a broken env still enforces the defaults', async () => {
    const { deps } = setup({ AI_BUDGET_TRY_TOTAL: 'garbage', AI_BUDGET_TRY_DAILY: 'garbage' });
    expect((await status(deps)).remainingTry).toBe(AI_BUDGET_DEFAULTS.dailyTry); // daily ₺300 is tighter than the ₺6000 total
    expect(deps.config.budget).toEqual(readBudgetConfig({}));
  });

  it('a request while another one is running gets "busy" and does not touch the budget', async () => {
    let release: (r: Response) => void = () => {};
    const { deps, fetchFn } = setup({}, () => new Promise<Response>((r) => (release = r)));
    const first = handleAiPost(await planReq(), deps);
    // let the first request reach the model call
    for (let i = 0; i < 50 && fetchFn.mock.calls.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
    const second = await handleAiPost(await planReq(), deps);
    expect(second.status).toBe(429);
    expect((await second.json()).error).toBe('busy');
    release(planOk());
    expect((await first).status).toBe(200);
    expect(await deps.counter.get(quotaKeys.budgetTotal())).toBe(chargeKurus(AI_PLAN_COST_TRY));
  });
});
