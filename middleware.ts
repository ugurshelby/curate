/**
 * Whole-app PIN gate (D27). Decision logic and tests: lib/access/session.ts, tests/access.test.ts.
 * The API keeps its own cookie check; build assets and PWA install files stay public.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { decideAccess, isPublicPath, LOCK_PATH, readAccessSecret } from './lib/access/session';

export async function middleware(req: NextRequest) {
  // named reads: works whether the Edge runtime inlines or injects server env vars
  const env = { VERTEX_API_KEY: process.env.VERTEX_API_KEY, CURATE_AI_PASSWORD: process.env.CURATE_AI_PASSWORD };
  const d = await decideAccess(req.nextUrl.pathname, req.nextUrl.search, req.headers.get('cookie'), env, Date.now());
  const res = d.action === 'redirect' ? NextResponse.redirect(new URL(d.location, req.url), 307) : NextResponse.next();
  if (d.setCookie) res.headers.append('Set-Cookie', d.setCookie);
  // gated pages are per-device: never served from a shared cache
  const p = req.nextUrl.pathname;
  if (p === LOCK_PATH || !isPublicPath(p)) res.headers.set('Cache-Control', 'private, no-store');
  // diagnostics without values: tells the owner (curl -I /kilit) whether the gate can verify sessions
  if (p === LOCK_PATH) res.headers.set('X-Curate-Gate', readAccessSecret(env) ? 'ready' : 'not-configured');
  return res;
}

export const config = {
  // everything except build assets; the remaining public paths are decided in isPublicPath
  matcher: ['/((?!_next/static|_next/image).*)'],
};
