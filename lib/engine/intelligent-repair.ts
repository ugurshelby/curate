import { applyAiPlan, type AiLightPlan } from './ai-plan';
import type { ImageTechnicalSchema } from './image-schema';
import type { AiRepairSchema, AiRepairStyle } from '../ai/config';

/**
 * Curate Studio — Düzenle → AI Onar.
 * Primary path: technical schema + template/directive + photo preview go to the interpreter model through our proxy,
 * which answers with a JSON light/colour plan only (D28); Curate applies it locally.
 * This file holds the device-side parts: template keys, directive matching, the local fallback plan used when the
 * model cannot be reached, and the strip-wise applier.
 */

export type RepairTemplateKey = ImageTechnicalSchema['suggestedTemplateKey'];
export const REPAIR_TEMPLATE_KEYS: RepairTemplateKey[] = ['blownLight', 'illuminateSubject', 'dehaze', 'neutralizeColor', 'nightClarity'];

export function isRepairTemplateKey(v: unknown): v is RepairTemplateKey {
  return typeof v === 'string' && (REPAIR_TEMPLATE_KEYS as string[]).includes(v);
}

/** Template → model style; a free-text directive without a template uses `repair_auto` */
export const REPAIR_STYLE_BY_TEMPLATE: Record<RepairTemplateKey, AiRepairStyle> = {
  blownLight: 'repair_blown_light',
  illuminateSubject: 'repair_illuminate_subject',
  dehaze: 'repair_dehaze',
  neutralizeColor: 'repair_neutralize_color',
  nightClarity: 'repair_night_clarity',
};

/** Turkish (and a few English) words the owner uses for each problem; first match in this order wins */
const DIRECTIVE_KEYWORDS: [RepairTemplateKey, RegExp][] = [
  ['blownLight', /patla|bembeyaz|parlak|gökyüz|gokyuz|pencere|blown|overexpos/i],
  ['nightClarity', /gece|karanlık ortam|düşük ışık|dusuk isik|night/i],
  ['illuminateSubject', /karanlık|karanlik|gölge|golge|ters ışık|ters isik|özne|ozne|yüz|yuz|backlit|dark/i],
  ['neutralizeColor', /sarı|sari|mavi|yeşil|yesil|mor|renk kay|ton kay|beyaz dengesi|cast/i],
  ['dehaze', /soluk|cansız|cansiz|pus|duman|sis|mat|donuk|renk|haze|flat|dull/i],
];

/** Best template for a free-text directive, or null when nothing matches */
export function templateFromDirective(text: string | null | undefined): RepairTemplateKey | null {
  const t = (text ?? '').toLocaleLowerCase('tr');
  if (!t.trim()) return null;
  for (const [key, re] of DIRECTIVE_KEYWORDS) if (re.test(t)) return key;
  return null;
}

/** Template actually used: explicit tap → directive words → schema suggestion */
export function resolveRepairTemplate(schema: ImageTechnicalSchema, templateKey?: string | null, directive?: string | null): RepairTemplateKey {
  if (isRepairTemplateKey(templateKey)) return templateKey;
  return templateFromDirective(directive) ?? schema.suggestedTemplateKey;
}

/** Numbers sent to the interpreter model (no dimensions, no pixels) */
export function schemaForAi(s: ImageTechnicalSchema): AiRepairSchema {
  return {
    meanLuma: s.meanLuma,
    blownRatio: s.blownRatio,
    crushedRatio: s.crushedRatio,
    avgSaturation: s.avgSaturation,
    warmth: s.colorCast.warmth,
    tint: s.colorCast.tint,
  };
}

export interface RepairInterpretation {
  sceneType: 'portrait' | 'landscape' | 'interior' | 'night' | 'street';
  lightDirection: 'backlit' | 'top_window' | 'diffused' | 'low_ambient';
  mainSubject: string;
  summary: string;
}

/**
 * Local fallback interpretation (no model): reads the schema and the resolved template.
 */
