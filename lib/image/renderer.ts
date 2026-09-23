import { CurateImage } from "../types";
import { computeLabStats, applyReinhardTransfer } from "./reinhard-transfer";
import { applyProceduralGrain } from "./grain";
import { applyHalation } from "./halation";
import { applyBorderToCanvas } from "./border";
import { drawDateTimestamp } from "./timestamp";
import { FILM_PRESETS, applyFilmPreset } from "./film-presets";
import { drawVignette, drawLightLeak } from "./light-leak";

/**
 * Non-destructive layered render chain (always from original pixels):
 *   Original raw → Crop/Zoom/Pan → LUT/Color transfer → Analog (grain/halation/vignette/leak) → Frame/stamp
 *
 * Changing crop after frame/stamp re-runs the FULL chain from the original —
 * effects are never baked into an intermediate bitmap that survives crop edits.
 */

// Cache for reference image Lab statistics
const statsCache = new Map<string, ReturnType<typeof computeLabStats>>();

export function getOrComputeStats(img: HTMLImageElement, id: string) {
  if (statsCache.has(id)) return statsCache.get(id)!;

  const canvas = document.createElement("canvas");
  // Downscale for stat calculation
  const sampleW = Math.min(600, img.naturalWidth);
  const sampleH = Math.round(sampleW * (img.naturalHeight / img.naturalWidth));
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
  const stats = computeLabStats(imageData);
  statsCache.set(id, stats);
  return stats;
}

export function clearStatsCache(id?: string) {
  if (id) {
    statsCache.delete(id);
  } else {
    statsCache.clear();
  }
}

/**
 * Calculates target crop bounding box in source image pixels
 */
export function getCropDimensions(
  imgWidth: number,
  imgHeight: number,
  aspectRatio: string
): { width: number; height: number } {
  let targetRatio = imgWidth / imgHeight;

  if (aspectRatio === "4:5") {
    targetRatio = 4 / 5;
  } else if (aspectRatio === "9:16") {
    targetRatio = 9 / 16;
  } else if (aspectRatio === "1:1") {
    targetRatio = 1 / 1;
  }

  let cropW = imgWidth;
  let cropH = imgHeight;

  if (imgWidth / imgHeight > targetRatio) {
    // Source is wider than target ratio: crop horizontally
    cropW = Math.round(imgHeight * targetRatio);
    cropH = imgHeight;
  } else {
    // Source is taller than target ratio: crop vertically
    cropW = imgWidth;
    cropH = Math.round(imgWidth / targetRatio);
  }

  return { width: cropW, height: cropH };
}

/**
 * Renders an image with all transformations from the original:
 * Crop/Zoom/Pan → 35mm Film LUT → Reinhard → Halation → Grain → Vignette → Light Leak → Border → Timestamp
 *
 * @param targetWidth/Height — proxy (~1080p) for live preview, or full crop / export size for Download.
 * Grain + halation scale by resolution so proxy and full-res stay visually consistent.
 */
export async function renderProcessedImage(
  imageObj: HTMLImageElement,
  item: CurateImage,
  refImageObj: HTMLImageElement | null,
  targetWidth?: number,
  targetHeight?: number
): Promise<ImageData> {
  const { crop, filters } = item;
  const origW = imageObj.naturalWidth;
  const origH = imageObj.naturalHeight;

  const baseCrop = getCropDimensions(origW, origH, crop.aspectRatio);

  // Apply zoom to crop window (zooming in shrinks the crop area in source space)
  const zoomedCropW = baseCrop.width / crop.zoom;
  const zoomedCropH = baseCrop.height / crop.zoom;

  // Center + pan offset
  const centerX = origW / 2 + crop.panX;
  const centerY = origH / 2 + crop.panY;

  // Source rectangle coordinates
  let srcX = centerX - zoomedCropW / 2;
  let srcY = centerY - zoomedCropH / 2;

  // Boundary clamp
  srcX = Math.max(0, Math.min(origW - zoomedCropW, srcX));
  srcY = Math.max(0, Math.min(origH - zoomedCropH, srcY));

  // Destination size
  const outW = targetWidth || Math.round(zoomedCropW);
  const outH = targetHeight || Math.round(zoomedCropH);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed");

  // Draw cropped and scaled image onto canvas (from ORIGINAL pixels every time)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imageObj,
    srcX,
    srcY,
    zoomedCropW,
    zoomedCropH,
    0,
    0,
    outW,
    outH
  );

  let currentData = ctx.getImageData(0, 0, outW, outH);

  // 1. 35mm Analog Film LUT Preset
  if (filters.activePresetId) {
    const preset = FILM_PRESETS.find((p) => p.id === filters.activePresetId);
    if (preset) {
      currentData = applyFilmPreset(
        currentData,
        preset,
        filters.presetAmount !== undefined ? filters.presetAmount : 100
      );
    }
  }

  // 2. Reinhard Color Transfer
  if (
    filters.reinhardEnabled &&
    filters.reinhardStrength > 0 &&
    filters.referenceImageId &&
    refImageObj
  ) {
    const sourceStats = computeLabStats(currentData);
    const refStats = getOrComputeStats(refImageObj, filters.referenceImageId);
    currentData = applyReinhardTransfer(
      currentData,
      sourceStats,
      refStats,
      filters.reinhardStrength / 100
    );
  }

  // 3. Halation (apply before grain for organic diffusion)
  if (filters.halationEnabled) {
    const amount =
      filters.halationAmount !== undefined ? filters.halationAmount : 12;
    currentData = applyHalation(
      currentData,
      filters.halationRadius,
      filters.halationTemp,
      filters.halationThreshold,
      amount
    );
  }

  // 4. Luminance-aware organic film grain
  if (filters.grainEnabled && filters.grainAmount > 0) {
    currentData = applyProceduralGrain(
      currentData,
      filters.grainAmount,
      filters.grainSize
    );
  }

  // Put filtered image back onto canvas for optical 2D passes
  ctx.putImageData(currentData, 0, 0);

  // 5. Vintage Lens Vignette (soft falloff)
  if (filters.vignetteEnabled && filters.vignetteAmount > 0) {
    drawVignette(ctx, outW, outH, filters.vignetteAmount);
  }

  // 6. 35mm Light Leak
  if (filters.lightLeakEnabled && filters.lightLeakAmount > 0) {
    drawLightLeak(ctx, outW, outH, filters.lightLeakType || "warm-side", filters.lightLeakAmount);
  }

  // 7. Matte, Polaroid, or Smart Ambient Gradient Border
  let finalCanvas = canvas;
  if (item.border && item.border.enabled) {
    finalCanvas = applyBorderToCanvas(canvas, item.border);
  }

  // 8. 90s Film Timestamp (drawn after border or onto canvas)
  const finalCtx = finalCanvas.getContext("2d", { willReadFrequently: true });
  if (finalCtx && item.timestamp && item.timestamp.enabled) {
    drawDateTimestamp(finalCtx, finalCanvas.width, finalCanvas.height, item.timestamp);
  }

  if (!finalCtx) return currentData;
  return finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
}
