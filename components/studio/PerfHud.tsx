"use client";

import React, { useEffect, useState } from "react";

/** Önizleme çizim süresini bildirmek için (yalnız ?perf=1 açıkken dinlenir) */
export function reportRenderTime(ms: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<number>("curate:render", { detail: ms }));
}

/**
 * Yalnız geliştirme ölçümü: ?perf=1 ile açılır.
 * Son kare süresi (rAF aralığı), son önizleme çizim süresi ve uzun görev (>50ms) sayısı.
 */
export function PerfHud() {
  const [enabled, setEnabled] = useState(false);
  const [frameMs, setFrameMs] = useState(0);
  const [worstFrameMs, setWorstFrameMs] = useState(0);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [longTasks, setLongTasks] = useState(0);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get("perf") === "1");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let last = performance.now();
    let worst = 0;
    let lastPaint = last;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      worst = Math.max(worst, dt);
      // Göstergeyi saniyede ~4 kez güncelle (kendisi ölçümü bozmasın)
      if (now - lastPaint > 250) {
        setFrameMs(dt);
        setWorstFrameMs(worst);
        worst = 0;
        lastPaint = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        setLongTasks((n) => n + list.getEntries().length);
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      observer = null;
    }

    const onRender = (e: Event) => setRenderMs((e as CustomEvent<number>).detail);
    window.addEventListener("curate:render", onRender);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("curate:render", onRender);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="fixed left-2 top-[calc(var(--safe-area-top)+64px)] z-[60] px-2 py-1 rounded-md bg-base/80 border border-separator text-xs text-ink-1 num-metric pointer-events-none leading-tight"
    >
      <div>Kare {frameMs.toFixed(1)} ms · en kötü {worstFrameMs.toFixed(0)} ms</div>
      <div>Çizim {renderMs === null ? "—" : `${renderMs.toFixed(0)} ms`}</div>
      <div>Uzun görev {longTasks}</div>
    </div>
  );
}
