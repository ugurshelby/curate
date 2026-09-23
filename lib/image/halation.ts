/**
 * Analog Halation (Işık Haresi & Sıcak Yayılma)
 * Simulates red/orange anti-halation layer diffusion in photographic film.
 * 1. Extract highlights (Y > threshold).
 * 2. Color highlights with warm red/amber tint depending on temperature.
 * 3. Box/Gaussian blur diffusion scaled proportionally to image resolution.
 * 4. Screen blend back onto base image.
 */

export function applyHalation(
  imageData: ImageData,
  radius: number = 10,
  temperature: number = 50, // 0 = warm amber, 100 = deep red
  threshold: number = 0.82
): ImageData {
  if (radius <= 0) return imageData;

  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;

  // 1. Create highlight map buffer (R, G, B channels of warm glow)
  const glow = new Float32Array(width * height * 3);

  // Temperature color multiplier
  // temp 0 -> amber (1.0, 0.65, 0.15)
  // temp 100 -> deep red (1.0, 0.12, 0.05)
  const t = Math.max(0, Math.min(100, temperature)) / 100;
  const tintR = 1.0;
  const tintG = 0.65 * (1 - t) + 0.12 * t;
  const tintB = 0.15 * (1 - t) + 0.05 * t;

  for (let i = 0, p = 0; i < src.length; i += 4, p += 3) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];

    const Y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (Y > threshold) {
      // Soft ramp above threshold
      const factor = (Y - threshold) / (1 - threshold);
      glow[p] = r * tintR * factor;
      glow[p + 1] = g * tintG * factor;
      glow[p + 2] = b * tintB * factor;
    }
  }

  // 2. Scale blur radius relative to image width (baseline: 800px)
  // Ensures identical visual spread in both preview and high-res retina export
  const scaleFactor = Math.max(0.5, width / 800);
  const blurR = Math.max(1, Math.min(60, Math.round(radius * scaleFactor)));
  const tempBuf = new Float32Array(width * height * 3);

  // Horizontal blur pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 3;
    for (let x = 0; x < width; x++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      const xMin = Math.max(0, x - blurR);
      const xMax = Math.min(width - 1, x + blurR);

      for (let kx = xMin; kx <= xMax; kx++) {
        const idx = rowOffset + kx * 3;
        sumR += glow[idx];
        sumG += glow[idx + 1];
        sumB += glow[idx + 2];
        count++;
      }

      const outIdx = rowOffset + x * 3;
      tempBuf[outIdx] = sumR / count;
      tempBuf[outIdx + 1] = sumG / count;
      tempBuf[outIdx + 2] = sumB / count;
    }
  }

  // Vertical blur pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      const yMin = Math.max(0, y - blurR);
      const yMax = Math.min(height - 1, y + blurR);

      for (let ky = yMin; ky <= yMax; ky++) {
        const idx = (ky * width + x) * 3;
        sumR += tempBuf[idx];
        sumG += tempBuf[idx + 1];
        sumB += tempBuf[idx + 2];
        count++;
      }

      const outIdx = (y * width + x) * 3;
      glow[outIdx] = sumR / count;
      glow[outIdx + 1] = sumG / count;
      glow[outIdx + 2] = sumB / count;
    }
  }

  // 3. Screen Blend back onto original image:
  // Screen(A, B) = A + B - (A * B) / 255
  const output = new ImageData(new Uint8ClampedArray(src), width, height);
  const outData = output.data;

  for (let i = 0, p = 0; i < outData.length; i += 4, p += 3) {
    const baseR = src[i];
    const baseG = src[i + 1];
    const baseB = src[i + 2];

    const addR = glow[p];
    const addG = glow[p + 1];
    const addB = glow[p + 2];

    outData[i] = Math.min(255, Math.round(baseR + addR - (baseR * addR) / 255));
    outData[i + 1] = Math.min(255, Math.round(baseG + addG - (baseG * addG) / 255));
    outData[i + 2] = Math.min(255, Math.round(baseB + addB - (baseB * addB) / 255));
  }

  return output;
}
