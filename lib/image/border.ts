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
 * Samples perimeter pixels of an image canvas to extract harmonious edge colors
 */
export function extractEdgeGradientColors(
  sourceCanvas: HTMLCanvasElement
): [string, string] {
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return ["#18181b", "#09090b"];

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const step = Math.max(1, Math.floor(w / 40));

  // Top edge sample
  let topR = 0, topG = 0, topB = 0, topCount = 0;
  // Bottom edge sample
  let botR = 0, botG = 0, botB = 0, botCount = 0;

  try {
    const topData = ctx.getImageData(0, 0, w, Math.min(6, h)).data;
    for (let x = 0; x < w; x += step) {
      const idx = x * 4;
      topR += topData[idx];
      topG += topData[idx + 1];
      topB += topData[idx + 2];
      topCount++;
    }

    const botY = Math.max(0, h - 6);
    const botData = ctx.getImageData(0, botY, w, Math.min(6, h - botY)).data;
    for (let x = 0; x < w; x += step) {
      const idx = x * 4;
      botR += botData[idx];
      botG += botData[idx + 1];
      botB += botData[idx + 2];
      botCount++;
    }
  } catch (err) {
    return ["#27272a", "#09090b"];
  }

  const avgTopR = Math.round(topR / Math.max(1, topCount));
  const avgTopG = Math.round(topG / Math.max(1, topCount));
  const avgTopB = Math.round(topB / Math.max(1, topCount));

  const avgBotR = Math.round(botR / Math.max(1, botCount));
  const avgBotG = Math.round(botG / Math.max(1, botCount));
  const avgBotB = Math.round(botB / Math.max(1, botCount));

  const topHex = `#${((1 << 24) + (avgTopR << 16) + (avgTopG << 8) + avgTopB).toString(16).slice(1)}`;
  const botHex = `#${((1 << 24) + (avgBotR << 16) + (avgBotG << 8) + avgBotB).toString(16).slice(1)}`;

  return [topHex, botHex];
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

  // Uniform gallery matte & smart gradient
  return {
    top: baseMargin,
    bottom: baseMargin,
    left: baseMargin,
    right: baseMargin,
  };
}

/**
 * Renders an image with optional border, polaroid chin, or edge-adaptive gradient
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

  // 1. Fill background (Solid, Polaroid, or Smart Ambient Gradient)
  if (border.type === "smart-gradient") {
    const [startCol, endCol] = border.gradientColors || extractEdgeGradientColors(sourceCanvas);

    // Diagonal linear ambient gradient matching the edges
    const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
    grad.addColorStop(0, startCol);
    grad.addColorStop(1, endCol);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, totalW, totalH);

    // Ambient edge glow / blurred underlay
    ctx.save();
    ctx.filter = `blur(${Math.max(12, Math.round(insets.left * 0.8))}px)`;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(sourceCanvas, 0, 0, totalW, totalH);
    ctx.restore();
  } else {
    // Solid matte or polaroid color
    ctx.fillStyle = border.color || "#ffffff";
    ctx.fillRect(0, 0, totalW, totalH);
  }

  // 2. Draw inner image with optional rounded corners
  const innerX = insets.left;
  const innerY = insets.top;
  const innerW = sourceCanvas.width;
  const innerH = sourceCanvas.height;

  // Scale corner radius proportional to image scale
  const scale = Math.min(totalW, totalH) / 1080;
  const radius = Math.max(0, Math.round(border.radius * scale));

  ctx.save();

  // Subtle soft ambient drop shadow for depth if smart gradient
  if (border.type === "smart-gradient") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = Math.max(10, Math.round(18 * scale));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(4, Math.round(8 * scale));
  }

  if (radius > 0) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(innerX, innerY, innerW, innerH, radius);
    } else {
      ctx.rect(innerX, innerY, innerW, innerH);
    }
    ctx.clip();
  }

  ctx.drawImage(sourceCanvas, innerX, innerY, innerW, innerH);
  ctx.restore();

  return destCanvas;
}
