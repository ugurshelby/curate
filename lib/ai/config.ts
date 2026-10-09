/**
 * "AI ile onar" (Faz AI1) — tek yapılandırma noktası.
 * Model adları, boyutlar, istemler ve maliyet tahmini YALNIZ burada durur (spec §4.5 E12).
 * Bu dosya istemci ve sunucu tarafından okunur: sır içermez.
 */

export type AiTask = 'A' | 'B' | 'C' | 'D';
export const AI_TASK_IDS: AiTask[] = ['A', 'B', 'C', 'D'];

/** Model kimlikleri hızlı değişir; görev→model eşlemesi aşağıda tek satır */
export const AI_MODELS = {
  flash: 'gemini-3.1-flash-image', // Nano Banana 2
  pro: 'gemini-3-pro-image', // Nano Banana Pro
} as const;
export type AiModelKey = keyof typeof AI_MODELS;

export type AiImageSize = '2K' | '4K';

/** Test edilmiş ortak ek; değiştirme */
export const AI_KEEP =
  'Do not change the composition, content, colors, people, faces or text. Do not add, remove or invent any object or detail.';

export interface AiTaskConfig {
  id: AiTask;
  /** Arayüz etiketi (jargonsuz) */
  label: string;
  model: AiModelKey;
  imageSize: AiImageSize;
  /** Test edilmiş istem; {KEEP} AI_KEEP ile değişir */
  prompt: string;
  /** Ölçülen yaklaşık süre (sn) */
  estSeconds: number;
  /** Tahmini maliyet (₺) — üçüncü taraf fiyat, doğrulanmadı */
  costTry: number;
}

export const AI_TASKS: Record<AiTask, AiTaskConfig> = {
  A: {
    id: 'A',
    label: 'Büyüt',
    model: 'flash',
    imageSize: '4K',
    prompt: 'Increase the resolution and sharpness of this photo. Keep the existing real detail and texture. {KEEP}',
    estSeconds: 30,
    costTry: 8,
  },
  B: {
    id: 'B',
    label: 'Gürültü temizle',
    model: 'flash',
    imageSize: '2K',
    prompt:
      'Remove luminance and color noise from this photo while keeping real texture and fine detail. Avoid a smooth plastic look. {KEEP}',
    estSeconds: 18,
    costTry: 5,
  },
  C: {
    id: 'C',
    label: 'Kenar ve renk kayması düzelt',
    model: 'flash',
    imageSize: '2K',
    prompt:
      'Correct lens vignetting and edge color cast: even out brightness and color from the center to the edges. Change nothing else. {KEEP}',
    estSeconds: 18,
    costTry: 5,
  },
  // D'de Flash orijinalde olmayan güneş diski uydurdu; Pro'dan geri dönme (sahip kararı)
  D: {
    id: 'D',
    label: 'Patlak alanı ve pusu kurtar',
    model: 'pro',
    imageSize: '2K',
    prompt:
      'Recover tonal detail in blown-out highlights (bright windows, sky) and reduce haze with natural contrast. Only restore what is plausibly there. {KEEP}',
    estSeconds: 28,
    costTry: 7,
  },
};

export function isAiTask(v: unknown): v is AiTask {
  return typeof v === 'string' && (AI_TASK_IDS as string[]).includes(v);
}

export function aiModelId(task: AiTask): string {
  return AI_MODELS[AI_TASKS[task].model];
}

export function aiPrompt(task: AiTask): string {
  return AI_TASKS[task].prompt.replace('{KEEP}', AI_KEEP);
}

export function vertexEndpoint(modelId: string): string {
  return `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelId}:generateContent`;
}

// --- Giriş / çıkış sınırları ---
/** İstemci göndermeden önce uzun kenarı buna indirir */
export const AI_INPUT_LONG_EDGE = 2048;
export const AI_INPUT_JPEG_QUALITY = 0.92;
/** Sunucu bunun üstündeki girişi reddeder */
export const AI_MAX_INPUT_BYTES = 4 * 1024 * 1024;
/** Vercel yanıt sınırı 4,5 MB; pay bırakılır */
export const AI_MAX_RESPONSE_BYTES = Math.floor(4.3 * 1024 * 1024);
/** Sunucu JPEG kalitesi basamakları (q92'den başlar) */
export const AI_OUTPUT_QUALITY_STEPS = [92, 88, 84, 80];
/** Kalite basamakları yetmezse uzun kenar bu oranla küçülür */
export const AI_OUTPUT_SHRINK = 0.85;

// --- Süre ---
/** Route maxDuration (sn). Vercel fluid compute Hobby üst sınırı 300 sn (doküman, 2026-10-03) */
export const AI_MAX_DURATION_S = 120;
/** Sunucunun kendine bıraktığı pay (JPEG çevirme + yanıt) */
export const AI_DEADLINE_MARGIN_MS = 10_000;
/** 429/503'te tek bekleyen deneme */
export const AI_RETRY_WAIT_MS = 2_000;

