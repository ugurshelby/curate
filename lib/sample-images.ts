export interface SampleImageDef {
  name: string;
  url: string;
}

export const SAMPLE_IMAGES: SampleImageDef[] = [
  {
    name: "01_editorial_portrait.jpg",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "02_tokyo_night_neon.jpg",
    url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "03_minimal_architecture.jpg",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "04_analog_coastal_drive.jpg",
    url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=85",
  },
];

/**
 * Generates high-fidelity offline sample photographic canvases
 * in case external network requests are restricted or offline.
 */
export function generateOfflineSample(index: number): { name: string; dataUrl: string; width: number; height: number } {
  const width = 1200;
  const height = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  if (index === 0) {
    // Warm Kodak Gold Editorial Portrait simulation
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#2c1810");
    grad.addColorStop(0.35, "#824936");
    grad.addColorStop(0.7, "#d49b78");
    grad.addColorStop(1, "#f3ceb4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm radial glow
    const radial = ctx.createRadialGradient(width * 0.45, height * 0.4, 50, width * 0.45, height * 0.4, 600);
    radial.addColorStop(0, "rgba(255, 235, 200, 0.45)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    return { name: "kodak_gold_portrait.jpg", dataUrl: canvas.toDataURL("image/jpeg", 0.95), width, height };
  } else if (index === 1) {
    // Tokyo Neon Night simulation (High contrast for Halation testing)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#050508");
    grad.addColorStop(0.6, "#0f111a");
    grad.addColorStop(1, "#1a0b1e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon signs / bright lights
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(width * 0.3, height * 0.35, 12, 140);
    ctx.fillStyle = "#ff2a5f";
    ctx.shadowColor = "#ff2a5f";
    ctx.shadowBlur = 30;
    ctx.fillRect(width * 0.5, height * 0.4, 80, 20);

    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 40;
    ctx.fillRect(width * 0.45, height * 0.6, 120, 25);
    ctx.shadowBlur = 0;

    return { name: "tokyo_neon_night.jpg", dataUrl: canvas.toDataURL("image/jpeg", 0.95), width, height };
  } else if (index === 2) {
    // Architectural minimal concrete & sky
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#1f242e");
    grad.addColorStop(0.45, "#4d5b6e");
    grad.addColorStop(0.5, "#d4d8de");
    grad.addColorStop(1, "#8e96a2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Hard architectural diagonal shadow
    ctx.fillStyle = "rgba(10, 12, 16, 0.75)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.3);
    ctx.lineTo(width, height * 0.85);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    return { name: "brutalist_architecture.jpg", dataUrl: canvas.toDataURL("image/jpeg", 0.95), width, height };
  } else {
    // Coastal Horizon / Golden hour
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#19283c");
    grad.addColorStop(0.4, "#48627e");
    grad.addColorStop(0.65, "#d48d61");
    grad.addColorStop(0.85, "#ebbb8a");
    grad.addColorStop(1, "#1d3244");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Golden sun glow
    const sunGrad = ctx.createRadialGradient(width * 0.5, height * 0.65, 10, width * 0.5, height * 0.65, 300);
    sunGrad.addColorStop(0, "rgba(255, 248, 220, 0.9)");
    sunGrad.addColorStop(0.4, "rgba(255, 160, 90, 0.4)");
    sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, height);

    return { name: "coastal_golden_hour.jpg", dataUrl: canvas.toDataURL("image/jpeg", 0.95), width, height };
  }
}
