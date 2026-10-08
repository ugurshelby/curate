import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  decideAccess,
  isPublicPath,
  readAccessSecret,
  safeNext,
  sessionCookie,
  signSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  SESSION_REFRESH_AFTER_S,
} from '../lib/access/session';

/** Fake test values (unrelated to the real ones) */
const ENV = { VERTEX_API_KEY: 'test-key-not-real-000000', CURATE_AI_PASSWORD: '2468' };
const SECRET = readAccessSecret(ENV)!;
const NOW = Date.UTC(2026, 9, 8, 12, 0, 0);
const DAY = 24 * 3600 * 1000;

const cookieOf = async (now = NOW, secret = SECRET) => `${SESSION_COOKIE}=${await signSession(secret, now)}`;

describe('access session token (Web Crypto, Edge + Node)', () => {
  it('matches a node:crypto reference signature (same format in middleware and API)', async () => {
    const token = await signSession(SECRET, NOW);
    const payload = `s1.${Math.floor(NOW / 1000)}`;
    const key = createHmac('sha256', ENV.VERTEX_API_KEY).update(`curate-session-v1:${ENV.CURATE_AI_PASSWORD}`).digest();
    const sig = createHmac('sha256', key).update(payload).digest('base64url');
    expect(token).toBe(`${payload}.${sig}`);
    expect(token).not.toContain(ENV.CURATE_AI_PASSWORD);
  });

  it('accepts a fresh token; rejects tampered, expired, future, other PIN and other key', async () => {
    const good = await signSession(SECRET, NOW);
    expect((await verifySession(SECRET, good, NOW)).ok).toBe(true);
    const tampered = good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA');
    const expired = await signSession(SECRET, NOW - (SESSION_MAX_AGE_S + 60) * 1000);
    const future = await signSession(SECRET, NOW + 3600 * 1000);
    const otherPin = await signSession({ ...SECRET, pin: '1357' }, NOW);
    const otherKey = await signSession({ ...SECRET, apiKey: 'another-key-not-real' }, NOW);
    for (const t of [tampered, expired, future, otherPin, otherKey, 'garbage', '', null]) {
      expect((await verifySession(SECRET, t, NOW)).ok).toBe(false);
    }
  });

  it('secret needs both values and a 4-digit PIN', () => {
    expect(readAccessSecret({})).toBeNull();
    expect(readAccessSecret({ VERTEX_API_KEY: 'k' })).toBeNull();
    expect(readAccessSecret({ VERTEX_API_KEY: 'k', CURATE_AI_PASSWORD: '12345' })).toBeNull();
    expect(readAccessSecret({ VERTEX_API_KEY: 'k', CURATE_AI_PASSWORD: ' 2468 ' })).toEqual({ apiKey: 'k', pin: '2468' });
  });

  it('cookie attributes: HttpOnly, Secure, SameSite=Lax, Path=/, 365 days', () => {
    const c = sessionCookie('x');
    for (const a of ['Path=/;', 'Max-Age=31536000', 'HttpOnly', 'Secure', 'SameSite=Lax']) expect(c).toContain(a);
  });
});

describe('gate decisions (middleware)', () => {
  it('PWA install files, build assets and the API stay public; pages and reference images are gated', () => {
    for (const p of ['/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/icon.svg', '/apple-touch-icon.png', '/favicon.ico', '/_next/static/x.js', '/api/ai', '/kilit']) {
      expect(isPublicPath(p)).toBe(true);
    }
    for (const p of ['/', '/reference-images/a.jpg', '/kilit2', '/manifest.json.bak', '/icon-999.png']) expect(isPublicPath(p)).toBe(false);
  });

  it('no cookie → /kilit (with next for deep links)', async () => {
    expect(await decideAccess('/', '', null, ENV, NOW)).toEqual({ action: 'redirect', location: '/kilit' });
    expect(await decideAccess('/reference-images/a.jpg', '', null, ENV, NOW)).toEqual({
      action: 'redirect',
      location: '/kilit?next=%2Freference-images%2Fa.jpg',
    });
  });

  it('valid cookie → through; on /kilit → back to next (same-origin only)', async () => {
    const c = await cookieOf();
    expect(await decideAccess('/', '', c, ENV, NOW)).toEqual({ action: 'next' });
    expect(await decideAccess('/kilit', '?next=%2F%3Fa%3D1', c, ENV, NOW)).toEqual({ action: 'redirect', location: '/?a=1' });
    expect(await decideAccess('/kilit', '?next=https%3A%2F%2Fevil.example', c, ENV, NOW)).toEqual({ action: 'redirect', location: '/' });
    expect(await decideAccess('/kilit', '?next=%2F%2Fevil.example', c, ENV, NOW)).toEqual({ action: 'redirect', location: '/' });
  });

  it('bad or foreign cookie → redirect and clear', async () => {
    const d = await decideAccess('/', '', `${SESSION_COOKIE}=s1.1.${'A'.repeat(43)}`, ENV, NOW);
    expect(d.action).toBe('redirect');
    expect(d.setCookie).toContain('Max-Age=0');
  });

  it('changing the PIN logs out every device', async () => {
    const c = await cookieOf();
    expect((await decideAccess('/', '', c, { ...ENV, CURATE_AI_PASSWORD: '1357' }, NOW)).action).toBe('redirect');
  });

  it('not configured → fail closed (pages locked, lock page reachable)', async () => {
    const c = await cookieOf();
    expect((await decideAccess('/', '', c, {}, NOW)).action).toBe('redirect');
    expect(await decideAccess('/kilit', '', null, {}, NOW)).toEqual({ action: 'next' });
  });

  it('sliding: older than 30 days → re-issued for another 365 days', async () => {
    const old = await cookieOf(NOW - (SESSION_REFRESH_AFTER_S * 1000 + DAY));
    const d = await decideAccess('/', '', old, ENV, NOW);
    expect(d.action).toBe('next');
    const token = d.setCookie!.split(';')[0].split('=')[1];
    expect(await verifySession(SECRET, token, NOW)).toEqual({ ok: true, issuedS: Math.floor(NOW / 1000) });
    expect((await decideAccess('/', '', await cookieOf(NOW - DAY), ENV, NOW)).setCookie).toBeUndefined();
  });

  it('safeNext allows only same-origin paths', () => {
    expect(safeNext('/a?b=1')).toBe('/a?b=1');
    for (const n of [null, '', 'https://x.y', '//x.y', '/\\x.y', 'javascript:alert(1)', '/kilit', '/kilit?next=/']) expect(safeNext(n)).toBe('/');
  });
});