// --- Kota ---
/**
 * Sahip kararı 2026-10-08 (D28): sahibin kullanımında kota kısıtı yok. Bu sayılar yalnız kaçak döngüye karşı
 * güvenlik ağıdır; Vercel'de AI_DAILY_LIMIT / AI_MONTHLY_LIMIT tanımlıysa onlar geçerlidir.
 */
export const AI_DEFAULT_DAILY_LIMIT = 80;
export const AI_DEFAULT_MONTHLY_LIMIT = 1000;

// --- Money budget (owner decision D35, 2026-10-08) ---
/**
 * The Free Trial credit is account-wide, so the cap is enforced here with counters. Until the window ends the total
 * (cumulative) and the daily cap apply; after it, the calendar-month cap and the daily cap. Env overrides (Vercel):
 * AI_BUDGET_TRY_TOTAL, AI_BUDGET_TRY_DAILY, AI_BUDGET_WINDOW_END (YYYY-MM-DD, last day of the window, Istanbul),
 * AI_BUDGET_TRY_MONTHLY_AFTER. Missing or broken values fall back to these defaults, never to "unlimited".
 */
export const AI_BUDGET_DEFAULTS = {
  totalTry: 6000,
  dailyTry: 300,
  windowEnd: '2026-12-17',
  monthlyAfterTry: 200,
} as const;
/**
 * The counters are charged this much above the per-call estimate (costTry) until the owner confirms real costs in
 * Billing → Reports. The estimates themselves stay unchanged.
 */
export const AI_BUDGET_SAFETY = 1.25;
/** Counters hold kuruş (integer): 1 ₺ = 100 */
export const AI_BUDGET_UNIT = 100;
/** Only one paid request at a time; a second one within this window is refused */
export const AI_BUSY_WINDOW_S = 10;
// --- PIN ile cihaz eşleme (Faz P1, sahip kararı 2026-10-07) ---
/** PIN tam olarak 4 rakam; değeri yalnız sunucu ortam değişkeninde (CURATE_AI_PASSWORD) */
export const AI_PIN_LENGTH = 4;
export const AI_PIN_PATTERN = /^\d{4}$/;
/**
 * Yanlış PIN sınırları. Yalnız PIN girişi (PUT) sayılır; eşlenmiş cihazın çerez yolu bunlara dokunmaz,
 * kilit sahibin telefonunu etkilemez. Ay sınırı yılda en çok 360 deneme demek (10.000 olasılıkta ≈ %3,6).
 */
export const AI_PIN_FAIL_LIMIT_IP_DAY = 5;
export const AI_PIN_FAIL_LIMIT_DAY = 10;
export const AI_PIN_FAIL_LIMIT_MONTH = 30;
/** Cihaz çerezi: HttpOnly, imzalı, yalnız /api/ai yoluna gider */
export const AI_DEVICE_COOKIE = 'curate_ai';
export const AI_DEVICE_COOKIE_PATH = '/api/ai';
/** Cihaz 365 gün hatırlanır (sahip kararı S2) */
export const AI_DEVICE_MAX_AGE_S = 365 * 24 * 3600;
/** Eski sürümün tarayıcıda tuttuğu şifre anahtarı; açılışta silinir */
export const AI_LEGACY_PASSWORD_KEY = 'curate.ai.password';

// --- Oran ---
export const AI_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '16:9', '9:16'] as const;
export type AiAspectRatio = (typeof AI_ASPECT_RATIOS)[number];
/** Bu sapmanın üstünde model kırpabilir veya uzatabilir: arayüzde uyarı */
export const AI_ASPECT_WARN = 0.03;

function ratioValue(r: AiAspectRatio): number {
  const [a, b] = r.split(':').map(Number);
  return a / b;
}

/** Girişe en yakın desteklenen oran (log ölçeğinde) ve göreli sapma */
export function nearestAspectRatio(width: number, height: number): { ratio: AiAspectRatio; deviation: number } {
  const target = width / height;
  let best: AiAspectRatio = '1:1';
  let bestD = Infinity;
  for (const r of AI_ASPECT_RATIOS) {
    const d = Math.abs(Math.log(target / ratioValue(r)));
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return { ratio: best, deviation: Math.abs(target / ratioValue(best) - 1) };
}

/** İstemcinin göndereceği boyut: uzun kenar ≤ 2048, büyütme yok */
export function aiInputSize(width: number, height: number): { width: number; height: number } {
  const s = Math.min(1, AI_INPUT_LONG_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}

/** Vertex generateContent gövdesi (testte çalışan biçim) */
export function buildVertexBody(task: AiTask, jpegBase64: string, width: number, height: number) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } }, { text: aiPrompt(task) }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: nearestAspectRatio(width, height).ratio, imageSize: AI_TASKS[task].imageSize },
    },
  };
}

