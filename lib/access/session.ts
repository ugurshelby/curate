/**
 * Whole-app access gate (owner decision D27, plan docs/reports/2026-10-08-erisim-plani.md).
 * One signed, HttpOnly session cookie per device. Runs in the Edge middleware and in the Node API route,
 * so it uses Web Crypto only (no node:crypto). The PIN value is read from CURATE_AI_PASSWORD and never
 * stored, printed or sent to the browser. Signing key: HMAC(VERTEX_API_KEY, "curate-session-v1:" + PIN),
 * so changing the PIN in Vercel invalidates every device (lost-phone revocation).
 */

export const SESSION_COOKIE = 'curate_session';
/** 365 days, sliding: re-issued when older than SESSION_REFRESH_AFTER_S */
export const SESSION_MAX_AGE_S = 365 * 24 * 60 * 60;
export const SESSION_REFRESH_AFTER_S = 30 * 24 * 60 * 60;
/** Clock tolerance for a token issued "in the future" */
export const SESSION_CLOCK_SKEW_S = 5 * 60;
export const LOCK_PATH = '/kilit';
/** PIN is exactly 4 digits (same rule as lib/ai/config.ts AI_PIN_PATTERN) */
const PIN_PATTERN = /^\d{4}$/;

export interface AccessSecret {
  apiKey: string;
  pin: string;
}

type EnvLike = Record<string, string | undefined>;

/** null → gate not configured: every page stays locked (fail closed) */
export function readAccessSecret(env: EnvLike): AccessSecret | null {
  const apiKey = env.VERTEX_API_KEY || '';
  const pin = (env.CURATE_AI_PASSWORD ?? '').trim();
  if (!apiKey || !PIN_PATTERN.test(pin)) return null;
  return { apiKey, pin };
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(raw: Uint8Array<ArrayBuffer> | ArrayBuffer, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

async function sessionKey(secret: AccessSecret): Promise<CryptoKey> {
  const base = await hmacKey(enc.encode(secret.apiKey), ['sign']);
  const derived = await crypto.subtle.sign('HMAC', base, enc.encode(`curate-session-v1:${secret.pin}`));
  return hmacKey(derived, ['sign', 'verify']);
}

/** Token: "s1.<issuedAtSeconds>.<base64url HMAC-SHA256>" */
export async function signSession(secret: AccessSecret, nowMs: number): Promise<string> {
  const payload = `s1.${Math.floor(nowMs / 1000)}`;
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export type SessionCheck = { ok: true; issuedS: number } | { ok: false };

export async function verifySession(secret: AccessSecret, token: string | null | undefined, nowMs: number): Promise<SessionCheck> {
  if (!token) return { ok: false };
  const m = /^(s1\.(\d{1,12}))\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return { ok: false };
  const issuedS = Number(m[2]);
  const nowS = Math.floor(nowMs / 1000);
  if (issuedS > nowS + SESSION_CLOCK_SKEW_S || nowS - issuedS > SESSION_MAX_AGE_S) return { ok: false };
  const sig = fromB64url(m[3]);
  if (!sig) return { ok: false };
  // subtle.verify compares in constant time
  const ok = await crypto.subtle.verify('HMAC', await sessionKey(secret), sig, enc.encode(m[1]));
  return ok ? { ok: true, issuedS } : { ok: false };
}

/** Path=/ so every page and /api/ai see it; Lax so opening the installed app (top-level navigation) sends it */
export function sessionCookie(token: string, maxAge: number = SESSION_MAX_AGE_S): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/** Outside the gate: the lock page, the API (own cookie check), build assets and PWA install files */
const PUBLIC_FILES = new Set([
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]);

export function isPublicPath(pathname: string): boolean {
  if (pathname === LOCK_PATH || PUBLIC_FILES.has(pathname)) return true;
  return pathname.startsWith('/_next/') || pathname.startsWith('/api/');
}

/** Only same-origin relative paths are allowed as the post-unlock target (no open redirect) */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (next === LOCK_PATH || next.startsWith(`${LOCK_PATH}?`)) return '/';
  return next;
}

export type GateDecision =
  | { action: 'next'; setCookie?: string }
  | { action: 'redirect'; location: string; setCookie?: string };

/**
 * Decision for one request (pure apart from Web Crypto; the middleware only applies it).
 * Valid session on /kilit → back into the app. No or bad session → /kilit?next=…
 */
export async function decideAccess(
  pathname: string,
  search: string,
  cookieHeader: string | null,
  env: EnvLike,
  nowMs: number,
): Promise<GateDecision> {
  if (pathname !== LOCK_PATH && isPublicPath(pathname)) return { action: 'next' };
  const secret = readAccessSecret(env);
  const token = readCookieValue(cookieHeader, SESSION_COOKIE);
  const check = secret ? await verifySession(secret, token, nowMs) : ({ ok: false } as const);

  if (pathname === LOCK_PATH) {
    if (check.ok) {
      const next = new URLSearchParams(search).get('next');
      return { action: 'redirect', location: safeNext(next) };
    }
    return { action: 'next' };
  }

  if (!check.ok) {
    const target = `${pathname}${search}`;
    const location = target === '/' ? LOCK_PATH : `${LOCK_PATH}?next=${encodeURIComponent(target)}`;
    // a stale or foreign cookie is cleared so the device starts clean
    return { action: 'redirect', location, setCookie: token ? sessionCookie('', 0) : undefined };
  }

  const ageS = Math.floor(nowMs / 1000) - check.issuedS;
  if (secret && ageS > SESSION_REFRESH_AFTER_S) {
    return { action: 'next', setCookie: sessionCookie(await signSession(secret, nowMs)) };
  }
  return { action: 'next' };
}
