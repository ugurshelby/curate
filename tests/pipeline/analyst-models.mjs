/**
 * Analist Modeller ve Prompt Stratejileri
 * 
 * 1. Direct-Instruction: Şikayetten doğrudan temel parametre ve talimat üretimi.
 * 2. CoT-Regional: İki aşamalı bölgesel (linear/radial/polygon) maskeli detay analisti.
 * 3. Curate-Harmonizer: Anayasa ve doku kısıtlarına duyarlı, yapaylaşmayı önleyen güvenli analist.
 */

export const STRATEGY_METADATA = {
  direct_instruction: {
    id: 'direct_instruction',
    name: 'Direct-Instruction Analist',
    description: 'Şikayeti doğrudan global ton ve pozlama düzeltmelerine dönüştüren hızlı hat.',
  },
  cot_regional: {
    id: 'cot_regional',
    name: 'CoT-Regional Analist',
    description: 'İki aşamalı akıl yürütmeyle sahneyi parçalara ayıran bölgesel maskeli analist.',
  },
  curate_harmonizer: {
    id: 'curate_harmonizer',
    name: 'Curate-Harmonizer Analist',
    description: 'Anayasal doku koruma ve ten emniyet sınırlarına sıkı sıkıya bağlı kalibre analist.',
  },
};

/**
 * Direct Instruction Analisti:
 * Şikayete göre hızlı global plan ve optimize prompt üretir.
 */
export function runDirectAnalyst(defectCategory, userComplaint, metrics) {
  const started = Date.now();
  let global = {};
  let optimizedPrompt = '';

  switch (defectCategory) {
    case 'blown_highlights':
      global = {
        exposure: -0.25,
        highlights: -0.35,
        shadows: 0.15,
        contrast: 0.1,
      };
      optimizedPrompt = `Recover blown highlights by lowering exposure (-0.25) and highlights (-0.35). Lift shadows slightly (+0.15) to maintain dynamic balance without artificial clipping. User complained: "${userComplaint}".`;
      break;

    case 'desaturated_flat':
      global = {
        contrast: 0.2,
        vibrance: 0.25,
        saturation: 0.15,
        shadows: -0.08,
      };
      optimizedPrompt = `Boost muted tones and enhance overall vitality. Increase vibrance (+0.25) and contrast (+0.20) while gently controlling deep blacks. Address complaint: "${userComplaint}".`;
      break;

    case 'underexposed_subject':
      global = {
        exposure: 0.2,
        shadows: 0.3,
        contrast: 0.08,
      };
      optimizedPrompt = `Lift overall exposure (+0.20) and open up shadows (+0.30) so the underexposed subject stands out clearly. Target complaint: "${userComplaint}".`;
      break;

    case 'color_cast_vignette':
      global = {
        temperature: -metrics.colorCast.warmth * 0.7,
        tint: -metrics.colorCast.tint * 0.7,
        contrast: 0.05,
      };
      optimizedPrompt = `Neutralize detected color cast (temp: ${global.temperature.toFixed(2)}, tint: ${global.tint.toFixed(2)}) and balance edge tonality. Complaint: "${userComplaint}".`;
      break;

    case 'noisy_blurry':
    default:
      global = {
        contrast: 0.12,
        highlights: -0.1,
        shadows: 0.1,
      };
      optimizedPrompt = `Apply clean edge contrast (+0.12) with micro-tonal balance to mask high-frequency noise and sharpen perceptual detail. Complaint: "${userComplaint}".`;
      break;
  }

  const durationMs = Date.now() - started + 12; // Simüle işlem süresi

  const plan = {
    version: 1,
    scene: { type: metrics.aspectRatio < 0.8 ? 'portrait' : 'landscape', light: 'midday', issues: [defectCategory] },
    global,
    regions: [],
  };

  return {
    strategyId: 'direct_instruction',
    plan,
    optimizedPrompt,
    durationMs,
  };
}

/**
 * CoT Regional Analisti:
 * Görselin kompozisyonunu ve bölgesel gereksinimlerini haritalandırır.
 */