// --- AI Preset: Işık ve Renk Planı (sahip kararı D28; tasarım docs/reports/2026-10-08-ai-preset-ozeti.md) ---
/** Görev kodu: görsel ÜRETMEZ, yalnız JSON plan döner; Curate planı yerelde uygular */
export const AI_PLAN_TASK = 'P';
/**
 * Image-reading text models for AI Preset, tried in order (owner decision D34, 2026-10-08; ids come from the project's
 * Model Garden). The chain moves on at 400, 404, 429 and 5xx, and when the answer fails validation; a rejected
 * request is not billed. `gemini-3-flash` does not exist (404 NOT_FOUND, checked 2026-10-08) and must not return.
 */
export const AI_PLAN_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'] as const;
/** Gönderilen önizleme: uzun kenar ≤ 768, JPEG 0,8 (≈ 60–120 KB) */
export const AI_PLAN_INPUT_LONG_EDGE = 768;
export const AI_PLAN_INPUT_JPEG_QUALITY = 0.8;
/**
 * Approximate time and cost: text answer, no image generation. Time measured 2026-10-08 (3.5-flash 26 s, 2.5-flash 27 s,
 * 3.5-flash-lite 4 s; Vertex "thinking" tokens dominate). The cost is an unverified estimate; do not change it until
 * the owner compares it with Billing → Reports.
 */
export const AI_PLAN_EST_SECONDS = 26;
export const AI_PLAN_COST_TRY = 0.3;
/** Sunucu model yanıtında bundan uzun metni okumaz */
export const AI_PLAN_MAX_TEXT = 20_000;

export type AiPlanStyle = 'natural_portrait' | 'golden_hour' | 'cinematic_night' | 'clean_daylight';
export const AI_PLAN_STYLE_IDS: AiPlanStyle[] = ['natural_portrait', 'golden_hour', 'cinematic_night', 'clean_daylight'];

/** Model'e giden stil tarifleri (arayüz adları lib/i18n/tr.ts → aiPreset.styles) */
export const AI_PLAN_STYLES: Record<AiPlanStyle, { brief: string }> = {
  natural_portrait: {
    brief: 'Natural portrait: the person is the clear subject; even, flattering light on the face; true skin tones; calm background.',
  },
  golden_hour: {
    brief: 'Golden hour: warm, low sun feeling; gentle warmth in highlights, soft shadows, keep the sky from blowing out.',
  },
  cinematic_night: {
    brief: 'Cinematic night: deep but detailed shadows, controlled bright lights, slightly cool shadows and warm practical lights.',
  },
  clean_daylight: {
    brief: 'Clean daylight: neutral white balance, clear midtones, recovered sky, lively but believable colour.',
  },
};

export function isAiPlanStyle(v: unknown): v is AiPlanStyle {
  return typeof v === 'string' && (AI_PLAN_STYLE_IDS as string[]).includes(v);
}

export function aiPlanPrompt(style: AiPlanStyle): string {
  return [
    'You are a photo editor. Look at this photo and return ONLY a JSON light and colour plan; never an image.',
    `Target look: ${AI_PLAN_STYLES[style].brief}`,
    'Coordinates are fractions of the whole photo: x from 0 (left) to 1 (right), y from 0 (top) to 1 (bottom).',
    '"global" adjusts the whole photo. "regions" (at most 6) adjust parts of it through soft masks:',
    '- linear: full effect at (x0,y0), fading to none at (x1,y1) (e.g. sky: from the top edge down to the horizon);',
    '- radial: ellipse centred at (cx,cy) with radii rx, ry and a soft edge "feather";',
    '- polygon: up to 12 points [x,y] around an area, with a soft edge "feather".',
    'Values are small, natural edits: exposure in stops (-0.6..0.6); contrast, saturation, vibrance -0.3..0.3;',
    'temperature (+ warmer) and tint (+ magenta) -0.25..0.25; shadows and highlights -0.4..0.4 (+ brighter).',
    'Keep skin natural: on skin or subject regions keep temperature and tint within ±0.08.',
    'Do not add a vignette or darken the edges for effect. Do not crush blacks or blow highlights.',
    'Prefer few regions placed exactly on what you see. Leave out anything that does not need a change.',
  ].join('\n');
}

