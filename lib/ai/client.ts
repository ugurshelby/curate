/**
 * "AI ile onar" istemci tarafı: küçültme, PIN ile cihaz eşleme, istek ve Türkçe hata eşlemesi.
 * Görsel yalnız kendi proxy'mize (/api/ai) gider; üçüncü taraf SDK yok.
 * Erişim HttpOnly cihaz çerezidir (sunucu verir); PIN tarayıcıda saklanmaz, yalnız eşlemede bir kez gider.
 */
import {
  AI_ENDPOINT,
  AI_ERRORS,
  AI_HEADER_REMAINING_DAY,
  AI_HEADER_REMAINING_MONTH,
  AI_HEADER_TASK,
  AI_INPUT_JPEG_QUALITY,
  AI_LEGACY_PASSWORD_KEY,
  AiErrorCode,
  AiTask,
  aiInputSize,
} from './config';

/** Eski sürümün localStorage'da düz metin tuttuğu şifreyi siler */
export function clearLegacyAiPassword(): void {
  try {
    window.localStorage.removeItem(AI_LEGACY_PASSWORD_KEY);
  } catch {
    /* depolama kapalı: silinecek bir şey de yok */
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
  401: 'pin_required',
  403: 'forbidden',
  413: 'too_large',
  415: 'bad_image',
  429: 'model_busy',
  499: 'canceled',
  500: 'server_error',
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

function numHeader(res: Response, name: string): number | null {
  const v = res.headers.get(name);
  return v === null ? null : Number(v);
}

async function statusFrom(res: Response): Promise<AiStatusResult> {
  if (!res.ok) return failureFromResponse(res);
  const json = (await res.json()) as { remainingDay: number; remainingMonth: number };
  return { ok: true, remainingDay: json.remainingDay, remainingMonth: json.remainingMonth };
}

/** Cihaz eşli mi ve kalan hak (model çağrısı yok, para harcamaz) */
export async function fetchAiStatus(fetchFn: typeof fetch = fetch): Promise<AiStatusResult> {
  try {
    return await statusFrom(
      await fetchFn(AI_ENDPOINT, { method: 'GET', credentials: 'same-origin', cache: 'no-store' }),
    );
  } catch {
    return fail('network');
  }
}

/** PIN ile bu cihazı eşler; başarıda sunucu HttpOnly çerez bırakır */
export async function unlockAi(pin: string, fetchFn: typeof fetch = fetch): Promise<AiStatusResult> {
  try {
    return await statusFrom(
      await fetchFn(AI_ENDPOINT, {
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }),
    );
  } catch {
    return fail('network');
  }
}

/** "Bu cihazı unut": çerezi sunucu siler */
export async function forgetAiDevice(fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn(AI_ENDPOINT, { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Tek istek; otomatik yeniden deneme istemcide yok (her deneme para) */
export async function requestAiRepair(
  task: AiTask,
  jpeg: Blob,
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<AiRepairResult> {
  try {
    const res = await fetchFn(AI_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [AI_HEADER_TASK]: task, 'Content-Type': 'image/jpeg' },
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
