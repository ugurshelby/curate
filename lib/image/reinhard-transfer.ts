import { rgbToLab, labToRgb } from "./color-space";

interface ImageLabStats {
  meanL: number;
  meanA: number;
  meanB: number;
  stdL: number;
  stdA: number;
  stdB: number;
}

/**
 * Calculates mean and standard deviation of L*, a*, b* channels.
 * Uses stepped sampling for high-resolution images to maintain 60fps performance.
 */
export function computeLabStats(imageData: ImageData): ImageLabStats {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  // Sample up to ~25,000 pixels for fast, robust statistics
  const step = Math.max(1, Math.floor(totalPixels / 25000)) * 4;

  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [L, a, bVal] = rgbToLab(r, g, b);
    sumL += L;
    sumA += a;
    sumB += bVal;
    count++;
  }

  const meanL = sumL / count;
  const meanA = sumA / count;
  const meanB = sumB / count;

  let varL = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [L, a, bVal] = rgbToLab(r, g, b);
    varL += (L - meanL) * (L - meanL);
    varA += (a - meanA) * (a - meanA);
    varB += (bVal - meanB) * (bVal - meanB);
  }

  const stdL = Math.sqrt(varL / count) || 1e-4;
  const stdA = Math.sqrt(varA / count) || 1e-4;
  const stdB = Math.sqrt(varB / count) || 1e-4;

  return { meanL, meanA, meanB, stdL, stdA, stdB };
}

/**
 * Applies Reinhard Color Transfer from reference stats to source image.
 * strength: 0 (no effect) to 1.0 (full match)
 */
export function applyReinhardTransfer(
  sourceData: ImageData,
  sourceStats: ImageLabStats,
  refStats: ImageLabStats,
  strength: number
): ImageData {
  if (strength <= 0) return sourceData;

  const width = sourceData.width;
  const height = sourceData.height;
  const output = new ImageData(new Uint8ClampedArray(sourceData.data), width, height);
  const data = output.data;

  const scaleL = refStats.stdL / sourceStats.stdL;
  const scaleA = refStats.stdA / sourceStats.stdA;
  const scaleB = refStats.stdB / sourceStats.stdB;

  const t = Math.min(1, Math.max(0, strength));
  const oneMinusT = 1 - t;

  for (let i = 0; i < data.length; i += 4) {
    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];

    const [L, a, bVal] = rgbToLab(origR, origG, origB);

    // Reinhard scaling
    const targetL = (L - sourceStats.meanL) * scaleL + refStats.meanL;
    const targetA = (a - sourceStats.meanA) * scaleA + refStats.meanA;
    const targetB = (bVal - sourceStats.meanB) * scaleB + refStats.meanB;

    // Clamp L to reasonable range [0, 100]
    const clampedL = Math.max(0, Math.min(100, targetL));

    const [transR, transG, transB] = labToRgb(clampedL, targetA, targetB);

    // Linear interpolation (lerp) with original
    data[i] = Math.round(origR * oneMinusT + transR * t);
    data[i + 1] = Math.round(origG * oneMinusT + transG * t);
    data[i + 2] = Math.round(origB * oneMinusT + transB * t);
  }

  return output;
}
