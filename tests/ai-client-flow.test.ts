import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestAiRepair, fetchAiStatus, unlockAi, forgetAiDevice, clearLegacyAiPassword } from '../lib/ai/client';
import { findSuspectRegion, diffSize, DIFF_BLOCK } from '../lib/ai/diff-check';
import { studioStore, acceptAiResult, AI_EVICT_CONFIRM } from '../lib/core/state-machine';
import { registerUrl } from '../lib/engine/proxy';
import { StudioItem } from '../lib/core/types';

describe('AI client requests', () => {
  it('sends task and the JPEG with the device cookie (no password header); returns the image blob and remaining quota', async () => {
    const f = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg', 'x-curate-remaining-day': '19', 'x-curate-remaining-month': '149' },
        }),
    );
    const r = await requestAiRepair('B', new Blob([new Uint8Array([9])], { type: 'image/jpeg' }), undefined, f as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.blob.size).toBe(3);
      expect(r.remainingDay).toBe(19);
      expect(r.remainingMonth).toBe(149);
    }
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/ai');
    const h = init.headers as Record<string, string>;
    expect(h['x-curate-task']).toBe('B');
    expect(Object.keys(h).some((k) => /password|pin/i.test(k))).toBe(false);
    expect(init.credentials).toBe('same-origin');
  });

  it('maps server errors to plain Turkish messages', async () => {
    const json = (status: number, error: string) =>
      vi.fn(async () => new Response(JSON.stringify({ error, message: 'x' }), { status }));
    const cases: [number, string, string][] = [
      [401, 'wrong_pin', 'PIN yanlış.'],
      [401, 'pin_required', 'Bu cihazı eşlemek için PIN’ini gir.'],
      [503, 'service_error', 'Sunucu sayacına ulaşılamadı. Biraz sonra tekrar dene.'],
      [429, 'quota_day', 'Bugünkü AI hakkı doldu.'],
      [504, 'timeout', 'Süre aşıldı. Tekrar dene.'],
      [502, 'no_image', 'Model görsel döndürmedi.'],
    ];
    for (const [status, code, message] of cases) {
      const r = await requestAiRepair('B', new Blob(['x']), undefined, json(status, code) as unknown as typeof fetch);
      expect(r).toEqual({ ok: false, code, message });
    }
    // Vercel'in kendi zaman aşımı sayfası (JSON değil)
    const html = vi.fn(async () => new Response('<html>timeout</html>', { status: 504 }));
    expect(await requestAiRepair('B', new Blob(['x']), undefined, html as unknown as typeof fetch)).toMatchObject({ code: 'timeout' });
    // Çöken fonksiyon (500, JSON değil) artık "Süre aşıldı" değil
    const crash = vi.fn(async () => new Response('Internal Server Error', { status: 500 }));
    expect(await requestAiRepair('B', new Blob(['x']), undefined, crash as unknown as typeof fetch)).toMatchObject({ code: 'server_error' });
  });

  it('cancel → canceled (with the cost note), no retry', async () => {
    const controller = new AbortController();
    const f = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        }),
    );
    const p = requestAiRepair('A', new Blob(['x']), controller.signal, f as unknown as typeof fetch);
    controller.abort();
    expect(await p).toEqual({ ok: false, code: 'canceled', message: 'İptal edildi; ücret yansımış olabilir.' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('status check reads pairing and quota without a model call', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ remainingDay: 5, remainingMonth: 50 }), { status: 200 }));
    expect(await fetchAiStatus(f as unknown as typeof fetch)).toEqual({ ok: true, remainingDay: 5, remainingMonth: 50, remainingTry: null });
    // the money left (D35) comes through when the server reports it
    const withBudget = vi.fn(async () => new Response(JSON.stringify({ remainingDay: 5, remainingMonth: 50, remainingTry: 287.5 }), { status: 200 }));
    expect(await fetchAiStatus(withBudget as unknown as typeof fetch)).toMatchObject({ ok: true, remainingTry: 287.5 });
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('GET');
    const unpaired = vi.fn(async () => new Response('{"error":"pin_required"}', { status: 401 }));
    expect(await fetchAiStatus(unpaired as unknown as typeof fetch)).toMatchObject({ ok: false, code: 'pin_required' });
  });

  it('unlock sends the PIN once as JSON via PUT; forget uses DELETE', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ remainingDay: 20, remainingMonth: 150 }), { status: 200 }));
    expect(await unlockAi('0000', f as unknown as typeof fetch)).toEqual({ ok: true, remainingDay: 20, remainingMonth: 150, remainingTry: null });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ pin: '0000' });
    const wrong = vi.fn(async () => new Response('{"error":"wrong_pin"}', { status: 401 }));
    expect(await unlockAi('0000', wrong as unknown as typeof fetch)).toMatchObject({ ok: false, code: 'wrong_pin', message: 'PIN yanlış.' });
    const del = vi.fn(async () => new Response(null, { status: 204 }));
    expect(await forgetAiDevice(del as unknown as typeof fetch)).toBe(true);
    expect((del.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('DELETE');
  });

  it('removes the old plain-text password from localStorage', () => {
    const removed: string[] = [];
    vi.stubGlobal('window', { localStorage: { removeItem: (k: string) => removed.push(k) } });
    clearLegacyAiPassword();
    expect(removed).toEqual(['curate.ai.password']);
    vi.unstubAllGlobals();
  });
});