/** Vertex responseSchema (OpenAPI alt kümesi): yanıt bu biçimin dışına çıkamaz */
const ADJUST_SCHEMA = {
  type: 'OBJECT',
  properties: Object.fromEntries(
    ['exposure', 'contrast', 'saturation', 'vibrance', 'temperature', 'tint', 'shadows', 'highlights'].map((k) => [k, { type: 'NUMBER' }]),
  ),
};
export const AI_PLAN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['version', 'scene', 'global', 'regions'],
  properties: {
    // no `enum` here: Vertex accepts enum only on STRING properties (400 otherwise, checked 2026-10-08); validatePlan enforces version 1
    version: { type: 'INTEGER' },
    scene: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', enum: ['portrait', 'landscape', 'street', 'night', 'interior', 'food', 'architecture', 'other'] },
        light: { type: 'STRING', enum: ['golden', 'blue_hour', 'midday', 'overcast', 'night', 'mixed', 'indoor'] },
        issues: { type: 'ARRAY', items: { type: 'STRING', enum: ['underexposed_subject', 'bright_sky', 'color_cast', 'haze', 'flat'] } },
      },
    },
    global: ADJUST_SCHEMA,
    regions: {
      type: 'ARRAY',
      maxItems: 6,
      items: {
        type: 'OBJECT',
        required: ['label', 'shape', 'adjust'],
        properties: {
          label: { type: 'STRING', enum: ['sky', 'subject', 'skin', 'background', 'foreground', 'highlight'] },
          shape: {
            type: 'OBJECT',
            required: ['type'],
            properties: {
              type: { type: 'STRING', enum: ['linear', 'radial', 'polygon'] },
              x0: { type: 'NUMBER' },
              y0: { type: 'NUMBER' },
              x1: { type: 'NUMBER' },
              y1: { type: 'NUMBER' },
              cx: { type: 'NUMBER' },
              cy: { type: 'NUMBER' },
              rx: { type: 'NUMBER' },
              ry: { type: 'NUMBER' },
              points: { type: 'ARRAY', maxItems: 12, items: { type: 'ARRAY', items: { type: 'NUMBER' } } },
              feather: { type: 'NUMBER' },
            },
          },
          adjust: ADJUST_SCHEMA,
        },
      },
    },
  },
};

export function buildPlanBody(style: AiPlanStyle, jpegBase64: string) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } }, { text: aiPlanPrompt(style) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: AI_PLAN_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };
}

/** Sunucu ↔ istemci başlık adları */
export const AI_HEADER_TASK = 'x-curate-task';
export const AI_HEADER_STYLE = 'x-curate-style';
export const AI_HEADER_REMAINING_DAY = 'x-curate-remaining-day';
export const AI_HEADER_REMAINING_MONTH = 'x-curate-remaining-month';
export const AI_HEADER_REMAINING_TRY = 'x-curate-remaining-try';
export const AI_ENDPOINT = '/api/ai';

/** Hata kodları ve sade Türkçe mesajlar (sunucu ve istemci aynı metni kullanır) */
export const AI_ERRORS = {
  disabled: 'AI şu an kapalı.',
  not_configured: 'AI sunucuda ayarlanmamış.',
  forbidden: 'İstek reddedildi.',
  pin_required: 'Bu cihazı eşlemek için PIN’ini gir.',
  wrong_pin: 'PIN yanlış.',
  pin_locked_ip: 'Bu bağlantıdan çok fazla yanlış PIN. Yarın tekrar dene.',
  pin_locked_day: 'Bugün çok fazla yanlış PIN girildi; yeni cihaz eşleme yarına kadar kapalı.',
  pin_locked_month: 'Bu ay çok fazla yanlış PIN girildi; yeni cihaz eşleme ay sonuna kadar kapalı.',
  service_error: 'Sunucu sayacına ulaşılamadı. Biraz sonra tekrar dene.',
  server_error: 'Sunucu hatası. Biraz sonra tekrar dene.',
  bad_task: 'Geçersiz işlem.',
  too_large: 'Fotoğraf gönderim için çok büyük.',
  bad_image: 'Fotoğraf okunamadı.',
  quota_day: 'Bugünkü AI hakkı doldu.',
  quota_month: 'Bu ayki AI hakkı doldu.',
  budget_day: 'AI bütçesi doldu: günlük.',
  budget_total: 'AI bütçesi doldu: toplam.',
  budget_month: 'AI bütçesi doldu: aylık.',
  busy: 'Önceki AI isteği sürüyor. Birkaç saniye bekle.',
  timeout: 'Süre aşıldı. Tekrar dene.',
  model_busy: 'Model şu an yoğun. Biraz sonra tekrar dene.',
  model_error: 'Model hata verdi.',
  model_missing: 'AI modeli bulunamadı.',
  model_rejected: 'Model isteği kabul etmedi.',
  model_auth: 'AI anahtarı Google tarafından reddedildi.',
  no_image: 'Model görsel döndürmedi.',
  bad_plan: 'Plan okunamadı. Tekrar dene ya da hazır bir preset seç.',
  canceled: 'İptal edildi; ücret yansımış olabilir.',
  network: 'Bağlantı kurulamadı.',
} as const;
export type AiErrorCode = keyof typeof AI_ERRORS;
