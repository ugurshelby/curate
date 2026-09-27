/**
 * Curate Export — JSZip Packager & Batch Exporter
 * Formats images into sequenced zero-waste archives (dump_01.jpg, dump_02.jpg).
 */

import JSZip from 'jszip';
import { ExportProgress } from '../core/types';
import { sanitizeImageBlob } from './exif-sanitizer';

export interface ExportableItem {
  id: string;
  name?: string;
  blob: Blob;
  order: number;
}

/**
 * Packages a list of image blobs into a clean sequenced zip file
 */
export async function packageDumpZip(
  items: ExportableItem[],
  prefix: string = 'dump',
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const zip = new JSZip();
  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  const total = sortedItems.length;

  for (let i = 0; i < total; i++) {
    const item = sortedItems[i];
    const indexStr = String(i + 1).padStart(2, '0');
    const fileName = `${prefix}_${indexStr}.jpg`;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        itemPercentage: Math.round(((i + 1) / total) * 100),
        status: `Paketleniyor: ${fileName}`,
      });
    }

    // Sanitize metadata before archiving
    const cleanBlob = await sanitizeImageBlob(item.blob);
    zip.file(fileName, cleanBlob);
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      itemPercentage: 100,
      status: 'ZIP arşivi sıkıştırılıyor...',
    });
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress({
          current: total,
          total,
          itemPercentage: Math.round(metadata.percent),
          status: `Arşivleniyor (%${Math.round(metadata.percent)})`,
        });
      }
    }
  );

  return zipBlob;
}

/**
 * Triggers native browser download for a generated blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
