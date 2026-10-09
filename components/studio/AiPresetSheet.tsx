"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { fetchAiStatus, requestAiPlan, type AiFailure } from "@/lib/ai/client";
import { AI_PLAN_COST_TRY, AI_PLAN_EST_SECONDS, AI_PLAN_STYLE_IDS, type AiPlanStyle } from "@/lib/ai/config";
import { LOCK_PATH } from "@/lib/access/session";
import type { AiPlanRecord } from "@/lib";

interface AiPresetSheetProps {
  open: boolean;
  onClose: () => void;
  /** Original photo (the plan's coordinates are on it) */
  getImage: () => Promise<HTMLImageElement | null>;
  /** Plan already stored for this photo, if any */
  current: AiPlanRecord | null;
  onResult: (record: AiPlanRecord) => void;
  onUseCurrent: () => void;
}

/**
 * AI Preset (D28): pick a style; the model returns a light/colour plan as JSON and Curate applies it locally.
 * One paid call per tap (same quota and PIN cookie as "AI ile onar"). No pixels come back.
 */
export function AiPresetSheet({ open, onClose, getImage, current, onResult, onUseCurrent }: AiPresetSheetProps) {
  const [running, setRunning] = useState<AiPlanStyle | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<AiFailure | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    // reading the status costs nothing; an unpaired device simply shows no budget line
    let cancelled = false;
    fetchAiStatus().then((r) => {
      if (!cancelled && r.ok) setBudget(r.remainingTry);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    const id = window.setInterval(() => setElapsed(Math.floor((performance.now() - t0) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [running]);

  if (!open) return null;

  const run = async (style: AiPlanStyle) => {
    // a double tap never sends a second paid request
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setElapsed(0);
    setRunning(style);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const img = await getImage();
      if (!img) {
        setError({ ok: false, code: "bad_image", message: tr.ai.prepareFailed });
        return;
      }
      const r = await requestAiPlan(style, img, ac.signal);
      if (r.ok) {
        if (r.remainingTry !== null) setBudget(r.remainingTry);
        onResult(r.record);
      } else setError(r);
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      setRunning(null);
    }
  };

  const styleName = (id: string) => tr.aiPreset.styles[id] ?? id;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-base/70 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr.aiPreset.title}
        data-ai-preset-sheet
        className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-sheet sm:rounded-sheet bg-surface p-5 pb-[calc(var(--safe-area-bottom)+20px)] border border-separator shadow-2xl animate-panel-in flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-headline text-ink-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ink-2" />
            {tr.aiPreset.title}
          </span>
          {!running && (
            <button
              type="button"
              onClick={onClose}
              aria-label={tr.common.close}
              className="touch-target press rounded-full text-ink-2 hover:text-ink-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {running ? (
          <div role="status" className="flex flex-col gap-2">
            <span className="text-sm text-ink-1">{tr.aiPreset.running(styleName(running))}</span>
            <span className="text-xs text-ink-2 num-metric">{tr.aiPreset.seconds(elapsed, AI_PLAN_EST_SECONDS)}</span>
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="press h-11 rounded-xl bg-surface-2 text-ink-1 text-sm font-semibold"
            >
              {tr.aiPreset.cancel}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-ink-2">{tr.aiPreset.intro}</p>
            {current && (
              <button
                type="button"
                onClick={onUseCurrent}
                className="press h-11 px-3 rounded-xl border border-accent bg-accent/15 text-accent text-sm font-semibold text-left"
              >
                {tr.aiPreset.useCurrent(styleName(current.style))}
              </button>
            )}
            <div className="flex flex-col rounded-xl bg-surface-2 border border-separator divide-y divide-separator">
              {AI_PLAN_STYLE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => run(id)}
                  className="press min-h-[52px] px-3 py-2 flex items-center justify-between gap-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink-1">{styleName(id)}</span>
                    <span className="text-xs text-ink-2">{tr.aiPreset.hints[id]}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-2 num-metric">
                    {tr.aiPreset.estimate(AI_PLAN_EST_SECONDS, AI_PLAN_COST_TRY)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {error && !running && (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-sm text-danger">
              {error.message}
            </p>
            {error.code === "pin_required" && (
              <button
                type="button"
                onClick={() => window.location.assign(LOCK_PATH)}
                className="press h-11 rounded-xl bg-surface-2 text-ink-1 text-sm font-semibold"
              >
                {tr.aiPreset.unlock}
              </button>
            )}
          </div>
        )}

        {budget !== null && (
          <p className="text-xs text-ink-2 num-metric" data-ai-budget>
            {tr.ai.budgetLeft(budget)}
          </p>
        )}
        <p className="text-xs text-ink-3">{tr.aiPreset.privacy}</p>
      </div>
    </div>
  );
}
