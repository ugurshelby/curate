import { BorderState } from "../types";

export function getDefaultBorderState(): BorderState {
  return {
    enabled: false,
    type: "matte",
    color: "#ffffff",
    widthPercent: 6, // 6% of short edge
    radius: 0, // sharp by default, adjustable up to 30
  };
}

/**
 * Calculates border margins based on canvas dimensions and border settings
 */
export function calculateBorderInsets(
  width: number,
  height: number,
  border: BorderState
): { top: number; bottom: number; left: number; right: number } {
  if (!border.enabled) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const baseDim = Math.min(width, height);
  const baseMargin = Math.round((baseDim * border.widthPercent) / 100);

  if (border.type === "polaroid") {
    // Classic instant film proportions: equal top and sides, ~3.2x bottom chin
    const topMargin = Math.max(16, baseMargin);
    const sideMargin = Math.max(16, baseMargin);
    const bottomMargin = Math.max(48, Math.round(baseMargin * 3.2));
    return {
      top: topMargin,
      bottom: bottomMargin,
      left: sideMargin,
      right: sideMargin,
    };
  }

  // Uniform gallery matte
  return {
    top: baseMargin,
    bottom: baseMargin,
    left: baseMargin,
    right: baseMargin,
  };
}

/**
 * Renders an image with optional border & rounded corner clipping onto a canvas
 */
export function applyBorderToCanvas(
  sourceCanvas: HTMLCanvasElement,
  border: BorderState
): HTMLCanvasElement {
  if (!border.enabled || border.widthPercent <= 0) {
    return sourceCanvas;
  }

  const insets = calculateBorderInsets(sourceCanvas.width, sourceCanvas.height, border);
  const totalW = sourceCanvas.width + insets.left + insets.right;
  const totalH = sourceCanvas.height + insets.top + insets.bottom;

  const destCanvas = document.createElement("canvas");
  destCanvas.width = totalW;
  destCanvas.height = totalH;
  const ctx = destCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  // 1. Fill background with border color
  ctx.fillStyle = border.color || "#ffffff";
  ctx.fillRect(0, 0, totalW, totalH);

  // 2. Draw inner image with optional rounded corners
  const innerX = insets.left;
  const innerY = insets.top;
  const innerW = sourceCanvas.width;
  const innerH = sourceCanvas.height;

  // Scale corner radius proportional to image scale
  const scale = Math.min(totalW, totalH) / 1080;
  const radius = Math.max(0, Math.round(border.radius * scale));

  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(innerX, innerY, innerW, innerH, radius);
    } else {
      // Fallback
      ctx.rect(innerX, innerY, innerW, innerH);
    }
    ctx.clip();
  }

  ctx.drawImage(sourceCanvas, innerX, innerY, innerW, innerH);
  ctx.restore();

  return destCanvas;
}
