"use client";

import React, { useRef, useState } from "react";
import { SuspectRegion } from "@/lib";

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

const HOLD_MS = 150;

/**
 * Tam ekran önce/sonra kontrolü (spec §4.5 E12). Kullanıcı "Kullan" demeden sonuç kütüphaneye girmez.
 * Basılı tut: orijinal.
 */
export function AiReviewScreen({ resultUrl, originalUrl, width, height, taskLabel, suspect, onUse, onDiscard }: AiReviewScreenProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const timerRef = useRef<number | null>(null);
  const ratio = width / height;

  const startHold = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setShowOriginal(true), HOLD_MS);
  };
  const endHold = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setShowOriginal(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI sonucunu kontrol et"
      className="fixed inset-0 z-[55] bg-black flex flex-col animate-fade-in"
    >
      <div
        data-review-header
        className="shrink-0 px-4 pt-[calc(var(--safe-area-top)+12px)] pb-2 flex flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-semibold text-[#f5f5f7]">Sonucu kontrol et</span>
          <span className="text-xs text-[#a1a1aa] truncate">{taskLabel}</span>
        </div>
        <p className="text-sm text-[#f5a623]">AI bazen fotoğrafta olmayan bir şey ekleyebilir. Kaydetmeden önce kontrol et.</p>
      </div>

      <div className="stage-fit flex-1 min-h-0 flex items-center justify-center px-3">
        <div
          data-review-stage
          className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c] select-none"
          style={{ aspectRatio: `${ratio}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="AI sonucu" draggable={false} className="w-full h-full object-contain pointer-events-none" />
          {suspect && !showOriginal && (
            <div
              className="absolute border-2 border-dashed border-[#f5a623] rounded-md pointer-events-none"
              style={{
                left: `${suspect.x * 100}%`,
                top: `${suspect.y * 100}%`,
                width: `${suspect.w * 100}%`,
                height: `${suspect.h * 100}%`,
              }}
            >
              <span className="absolute left-0 top-full mt-1 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/80 text-xs text-[#f5a623]">
                Buraya dikkatli bak
              </span>
            </div>
          )}
          {showOriginal && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalUrl} alt="" draggable={false} className="w-full h-full object-contain pointer-events-none" />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">Orijinal</span>
            </div>
          )}
        </div>
      </div>

      <div
        data-review-bar
        className="shrink-0 px-4 pt-2 pb-[calc(var(--safe-area-bottom)+12px)] flex flex-col gap-2"
      >
        <p className="text-xs text-[#71717a] text-center">Basılı tut: orijinal</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="press flex-1 h-12 rounded-xl bg-white/10 text-white text-sm font-semibold"
          >
            At
          </button>
          <button
            type="button"
            onClick={onUse}
            className="press flex-1 h-12 rounded-xl bg-[#f5a623] text-black text-sm font-semibold"
          >
            Kullan
          </button>
        </div>
      </div>
    </div>
  );
}
