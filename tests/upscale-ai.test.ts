import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AI_TASKS, AI_UPSCALE_MAX_SOURCE_EDGE, AI_INPUT_LONG_EDGE, aiUpscaleAllowed, AI_MODELS, aiModelId } from '../lib/ai/config';
import { requestAiRepair } from '../lib/ai/client';
import { studioStore } from '../lib/core/state-machine';
import { registerUrl } from '../lib/engine/proxy';
import { tr } from '../lib/i18n/tr';
import type { StudioItem } from '../lib/core/types';

// Büyüt → "AI ile Büyüt" (D38): image task A through the existing proxy, result kept only on "Kullan"

describe('AI upscale: task and limits', () => {
  it('uses image task A (pixel-returning model, 4K) with time and cost for the sheet', () => {
    const a = AI_TASKS.A;
    expect(aiModelId('A')).toBe(AI_MODELS.flash);
    expect(a.imageSize).toBe('4K');
    expect(a.estSeconds).toBeGreaterThan(0);
    expect(a.costTry).toBeGreaterThan(0);
    expect(a.prompt).toContain('{KEEP}');
  });

  it('only photos whose long edge fits the AI input (no downscale before sending)', () => {
    expect(AI_UPSCALE_MAX_SOURCE_EDGE).toBe(AI_INPUT_LONG_EDGE);
    expect(aiUpscaleAllowed(2048, 1536)).toBe(true);
    expect(aiUpscaleAllowed(1536, 2048)).toBe(true);
    expect(aiUpscaleAllowed(2049, 100)).toBe(false);
    expect(aiUpscaleAllowed(0, 0)).toBe(false);
  });

  it('client sends task A as JPEG to /api/ai and returns the image', async () => {
    const f = vi.fn(async () => new Response(new Uint8Array([0xff, 0xd8, 1]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }));
    const r = await requestAiRepair('A', new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), undefined, f as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-curate-task']).toBe('A');
  });

  it('budget errors reach the user in plain Turkish', async () => {
    const f = async () => new Response(JSON.stringify({ error: 'budget_day' }), { status: 429 });
    const r = await requestAiRepair('A', new Blob(['x']), undefined, f as unknown as typeof fetch);
    expect(r).toMatchObject({ ok: false, code: 'budget_day' });
    if (!r.ok) expect(r.message).toMatch(/bütçe/i);
  });
});

describe('AI upscale: copy', () => {
  it('no "Doku Üretimi" / "AI Doku" wording; cost and Google disclosure are shown', () => {
    const all = JSON.stringify({ upscale: tr.upscale, modules: tr.modules, ai: AI_TASKS.A.label });
    expect(all).not.toMatch(/Doku/);
    expect(tr.upscale.aiCostNote(30, 8)).toContain("Google'a gönderilir");
    expect(tr.upscale.aiCostNote(30, 8)).toContain('₺8');
    expect(tr.hub.trustDetail).toContain('AI ile Büyüt');
  });

  it('the fake local contrast preview is gone from UpscaleStudio', () => {
    const src = readFileSync(join(__dirname, '../components/studio/UpscaleStudio.tsx'), 'utf8');
    expect(src).not.toMatch(/1\.05|0\.95|aiPreviewUrl/);
    expect(src).toContain('AiReviewScreen');
  });
});

let seq = 0;
function makeItem(id: string): StudioItem {
  seq++;
  const url = registerUrl(`blob:http://localhost:3000/${id}`);
  return {
    id,
    name: `${id}.jpg`,
    originalUrl: url,
    proxyUrl: url,
    dimensions: { width: 1000, height: 750, aspectRatio: 4 / 3 },
    proxyDimensions: { width: 1000, height: 750, aspectRatio: 4 / 3 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: 0,
    createdAt: seq,
  };
}
const result = (sourceId: string, name: string) => ({
  sourceId,
  url: registerUrl(`blob:http://localhost:3000/${name}`),
  width: 4096,
  height: 3072,
});

describe('AI upscale: kept result ("Kullan")', () => {
  let revoked: string[];
  beforeEach(() => {
    revoked = [];
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u: string) => {
      revoked.push(u);
    });
    studioStore.clearItems();
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts empty; "Kullan" keeps one result for its source', () => {
    expect(studioStore.getState().upscaleAi).toBeNull();
    studioStore.addItems([makeItem('a')]);
    const r = result('a', 'ai1');
    studioStore.setUpscaleAi(r);
    expect(studioStore.getState().upscaleAi).toEqual(r);
  });

  it('a new result replaces the old one and releases its memory', () => {
    studioStore.addItems([makeItem('a')]);
    const r1 = result('a', 'ai1');
    studioStore.setUpscaleAi(r1);
    studioStore.setUpscaleAi(result('a', 'ai2'));
    expect(revoked).toContain(r1.url);
  });

  it('deleting the source releases the result; deleting another photo keeps it', () => {
    studioStore.addItems([makeItem('a'), makeItem('b')]);
    const r = result('a', 'ai1');
    studioStore.setUpscaleAi(r);
    studioStore.removeItem('b');
    expect(studioStore.getState().upscaleAi).toEqual(r);
    studioStore.removeItem('a');
    expect(studioStore.getState().upscaleAi).toBeNull();
    expect(revoked).toContain(r.url);
  });

  it('clearing the library releases the result', () => {
    studioStore.addItems([makeItem('a')]);
    const r = result('a', 'ai1');
    studioStore.setUpscaleAi(r);
    studioStore.clearItems();
    expect(studioStore.getState().upscaleAi).toBeNull();
    expect(revoked).toContain(r.url);
  });
});
