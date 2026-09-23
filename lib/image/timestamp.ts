import { TimestampState } from "../types";

/**
 * Returns formatted date string according to local date and format
 */
export function getFormattedTodayDate(format: TimestampState["format"] = "YY MM DD"): string {
  const now = new Date();
  const fullYear = now.getFullYear();
  const shortYear = `'${String(fullYear).slice(-2)}`;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  switch (format) {
    case "YY MM DD":
      return `${shortYear} ${month} ${day}`;
    case "DD MM YY":
      return `${day} ${month} ${shortYear}`;
    case "YYYY.MM.DD":
      return `${fullYear}.${month}.${day}`;
    default:
      return `${shortYear} ${month} ${day}`;
  }
}

export function getDefaultTimestampState(): TimestampState {
  return {
    enabled: false,
    dateText: getFormattedTodayDate("YY MM DD"),
    color: "#ff8c00", // warm amber orange LED
    position: "bottom-right",
    format: "YY MM DD",
  };
}

/**
 * Draws an authentic 90s film camera quartz date imprint onto a CanvasRenderingContext2D
 */
export function drawDateTimestamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: TimestampState
) {
  if (!timestamp.enabled || !timestamp.dateText) return;

  ctx.save();

  // Baseline scale relative to 1080px dimension
  const baseDim = Math.min(width, height);
  const fontSize = Math.max(16, Math.round(baseDim * 0.038));
  const paddingX = Math.round(width * 0.045);
  const paddingY = Math.round(height * 0.045);

  ctx.font = `700 ${fontSize}px "SF Mono", "Courier New", "Menlo", monospace`;
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(timestamp.dateText);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  let x = width - paddingX - textWidth;
  let y = height - paddingY;

  switch (timestamp.position) {
    case "bottom-right":
      x = width - paddingX - textWidth;
      y = height - paddingY;
      break;
    case "bottom-left":
      x = paddingX;
      y = height - paddingY;
      break;
    case "top-right":
      x = width - paddingX - textWidth;
      y = paddingY + textHeight / 2;
      break;
    case "top-left":
      x = paddingX;
      y = paddingY + textHeight / 2;
      break;
  }

  // Draw authentic LED glow
  const glowColor = timestamp.color || "#ff8c00";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.45));

  // Multi-pass draw for retro blooming intensity
  ctx.fillStyle = glowColor;
  ctx.globalAlpha = 0.95;
  ctx.fillText(timestamp.dateText, x, y);

  // Core hot-spot highlight for incandescent/LED filament look
  ctx.shadowBlur = Math.max(1, Math.round(fontSize * 0.15));
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.35;
  ctx.fillText(timestamp.dateText, x, y);

  ctx.restore();
}
