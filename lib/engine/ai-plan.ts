/**
 * AI Preset — "Işık ve Renk Planı" (owner decision D28, design docs/reports/2026-10-08-ai-preset-ozeti.md).
 * The model returns a JSON plan only; Curate validates, clamps and applies it locally. No generated pixels.
 * Shared by the server (validation before answering) and the browser (validation again + rendering).
 * Coordinates are 0–1 on the ORIGINAL photo (before crop/rotate), so the plan survives crop changes.
 */

import type { EditCrop } from '../core/types';
import { calculateAspectCrop } from '../export/platform-specs';
import { cropGeometry } from './edit-geometry';

export const PLAN_VERSION = 1;
export const PLAN_MAX_REGIONS = 6;
export const PLAN_MAX_POINTS = 12;

export const SCENE_TYPES = ['portrait', 'landscape', 'street', 'night', 'interior', 'food', 'architecture', 'other'] as const;
export const SCENE_LIGHTS = ['golden', 'blue_hour', 'midday', 'overcast', 'night', 'mixed', 'indoor'] as const;
export const SCENE_ISSUES = ['underexposed_subject', 'bright_sky', 'color_cast', 'haze', 'flat'] as const;
export const REGION_LABELS = ['sky', 'subject', 'skin', 'background', 'foreground', 'highlight'] as const;
export const ADJUST_KEYS = ['exposure', 'contrast', 'saturation', 'vibrance', 'temperature', 'tint', 'shadows', 'highlights'] as const;

export type AdjustKey = (typeof ADJUST_KEYS)[number];
export type PlanAdjust = Partial<Record<AdjustKey, number>>;
export type RegionLabel = (typeof REGION_LABELS)[number];

export type PlanShape =
  | { type: 'linear'; x0: number; y0: number; x1: number; y1: number; feather: number }
  | { type: 'radial'; cx: number; cy: number; rx: number; ry: number; feather: number }
  | { type: 'polygon'; points: [number, number][]; feather: number };

export interface PlanRegion {
  label: RegionLabel;
  shape: PlanShape;
  adjust: PlanAdjust;
}

export interface AiLightPlan {
  version: 1;
  scene: {
    type: (typeof SCENE_TYPES)[number];
    light: (typeof SCENE_LIGHTS)[number];
    issues: (typeof SCENE_ISSUES)[number][];
  };
  global: PlanAdjust;
  regions: PlanRegion[];
}

/** Clamp limits (design §4). Skin/subject colour shifts are tighter. */
export const ADJUST_LIMITS: Record<AdjustKey, number> = {
  exposure: 0.6,
  contrast: 0.3,
  saturation: 0.3,
  vibrance: 0.3,
  temperature: 0.25,
  tint: 0.25,
  shadows: 0.4,
  highlights: 0.4,
};
export const SKIN_COLOR_LIMIT = 0.08;
export const FEATHER_MIN = 0.02;
export const FEATHER_MAX = 0.6;

export type PlanValidation = { ok: true; plan: AiLightPlan; notes: string[] } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const unknownKeys = (o: Record<string, unknown>, allowed: readonly string[]) => Object.keys(o).filter((k) => !allowed.includes(k));

function readAdjust(raw: unknown, colorLimit?: number): PlanAdjust | string {
  if (raw === undefined) return {};
  if (!isObj(raw)) return 'adjust is not an object';
  const extra = unknownKeys(raw, ADJUST_KEYS);
  if (extra.length) return `unknown adjust field ${extra[0]}`;
  const out: PlanAdjust = {};
  for (const k of ADJUST_KEYS) {
    const v = raw[k];
    if (v === undefined || v === null) continue;
    if (!isNum(v)) return `adjust.${k} is not a number`;
    let lim = ADJUST_LIMITS[k];
    if (colorLimit !== undefined && (k === 'temperature' || k === 'tint')) lim = Math.min(lim, colorLimit);
    const c = clamp(v, -lim, lim);
    if (c !== 0) out[k] = c;
  }
  return out;
}

const SHAPE_KEYS = ['type', 'x0', 'y0', 'x1', 'y1', 'cx', 'cy', 'rx', 'ry', 'points', 'feather'] as const;

