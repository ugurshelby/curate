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
export const AI_DEFAULT_DAILY_LIMIT = 20;
export const AI_DEFAULT_MONTHLY_LIMIT = 150;
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

/** Sunucu ↔ istemci başlık adları */
export const AI_HEADER_TASK = 'x-curate-task';
export const AI_HEADER_REMAINING_DAY = 'x-curate-remaining-day';
export const AI_HEADER_REMAINING_MONTH = 'x-curate-remaining-month';
export const AI_ENDPOINT = '/api/ai';

/** Hata kodları ve sade Türkçe mesajlar (sunucu ve istemci aynı metni kullanır) */
export const AI_ERRORS = {
  disabled: 'AI şu an kapalı.',
  not_configured: 'AI sunucuda ayarlanmamış.',
  forbidden: 'İstek reddedildi.',
  pin_required: 'Bu cihazı eşlemek için AI PIN’ini gir.',
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
  timeout: 'Süre aşıldı. Tekrar dene.',
  model_busy: 'Model şu an yoğun. Biraz sonra tekrar dene.',
  model_error: 'Model hata verdi.',
  no_image: 'Model görsel döndürmedi.',
  canceled: 'İptal edildi; ücret yansımış olabilir.',
  network: 'Bağlantı kurulamadı.',
} as const;
export type AiErrorCode = keyof typeof AI_ERRORS;
