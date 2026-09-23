import JSZip from "jszip";
import { CurateImage, ExportPreset, ExportProgress } from "../types";
import { renderProcessedImage, getCropDimensions } from "../image/renderer";
import { resampleLanczos3 } from "../image/lanczos";

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "2x-lanczos",
    name: "2x Retina Upscale (Lanczos-3)",
    description: "Doğal çözünürlüğü 2 katına çıkarır (Lanczos-3 sinc konvolüsyonu)",
    scaleMultiplier: 2,
    aspectRatio: "original",
    useLanczos: true,
  },
  {
    id: "4x-lanczos",
    name: "4x Ultra HD Upscale (Lanczos-3)",
    description: "Doğal çözünürlüğü 4 katına çıkarır (4K baskı ve arşiv standardı)",
    scaleMultiplier: 4,
    aspectRatio: "original",
    useLanczos: true,
  },
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
    name: "Doğal Çözünürlük (1x)",
    description: "Görselin tam kırpma çözünürlüğü (EXIF'siz, kayıpsız JPEG)",
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
 * Renders and exports a single CurateImage to Blob with optional Lanczos-3 Resampling
 */
export async function exportSingleImage(
  item: CurateImage,
  refItem: CurateImage | null,
  preset: ExportPreset
): Promise<Blob> {
  const imgObj = await loadImage(item.dataUrl);
  const refObj = refItem ? await loadImage(refItem.dataUrl) : null;

  const baseCrop = getCropDimensions(imgObj.naturalWidth, imgObj.naturalHeight, item.crop.aspectRatio);

  let targetW = preset.targetWidth;
  let targetH = preset.targetHeight;

  if (preset.scaleMultiplier) {
    targetW = Math.round(baseCrop.width * preset.scaleMultiplier);
    targetH = Math.round(baseCrop.height * preset.scaleMultiplier);
  } else if (!targetW || !targetH) {
    targetW = Math.round(baseCrop.width);
    targetH = Math.round(baseCrop.height);
  }

  let renderedData: ImageData;

  if (preset.useLanczos && (targetW !== Math.round(baseCrop.width) || targetH !== Math.round(baseCrop.height))) {
    // 1. Render at native crop resolution with all analog filters
    const intermediateData = await renderProcessedImage(
      imgObj,
      item,
      refObj,
      Math.round(baseCrop.width),
      Math.round(baseCrop.height)
    );
    // 2. Lanczos-3 Separable Convolution Resample
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

  // 3. Convert to JPEG blob (automatically strips EXIF/GPS metadata)
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
        phase: `İşleniyor & Lanczos-3 (${i + 1}/${total}): ${item.name}`,
      });
    }

    const refItem = item.filters.referenceImageId
      ? items.find((x) => x.id === item.filters.referenceImageId) || null
      : null;

    const blob = await exportSingleImage(item, refItem, preset);

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
