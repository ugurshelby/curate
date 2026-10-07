/**
 * "AI ile onar" proxy'si (spec §4.5 E12). Anahtar ve PIN yalnız sunucu ortam değişkeninde
 * (VERTEX_API_KEY, CURATE_AI_PASSWORD); tarayıcıya hiç inmez. Mantık ve testler: lib/ai/server.ts.
 * GET durum · PUT PIN ile cihaz eşleme · POST görev · DELETE cihazı unut.
 */
import { defaultAiDeps, handleAiForget, handleAiPost, handleAiStatus, handleAiUnlock } from '@/lib/ai/server';

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

export async function PUT(req: Request): Promise<Response> {
  return handleAiUnlock(req, defaultAiDeps());
}

export async function DELETE(req: Request): Promise<Response> {
  return handleAiForget(req);
}
