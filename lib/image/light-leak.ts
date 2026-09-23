import { LightLeakType } from "../types";

/**
 * Draws vintage 35mm light leak onto a canvas context
 */
export function drawLightLeak(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: LightLeakType,
  amount: number
) {
  if (amount <= 0) return;

  const alpha = (amount / 100) * 0.75; // subtle to expressive
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  if (type === "warm-side") {
    // Rich orange/amber leak from the right edge
    const grad = ctx.createRadialGradient(
      width,
      height * 0.45,
      10,
      width * 0.8,
      height * 0.5,
      width * 0.65
    );
    grad.addColorStop(0, `rgba(255, 120, 30, ${alpha * 0.95})`);
    grad.addColorStop(0.35, `rgba(255, 60, 20, ${alpha * 0.7})`);
    grad.addColorStop(0.65, `rgba(210, 30, 90, ${alpha * 0.35})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Extra secondary soft glow from top right
    const topGlow = ctx.createRadialGradient(
      width * 0.9,
      0,
      5,
      width * 0.85,
      0,
      width * 0.4
    );
    topGlow.addColorStop(0, `rgba(255, 200, 80, ${alpha * 0.6})`);
    topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "corner-flare") {
    // Vintage corner flare from top-left
    const grad = ctx.createRadialGradient(
      0,
      0,
      20,
      0,
      0,
      Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, `rgba(255, 235, 170, ${alpha})`);
    grad.addColorStop(0.25, `rgba(255, 140, 50, ${alpha * 0.8})`);
    grad.addColorStop(0.55, `rgba(240, 50, 80, ${alpha * 0.4})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "streak") {
    // Film transport streak across the frame
    const grad = ctx.createLinearGradient(0, height * 0.3, width, height * 0.6);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.35, `rgba(255, 90, 40, ${alpha * 0.5})`);
    grad.addColorStop(0.5, `rgba(255, 180, 80, ${alpha * 0.85})`);
    grad.addColorStop(0.65, `rgba(255, 70, 70, ${alpha * 0.5})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Subtle bottom-left warm ambient leak
    const grad = ctx.createRadialGradient(
      0,
      height,
      10,
      width * 0.2,
      height * 0.8,
      width * 0.6
    );
    grad.addColorStop(0, `rgba(255, 150, 60, ${alpha * 0.7})`);
    grad.addColorStop(0.5, `rgba(240, 80, 110, ${alpha * 0.35})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Draws vintage lens optical vignette onto a canvas context
 */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const alpha = Math.min(0.92, (amount / 100) * 0.88);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.sqrt(centerX * centerX + centerY * centerY);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  const grad = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.35,
    centerX,
    centerY,
    radius
  );
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.55, "rgba(240, 240, 240, 1)");
  grad.addColorStop(0.85, `rgba(80, 80, 80, ${1 - alpha * 0.5})`);
  grad.addColorStop(1, `rgba(0, 0, 0, ${1 - alpha})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}
