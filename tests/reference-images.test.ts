import { describe, it, expect } from 'vitest';
import { REFERENCE_IMAGES, fetchReferenceFiles, referenceImageUrl } from '../lib/core/reference-images';

describe('Reference image loader (spec §4.4 K3)', () => {
  it('lists the 13 tracked reference images', () => {
    expect(REFERENCE_IMAGES).toHaveLength(13);
    expect(new Set(REFERENCE_IMAGES.map((r) => r.file)).size).toBe(13);
  });

  it('fetches from the same origin path and returns image/jpeg Files with .jpg names', async () => {
    const requested: string[] = [];
    const fakeFetch = async (url: string) => {
      requested.push(url);
      // .jfif is served with an ambiguous type on purpose
      return new Response(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'application/octet-stream' }));
    };

    const files = await fetchReferenceFiles(['kopru.jfif', 'tren.jfif'], fakeFetch);

    expect(requested).toEqual([referenceImageUrl('kopru.jfif'), referenceImageUrl('tren.jfif')]);
    expect(requested.every((u) => u.startsWith('/reference-images/'))).toBe(true);
    expect(files.map((f) => f.name)).toEqual(['kopru.jpg', 'tren.jpg']);
    expect(files.every((f) => f.type === 'image/jpeg')).toBe(true);
    expect(files[0].size).toBe(3);
  });

  it('rejects when a reference image is missing', async () => {
    const fakeFetch = async () => new Response('missing', { status: 404 });
    await expect(fetchReferenceFiles(['yok.jfif'], fakeFetch)).rejects.toThrow('Referans görsel yüklenemedi');
  });
});
