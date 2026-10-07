/**
 * AI kota sayacı (sunucu). Kalıcı sayaç: Upstash Redis REST (SDK yok, doğrudan fetch).
 * Değişkenler: UPSTASH_REDIS_REST_URL/TOKEN veya Vercel Marketplace adları KV_REST_API_URL/TOKEN.
 * İkisi de yoksa bellek içi yedek (dev; dağıtık çalışmada kalıcı değil).
 */

export interface CounterStore {
  readonly kind: 'redis' | 'memory';
  get(key: string): Promise<number>;
  /** Artırır, anahtara süre verir, yeni değeri döner */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** Bir azaltır (ayırmayı geri alma); yeni değeri döner */
  decr(key: string): Promise<number>;
}

export class MemoryCounterStore implements CounterStore {
  readonly kind = 'memory' as const;
  private map = new Map<string, { value: number; expiresAt: number }>();
  constructor(private now: () => number = Date.now) {}

  /** Senkron okuma: incr/decr okuma ile yazma arasında await içermez (Redis INCR gibi atomik) */
  private read(key: string): number {
    const e = this.map.get(key);
    if (!e) return 0;
    if (e.expiresAt <= this.now()) {
      this.map.delete(key);
      return 0;
    }
    return e.value;
  }

  async get(key: string): Promise<number> {
    return this.read(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const value = this.read(key) + 1;
    this.map.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
    return value;
  }

  async decr(key: string): Promise<number> {
    const e = this.map.get(key);
    if (!e || e.expiresAt <= this.now()) return 0;
    e.value -= 1;
    return e.value;
  }
}

type FetchFn = typeof fetch;

export class UpstashCounterStore implements CounterStore {
  readonly kind = 'redis' as const;
  constructor(
    private url: string,
    private token: string,
    private fetchFn: FetchFn = fetch,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.fetchFn(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Sayaç hatası (${res.status})`);
    const json = (await res.json()) as { result?: unknown; error?: string }[];
    return json.map((r) => {
      if (r.error) throw new Error('Sayaç hatası');
      return r.result;
    });
  }

  async get(key: string): Promise<number> {
    const [v] = await this.pipeline([['GET', key]]);
    return Number(v ?? 0) || 0;
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const [v] = await this.pipeline([
      ['INCR', key],
      ['EXPIRE', key, ttlSeconds],
    ]);
    return Number(v) || 0;
  }

  async decr(key: string): Promise<number> {
    const [v] = await this.pipeline([['DECR', key]]);
    return Number(v) || 0;
  }
}

type EnvLike = Record<string, string | undefined>;

/** Hangi Redis değişkenleri tanımlı (değerleri değil) */
export function redisEnv(env: EnvLike): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

const globalMemory = globalThis as unknown as { __curateAiCounter?: MemoryCounterStore };

export function counterStoreFromEnv(env: EnvLike, fetchFn: FetchFn = fetch): CounterStore {
  const r = redisEnv(env);
  if (r) return new UpstashCounterStore(r.url, r.token, fetchFn);
  if (!globalMemory.__curateAiCounter) globalMemory.__curateAiCounter = new MemoryCounterStore();
  return globalMemory.__curateAiCounter;
}

// --- Gün / ay anahtarları: Europe/Istanbul ---
const ISTANBUL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function istanbulDay(now: Date): string {
  return ISTANBUL.format(now); // YYYY-MM-DD
}

export function istanbulMonth(now: Date): string {
  return istanbulDay(now).slice(0, 7); // YYYY-MM
}

export const quotaKeys = {
  day: (now: Date) => `curate:ai:day:${istanbulDay(now)}`,
  month: (now: Date) => `curate:ai:month:${istanbulMonth(now)}`,
  /** tag: PIN'e bağlı kısa etiket (sunucuda imza anahtarından türetilir); PIN değişince sayaçlar sıfırlanır */
  pinFailIp: (tag: string, ip: string, now: Date) => `curate:ai:pinfail:${tag}:ip:${ip}:${istanbulDay(now)}`,
  pinFailDay: (tag: string, now: Date) => `curate:ai:pinfail:${tag}:day:${istanbulDay(now)}`,
  pinFailMonth: (tag: string, now: Date) => `curate:ai:pinfail:${tag}:month:${istanbulMonth(now)}`,
};

export const DAY_TTL_S = 2 * 24 * 3600;
export const MONTH_TTL_S = 32 * 24 * 3600;
