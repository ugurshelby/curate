"use client";

import React from "react";
import { ArrowLeft, Download } from "lucide-react";
import { tr } from "@/lib/i18n/tr";

/**
 * Ortak mobil iskelet (CDS §6): header / sahne / alt yığın.
 * Hiçbir bölge görselin üstüne bindirilmez; sahne kalan alanı alır ve panel açılınca gerçekten küçülür.
 * Ölçüt: [data-stage].top >= header.bottom ve [data-stage].bottom <= [data-bottom-stack].top
 */

interface StudioShellProps {
  title: string;
  onBack: () => void;
  exportLabel?: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  /** Sahne içeriği: çağıran, görsel kutusuna data-stage verir */
  stage: React.ReactNode;
  /** Sahnenin altındaki küçük araç satırı (hedef, boyut notu, Doldur/Sığdır) */
  stageToolbar?: React.ReactNode;
  /** Alt yığındaki kaydırılabilir panel (cam) */
  panel?: React.ReactNode;
  /** Alt çubuk (cam): "+" menüsü, filmstrip, modül eylemleri */
  bar: React.ReactNode;
  /** Menü, sayfa, modal gibi katmanlar */
  children?: React.ReactNode;
}

export function StudioShell({
  title,
  onBack,
  exportLabel = tr.common.export,
  onExport,
  exportDisabled,
  stage,
  stageToolbar,
  panel,
  bar,
  children,
}: StudioShellProps) {
  const chromeWidth = "mx-3 sm:mx-auto sm:w-[min(42rem,calc(100%-24px))]";

  return (
    <div className="studio-root bg-base text-ink-1 select-none">
      <header
        className={`${chromeWidth} shrink-0 mt-[calc(var(--safe-area-top)+8px)] h-[52px] px-1 flex items-center gap-1 rounded-2xl glass-panel`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={tr.common.back}
          className="touch-target press rounded-xl text-ink-2 hover:text-ink-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="flex-1 min-w-0 flex justify-center">
          {/* Paylaşılan öğe: ana sayfa kartının başlığı buraya dönüşür (CDS §5) */}
          <span className="truncate text-headline text-ink-1" style={{ viewTransitionName: "module-title" }}>
            {title}
          </span>
        </h1>

        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="touch-target press shrink-0 h-11 px-3.5 rounded-md bg-accent-fill text-on-accent text-subhead font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{exportLabel}</span>
          </button>
        ) : (
          <span className="w-11 shrink-0" aria-hidden />
        )}
      </header>

      <main className="flex-1 min-h-[34dvh] flex flex-col gap-2 px-3 pt-2 pb-2">
        <div className="stage-fit flex-1 min-h-0 flex items-center justify-center">{stage}</div>
        {stageToolbar && (
          <div className="shrink-0 flex items-center justify-between gap-1.5">{stageToolbar}</div>
        )}
      </main>

      <div
        data-bottom-stack
        className={`${chromeWidth} shrink-0 max-h-[40dvh] mb-[calc(var(--safe-area-bottom)+8px)] flex flex-col gap-2 min-h-0`}
      >
        {panel && (
          <section className="min-h-0 overflow-y-auto overscroll-contain rounded-2xl glass-panel animate-panel-in">
            {panel}
          </section>
        )}
        <div className="shrink-0 rounded-2xl glass-panel">{bar}</div>
      </div>

      {children}
    </div>
  );
}

/** Sahne altındaki küçük, cam olmayan boyut notu */
export function StageNote({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-ink-3 num-metric whitespace-nowrap">{children}</span>;
}