export function runCoTRegionalAnalyst(defectCategory, userComplaint, metrics) {
  const started = Date.now();
  let global = {};
  const regions = [];
  let optimizedPrompt = '';

  switch (defectCategory) {
    case 'blown_highlights':
      global = {
        exposure: -0.15,
        contrast: 0.08,
      };
      // Gökyüzü / Pencere linear maskesi (üstten aşağı)
      regions.push({
        label: 'sky',
        shape: { type: 'linear', x0: 0.5, y0: 0.0, x1: 0.5, y1: 0.45, feather: 0.2 },
        adjust: { exposure: -0.35, highlights: -0.4, vibrance: 0.12 },
      });
      // Parlak nokta kontrolü
      regions.push({
        label: 'highlight',
        shape: { type: 'radial', cx: 0.5, cy: 0.25, rx: 0.4, ry: 0.3, feather: 0.25 },
        adjust: { highlights: -0.3, exposure: -0.2 },
      });
      optimizedPrompt = `CoT Phase 1: Detected severe blown highlights localized in upper half / window regions.
CoT Phase 2: Formulated linear gradient mask (y: 0.0 -> 0.45) with -0.35 EV recovery, combined with radial highlight containment. Preserves middle-ground exposure while recovering window details. Complaint: "${userComplaint}".`;
      break;

    case 'underexposed_subject':
      global = {
        contrast: 0.05,
      };
      // Merkezde özne radial aydınlatma
      regions.push({
        label: 'subject',
        shape: { type: 'radial', cx: 0.5, cy: 0.52, rx: 0.32, ry: 0.38, feather: 0.25 },
        adjust: { exposure: 0.38, shadows: 0.35, contrast: 0.1 },
      });
      // Arka planı hafif sakinleştirme
      regions.push({
        label: 'background',
        shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.6, ry: 0.6, feather: 0.3 },
        adjust: { exposure: -0.08, contrast: 0.05 },
      });
      optimizedPrompt = `CoT Phase 1: Subject identified in central foreground under heavy shadow; background is significantly brighter.
CoT Phase 2: Applied central radial mask (cx: 0.5, cy: 0.52, rx: 0.32, ry: 0.38) lifting shadows (+0.35) and exposure (+0.38). Controlled background exposure by -0.08 to create depth of field. Complaint: "${userComplaint}".`;
      break;

    case 'desaturated_flat':
      global = {
        contrast: 0.15,
        vibrance: 0.2,
      };
      regions.push({
        label: 'foreground',
        shape: { type: 'radial', cx: 0.5, cy: 0.6, rx: 0.45, ry: 0.4, feather: 0.25 },
        adjust: { saturation: 0.22, vibrance: 0.25, contrast: 0.12 },
      });
      optimizedPrompt = `CoT Phase 1: Flat dynamic range with compressed tonal delta across all RGB channels.
CoT Phase 2: Layered vibrance curve targeting the foreground focal plane with +0.22 saturation and +0.15 contrast, avoiding skin over-saturation. Complaint: "${userComplaint}".`;
      break;

    case 'color_cast_vignette':
      global = {
        temperature: -metrics.colorCast.warmth * 0.8,
        tint: -metrics.colorCast.tint * 0.8,
      };
      // Kenar düzeltme maskesi
      regions.push({
        label: 'background',
        shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.55, ry: 0.55, feather: 0.3 },
        adjust: { exposure: 0.25, shadows: 0.2 },
      });
      optimizedPrompt = `CoT Phase 1: Measured chromatic drift (warmth: ${metrics.colorCast.warmth}, tint: ${metrics.colorCast.tint}) plus peripheral lens light falloff.
CoT Phase 2: Inverse vignette radial feather compensating edge illumination (+0.25 exposure) and neutral white-balance balance. Complaint: "${userComplaint}".`;
      break;

    case 'noisy_blurry':
    default:
      global = {
        contrast: 0.18,
        highlights: -0.15,
        shadows: 0.15,
      };
      regions.push({
        label: 'subject',
        shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.35, ry: 0.35, feather: 0.2 },
        adjust: { contrast: 0.2, shadows: 0.1 },
      });
      optimizedPrompt = `CoT Phase 1: High frequency noise and soft edge definition in central focus zone.
CoT Phase 2: Concentrated micro-contrast boost (+0.20) in primary subject ellipse while stabilizing ambient noise floor. Complaint: "${userComplaint}".`;
      break;
  }

  const durationMs = Date.now() - started + 35; // Simüle işlem süresi

  const plan = {
    version: 1,
    scene: { type: metrics.aspectRatio < 0.8 ? 'portrait' : 'landscape', light: 'indoor', issues: [defectCategory] },
    global,
    regions,
  };

  return {
    strategyId: 'cot_regional',
    plan,
    optimizedPrompt,
    durationMs,
  };
}

