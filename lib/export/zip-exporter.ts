import JSZip from "jszip";
import { CurateImage, ExportPreset, ExportProgress } from "../types";
import { renderProcessedImage, getCropDimensions } from "../image/renderer";
import { resampleLanczos3 } from "../image/lanczos";

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "ig-retina",
    name: "Instagram Post (Retina 4:5)",
    description: "2160 × 2700 px — Lanczos-3 keskinleştirilmiş dikey post",
    targetWidth: 2160,
    targetHeight: 2700,
    aspectRatio: "4:5",
    useLanczos: true,
  },
  {
    id: "ig-story",
    name: "Instagram / TikTok Story (9:16)",
    description: "1080 × 1920 px — Dikey hikaye ve Reels formatı",
    targetWidth: 1080,
    targetHeight: 1920,
    aspectRatio: "9:16",
    useLanczos: true,
  },
  {
    id: "square-hd",
    name: "Square HD (1:1)",
    description: "1080 × 1080 px — Klasik kare kompozisyon",
    targetWidth: 1080,
    targetHeight: 1080,
    aspectRatio: "1:1",
    useLanczos: true,
  },
  {
    id: "native-hq",
    name: "Ultra HD Archive (Original)",
    description: "Görselin tam çözünürlüğü (EXIF'siz, kayıpsız JPEG)",
    aspectRatio: "original",
    useLanczos: false,
  },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function imageDataToBlob(imageData: ImageData, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas context failed"));
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Blob creation failed"));
      },
      "image/jpeg",
      quality
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Renders and exports a single CurateImage to Blob
 */
export async function exportSingleImage(
  item: CurateImage,
  refItem: CurateImage | null,
  preset: ExportPreset
): Promise<Blob> {
  const imgObj = await loadImage(item.dataUrl);
  const refObj = refItem ? await loadImage(refItem.dataUrl) : null;

  // Determine output dimensions
  let targetW = preset.targetWidth;
  let targetH = preset.targetHeight;

  if (!targetW || !targetH) {
    const baseCrop = getCropDimensions(imgObj.naturalWidth, imgObj.naturalHeight, item.crop.aspectRatio);
    targetW = Math.round(baseCrop.width);
    targetH = Math.round(baseCrop.height);
  }

  // 1. Render all filters and adjustments
  // For Lanczos upscale, we can render at native crop size first, then upscale with Lanczos
  let renderedData: ImageData;

  if (preset.useLanczos && (targetW > imgObj.naturalWidth || targetH > imgObj.naturalHeight)) {
    // Render at base crop resolution
    const baseCrop = getCropDimensions(imgObj.naturalWidth, imgObj.naturalHeight, item.crop.aspectRatio);
    const intermediateData = await renderProcessedImage(
      imgObj,
      item,
      refObj,
      Math.round(baseCrop.width),
      Math.round(baseCrop.height)
    );
    // Lanczos-3 Resample
    renderedData = resampleLanczos3(intermediateData, targetW, targetH);
  } else {
    renderedData = await renderProcessedImage(
      imgObj,
      item,
      refObj,
      targetW,
      targetH
    );
  }

  // 2. Convert to JPEG blob (automatically sanitizes EXIF/GPS)
  return await imageDataToBlob(renderedData, 0.95);
}

/**
 * Exports all images in collection to a zip archive: dump_YYYY-MM-DD.zip
 */
export async function exportDumpZip(
  items: CurateImage[],
  preset: ExportPreset,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder("curate_dump") || zip;

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress({
        isExporting: true,
        current: i + 1,
        total,
        phase: `İşleniyor (${i + 1}/${total}): ${item.name}`,
      });
    }

    // Find reference image if applicable
    const refItem = item.filters.referenceImageId
      ? items.find((x) => x.id === item.filters.referenceImageId) || null
      : null;

    const blob = await exportSingleImage(item, refItem, preset);

    // Formatted filename: 01_imgname.jpg
    const padIndex = String(i + 1).padStart(2, "0");
    const cleanName = item.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${padIndex}_${cleanName}.jpg`;

    folder.file(filename, blob);
  }

  if (onProgress) {
    onProgress({
      isExporting: true,
      current: total,
      total,
      phase: "ZIP arşivi sıkıştırılıyor...",
    });
  }

  return await zip.generateAsync({ type: "blob" }, (metadata) => {
    if (onProgress) {
      onProgress({
        isExporting: true,
        current: total,
        total,
        phase: `Arşiv oluşturuluyor: %${Math.round(metadata.percent)}`,
      });
    }
  });
}
