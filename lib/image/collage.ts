import { StoryCollageLayout, CollageSlot } from "../types";

export const STORY_COLLAGE_LAYOUTS: StoryCollageLayout[] = [
  // 2 Photos
  {
    id: "2-vertical-split",
    name: "2'li Üst / Alt Eşit",
    photoCount: 2,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.5 },
      { x: 0, y: 0.5, width: 1, height: 0.5 },
    ],
  },
  {
    id: "2-horizontal-split",
    name: "2'li Yan Yana Dikey",
    photoCount: 2,
    slots: [
      { x: 0, y: 0, width: 0.5, height: 1 },
      { x: 0.5, y: 0, width: 0.5, height: 1 },
    ],
  },
  {
    id: "2-hero-top",
    name: "2'li Büyük Üst / Mini Alt",
    photoCount: 2,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.65 },
      { x: 0, y: 0.65, width: 1, height: 0.35 },
    ],
  },

  // 3 Photos
  {
    id: "3-hero-top-2-bottom",
    name: "3'lü Büyük Üst + 2 Alt",
    photoCount: 3,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.55 },
      { x: 0, y: 0.55, width: 0.5, height: 0.45 },
      { x: 0.5, y: 0.55, width: 0.5, height: 0.45 },
    ],
  },
  {
    id: "3-2-top-hero-bottom",
    name: "3'lü 2 Üst + Büyük Alt",
    photoCount: 3,
    slots: [
      { x: 0, y: 0, width: 0.5, height: 0.45 },
      { x: 0.5, y: 0, width: 0.5, height: 0.45 },
      { x: 0, y: 0.45, width: 1, height: 0.55 },
    ],
  },
  {
    id: "3-horizontal-strips",
    name: "3'lü Üçlü Şerit",
    photoCount: 3,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.3333 },
      { x: 0, y: 0.3333, width: 1, height: 0.3333 },
      { x: 0, y: 0.6666, width: 1, height: 0.3334 },
    ],
  },

  // 4 Photos
  {
    id: "4-grid-2x2",
    name: "4'lü 2×2 Izgara",
    photoCount: 4,
    slots: [
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { x: 0, y: 0.5, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ],
  },
  {
    id: "4-hero-top-3-bottom",
    name: "4'lü Büyük Üst + 3 Alt",
    photoCount: 4,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.58 },
      { x: 0, y: 0.58, width: 0.3333, height: 0.42 },
      { x: 0.3333, y: 0.58, width: 0.3333, height: 0.42 },
      { x: 0.6666, y: 0.58, width: 0.3334, height: 0.42 },
    ],
  },
  {
    id: "4-hero-left-3-right",
    name: "4'lü Sol Büyük + Sağ 3'lü",
    photoCount: 4,
    slots: [
      { x: 0, y: 0, width: 0.6, height: 1 },
      { x: 0.6, y: 0, width: 0.4, height: 0.3333 },
      { x: 0.6, y: 0.3333, width: 0.4, height: 0.3333 },
      { x: 0.6, y: 0.6666, width: 0.4, height: 0.3334 },
    ],
  },

  // 5 Photos
  {
    id: "5-2top-3bottom",
    name: "5'li 2 Üst + 3 Alt",
    photoCount: 5,
    slots: [
      { x: 0, y: 0, width: 0.5, height: 0.48 },
      { x: 0.5, y: 0, width: 0.5, height: 0.48 },
      { x: 0, y: 0.48, width: 0.3333, height: 0.52 },
      { x: 0.3333, y: 0.48, width: 0.3333, height: 0.52 },
      { x: 0.6666, y: 0.48, width: 0.3334, height: 0.52 },
    ],
  },
  {
    id: "5-hero-top-4grid",
    name: "5'li Büyük Üst + 4 Izgara",
    photoCount: 5,
    slots: [
      { x: 0, y: 0, width: 1, height: 0.5 },
      { x: 0, y: 0.5, width: 0.5, height: 0.25 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.25 },
      { x: 0, y: 0.75, width: 0.5, height: 0.25 },
      { x: 0.5, y: 0.75, width: 0.5, height: 0.25 },
    ],
  },
  {
    id: "5-3top-2bottom",
    name: "5'li 3 Üst + 2 Alt",
    photoCount: 5,
    slots: [
      { x: 0, y: 0, width: 0.3333, height: 0.48 },
      { x: 0.3333, y: 0, width: 0.3333, height: 0.48 },
      { x: 0.6666, y: 0.48, width: 0.3334, height: 0.48 },
      { x: 0, y: 0.48, width: 0.5, height: 0.52 },
      { x: 0.5, y: 0.48, width: 0.5, height: 0.52 },
    ],
  },

  // 6 Photos
  {
    id: "6-grid-2x3",
    name: "6'lı 2×3 Dikey Izgara",
    photoCount: 6,
    slots: [
      { x: 0, y: 0, width: 0.5, height: 0.3333 },
      { x: 0.5, y: 0, width: 0.5, height: 0.3333 },
      { x: 0, y: 0.3333, width: 0.5, height: 0.3333 },
      { x: 0.5, y: 0.3333, width: 0.5, height: 0.3333 },
      { x: 0, y: 0.6666, width: 0.5, height: 0.3334 },
      { x: 0.5, y: 0.6666, width: 0.5, height: 0.3334 },
    ],
  },
  {
    id: "6-grid-3x2",
    name: "6'lı 3×2 Yatay Izgara",
    photoCount: 6,
    slots: [
      { x: 0, y: 0, width: 0.3333, height: 0.5 },
      { x: 0.3333, y: 0, width: 0.3333, height: 0.5 },
      { x: 0.6666, y: 0, width: 0.3334, height: 0.5 },
      { x: 0, y: 0.5, width: 0.3333, height: 0.5 },
      { x: 0.3333, y: 0.5, width: 0.3333, height: 0.5 },
      { x: 0.6666, y: 0.5, width: 0.3334, height: 0.5 },
    ],
  },
];

