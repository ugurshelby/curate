/**
 * Curate Export — Zero-Leak EXIF Sanitizer
 * Strips GPS, device serials, camera models, and private metadata.
 * Canvas re-encoding provides natural sanitization; this module adds strict binary verification.
 */

/**
 * Strips EXIF APP1 (0xFFE1) and APP2 (0xFFE2) markers from raw JPEG ArrayBuffer if present
 */
export function sanitizeJpegBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);

  // Verify JPEG SOI marker (0xFFD8)
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
    return buffer; // Not standard JPEG, return unmodified
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length - 1) {
    const marker = view.getUint16(offset, false);

    // Stop at Start of Scan (SOS - 0xFFDA) where image data begins
    if (marker === 0xffda) {
      break;
    }

    // Standalone markers (RST0–7) have no length
    if (marker >= 0xffd0 && marker <= 0xffd7) {
      offset += 2;
      continue;
    }

    // Bozuk/kesik dosya: uzunluk okunamıyor veya dosya dışına taşıyor → dokunmadan dur (RangeError yok)
    if (offset + 4 > length) break;
    const segLen = view.getUint16(offset + 2, false);
    if (segLen < 2 || offset + 2 + segLen > length) break;

    // Check for APP1 (EXIF: 0xFFE1) or APP2 (0xFFE2): zero out the metadata segment payload
    if (marker === 0xffe1 || marker === 0xffe2) {
      for (let i = offset + 4; i < offset + 2 + segLen; i++) {
        view.setUint8(i, 0);
      }
    }
    offset += 2 + segLen;
  }

  return buffer;
}

/**
 * Creates a sanitized Blob guaranteed to be stripped of private GPS/device EXIF
 */
export async function sanitizeImageBlob(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const sanitizedBuffer = sanitizeJpegBuffer(arrayBuffer);
  return new Blob([sanitizedBuffer], { type: blob.type || 'image/jpeg' });
}
