import { FilmPreset } from "../types";
import { applyFilmPreset } from "./film-presets";

const previewCache = new Map<string, Record<string, string>>();

/**
 * Generates miniature live real-time previews of an image for a list of presets.
 * Downscales to 96x64 px for blazing fast performance (<10ms).
 */
export async function generatePresetPreviews(
  sourceUrl: string,
  presets: FilmPreset[]
): Promise<Record<string, string>> {
  if (previewCache.has(sourceUrl)) {
    return previewCache.get(sourceUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const thumbW = 96;
        const thumbH = Math.max(48, Math.round(thumbW / (img.naturalWidth / img.naturalHeight || 1)));

        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = thumbW;
        baseCanvas.height = thumbH;
        const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });

        if (!baseCtx) {
          resolve({});
          return;
        }

        baseCtx.drawImage(img, 0, 0, thumbW, thumbH);
        const originalData = baseCtx.getImageData(0, 0, thumbW, thumbH);

        const results: Record<string, string> = {};

        // Helper canvas for export
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = thumbW;
        exportCanvas.height = thumbH;
        const exportCtx = exportCanvas.getContext("2d");

        if (!exportCtx) {
          resolve({});
          return;
        }

        for (const preset of presets) {
          // Clone image data
          const clonedData = new ImageData(
            new Uint8ClampedArray(originalData.data),
            thumbW,
            thumbH
          );

          // Apply film preset LUT
          const filteredData = applyFilmPreset(clonedData, preset, 100);
          exportCtx.putImageData(filteredData, 0, 0);
          results[preset.id] = exportCanvas.toDataURL("image/jpeg", 0.75);
        }

        previewCache.set(sourceUrl, results);
        resolve(results);
      } catch (err) {
        console.warn("Could not generate preset previews:", err);
        resolve({});
      }
    };

    img.onerror = () => {
      resolve({});
    };

    img.src = sourceUrl;
  });
}
