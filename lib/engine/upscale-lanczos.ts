/**
 * Curate Engine — Mathematical Lanczos-3 Upscaling Core
 * Implements high-fidelity separable 2-pass Lanczos-3 convolution
 * L(x) = sinc(x) * sinc(x/3) for -3 < x < 3; 0 elsewhere.
 */

const PI = Math.PI;

/**
 * Upscale güvenli sınırı (spec §4.5, VARSAYIM, telefonda ölçülmedi):
 * çıktının uzun kenarı en çok 8192 px VE toplam alanı en çok 16 MP (16.000.000 piksel).
 * Biri aşılırsa çarpan arayüzde kapatılır (mobil canvas belleği).
 */
export const UPSCALE_MAX_LONG_EDGE = 8192;
export const UPSCALE_MAX_PIXELS = 16_000_000;

export function upscaleFactorAllowed(width: number, height: number, factor: number): boolean {
  const outW = Math.round(width * factor);
  const outH = Math.round(height * factor);
  return Math.max(outW, outH) <= UPSCALE_MAX_LONG_EDGE && outW * outH <= UPSCALE_MAX_PIXELS;
}

function sinc(x: number): number {
  if (x === 0) return 1;
  const pix = PI * x;
  return Math.sin(pix) / pix;
}

function lanczos3(x: number): number {
  const absX = Math.abs(x);
  if (absX >= 3) return 0;
  return sinc(absX) * sinc(absX / 3);
}

/**
 * Resizes an ImageData using 2-pass separable Lanczos-3 resampling
 * @param src Source ImageData
 * @param scaleFactor 2 or 4
 */
export function upscaleLanczos3(src: ImageData, scaleFactor: 2 | 4): ImageData {
  const srcW = src.width;
  const srcH = src.height;
  const dstW = Math.round(srcW * scaleFactor);
  const dstH = Math.round(srcH * scaleFactor);

  const srcData = src.data;

  // Pass 1: Horizontal Resampling (srcW x srcH -> dstW x srcH)
  const tempBuf = new Float32Array(dstW * srcH * 4);
  const ratioX = srcW / dstW;
  const filterRadius = 3;

  for (let x = 0; x < dstW; x++) {
    const srcCenterX = (x + 0.5) * ratioX - 0.5;
    const startX = Math.max(0, Math.floor(srcCenterX - filterRadius));
    const endX = Math.min(srcW - 1, Math.ceil(srcCenterX + filterRadius));

    // Precalculate weights
    let weightSum = 0;
    const weights: number[] = [];
    for (let sx = startX; sx <= endX; sx++) {
      const w = lanczos3(srcCenterX - sx);
      weights.push(w);
      weightSum += w;
    }

    // Normalize weights
    const norm = weightSum !== 0 ? 1 / weightSum : 1;

    for (let y = 0; y < srcH; y++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let i = 0; i < weights.length; i++) {
        const sx = startX + i;
        const w = weights[i] * norm;
        const srcIdx = (y * srcW + sx) * 4;

        r += srcData[srcIdx] * w;
        g += srcData[srcIdx + 1] * w;
        b += srcData[srcIdx + 2] * w;
        a += srcData[srcIdx + 3] * w;
      }

      const dstIdx = (y * dstW + x) * 4;
      tempBuf[dstIdx] = r;
      tempBuf[dstIdx + 1] = g;
      tempBuf[dstIdx + 2] = b;
      tempBuf[dstIdx + 3] = a;
    }
  }

  // Pass 2: Vertical Resampling (dstW x srcH -> dstW x dstH)
  const outBuffer = new Uint8ClampedArray(dstW * dstH * 4);
  let resultImageData: ImageData;

  if (typeof ImageData !== 'undefined') {
    resultImageData = new ImageData(outBuffer, dstW, dstH);
  } else if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(dstW, dstH);
    const ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D;
    resultImageData = ctx.createImageData(dstW, dstH);
  } else if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    resultImageData = ctx.createImageData(dstW, dstH);
  } else {
    resultImageData = {
      width: dstW,
      height: dstH,
      data: outBuffer,
      colorSpace: 'srgb',
    } as ImageData;
  }

  const outData = resultImageData.data;

  const ratioY = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcCenterY = (y + 0.5) * ratioY - 0.5;
    const startY = Math.max(0, Math.floor(srcCenterY - filterRadius));
    const endY = Math.min(srcH - 1, Math.ceil(srcCenterY + filterRadius));

    let weightSum = 0;
    const weights: number[] = [];
    for (let sy = startY; sy <= endY; sy++) {
      const w = lanczos3(srcCenterY - sy);
      weights.push(w);
      weightSum += w;
    }

    const norm = weightSum !== 0 ? 1 / weightSum : 1;

    for (let x = 0; x < dstW; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let i = 0; i < weights.length; i++) {
        const sy = startY + i;
        const w = weights[i] * norm;
        const tmpIdx = (sy * dstW + x) * 4;

        r += tempBuf[tmpIdx] * w;
        g += tempBuf[tmpIdx + 1] * w;
        b += tempBuf[tmpIdx + 2] * w;
        a += tempBuf[tmpIdx + 3] * w;
      }

      const outIdx = (y * dstW + x) * 4;
      outData[outIdx] = Math.min(255, Math.max(0, Math.round(r)));
      outData[outIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      outData[outIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      outData[outIdx + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }

  return resultImageData;
}