/**
 * Curate Harmonizer Analisti:
 * Curate Design ve Engine kurallarına sıkı sıkıya bağlı:
 * Asla yapay vinyet eklemez, ten rengini 0.08 ile sınırlar, clipping bütçesini aşmaz.
 */
export function runCurateHarmonizer(defectCategory, userComplaint, metrics) {
  const started = Date.now();
  let global = {};
  const regions = [];
  let optimizedPrompt = '';

  switch (defectCategory) {
    case 'blown_highlights':
      // Doku korumalı yumuşak highlights kurtarma
      global = {
        exposure: -0.12,
        highlights: -0.28,
        shadows: 0.08,
      };
      regions.push({
        label: 'sky',
        shape: { type: 'linear', x0: 0.5, y0: 0.0, x1: 0.5, y1: 0.38, feather: 0.25 },
        adjust: { exposure: -0.22, highlights: -0.3 },
      });
      optimizedPrompt = `Curate Harmonizer: Strictly preserving natural midtone fidelity. Soft shoulder exposure adjustment (-0.12 EV) and linear sky dampening (-0.22 EV) respecting PLAN_CLIP_BUDGET. Avoids dark halo artifacts. Complaint: "${userComplaint}".`;
      break;

    case 'underexposed_subject':
      global = {
        exposure: 0.1,
        shadows: 0.18,
      };
      // Ten ve özne emniyetli maske
      regions.push({
        label: 'skin',
        shape: { type: 'radial', cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.35, feather: 0.3 },
        adjust: { exposure: 0.28, shadows: 0.22, temperature: 0.04 }, // Ten emniyeti <= 0.08
      });
      optimizedPrompt = `Curate Harmonizer: Human-centric calibration. Target radial subject mask lifting exposure (+0.28) with skin temperature clamped to +0.04 (SKIN_COLOR_LIMIT safe). Clean subject separation without background blowout. Complaint: "${userComplaint}".`;
      break;

    case 'desaturated_flat':
      global = {
        contrast: 0.14,
        vibrance: 0.18,
        saturation: 0.08, // Düşük tutulur, yapay floresan renkleri önler
      };
      optimizedPrompt = `Curate Harmonizer: Organic color grading. Vibrance-weighted saturation curve (+0.18) preserving skin tone neutrality while restoring natural foliage and ambient colors. Complaint: "${userComplaint}".`;
      break;

    case 'color_cast_vignette':
      global = {
        temperature: -Math.max(-0.25, Math.min(0.25, metrics.colorCast.warmth * 0.75)),
        tint: -Math.max(-0.25, Math.min(0.25, metrics.colorCast.tint * 0.75)),
        exposure: 0.05,
      };
      optimizedPrompt = `Curate Harmonizer: Precise white balance neutralization with clamped temp/tint shifts. Avoids synthetic vignette compensation and maintains authentic sensor tone. Complaint: "${userComplaint}".`;
      break;

    case 'noisy_blurry':
    default:
      global = {
        contrast: 0.1,
        highlights: -0.08,
        shadows: 0.08,
      };
      optimizedPrompt = `Curate Harmonizer: Film grain preservation. Clean tonal micro-steps without edge-tearing or plastic de-noising. Real photo texture kept intact. Complaint: "${userComplaint}".`;
      break;
  }

  const durationMs = Date.now() - started + 24;

  const plan = {
    version: 1,
    scene: { type: metrics.aspectRatio < 0.8 ? 'portrait' : 'landscape', light: 'golden', issues: [defectCategory] },
    global,
    regions,
  };

  return {
    strategyId: 'curate_harmonizer',
    plan,
    optimizedPrompt,
    durationMs,
  };
}

/**
 * Üç stratejiyi de verilen görsel ve şikayet için koşturur
 */
export function runAllAnalystStrategies(defectCategory, userComplaint, metrics) {
  return [
    runDirectAnalyst(defectCategory, userComplaint, metrics),
    runCoTRegionalAnalyst(defectCategory, userComplaint, metrics),
    runCurateHarmonizer(defectCategory, userComplaint, metrics),
  ];
}
