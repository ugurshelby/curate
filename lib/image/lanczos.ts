/**
 * Lanczos-3 Resampling Engine
 * Sharp, high-fidelity interpolation for high-resolution retina exports.
 * Kernel: L(x) = sinc(x) * sinc(x/3) for -3 < x < 3, else 0
 */

function sinc(x: number): number {
  if (x === 0) return 1.0;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

function lanczos3Kernel(x: number): number {
  const absX = Math.abs(x);
  if (absX >= 3.0) return 0.0;
  return sinc(absX) * sinc(absX / 3.0);
}

/**
 * Resamples source ImageData to target dimensions using 2-pass separable Lanczos-3
 */
export function resampleLanczos3(
  source: ImageData,
  destWidth: number,
  destHeight: number
): ImageData {
  const srcWidth = source.width;
  const srcHeight = source.height;
  const srcData = source.data;

  // If dimensions match, return clone
  if (srcWidth === destWidth && srcHeight === destHeight) {
    return new ImageData(new Uint8ClampedArray(srcData), destWidth, destHeight);
  }

  // Intermediate buffer: destWidth x srcHeight (RGBA float)
  const intermediate = new Float32Array(destWidth * srcHeight * 4);
  const scaleX = destWidth / srcWidth;
  const filterRadiusX = scaleX < 1 ? 3 / scaleX : 3;

  // Pass 1: Horizontal resampling
  for (let y = 0; y < srcHeight; y++) {
    const srcRowOffset = y * srcWidth * 4;
    const interRowOffset = y * destWidth * 4;

    for (let dx = 0; dx < destWidth; dx++) {
      // Map destination coordinate to source coordinate
      const centerSrcX = (dx + 0.5) / scaleX - 0.5;
      const startX = Math.max(0, Math.floor(centerSrcX - filterRadiusX));
      const endX = Math.min(srcWidth - 1, Math.ceil(centerSrcX + filterRadiusX));

      let weightSum = 0;
      let r = 0, g = 0, b = 0, a = 0;

      for (let sx = startX; sx <= endX; sx++) {
        const dist = (sx - centerSrcX) * (scaleX < 1 ? scaleX : 1);
        const weight = lanczos3Kernel(dist);
        if (weight !== 0) {
          weightSum += weight;
          const sIdx = srcRowOffset + sx * 4;
          r += srcData[sIdx] * weight;
          g += srcData[sIdx + 1] * weight;
          b += srcData[sIdx + 2] * weight;
          a += srcData[sIdx + 3] * weight;
        }
      }

      const outIdx = interRowOffset + dx * 4;
      if (weightSum > 0) {
        intermediate[outIdx] = r / weightSum;
        intermediate[outIdx + 1] = g / weightSum;
        intermediate[outIdx + 2] = b / weightSum;
        intermediate[outIdx + 3] = a / weightSum;
      }
    }
  }

  // Pass 2: Vertical resampling
  const output = new ImageData(destWidth, destHeight);
  const outData = output.data;
  const scaleY = destHeight / srcHeight;
  const filterRadiusY = scaleY < 1 ? 3 / scaleY : 3;

  for (let dy = 0; dy < destHeight; dy++) {
    const centerSrcY = (dy + 0.5) / scaleY - 0.5;
    const startY = Math.max(0, Math.floor(centerSrcY - filterRadiusY));
    const endY = Math.min(srcHeight - 1, Math.ceil(centerSrcY + filterRadiusY));
    const outRowOffset = dy * destWidth * 4;

    for (let dx = 0; dx < destWidth; dx++) {
      let weightSum = 0;
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = startY; sy <= endY; sy++) {
        const dist = (sy - centerSrcY) * (scaleY < 1 ? scaleY : 1);
        const weight = lanczos3Kernel(dist);
        if (weight !== 0) {
          weightSum += weight;
          const sIdx = (sy * destWidth + dx) * 4;
          r += intermediate[sIdx] * weight;
          g += intermediate[sIdx + 1] * weight;
          b += intermediate[sIdx + 2] * weight;
          a += intermediate[sIdx + 3] * weight;
        }
      }

      const outIdx = outRowOffset + dx * 4;
      if (weightSum > 0) {
        outData[outIdx] = Math.min(255, Math.max(0, Math.round(r / weightSum)));
        outData[outIdx + 1] = Math.min(255, Math.max(0, Math.round(g / weightSum)));
        outData[outIdx + 2] = Math.min(255, Math.max(0, Math.round(b / weightSum)));
        outData[outIdx + 3] = Math.min(255, Math.max(0, Math.round(a / weightSum)));
      } else {
        outData[outIdx + 3] = 255;
      }
    }
  }

  return output;
}
