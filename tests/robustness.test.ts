/**
 * Faz H1 — sağlamlık: worker çökmesi, bozuk JPEG, açılamayan dosya, replaceItem temizliği.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerBridge } from '../lib/core/worker-bridge';
import { sanitizeJpegBuffer } from '../lib/export/exif-sanitizer';
import { studioStore, handleUndecodable } from '../lib/core/state-machine';
import { registerUrl } from '../lib/engine/proxy';
import { StudioItem } from '../lib/core/types';

function fakeImageData(w: number, h: number): ImageData {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: 'srgb' } as ImageData;
}

describe('WorkerBridge: a crashed worker never leaves a task pending', () => {
  it('worker error rejects every pending task, terminates the worker, later tasks run on the main thread', async () => {
    const terminate = vi.fn();
    const worker = {
      postMessage: vi.fn(),
      terminate,
      onmessage: null,
      onerror: null as ((e: Event) => void) | null,
      onmessageerror: null,
    };
    const bridge = new WorkerBridge(() => worker as never);
    const a = bridge.upscaleLanczos(fakeImageData(2, 2), 2);
    const b = bridge.extractMetrics(fakeImageData(2, 2));
    expect(worker.postMessage).toHaveBeenCalledTimes(2);

    worker.onerror!(new Event('error'));
    await expect(a).rejects.toThrow('İşlem yarıda kaldı');
    await expect(b).rejects.toThrow('İşlem yarıda kaldı');
    expect(terminate).toHaveBeenCalledTimes(1);

    // Yedek: ana thread (worker artık yok)
    const up = await bridge.upscaleLanczos(fakeImageData(2, 2), 2);
    expect([up.width, up.height]).toEqual([4, 4]);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });

  it('unreadable message also settles the pending tasks', async () => {
    const worker = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null as (() => void) | null };
    const bridge = new WorkerBridge(() => worker as never);
    const p = bridge.extractMetrics(fakeImageData(2, 2));
    worker.onmessageerror!();
    await expect(p).rejects.toThrow('İşlem sonucu okunamadı');
  });
});

describe('EXIF sanitizer: malformed JPEG never throws', () => {
  function jpegWithApp1(payload: number[], declaredLen?: number): ArrayBuffer {
    const len = declaredLen ?? payload.length + 2;
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...payload, 0xff, 0xda, 0, 2]).buffer;
  }

  it('zeros APP1 payload in a well-formed file', () => {
    const out = new Uint8Array(sanitizeJpegBuffer(jpegWithApp1([0x45, 0x78, 0x69, 0x66])));
    expect(Array.from(out.slice(6, 10))).toEqual([0, 0, 0, 0]);
  });

  it('length past the end, length < 2, truncated header, tiny buffers: returned untouched, no RangeError', () => {
    const over = jpegWithApp1([1, 2, 3], 0x4000);
    expect(() => sanitizeJpegBuffer(over)).not.toThrow();
    expect(Array.from(new Uint8Array(over).slice(6, 9))).toEqual([1, 2, 3]);
    expect(() => sanitizeJpegBuffer(jpegWithApp1([1], 1))).not.toThrow();
    expect(() => sanitizeJpegBuffer(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).not.toThrow();
    expect(() => sanitizeJpegBuffer(new Uint8Array([0xff]).buffer)).not.toThrow();
    expect(() => sanitizeJpegBuffer(new ArrayBuffer(0))).not.toThrow();
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
    dimensions: { width: 100, height: 80, aspectRatio: 1.25 },
    proxyDimensions: { width: 100, height: 80, aspectRatio: 1.25 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: 0,
    createdAt: seq,
  };
}

describe('Library cleanup', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    studioStore.clearItems();
    studioStore.setNotice(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('replaceItem drops the old photo’s Düzenle settings', () => {
    studioStore.addItems([makeItem('a'), makeItem('b')]);
    studioStore.setEditParams('a', { intensity: 0.5 });
    studioStore.replaceItem(0, makeItem('c'));
    expect(studioStore.getState().items.map((i) => i.id)).toEqual(['c', 'b']);
    expect(studioStore.getState().edits['a']).toBeUndefined();
  });

  it('an undecodable file is removed with a message (not left with fake 1080×1350 size)', () => {
    studioStore.addItems([makeItem('ok'), makeItem('heic')]);
    handleUndecodable('heic', 'IMG_1.HEIC', 'blob:http://localhost:3000/heic');
    expect(studioStore.getState().items.map((i) => i.id)).toEqual(['ok']);
    expect(studioStore.getState().notice).toBe('"IMG_1.HEIC" açılamadı; bu dosya biçimi desteklenmiyor.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/heic');
  });
});
