/**
 * "AI ile onar" proxy'si (spec §4.5 E12). Anahtar yalnız sunucu ortam değişkeninde (VERTEX_API_KEY);
 * tarayıcıya hiç inmez. Mantık ve testler: lib/ai/server.ts.
 */
import { defaultAiDeps, handleAiPost, handleAiStatus } from '@/lib/ai/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// lib/ai/config.ts AI_MAX_DURATION_S ile aynı olmalı (Next bu değeri statik okur)
export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  return handleAiPost(req, defaultAiDeps());
}

export async function GET(req: Request): Promise<Response> {
  return handleAiStatus(req, defaultAiDeps());
}