let seq = 0;
function makeItem(id: string, extra: Partial<StudioItem> = {}): StudioItem {
  seq++;
  const url = registerUrl(`blob:http://localhost:3000/${id}`);
  return {
    id,
    name: `${id}.jpg`,
    originalUrl: url,
    proxyUrl: url,
    dimensions: { width: 100, height: 80, aspectRatio: 1.25 },
    proxyDimensions: { width: 100, height: 80, aspectRatio: 1.25 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: 0,
    createdAt: seq,
    ...extra,
  };
}
const ids = () => studioStore.getState().items.map((i) => i.id);

describe('AI result: "Kullan" / "At" and paid-result eviction', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    studioStore.clearItems();
    studioStore.setNotice(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('"At": nothing enters the library (the result only lives on the review screen)', () => {
    studioStore.addItems([makeItem('a')]);
    const before = JSON.stringify(studioStore.getState().items);
    // Kontrol sayfası açık: sonuç yalnız blob + URL; At → acceptAiResult hiç çağrılmaz
    expect(JSON.stringify(studioStore.getState().items)).toBe(before);
    expect(ids()).toEqual(['a']);
  });

  it('"Kullan": added as a derived photo of the ACTIVE photo via the shared path, selected, badge "AI sonucu"', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.addResultItem(makeItem('a_up'), 'a', 'upscale'); // aktif = Büyüt sonucu
    const confirm = vi.fn(() => true);
    expect(acceptAiResult(studioStore, () => makeItem('ai1'), 'a_up', confirm)).toBe('added');
    expect(confirm).not.toHaveBeenCalled();
    expect(ids()).toEqual(['a', 'a_up', 'ai1']);
    const ai = studioStore.getState().items.find((i) => i.id === 'ai1')!;
    expect(ai).toMatchObject({ sourceId: 'a_up', derivedBy: 'ai' });
    expect(studioStore.getState().selectedItemId).toBe('ai1');
    expect(studioStore.getState().edits['ai1']).toBeUndefined();
  });

  it('oldest is an AI result → asks first; declining adds nothing and creates no item', () => {
    studioStore.addItems([makeItem('a')]);
    acceptAiResult(studioStore, () => makeItem('ai1'), 'a', () => true);
    acceptAiResult(studioStore, () => makeItem('ai2'), 'a', () => true);
    const make = vi.fn(() => makeItem('ai3'));
    const confirm = vi.fn(() => false);

    expect(acceptAiResult(studioStore, make, 'a', confirm)).toBe('declined');
    expect(confirm).toHaveBeenCalledWith(AI_EVICT_CONFIRM);
    expect(make).not.toHaveBeenCalled();
    expect(ids()).toEqual(['a', 'ai1', 'ai2']);

    expect(acceptAiResult(studioStore, make, 'a', () => true)).toBe('added');
    expect(ids()).toEqual(['a', 'ai2', 'ai3']);
    expect(studioStore.getState().notice).toBe('En eski AI sonucu silindi (en çok 2).');
  });

  it('oldest is a Büyüt result → no question, existing message', () => {
    studioStore.addItems([makeItem('a')]);
    studioStore.addResultItem(makeItem('u1'), 'a', 'upscale');
    acceptAiResult(studioStore, () => makeItem('ai1'), 'a', () => true);
    const confirm = vi.fn(() => false);
    expect(acceptAiResult(studioStore, () => makeItem('ai2'), 'a', confirm)).toBe('added');
    expect(confirm).not.toHaveBeenCalled();
    expect(ids()).toEqual(['a', 'ai1', 'ai2']);
    expect(studioStore.getState().notice).toBe('Bellek için en eski büyütülmüş kopya silindi (en çok 2).');
  });
});

/** Gradyan + doku: gerçekçi blok farkları için */
function synth(w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const tex = ((x * 7 + y * 13) % 17) * 2;
      data[i] = 40 + (x / w) * 150 + tex;
      data[i + 1] = 60 + (y / h) * 120 + tex;
      data[i + 2] = 90 + tex;
      data[i + 3] = 255;
    }
  return { width: w, height: h, data };
}

describe('AI "look here" hint (soft, not a detector)', () => {
  it('global brighter/warmer output alone is not flagged', () => {
    const a = synth(256, 192);
    const b = synth(256, 192);
    for (let i = 0; i < b.data.length; i += 4) {
      b.data[i] = Math.min(255, b.data[i] * 1.1 + 12);
      b.data[i + 1] = Math.min(255, b.data[i + 1] * 1.05 + 8);
    }
    expect(findSuspectRegion(a, b)).toBeNull();
  });

  it('an added object in one block is flagged at that block', () => {
    const a = synth(256, 192);
    const b = synth(256, 192);
    // "Uydurulmuş güneş": (160..192, 32..64) bloğuna parlak disk
    for (let y = 32; y < 64; y++)
      for (let x = 160; x < 192; x++) {
        if ((x - 176) ** 2 + (y - 48) ** 2 > 14 ** 2) continue;
        const i = (y * 256 + x) * 4;
        b.data[i] = 255;
        b.data[i + 1] = 240;
        b.data[i + 2] = 200;
      }
    const r = findSuspectRegion(a, b)!;
    expect(r).not.toBeNull();
    expect(Math.round(r.x * 256)).toBe(160);
    expect(Math.round(r.y * 192)).toBe(32);
    expect(Math.round(r.w * 256)).toBe(DIFF_BLOCK);
  });

  it('compares at long edge 256', () => {
    expect(diffSize(4096, 3072)).toEqual({ width: 256, height: 192 });
  });
});