function readShape(raw: unknown): PlanShape | string {
  if (!isObj(raw)) return 'shape is not an object';
  const extra = unknownKeys(raw, SHAPE_KEYS);
  if (extra.length) return `unknown shape field ${extra[0]}`;
  const feather = clamp(isNum(raw.feather) ? raw.feather : 0.15, FEATHER_MIN, FEATHER_MAX);
  const unit = (v: unknown) => (isNum(v) ? clamp(v, 0, 1) : null);
  if (raw.type === 'linear') {
    const [x0, y0, x1, y1] = [unit(raw.x0), unit(raw.y0), unit(raw.x1), unit(raw.y1)];
    if (x0 === null || y0 === null || x1 === null || y1 === null) return 'linear needs x0,y0,x1,y1';
    if (Math.hypot(x1 - x0, y1 - y0) < 0.02) return 'linear gradient too short';
    return { type: 'linear', x0, y0, x1, y1, feather };
  }
  if (raw.type === 'radial') {
    const [cx, cy] = [unit(raw.cx), unit(raw.cy)];
    if (cx === null || cy === null || !isNum(raw.rx) || !isNum(raw.ry)) return 'radial needs cx,cy,rx,ry';
    return { type: 'radial', cx, cy, rx: clamp(raw.rx, 0.02, 1.5), ry: clamp(raw.ry, 0.02, 1.5), feather };
  }
  if (raw.type === 'polygon') {
    if (!Array.isArray(raw.points)) return 'polygon needs points';
    const points: [number, number][] = [];
    for (const p of raw.points.slice(0, PLAN_MAX_POINTS)) {
      if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1])) return 'polygon point is not [x, y]';
      points.push([clamp(p[0], 0, 1), clamp(p[1], 0, 1)]);
    }
    if (points.length < 3) return 'polygon needs 3 points';
    return { type: 'polygon', points, feather };
  }
  return 'unknown shape type';
}

/**
 * Validates and clamps an untrusted plan. Unknown fields, wrong types or another version reject the plan;
 * out-of-range numbers are clamped; extra regions/points are dropped. An added aesthetic vignette is not allowed
 * (AGENTS.md §4): global darkening offset by a large centred brightening is neutralised.
 */
export function validatePlan(raw: unknown): PlanValidation {
  if (!isObj(raw)) return { ok: false, reason: 'not an object' };
  const extra = unknownKeys(raw, ['version', 'scene', 'global', 'regions']);
  if (extra.length) return { ok: false, reason: `unknown field ${extra[0]}` };
  if (raw.version !== PLAN_VERSION) return { ok: false, reason: 'version' };
  const notes: string[] = [];

  const sc = isObj(raw.scene) ? raw.scene : {};
  if (raw.scene !== undefined && !isObj(raw.scene)) return { ok: false, reason: 'scene is not an object' };
  const sceneExtra = unknownKeys(sc, ['type', 'light', 'issues']);
  if (sceneExtra.length) return { ok: false, reason: `unknown scene field ${sceneExtra[0]}` };
  const scene: AiLightPlan['scene'] = {
    type: (SCENE_TYPES as readonly string[]).includes(sc.type as string) ? (sc.type as AiLightPlan['scene']['type']) : 'other',
    light: (SCENE_LIGHTS as readonly string[]).includes(sc.light as string) ? (sc.light as AiLightPlan['scene']['light']) : 'mixed',
    issues: Array.isArray(sc.issues)
      ? (sc.issues.filter((i) => (SCENE_ISSUES as readonly string[]).includes(i as string)) as AiLightPlan['scene']['issues'])
      : [],
  };

  const global = readAdjust(raw.global);
  if (typeof global === 'string') return { ok: false, reason: `global: ${global}` };

  if (raw.regions !== undefined && !Array.isArray(raw.regions)) return { ok: false, reason: 'regions is not a list' };
  const rawRegions = (raw.regions as unknown[] | undefined) ?? [];
  if (rawRegions.length > PLAN_MAX_REGIONS) notes.push(`regions dropped: ${rawRegions.length - PLAN_MAX_REGIONS}`);
  const regions: PlanRegion[] = [];
  for (const r of rawRegions.slice(0, PLAN_MAX_REGIONS)) {
    if (!isObj(r)) return { ok: false, reason: 'region is not an object' };
    const rExtra = unknownKeys(r, ['label', 'shape', 'adjust']);
    if (rExtra.length) return { ok: false, reason: `unknown region field ${rExtra[0]}` };
    if (!(REGION_LABELS as readonly string[]).includes(r.label as string)) return { ok: false, reason: 'region label' };
    const label = r.label as RegionLabel;
    const shape = readShape(r.shape);
    if (typeof shape === 'string') return { ok: false, reason: shape };
    const adjust = readAdjust(r.adjust, label === 'skin' || label === 'subject' ? SKIN_COLOR_LIMIT : undefined);
    if (typeof adjust === 'string') return { ok: false, reason: adjust };
    if (Object.keys(adjust).length) regions.push({ label, shape, adjust });
  }

  // No added vignette: overall darkening paired with a big centred brightening reads as a vignette
  const g = global.exposure ?? 0;
  if (g < -0.05) {
    const centred = regions.find(
      (r) =>
        r.shape.type === 'radial' &&
        Math.abs(r.shape.cx - 0.5) < 0.12 &&
        Math.abs(r.shape.cy - 0.5) < 0.12 &&
        r.shape.rx >= 0.3 &&
        r.shape.ry >= 0.3 &&
        (r.adjust.exposure ?? 0) >= -g * 0.6,
    );
    if (centred) {
      delete global.exposure;
      centred.adjust.exposure = Math.max(0, (centred.adjust.exposure ?? 0) + g);
      if (!centred.adjust.exposure) delete centred.adjust.exposure;
      notes.push('vignette pattern neutralised');
    }
  }

  const kept = regions.filter((r) => Object.keys(r.adjust).length > 0);
  return { ok: true, plan: { version: 1, scene, global, regions: kept }, notes };
}