export interface CollageRenderOptions {
  canvasWidth?: number; // default 1080
  canvasHeight?: number; // default 1920 (9:16)
  outerPadding: number; // in px at 1080 baseline (e.g. 16)
  innerGap: number; // in px at 1080 baseline (e.g. 12)
  borderRadius: number; // in px (e.g. 16)
  backgroundColor: string; // e.g. '#000000', '#ffffff', '#18181b', '#f4ede4'
}

/**
 * Renders the story collage to a 1080x1920 canvas with per-cell pan and zoom
 */
export async function renderStoryCollage(
  slots: CollageSlot[],
  loadedImages: Map<string, HTMLImageElement>,
  options: CollageRenderOptions
): Promise<Blob> {
  const {
    canvasWidth = 1080,
    canvasHeight = 1920,
    outerPadding = 20,
    innerGap = 14,
    borderRadius = 16,
    backgroundColor = "#000000",
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  // Background fill
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Available content area
  const contentX = outerPadding;
  const contentY = outerPadding;
  const contentW = canvasWidth - outerPadding * 2;
  const contentH = canvasHeight - outerPadding * 2;

  for (const slot of slots) {
    if (!slot.dataUrl) continue;
    const imgObj = loadedImages.get(slot.id);
    if (!imgObj) continue;

    // Slot bounding box in canvas coordinates
    const slotX = contentX + slot.rect.x * contentW + (slot.rect.x > 0 ? innerGap / 2 : 0);
    const slotY = contentY + slot.rect.y * contentH + (slot.rect.y > 0 ? innerGap / 2 : 0);
    const slotW = slot.rect.width * contentW - (slot.rect.x > 0 || slot.rect.x + slot.rect.width < 1 ? innerGap / 2 : 0);
    const slotH = slot.rect.height * contentH - (slot.rect.y > 0 || slot.rect.y + slot.rect.height < 1 ? innerGap / 2 : 0);

    ctx.save();

    // Clip to rounded rectangle
    ctx.beginPath();
    if (borderRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(slotX, slotY, slotW, slotH, borderRadius);
    } else {
      ctx.rect(slotX, slotY, slotW, slotH);
    }
    ctx.clip();

    // Calculate image fitting with per-cell zoom and pan
    const imgRatio = imgObj.naturalWidth / imgObj.naturalHeight;
    const slotRatio = slotW / slotH;

    let baseDrawW: number;
    let baseDrawH: number;

    if (imgRatio > slotRatio) {
      // Image is wider than slot: fill height
      baseDrawH = slotH;
      baseDrawW = slotH * imgRatio;
    } else {
      // Image is taller than slot: fill width
      baseDrawW = slotW;
      baseDrawH = slotW / imgRatio;
    }

    // Apply zoom
    const zoom = Math.max(1, slot.zoom || 1);
    const drawW = baseDrawW * zoom;
    const drawH = baseDrawH * zoom;

    // Center + pan offset
    const drawX = slotX + (slotW - drawW) / 2 + (slot.panX || 0);
    const drawY = slotY + (slotH - drawH) / 2 + (slot.panY || 0);

    ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Collage blob conversion failed"));
      },
      "image/jpeg",
      0.95
    );
  });
}
