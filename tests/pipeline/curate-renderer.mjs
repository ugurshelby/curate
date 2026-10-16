import sharp from 'sharp';
import path from 'path';

/**
 * Curate Native Rendering Engine (Node.js Port)
 * `lib/engine/ai-plan.ts`'in saf matematiksel piksel motorunu çalıştırır.
 * Giriş: Orijinal görsel + AI Light Plan
 * Çıktı: Kalibre edilmiş, yüksek kaliteli "Sonrası" (After) görseli.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const srgbToLin = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const linToSrgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const BUMP = 4 / 27;

function planTone(x, a) {
  let y = x;
  const ev = a.exposure ?? 0;
  if (ev !== 0) {
    const lin = srgbToLin(y);
    const g = Math.pow(2, ev);
    y = linToSrgb(g > 1 ? 1 - Math.pow(1 - lin, g) : lin * g);
  }
  const sh = a.shadows ?? 0;
  if (sh !== 0) y += (sh * 0.25 * y * (1 - y) * (1 - y)) / BUMP;
  const hl = a.highlights ?? 0;
  if (hl !== 0) y += (hl * 0.25 * y * y * (1 - y)) / BUMP;
  const c = a.contrast ?? 0;
  if (c !== 0) y = y - (c * Math.sin(2 * Math.PI * y)) / (2 * Math.PI);
  return clamp(y, 0, 1);
}

const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function shapeWeight(shape, u, v) {
  if (shape.type === 'linear') {
    const dx = shape.x1 - shape.x0;
    const dy = shape.y1 - shape.y0;
    const t = ((u - shape.x0) * dx + (v - shape.y0) * dy) / (dx * dx + dy * dy || 1e-9);
    return 1 - smooth(0, 1, t);
  }
  if (shape.type === 'radial') {
    const du = (u - shape.cx) / shape.rx;
    const dv = (v - shape.cy) / shape.ry;
    const d = Math.sqrt(du * du + dv * dv);
    const f = shape.feather || 0.2;
    return 1 - smooth(1 - f, 1 + f, d);
  }
  return 0.5;
}

function skinFactor(r, g, b) {
  if (!(r > g && g > b)) return 1;
  const mx = r;
  const mn = b;
  const s = mx > 0 ? (mx - mn) / mx : 0;
  const hue = (60 * (g - b)) / (mx - mn || 1);
  return hue < 50 && s > 0.15 && s < 0.7 ? 0.5 : 1;
}

const MASK_GRID = 4;

/**
 * Raw RGB buffer üzerinde AI Planını uygular
 */
export async function renderAiPlan(inputFilePath, outputFilePath, plan, strength = 1.0) {
  const started = Date.now();

  // Görseli işleme için uygun boyutta raw RGB olarak oku (max 1280px)
  const image = sharp(inputFilePath).rotate(); // EXIF orientation saygılı
  const meta = await image.metadata();

  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(meta.width, meta.height));
  const targetW = Math.round(meta.width * scale);
  const targetH = Math.round(meta.height * scale);

  const { data, info } = await image
    .resize(targetW, targetH)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;

  // Global adım
  const steps = [];
  const addStep = (adjust, shape = null) => {
    if (!adjust || Object.keys(adjust).length === 0) return;
    const lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = planTone(i / 255, adjust) * 255;
    }
    const t = (adjust.temperature ?? 0) * strength;
    const m = (adjust.tint ?? 0) * strength;
    steps.push({
      lut,
      gr: 1 + 0.4 * t,
      gg: 1 - 0.4 * m,
      gb: 1 - 0.4 * t,
      sat: (adjust.saturation ?? 0) * strength,
      vib: (adjust.vibrance ?? 0) * strength,
      shape,
    });
  };

  if (plan.global) {
    addStep(plan.global, null);
  }

  if (Array.isArray(plan.regions)) {
    for (const r of plan.regions) {
      if (r.adjust && r.shape) {
        addStep(r.adjust, r.shape);
      }
    }
  }

  // Izgara maskeleri
  const G = MASK_GRID;
  const gw = Math.ceil(W / G) + 1;
  const gh = Math.ceil(H / G) + 1;

  const grids = steps.map((st) => {
    if (!st.shape) return null;
    const grid = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const v = (gy * G + 0.5) / H;
      for (let gx = 0; gx < gw; gx++) {
        const u = (gx * G + 0.5) / W;
        grid[gy * gw + gx] = shapeWeight(st.shape, u, v);
      }
    }
    return grid;
  });

  const n = steps.length;

  for (let y = 0; y < H; y++) {
    const fy = y / G;
    const gy0 = fy | 0;
    const ty = fy - gy0;
    const row0 = gy0 * gw;
    const row1 = Math.min(gh - 1, gy0 + 1) * gw;

    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const sk = skinFactor(r, g, b);

      const fx = x / G;
      const gx0 = fx | 0;
      const tx = fx - gx0;
      const gx1 = Math.min(gw - 1, gx0 + 1);

      for (let si = 0; si < n; si++) {
        const st = steps[si];
        const grid = grids[si];
        let w = 1.0;

        if (grid) {
          const a0 = grid[row0 + gx0];
          const a1 = grid[row0 + gx1];
          const b0 = grid[row1 + gx0];
          const b1 = grid[row1 + gx1];
          if (a0 + a1 + b0 + b1 < 0.002) continue;
          w = (a0 + (a1 - a0) * tx) * (1 - ty) + (b0 + (b1 - b0) * tx) * ty;
          if (w < 0.002) continue;
        }

        const ri = clamp(r | 0, 0, 255);
        const gi = clamp(g | 0, 0, 255);
        const bi = clamp(b | 0, 0, 255);

        let nr = st.lut[ri] * (1 + (st.gr - 1) * sk);
        let ng = st.lut[gi] * (1 + (st.gg - 1) * sk);
        let nb = st.lut[bi] * (1 + (st.gb - 1) * sk);

        if (st.sat !== 0 || st.vib !== 0) {
          const L = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
          const mx = Math.max(nr, ng, nb);
          const mn = Math.min(nr, ng, nb);
          const cur = mx > 0 ? (mx - mn) / mx : 0;
          const f = 1 + st.sat + st.vib * (1 - cur) * (sk < 1 ? 0.4 : 1);
          nr = L + (nr - L) * f;
          ng = L + (ng - L) * f;
          nb = L + (nb - L) * f;
        }

        r += (nr - r) * w;
        g += (ng - g) * w;
        b += (nb - b) * w;
      }

      data[i] = clamp(Math.round(r), 0, 255);
      data[i + 1] = clamp(Math.round(g), 0, 255);
      data[i + 2] = clamp(Math.round(b), 0, 255);
    }
  }

  // Sharp ile JPEG olarak kaydet
  await sharp(data, {
    raw: {
      width: W,
      height: H,
      channels: 3,
    },
  })
    .jpeg({ quality: 90 })
    .toFile(outputFilePath);

  const durationMs = Date.now() - started;

  return {
    outputFilePath,
    width: W,
    height: H,
    renderDurationMs: durationMs,
  };
}

/**
 * Orijinal görselin optimize bir önizleme kopyasını kaydeder (HTML Raporu için)
 */
export async function createReferencePreview(inputFilePath, outputFilePath) {
  const maxEdge = 1280;
  await sharp(inputFilePath)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toFile(outputFilePath);

  return outputFilePath;
}
