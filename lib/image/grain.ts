/**
 * Organic Luminance-Aware Film Grain
 * Mathematical noise weighted by mid-tone luminance bell curve:
 * Weight(Y) = 4 * Y * (1 - Y)
 */

export function applyProceduralGrain(
  imageData: ImageData,
  amount: number, // 0 - 100
  size: number = 1 // 1 - 4
): ImageData {
  if (amount <= 0) return imageData;

  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  const data = output.data;

  // Normalized intensity
  const intensity = (amount / 100) * 55; // Max deviation +/- 55 px values
  // Scale grain size proportionally to output resolution
  const scale = width / 900;
  const effectiveGrainSize = Math.max(1, Math.min(8, Math.round(size * (scale > 1.2 ? scale * 0.8 : 1))));

  if (effectiveGrainSize <= 1) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminance Y in [0, 1]
      const Y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Organic weight curve: peaks at 0.5, fades at 0 and 1
      const weight = 4.0 * Y * (1.0 - Y);

      // Random noise in [-1, 1]
      const noise = Math.random() * 2 - 1;
      const delta = noise * weight * intensity;

      data[i] = Math.min(255, Math.max(0, r + delta));
      data[i + 1] = Math.min(255, Math.max(0, g + delta));
      data[i + 2] = Math.min(255, Math.max(0, b + delta));
    }
  } else {
    // Grain clumping for effectiveGrainSize > 1
    const gridW = Math.ceil(width / effectiveGrainSize);
    const gridH = Math.ceil(height / effectiveGrainSize);
    const noiseMap = new Float32Array(gridW * gridH);

    for (let n = 0; n < noiseMap.length; n++) {
      noiseMap[n] = Math.random() * 2 - 1;
    }

    for (let y = 0; y < height; y++) {
      const gy = Math.floor(y / effectiveGrainSize);
      const rowOffset = y * width;
      const noiseRowOffset = gy * gridW;

      for (let x = 0; x < width; x++) {
        const gx = Math.floor(x / effectiveGrainSize);
        const noise = noiseMap[noiseRowOffset + gx];

        const idx = (rowOffset + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const Y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const weight = 4.0 * Y * (1.0 - Y);
        const delta = noise * weight * intensity;

        data[idx] = Math.min(255, Math.max(0, r + delta));
        data[idx + 1] = Math.min(255, Math.max(0, g + delta));
        data[idx + 2] = Math.min(255, Math.max(0, b + delta));
      }
    }
  }

  return output;
}
