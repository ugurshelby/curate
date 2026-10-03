/**
 * "AI ile onar" istemci tarafı: küçültme, şifre saklama, istek ve Türkçe hata eşlemesi.
 * Görsel yalnız kendi proxy'mize (/api/ai) gider; üçüncü taraf SDK yok.
 */
import {
  AI_ENDPOINT,
  AI_ERRORS,
  AI_HEADER_PASSWORD,
  AI_HEADER_REMAINING_DAY,
  AI_HEADER_REMAINING_MONTH,
  AI_HEADER_TASK,
  AI_INPUT_JPEG_QUALITY,
  AiErrorCode,
  AiTask,
  aiInputSize,
} from './config';

const PASSWORD_KEY = 'curate.ai.password';

export function loadAiPassword(): string | null {
  try {
    return window.localStorage.getItem(PASSWORD_KEY);
  } catch {
    return null;
  }
}

export function saveAiPassword(pw: string | null): void {
  try {
    if (pw) window.localStorage.setItem(PASSWORD_KEY, pw);
    else window.localStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* depolama kapalı: şifre her oturumda yeniden sorulur */
  }
}

export type AiFailure = { ok: false; code: AiErrorCode; message: string };
export type AiStatusResult = { ok: true; remainingDay: number; remainingMonth: number } | AiFailure;
export type AiRepairResult = { ok: true; blob: Blob; remainingDay: number | null; remainingMonth: number | null } | AiFailure;

function fail(code: AiErrorCode): AiFailure {
  return { ok: false, code, message: AI_ERRORS[code] };
}

const STATUS_FALLBACK: Record<number, AiErrorCode> = {
  400: 'bad_task',
  401: 'wrong_password',
  413: 'too_large',
  415: 'bad_image',
  429: 'model_busy',
  499: 'canceled',
  502: 'model_error',
  503: 'model_busy',
  504: 'timeout',
};

/** Sunucu hata gövdesini koda çevirir; tanınmazsa durum koduna göre */
export async function failureFromResponse(res: Response): Promise<AiFailure> {
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error && json.error in AI_ERRORS) return fail(json.error as AiErrorCode);
  } catch {
    /* gövde JSON değil (ör. Vercel zaman aşımı sayfası) */
  }
  return fail(STATUS_FALLBACK[res.status] ?? (res.status >= 500 ? 'timeout' : 'model_error'));
}

function headers(password: string, extra: Record<string, string> = {}): Record<string, string> {
  return { [AI_HEADER_PASSWORD]: encodeURIComponent(password), ...extra };
}

function numHeader(res: Response, name: string): number | null {
  const v = res.headers.get(name);
  return v === null ? null : Number(v);
}

/** Şifreyi doğrular ve kalan hakkı okur (model çağrısı yok, para harcamaz) */
export async function fetchAiStatus(password: string, fetchFn: typeof fetch = fetch): Promise<AiStatusResult> {
  try {
    const res = await fetchFn(AI_ENDPOINT, { method: 'GET', headers: headers(password), cache: 'no-store' });
    if (!res.ok) return failureFromResponse(res);
    const json = (await res.json()) as { remainingDay: number; remainingMonth: number };
    return { ok: true, remainingDay: json.remainingDay, remainingMonth: json.remainingMonth };
  } catch {
    return fail('network');
  }
}

/** Tek istek; otomatik yeniden deneme istemcide yok (her deneme para) */
export async function requestAiRepair(
  task: AiTask,
  jpeg: Blob,
  password: string,
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<AiRepairResult> {
  try {
    const res = await fetchFn(AI_ENDPOINT, {
      method: 'POST',
      headers: headers(password, { [AI_HEADER_TASK]: task, 'Content-Type': 'image/jpeg' }),
      body: jpeg,
      signal,
      cache: 'no-store',
    });
    if (!res.ok) return failureFromResponse(res);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/') || blob.size === 0) return fail('no_image');
    return {
      ok: true,
      blob,
      remainingDay: numHeader(res, AI_HEADER_REMAINING_DAY),
      remainingMonth: numHeader(res, AI_HEADER_REMAINING_MONTH),
    };
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) return fail('canceled');
    return fail('network');
  }
}

/** Aktif fotoğrafın kendi pikselleri (ayarsız), uzun kenar ≤ 2048, JPEG 0.92 */
export async function prepareAiInput(img: CanvasImageSource & { naturalWidth: number; naturalHeight: number }): Promise<Blob> {
  const { width, height } = aiInputSize(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas yok');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG üretilemedi'))), 'image/jpeg', AI_INPUT_JPEG_QUALITY),
  );
}
