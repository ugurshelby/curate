"use client";

import { tr } from "@/lib/i18n/tr";
import React, { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { SuspectRegion } from "@/lib";
import { CompareStage } from "./CompareStage";

interface AiReviewScreenProps {
  resultUrl: string;
  originalUrl: string;
  /** Sonucun boyutu */
  width: number;
  height: number;
  taskLabel: string;
  /** Hafif otomatik işaret; kesin tespit değil */
  suspect: SuspectRegion | null;
  onUse: () => void;
  onDiscard: () => void;
}

/**
 * Tam ekran önce/sonra kontrolü (spec §4.5 E12). Kullanıcı "Kullan" demeden sonuç kütüphaneye girmez.
 * Basılı tut: orijinal. Çift dokun veya "Yakından bak": %100 görünüm (CompareStage).
 */
export function AiReviewScreen({ resultUrl, originalUrl, width, height, taskLabel, suspect, onUse, onDiscard }: AiReviewScreenProps) {
  const [detail, setDetail] = useState(false);
  const ratio = width / height;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr.review.aria}
      className="fixed inset-0 z-[55] bg-base flex flex-col animate-fade-in"
    >
      <div
        data-review-header
        className="shrink-0 px-4 pt-[calc(var(--safe-area-top)+12px)] pb-2 flex flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-semibold text-ink-1">{tr.review.title}</span>
          <span className="text-xs text-ink-2 truncate">{taskLabel}</span>
        </div>
        <p className="text-sm text-ink-1">{tr.review.warning}</p>
      </div>

      <div className="stage-fit flex-1 min-h-0 flex items-center justify-center px-3">
        <div
          data-review-stage
          className="relative rounded-xl overflow-hidden border border-separator bg-base"
          style={{ aspectRatio: `${ratio}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
        >
          <CompareStage
            beforeUrl={originalUrl}
            afterUrl={resultUrl}
            resultW={width}
            resultH={height}
            afterLabel={tr.review.resultLabel}
            detail={detail}
            onDetailChange={setDetail}
            overlay={
              suspect && (
                <div
                  className="absolute border-2 border-dashed border-white rounded-md pointer-events-none"
                  style={{
                    left: `${suspect.x * 100}%`,
                    top: `${suspect.y * 100}%`,
                    width: `${suspect.w * 100}%`,
                    height: `${suspect.h * 100}%`,
                  }}
                >
                  <span className="absolute left-0 top-full mt-1 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/80 text-xs text-white">
                    {tr.review.lookHere}
                  </span>
                </div>
              )
            }
          />
        </div>
      </div>

      <div
        data-review-bar
        className="shrink-0 px-4 pt-2 pb-[calc(var(--safe-area-bottom)+12px)] flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink-3 min-w-0">{tr.review.holdHint}</p>
          <button
            type="button"
            data-detail-toggle
            onClick={() => setDetail((d) => !d)}
            aria-pressed={detail}
            className="touch-target press shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-surface-2 text-ink-1 border border-separator flex items-center gap-1.5"
          >
            {detail ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            {detail ? tr.compare.detailOff : tr.compare.detailOn}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="press flex-1 h-12 rounded-xl bg-surface-2 text-ink-1 text-sm font-semibold"
          >
            {tr.review.discard}
          </button>
          <button
            type="button"
            onClick={onUse}
            className="press flex-1 h-12 rounded-xl bg-accent-fill text-on-accent text-sm font-semibold"
          >
            {tr.review.use}
          </button>
        </div>
      </div>
    </div>
  );
}
