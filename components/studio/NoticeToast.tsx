"use client";

import React, { useEffect } from "react";
import { useStudio } from "@/lib";

const NOTICE_MS = 4000;

/** Store'daki kısa bildirimi (ör. eski türetilmiş fotoğraf silindi) 4 sn gösterir. Cam değil, düz yüzey. */
export function NoticeToast() {
  const { state, actions } = useStudio();
  const notice = state.notice;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => actions.setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [notice, actions]);

  if (!notice) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 top-[calc(var(--safe-area-top)+68px)] z-[70] max-w-[calc(100%-24px)] px-3 py-2 rounded-xl bg-surface border border-separator shadow-2xl text-sm text-ink-1 animate-panel-in pointer-events-none"
    >
      {notice}
    </div>
  );
}

/** "Büyütülmüş" gibi türetilmiş fotoğraf rozeti (metin) */
export function DerivedBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-2 border border-separator text-xs text-ink-1 whitespace-nowrap">
      {label}
    </span>
  );
}
