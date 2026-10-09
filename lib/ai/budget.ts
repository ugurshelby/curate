/**
 * AI money budget (owner decision D35, 2026-10-08). Server only.
 *
 * Every paid call reserves its estimated cost (costTry × AI_BUDGET_SAFETY, in kuruş) on up to three counters BEFORE it
 * is sent to Google; if any cap would be exceeded the reservation is rolled back and the call is refused. A call that
 * Google answers with a 4xx is not billed, so its reservation is given back; 5xx, timeouts and cancellations stay
 * charged because Google may still have billed them.
 *
 * All three counters (day, cumulative total, calendar month) are written on every call; until the window ends the day
 * and total caps are checked, after it the day and month caps (the total is then switched off).
 */
import { AI_BUDGET_DEFAULTS, AI_BUDGET_SAFETY, AI_BUDGET_UNIT, type AiErrorCode } from './config';
import { CounterStore, DAY_TTL_S, MONTH_TTL_S, istanbulDay, quotaKeys } from './quota';

type EnvLike = Record<string, string | undefined>;

export interface BudgetConfig {
  totalTry: number;
  dailyTry: number;
  /** Last day (Istanbul, YYYY-MM-DD) on which the cumulative total applies */
  windowEnd: string;
  monthlyAfterTry: number;
}

function money(v: string | undefined, fallback: number): number {
  if (v === undefined || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function isoDay(v: string | undefined, fallback: string): string {
  const s = (v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? fallback : s;
}

/** Broken or missing values fall back to the defaults (never to "no limit") */
export function readBudgetConfig(env: EnvLike): BudgetConfig {
  return {
    totalTry: money(env.AI_BUDGET_TRY_TOTAL, AI_BUDGET_DEFAULTS.totalTry),
    dailyTry: money(env.AI_BUDGET_TRY_DAILY, AI_BUDGET_DEFAULTS.dailyTry),
    windowEnd: isoDay(env.AI_BUDGET_WINDOW_END, AI_BUDGET_DEFAULTS.windowEnd),
    monthlyAfterTry: money(env.AI_BUDGET_TRY_MONTHLY_AFTER, AI_BUDGET_DEFAULTS.monthlyAfterTry),
  };
}

/** What one call is charged, in kuruş (estimate × safety factor, rounded up) */
export function chargeKurus(costTry: number): number {
  return Math.max(1, Math.ceil(costTry * AI_BUDGET_SAFETY * AI_BUDGET_UNIT - 1e-9));
}

export type BudgetScopeName = 'day' | 'total' | 'month';

interface Scope {
  name: BudgetScopeName;
  key: string;
  /** kuruş; Infinity when this counter is written but not enforced right now */
  limit: number;
  ttl: number | null;
}

export function inBudgetWindow(cfg: BudgetConfig, now: Date): boolean {
  return istanbulDay(now) <= cfg.windowEnd;
}

/** All three counters; the ones not enforced right now carry an infinite limit */
function scopes(cfg: BudgetConfig, now: Date): Scope[] {
  const inWindow = inBudgetWindow(cfg, now);
  return [
    { name: 'day', key: quotaKeys.budgetDay(now), limit: Math.round(cfg.dailyTry * AI_BUDGET_UNIT), ttl: DAY_TTL_S },
    { name: 'total', key: quotaKeys.budgetTotal(), limit: inWindow ? Math.round(cfg.totalTry * AI_BUDGET_UNIT) : Infinity, ttl: null },
    { name: 'month', key: quotaKeys.budgetMonth(now), limit: inWindow ? Infinity : Math.round(cfg.monthlyAfterTry * AI_BUDGET_UNIT), ttl: MONTH_TTL_S },
  ];
}

export const BUDGET_ERROR: Record<BudgetScopeName, AiErrorCode> = { day: 'budget_day', total: 'budget_total', month: 'budget_month' };

export interface BudgetHold {
  readonly kurus: number;
  /** Gives the reservation back (Google answered 4xx: not billed). Safe to call once. */
  refund(): Promise<void>;
}

export type BudgetResult = { ok: true; hold: BudgetHold } | { ok: false; scope: BudgetScopeName };

/** Reserves `costTry` before the Google call; a refused reservation is rolled back and adds nothing */
export async function reserveBudget(counter: CounterStore, cfg: BudgetConfig, now: Date, costTry: number): Promise<BudgetResult> {
  const kurus = chargeKurus(costTry);
  const list = scopes(cfg, now);
  const used = await Promise.all(list.map((s) => counter.incrBy(s.key, kurus, s.ttl)));
  const over = list.find((s, i) => used[i] > s.limit);
  if (over) {
    await Promise.all(list.map((s) => counter.decrBy(s.key, kurus)));
    return { ok: false, scope: over.name };
  }
  let given = false;
  return {
    ok: true,
    hold: {
      kurus,
      async refund() {
        if (given) return;
        given = true;
        await Promise.all(list.map((s) => counter.decrBy(s.key, kurus)));
      },
    },
  };
}

/** Remaining money in ₺ under the tightest applicable cap (read only) */
export async function remainingBudgetTry(counter: CounterStore, cfg: BudgetConfig, now: Date): Promise<number> {
  const list = scopes(cfg, now);
  const used = await Promise.all(list.map((s) => counter.get(s.key)));
  const left = Math.min(...list.map((s, i) => s.limit - used[i]));
  return Math.max(0, left) / AI_BUDGET_UNIT;
}
