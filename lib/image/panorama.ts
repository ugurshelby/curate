import { PanoramaSlice } from "../types";
import JSZip from "jszip";

export interface PanoramaSplitOptions {
  sliceCount: 2 | 3 | 4;
  aspectRatio?: "4:5" | "1:1"; // default 4:5
  verticalPanPercent: number; // 0 (top) - 100 (bottom), default 50 (center)
  targetSlideWidth?: number; // default 1080
}

/**
 * Splits an image into N seamless 4:5 or 1:1 Instagram carousel slides
 */
export async function splitPanoramaImage(
  imageObj: HTMLImageElement,
  options: PanoramaSplitOptions
): Promise<PanoramaSlice[]> {
  const { sliceCount, aspectRatio = "4:5", verticalPanPercent = 50, targetSlideWidth = 1080 } = options;
  const slideHeight = aspectRatio === "1:1" ? targetSlideWidth : Math.round(targetSlideWidth * 1.25);

  const totalTargetWidth = targetSlideWidth * sliceCount;
  const targetRatio = totalTargetWidth / slideHeight;

  const origW = imageObj.naturalWidth;
  const origH = imageObj.naturalHeight;
  const origRatio = origW / origH;

  let cropW = origW;
  let cropH = origH;
  let cropX = 0;
  let cropY = 0;

  if (origRatio > targetRatio) {
    // Image is wider than needed: crop horizontal excess
    cropH = origH;
    cropW = Math.round(origH * targetRatio);
    cropX = Math.round((origW - cropW) / 2);
    cropY = 0;
  } else {
    // Image is taller than needed: crop vertical excess using verticalPanPercent
    cropW = origW;
    cropH = Math.round(origW / targetRatio);
    cropX = 0;
    const maxOffsetY = Math.max(0, origH - cropH);
    cropY = Math.round((maxOffsetY * verticalPanPercent) / 100);
  }

  // Draw the cropped full panorama onto an offscreen canvas
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = totalTargetWidth;
  fullCanvas.height = slideHeight;
  const fullCtx = fullCanvas.getContext("2d");
  if (!fullCtx) throw new Error("Canvas 2D context error");

  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = "high";
  fullCtx.drawImage(
    imageObj,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    totalTargetWidth,
    slideHeight
  );

  // Now slice into N vertical 4:5 segments
  const slices: PanoramaSlice[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = targetSlideWidth;
    sliceCanvas.height = slideHeight;
    const sliceCtx = sliceCanvas.getContext("2d");
    if (!sliceCtx) continue;

    sliceCtx.imageSmoothingEnabled = true;
    sliceCtx.imageSmoothingQuality = "high";

    // Copy segment from fullCanvas
    const srcX = i * targetSlideWidth;
    sliceCtx.drawImage(
      fullCanvas,
      srcX,
      0,
      targetSlideWidth,
      slideHeight,
      0,
      0,
      targetSlideWidth,
      slideHeight
    );

    const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const blob = await new Promise<Blob>((resolve, reject) => {
      sliceCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
        "image/jpeg",
        0.95
      );
    });

    const num = String(i + 1).padStart(2, "0");
    const filename = `${num}_panorama_part${i + 1}.jpg`;

    slices.push({
      index: i + 1,
      dataUrl,
      blob,
      filename,
      width: targetSlideWidth,
      height: slideHeight,
    });
  }

  return slices;
}

/**
 * Creates a zip archive of all panorama slices
 */
export async function createPanoramaZip(slices: PanoramaSlice[]): Promise<Blob> {
  const zip = new JSZip();
  slices.forEach((slice) => {
    zip.file(slice.filename, slice.blob);
  });
  return await zip.generateAsync({ type: "blob" });
}
