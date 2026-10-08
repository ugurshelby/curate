/**
 * Lock page client (D27): sends the PIN once to our own API; the server answers with an HttpOnly cookie.
 * The PIN is never stored in the browser.
 */
import { AI_ENDPOINT, AI_ERRORS } from '../ai/config';
import { failureFromResponse, type AiFailure } from '../ai/client';

export async function unlockDevice(pin: string, fetchFn: typeof fetch = fetch): Promise<{ ok: true } | AiFailure> {
  try {
    const res = await fetchFn(AI_ENDPOINT, {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.ok ? { ok: true } : await failureFromResponse(res);
  } catch {
    return { ok: false, code: 'network', message: AI_ERRORS.network };
  }
}