export function interpretImageSemantics(
  schema: ImageTechnicalSchema,
  templateKey?: string,
  customDirective?: string
): RepairInterpretation {
  const isPortrait = schema.aspectRatio < 0.85;
  const effectiveKey = resolveRepairTemplate(schema, templateKey, customDirective);

  let sceneType: RepairInterpretation['sceneType'] = isPortrait ? 'portrait' : 'landscape';
  let lightDir: RepairInterpretation['lightDirection'] = 'diffused';
  const mainSubject = isPortrait ? 'Ana portre öznesi' : 'Manzara ve çevre kompozisyonu';
  let summary: string;

  if (effectiveKey === 'blownLight') {
    lightDir = 'top_window';
    summary = 'Pencere veya gökyüzü bölgesinde ışık patlaması ve detay kaybı.';
  } else if (effectiveKey === 'illuminateSubject') {
    lightDir = 'backlit';
    summary = 'Özne ters ışıkta ve gölgede kalmış.';
  } else if (effectiveKey === 'neutralizeColor') {
    summary = `Ortam ışığında renk sapması (sıcaklık: ${schema.colorCast.warmth.toFixed(2)}).`;
  } else if (effectiveKey === 'nightClarity') {
    sceneType = 'night';
    lightDir = 'low_ambient';
    summary = 'Düşük ışıklı sahnede gölge detayları ezilmiş.';
  } else {
    summary = 'Düşük dinamik aralık ve solgun renk doygunluğu.';
  }

  return {
    sceneType,
    lightDirection: lightDir,
    mainSubject,
    summary,
  };
}

/**
 * Local fallback plan from the resolved template (same JSON shape the model returns, so the same validator/applier runs).
 */
export function generateIntelligentRepairPlan(
  schema: ImageTechnicalSchema,
  interpretation: RepairInterpretation,
  templateKey?: string,
  directive?: string
): AiLightPlan {
  const effectiveKey = resolveRepairTemplate(schema, templateKey, directive);
  const plan: AiLightPlan = {
    version: 1,
    scene: {
      type: interpretation.sceneType,
      light: interpretation.lightDirection === 'backlit' ? 'golden' : 'midday',
      issues: [],
    },
    global: {},
    regions: [],
  };

  switch (effectiveKey) {
    case 'blownLight':
      // Global dengeli geri çekme
      plan.global = {
        exposure: -0.14,
        highlights: -0.28,
        shadows: 0.10,
        contrast: 0.08,
      };
      // Yorumlayıcının tespit ettiği patlayan üst/pencere alanına kademeli lineer maske
      plan.regions.push({
        label: 'highlight',
        shape: {
          type: 'linear',
          x0: 0.5,
          y0: 0.0,
          x1: 0.5,
          y1: 0.45,
          feather: 0.25,
        },
        adjust: {
          exposure: -0.24,
          highlights: -0.32,
        },
      });
      break;

    case 'illuminateSubject':
      plan.global = {
        contrast: 0.06,
        shadows: 0.14,
        exposure: 0.06,
      };
      // Yorumlayıcının işaret ettiği merkezdeki özneye radyal aydınlatma
      plan.regions.push({
        label: 'subject',
        shape: {
          type: 'radial',
          cx: 0.50,
          cy: 0.46,
          rx: 0.38,
          ry: 0.42,
          feather: 0.35,
        },
        adjust: {
          exposure: 0.28,
          shadows: 0.24,
          contrast: 0.08,
        },
      });
      break;

    case 'dehaze':
      plan.global = {
        contrast: 0.18,
        vibrance: 0.24,
        saturation: 0.12,
        shadows: -0.05,
      };
      break;

    case 'neutralizeColor':
      plan.global = {
        temperature: -schema.colorCast.warmth * 0.75,
        tint: -schema.colorCast.tint * 0.75,
        contrast: 0.06,
      };
      break;

    case 'nightClarity':
      plan.global = {
        contrast: 0.12,
        shadows: 0.22,
        highlights: -0.10,
        exposure: 0.08,
      };
      break;

    default:
      plan.global = {
        contrast: 0.12,
        vibrance: 0.16,
        exposure: 0.05,
      };
      break;
  }

  return plan;
}

/** Rows per strip; a multiple of MASK_GRID (4) so masks line up exactly with a whole-image pass */
export const PLAN_STRIP_ROWS = 256;

interface StripContext {
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  putImageData(img: ImageData, dx: number, dy: number): void;
}

/**
 * Applies a plan to a W×H canvas in horizontal strips: identical pixels to one whole-image pass, but the peak extra
 * memory is one strip instead of a full-size ImageData (a 50 MP photo would need ~200 MB at once).
 */
export function applyPlanInStrips(ctx: StripContext, W: number, H: number, plan: AiLightPlan, strength: number, rows: number = PLAN_STRIP_ROWS): void {
  const step = Math.max(4, Math.floor(rows / 4) * 4);
  for (let y0 = 0; y0 < H; y0 += step) {
    const h = Math.min(step, H - y0);
    const strip = ctx.getImageData(0, y0, W, h);
    // whole-photo mapping (u = x/W, v = y/H) shifted by the strip's top row
    applyAiPlan(strip, plan, strength, { a: 1 / W, b: 0, c: 0, d: 0, e: 1 / H, f: y0 / H });
    ctx.putImageData(strip, 0, y0);
  }
}