// ---------------------------------------------------------------------------------------------
// Rendering

/** Maps output pixel centres to 0–1 coordinates on the original photo: u = a·x + b·y + c, v = d·x + e·y + f */
export interface PlanMapping {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface PlanGeometry {
  /** Düzenle crop; null → the source fills the target (cover), as in the crop-tab look preview */
  crop: EditCrop | null;
  srcW: number;
  srcH: number;
}

export function planMapping(geo: PlanGeometry, TW: number, TH: number): PlanMapping {
  const { srcW: w, srcH: h } = geo;
  if (!geo.crop) {
    const cc = calculateAspectCrop(w, h, TW, TH);
    return { a: cc.sw / TW / w, b: 0, c: cc.sx / w, d: 0, e: cc.sh / TH / h, f: cc.sy / h };
  }
  // Inverse of drawEditGeometry: out = C · F · S · R(θ) · T(−o) · R(rot) · p
  const crop = geo.crop;
  const g = cropGeometry(w, h, crop);
  const s = TW / g.cw;
  const fx = crop.flipH ? -1 : 1;
  const ct = Math.cos(-g.theta);
  const st = Math.sin(-g.theta);
  const rr = (-(crop.rotation * Math.PI) / 180);
  const cr = Math.cos(rr);
  const sr = Math.sin(rr);
  // q = R(−θ)·(F·(out − C)) / s + o ; p = R(−rot)·q ; u = (p.x + w/2) / w
  // F·(out − C) = (fx·(x − TW/2), y − TH/2)
  // R(−θ)·(X, Y) = (ct·X − st·Y, st·X + ct·Y)
  const qxx = (ct * fx) / s; // ∂qx/∂x
  const qxy = -st / s; // ∂qx/∂y
  const qyx = (st * fx) / s;
  const qyy = ct / s;
  const qx0 = -(qxx * TW) / 2 - (qxy * TH) / 2 + g.ox;
  const qy0 = -(qyx * TW) / 2 - (qyy * TH) / 2 + g.oy;
  const px = (X: number, Y: number) => cr * X - sr * Y;
  const py = (X: number, Y: number) => sr * X + cr * Y;
  return {
    a: px(qxx, qyx) / w,
    b: px(qxy, qyy) / w,
    c: (px(qx0, qy0) + w / 2) / w,
    d: py(qxx, qyx) / h,
    e: py(qxy, qyy) / h,
    f: (py(qx0, qy0) + h / 2) / h,
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Mask weight 0–1 of a shape at (u, v) on the original photo */
export function shapeWeight(shape: PlanShape, u: number, v: number): number {
  if (shape.type === 'linear') {
    const dx = shape.x1 - shape.x0;
    const dy = shape.y1 - shape.y0;
    const t = ((u - shape.x0) * dx + (v - shape.y0) * dy) / (dx * dx + dy * dy);
    return 1 - smooth(0, 1, t);
  }
  if (shape.type === 'radial') {
    const du = (u - shape.cx) / shape.rx;
    const dv = (v - shape.cy) / shape.ry;
    const d = Math.sqrt(du * du + dv * dv);
    return 1 - smooth(1 - shape.feather, 1 + shape.feather, d);
  }
  // polygon: even-odd inside test + soft edge by distance to the outline
  const pts = shape.points;
  let inside = false;
  let minD = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
    const ex = xi - xj;
    const ey = yi - yj;
    const len2 = ex * ex + ey * ey || 1e-9;
    const t = clamp(((u - xj) * ex + (v - yj) * ey) / len2, 0, 1);
    const qx = u - (xj + t * ex);
    const qy = v - (yj + t * ey);
    const d2 = qx * qx + qy * qy;
    if (d2 < minD) minD = d2;
  }
  const dist = Math.sqrt(minD);
  const signed = inside ? dist : -dist;
  const f = shape.feather / 2;
  return smooth(-f, f, signed);
}

const srgbToLin = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const linToSrgb = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** peak of x(1−x)² on 0–1 (at x = 1/3) */
const BUMP = 4 / 27;

/** 0–1 → 0–1 tone curve of one adjust (exposure in linear light with a soft shoulder, then shadows/highlights, then contrast) */
export function planTone(x: number, a: PlanAdjust): number {
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

function scaleAdjust(a: PlanAdjust, k: number): PlanAdjust {
  const out: PlanAdjust = {};
  for (const key of ADJUST_KEYS) if (a[key]) out[key] = (a[key] as number) * k;
  return out;
}

interface Step {
  lut: Float32Array;
  gr: number;
  gg: number;
  gb: number;
  sat: number;
  vib: number;
  shape: PlanShape | null;
}

function buildStep(a: PlanAdjust, shape: PlanShape | null): Step | null {
  if (!ADJUST_KEYS.some((k) => a[k])) return null;
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) lut[i] = planTone(i / 255, a) * 255;
  const t = a.temperature ?? 0;
  const m = a.tint ?? 0;
  return { lut, gr: 1 + 0.4 * t, gg: 1 - 0.4 * m, gb: 1 - 0.4 * t, sat: a.saturation ?? 0, vib: a.vibrance ?? 0, shape };
}

/** Skin-like pixel (warm hue, moderate saturation): colour shifts are halved there */
function skinFactor(r: number, g: number, b: number): number {
  if (!(r > g && g > b)) return 1;
  const mx = r;
  const mn = b;
  const s = mx > 0 ? (mx - mn) / mx : 0;
  const hue = (60 * (g - b)) / (mx - mn || 1);
  return hue < 50 && s > 0.15 && s < 0.7 ? 0.5 : 1;
}

/** Mask grid spacing in output pixels */
export const MASK_GRID = 4;

/**
 * Applies the plan in place (preview and export call this with the same inputs; only the size differs).
 * strength scales every value (the preset's single "Miktar" slider × the plan's stored safety scale).
 */
export function applyAiPlan(img: ImageData, plan: AiLightPlan, strength: number, map: PlanMapping): ImageData {
  const k = clamp(strength, 0, 1);
  if (k <= 0) return img;
  const steps: Step[] = [];
  const gs = buildStep(scaleAdjust(plan.global, k), null);
  if (gs) steps.push(gs);
  for (const r of plan.regions) {
    const s = buildStep(scaleAdjust(r.adjust, k), r.shape);
    if (s) steps.push(s);
  }
  if (!steps.length) return img;

  const { width: W, height: H, data } = img;
  // Masks are smooth: evaluate them on a coarse grid (every MASK_GRID px) and interpolate bilinearly.
  // Same grid rule at every size, so preview and export of the same size match exactly.
  const G = MASK_GRID;
  const gw = Math.ceil(W / G) + 1;
  const gh = Math.ceil(H / G) + 1;
  const grids: (Float32Array | null)[] = steps.map((st) => {
    if (!st.shape) return null;
    const grid = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const yc = gy * G + 0.5;
      for (let gx = 0; gx < gw; gx++) {
        const xc = gx * G + 0.5;
        grid[gy * gw + gx] = shapeWeight(st.shape, map.a * xc + map.b * yc + map.c, map.d * xc + map.e * yc + map.f);
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
      const i = (y * W + x) * 4;
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
        let w = 1;
        if (grid) {
          const a0 = grid[row0 + gx0];
          const a1 = grid[row0 + gx1];
          const b0 = grid[row1 + gx0];
          const b1 = grid[row1 + gx1];
          if (a0 + a1 + b0 + b1 < 0.002) continue;
          w = (a0 + (a1 - a0) * tx) * (1 - ty) + (b0 + (b1 - b0) * tx) * ty;
          if (w < 0.002) continue;
        }
        const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
        const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
        const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
        let nr = st.lut[ri] * (1 + (st.gr - 1) * sk);
        let ng = st.lut[gi] * (1 + (st.gg - 1) * sk);
        let nb = st.lut[bi] * (1 + (st.gb - 1) * sk);
        if (st.sat !== 0 || st.vib !== 0) {
          const L = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
          const mx = nr > ng ? (nr > nb ? nr : nb) : ng > nb ? ng : nb;
          const mn = nr < ng ? (nr < nb ? nr : nb) : ng < nb ? ng : nb;
          const cur = mx > 0 ? (mx - mn) / mx : 0;
          // vibrance lifts muted colours more and skin less
          const f = 1 + st.sat + st.vib * (1 - cur) * (sk < 1 ? 0.4 : 1);
          nr = L + (nr - L) * f;
          ng = L + (ng - L) * f;
          nb = L + (nb - L) * f;
        }
        r += (nr - r) * w;
        g += (ng - g) * w;
        b += (nb - b) * w;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return img;
}

function clipShare(d: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    // true black (all channels ≤ 2) or true white (all ≥ 254); one saturated channel at 0/255 is colour, not clipping
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    if (mx <= 2 || mn >= 254) n++;
  }
  return n / (d.length / 4);
}

/** Allowed rise of crushed (≤ 2) or blown (≥ 254) pixels at full strength (design §4) */
export const PLAN_CLIP_BUDGET = 0.005;
const SAFE_STEPS = [1, 0.85, 0.7, 0.55, 0.4, 0.25];

/**
 * Largest strength (≤ 1) whose clipping rise stays within budget, measured once on the image sent to the model.
 * Stored with the plan, so preview and export use the same number (parity).
 */
export function planSafeScale(img: ImageData, plan: AiLightPlan): number {
  const base = clipShare(img.data);
  const map = planMapping({ crop: null, srcW: img.width, srcH: img.height }, img.width, img.height);
  for (const s of SAFE_STEPS) {
    const copy = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) } as ImageData;
    applyAiPlan(copy, plan, s, map);
    if (clipShare(copy.data) - base <= PLAN_CLIP_BUDGET) return s;
  }
  return SAFE_STEPS[SAFE_STEPS.length - 1];
}

/** presetId value that means "apply the stored AI plan" (no library preset) */
export const AI_PLAN_PRESET_ID = 'ai_plan';

/** Stored with the photo's Düzenle settings (and on the device) */
export interface AiPlanRecord {
  style: string;
  plan: AiLightPlan;
  /** planSafeScale result; Miktar × safeScale is the applied strength */
  safeScale: number;
  createdAt: number;
}

/** Re-validates a stored record (old versions, edited storage); null if unusable */
export function sanitizeAiPlanRecord(raw: unknown): AiPlanRecord | null {
  if (!isObj(raw)) return null;
  const v = validatePlan(raw.plan);
  if (!v.ok) return null;
  return {
    style: typeof raw.style === 'string' ? raw.style.slice(0, 40) : '',
    plan: v.plan,
    safeScale: isNum(raw.safeScale) ? clamp(raw.safeScale, 0, 1) : 1,
    createdAt: isNum(raw.createdAt) ? raw.createdAt : 0,
  };
}

export function planKey(plan: AiLightPlan | null | undefined): string {
  return plan ? JSON.stringify(plan) : 'noplan';
}
