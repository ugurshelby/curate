import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { PLATFORM_SPECS, MAX_EXPORT_BYTES, JPEG_QUALITY_STEPS } from '../lib/export/platform-specs';
import {
  planExportDownload,
  encodeWithinLimit,
  mimeForFormat,
  exportFileName,
} from '../lib/export/export-plan';
import { packageDumpZip } from '../lib/export/zip-packager';

describe('Export targets as data (spec §4.4 K1, S-b)', () => {
  it('locks post, story and TikTok sizes, prefixes and the highest default quality', () => {
    expect([PLATFORM_SPECS.ig_post_4_5.width, PLATFORM_SPECS.ig_post_4_5.height]).toEqual([1080, 1350]);
    expect([PLATFORM_SPECS.ig_story_9_16.width, PLATFORM_SPECS.ig_story_9_16.height]).toEqual([1080, 1920]);
    expect([PLATFORM_SPECS.tiktok_9_16.width, PLATFORM_SPECS.tiktok_9_16.height]).toEqual([1080, 1920]);
    expect(PLATFORM_SPECS.ig_post_4_5.filePrefix).toBe('dump');
    expect(PLATFORM_SPECS.tiktok_9_16.filePrefix).toBe('tiktok');
    for (const id of ['ig_post_4_5', 'ig_story_9_16', 'tiktok_9_16'] as const) {
      expect(PLATFORM_SPECS[id].quality).toBe(0.97);
      expect(PLATFORM_SPECS[id].maxBytes).toBe(8 * 1024 * 1024);
    }
    // TikTok size is an owner assumption until verified on a phone
    expect(PLATFORM_SPECS.tiktok_9_16.verified).toBe(false);
    // Upscale is not a platform target: no 8 MB cap
    expect(PLATFORM_SPECS.original.maxBytes).toBeUndefined();
  });

  it('maps formats to MIME types and file extensions', () => {
    expect(mimeForFormat('jpeg')).toBe('image/jpeg');
    expect(mimeForFormat('png')).toBe('image/png');
    expect(exportFileName('dump', 0, 'image/jpeg')).toBe('dump_01.jpg');
    expect(exportFileName('tiktok', 9, 'image/png')).toBe('tiktok_10.png');
  });
});

describe('Single vs multi download', () => {
  it('one image downloads as a direct file, never a zip', () => {
    expect(planExportDownload(1, 'dump', 'jpeg')).toEqual({ kind: 'single', fileName: 'dump_01.jpg' });
    expect(planExportDownload(1, 'story', 'png')).toEqual({ kind: 'single', fileName: 'story_01.png' });
    expect(planExportDownload(1, 'tiktok', 'jpeg')).toEqual({ kind: 'single', fileName: 'tiktok_01.jpg' });
  });

  it('a multi-image series becomes one zip with sequenced names', () => {
    const plan = planExportDownload(3, 'tiktok', 'jpeg');
    expect(plan).toEqual({
      kind: 'zip',
      zipName: 'tiktok_3.zip',
      fileNames: ['tiktok_01.jpg', 'tiktok_02.jpg', 'tiktok_03.jpg'],
    });
  });

  it('zip contents follow the plan names for the TikTok prefix', async () => {
    const blob = (type: string) => new Blob([new Uint8Array([1, 2, 3])], { type });
    const zipBlob = await packageDumpZip(
      [
        { id: 'a', blob: blob('image/jpeg'), order: 0 },
        { id: 'b', blob: blob('image/jpeg'), order: 1 },
      ],
      'tiktok'
    );
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['tiktok_01.jpg', 'tiktok_02.jpg']);
  });

  it('rejects an empty export', () => {
    expect(() => planExportDownload(0, 'dump', 'jpeg')).toThrow();
  });
});

describe('8 MB limit lowers JPEG quality step by step (S-b)', () => {
  const sizedBlob = (bytes: number, type = 'image/jpeg') => new Blob([new Uint8Array(bytes)], { type });

  it('keeps 0.97 when the first encode fits', async () => {
    const calls: (number | undefined)[] = [];
    const out = await encodeWithinLimit(async (q) => {
      calls.push(q);
      return sizedBlob(1000);
    }, 'jpeg', MAX_EXPORT_BYTES);
    expect(calls).toEqual([0.97]);
    expect(out).toMatchObject({ quality: 0.97, reduced: false, overLimit: false });
    expect(out.blob.type).toBe('image/jpeg');
  });

  it('steps down until the file fits and reports the used quality', async () => {
    const sizes: Record<string, number> = { '0.97': 9e6, '0.94': 8.5e6, '0.91': 7e6 };
    const calls: number[] = [];
    const out = await encodeWithinLimit(async (q) => {
      calls.push(q!);
      return sizedBlob(sizes[String(q)] ?? 1000);
    }, 'jpeg', MAX_EXPORT_BYTES);
    expect(calls).toEqual([0.97, 0.94, 0.91]);
    expect(out).toMatchObject({ quality: 0.91, reduced: true, overLimit: false });
  });

  it('flags overLimit when even the last step is too large', async () => {
    const out = await encodeWithinLimit(async () => sizedBlob(100), 'jpeg', 50);
    expect(out.quality).toBe(JPEG_QUALITY_STEPS[JPEG_QUALITY_STEPS.length - 1]);
    expect(out.overLimit).toBe(true);
  });

  it('PNG is encoded once without quality; size above the limit is reported', async () => {
    const calls: (number | undefined)[] = [];
    const out = await encodeWithinLimit(async (q) => {
      calls.push(q);
      return sizedBlob(200, 'image/png');
    }, 'png', 100);
    expect(calls).toEqual([undefined]);
    expect(out).toMatchObject({ quality: null, reduced: false, overLimit: true });
    expect(out.blob.type).toBe('image/png');
  });

  it('no limit (Upscale) encodes once at 0.97', async () => {
    const calls: number[] = [];
    await encodeWithinLimit(async (q) => {
      calls.push(q!);
      return sizedBlob(50e6);
    }, 'jpeg', undefined);
    expect(calls).toEqual([0.97]);
  });
});
