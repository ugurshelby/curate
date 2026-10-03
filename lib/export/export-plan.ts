/**
 * Curate Export — download plan and size-limited encoding (spec §4.4 S-b)
 * - One image always downloads as a direct file; a zip only for a multi-image Carousel series.
 * - Default is the highest quality; JPEG quality steps down only when the file exceeds the platform limit.
 */

import { JPEG_QUALITY_STEPS } from './platform-specs';

export type ExportFormat = 'jpeg' | 'png';

export function mimeForFormat(format: ExportFormat): 'image/jpeg' | 'image/png' {
  return format === 'png' ? 'image/png' : 'image/jpeg';
}

export function extensionForMime(mime: string): 'jpg' | 'png' {
  return mime === 'image/png' ? 'png' : 'jpg';
}

export function exportFileName(prefix: string, index: number, mime: string): string {
  return `${prefix}_${String(index + 1).padStart(2, '0')}.${extensionForMime(mime)}`;
}

export type ExportDownloadPlan =
  | { kind: 'single'; fileName: string }
  | { kind: 'zip'; zipName: string; fileNames: string[] };

export function planExportDownload(count: number, prefix: string, format: ExportFormat): ExportDownloadPlan {
  if (count < 1) throw new Error('Dışa aktarılacak görsel yok');
  const mime = mimeForFormat(format);
  if (count === 1) {
    return { kind: 'single', fileName: exportFileName(prefix, 0, mime) };
  }
  return {
    kind: 'zip',
    zipName: `${prefix}_${count}.zip`,
    fileNames: Array.from({ length: count }, (_, i) => exportFileName(prefix, i, mime)),
  };
}

export interface EncodedExport {
  blob: Blob;
  /** Used JPEG quality, null for PNG */
  quality: number | null;
  /** Quality was lowered to fit the limit */
  reduced: boolean;
  /** Still above the limit after the last step (or PNG above the limit) */
  overLimit: boolean;
}

/**
 * Encodes at the highest quality first; for JPEG steps down until the blob fits `maxBytes`.
 * `encode` receives the JPEG quality (undefined for PNG).
 */
export async function encodeWithinLimit(
  encode: (quality: number | undefined) => Promise<Blob>,
  format: ExportFormat,
  maxBytes?: number,
  steps: number[] = JPEG_QUALITY_STEPS
): Promise<EncodedExport> {
  if (format === 'png') {
    const blob = await encode(undefined);
    return { blob, quality: null, reduced: false, overLimit: !!maxBytes && blob.size > maxBytes };
  }

  let last: Blob | null = null;
  for (let i = 0; i < steps.length; i++) {
    const blob = await encode(steps[i]);
    last = blob;
    if (!maxBytes || blob.size <= maxBytes) {
      return { blob, quality: steps[i], reduced: i > 0, overLimit: false };
    }
  }
  return { blob: last as Blob, quality: steps[steps.length - 1], reduced: true, overLimit: true };
}

/** sRGB canvas → Blob */
export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Blob üretilemedi'))), mime, quality);
  });
}

/** Export tuvali: açıkça sRGB */
export function createExportCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context failed');
  return { canvas, ctx };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
