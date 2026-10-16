import type { AiLightPlan } from './ai-plan';
import type { ImageTechnicalSchema } from './image-schema';

/**
 * Curate Studio — İki Aşamalı Akıllı Onarım Motoru (Production)
 * 1. Aşama: Semantik Görsel Yorumlama (Görsel Işık Yönü & Özne Analizi)
 * 2. Aşama: Output Plan Optimizer (Bölgesel Maskeli AiLightPlan Üretimi)
 */

export interface RepairInterpretation {
  sceneType: 'portrait' | 'landscape' | 'interior' | 'night' | 'street';
  lightDirection: 'backlit' | 'top_window' | 'diffused' | 'low_ambient';
  mainSubject: string;
  summary: string;
}

/**
 * 1. Aşama: Görsel Semantiğini ve Işık Yönünü Yorumlama
 */
export function interpretImageSemantics(
  schema: ImageTechnicalSchema,
  templateKey?: string,
  customDirective?: string
): RepairInterpretation {
  const isPortrait = schema.aspectRatio < 0.85;
  const isBlown = schema.blownRatio >= 0.012;
  const isDark = schema.crushedRatio >= 0.05 || schema.meanLuma < 90;

  const effectiveKey = templateKey || schema.suggestedTemplateKey;

  let sceneType: RepairInterpretation['sceneType'] = isPortrait ? 'portrait' : 'landscape';
  let lightDir: RepairInterpretation['lightDirection'] = 'diffused';
  let mainSubject = isPortrait ? 'Ana portre öznesi' : 'Manzara ve çevre kompozisyonu';
  let summary = 'Genel sahne ışığı ve kontrast dengesi.';

  if (effectiveKey === 'blownLight' || isBlown) {
    lightDir = 'top_window';
    summary = 'Pencere veya gökyüzü bölgesinde ışık patlaması ve detay kaybı tespit edildi.';
  } else if (effectiveKey === 'illuminateSubject' || isDark) {
    lightDir = 'backlit';
    summary = 'Özne ters ışıkta ve gölgede kalmış; yüz ve özne öne çıkarılmayı bekliyor.';
  } else if (effectiveKey === 'neutralizeColor' || Math.abs(schema.colorCast.warmth) > 0.15) {
    summary = `Ortam ışığında renk sapması (sıcaklık: ${schema.colorCast.warmth.toFixed(2)}) ve kenar kararması tespit edildi.`;
  } else if (effectiveKey === 'nightClarity') {
    sceneType = 'night';
    lightDir = 'low_ambient';
    summary = 'Düşük ışıklı gece sahnesinde gölge detayları ezilmiş.';
  } else {
    summary = 'Düşük dinamik aralık ve solgun renk doygunluğu tespit edildi.';
  }

  if (customDirective && customDirective.trim().length > 0) {
    summary = `${summary} Özel kullanıcı direktifi: "${customDirective.trim()}".`;
  }

  return {
    sceneType,
    lightDirection: lightDir,
    mainSubject,
    summary,
  };
}

/**
 * 2. Aşama: Yorumlayıcı Analizine Göre Bölgesel Maskeli AiLightPlan Üretimi
 */
export function generateIntelligentRepairPlan(
  schema: ImageTechnicalSchema,
  interpretation: RepairInterpretation,
  templateKey?: string
): AiLightPlan {
  const effectiveKey = templateKey || schema.suggestedTemplateKey;
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
