"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Circle, Copy, Download, Loader2, RotateCcw, Share2 } from "lucide-react";
import { MATRIX_KEYS, MATRIX_LABELS, probeFileName, validateProbeReport, type ProbeReport, type ProbeStatus } from "@/lib/probe/schema";
import { requestMotionPermission, runWebProbe, type FillMode } from "@/lib/probe/run-web";
import { kelvinToRgb } from "@/lib/probe/frame-stats";
import { copyText, downloadJson, shareJson } from "@/lib/probe/export";
import { trProbe as t } from "@/lib/i18n/tr";

// Green only for success, red only for errors (CDS); everything else neutral
const STATUS_CLASS: Record<ProbeStatus, string> = {
  var: "text-ink-1",
  yok: "text-ink-3",
  "kabul-edildi-etkisiz": "text-ink-2",
  etkili: "text-success",
  hata: "text-danger",
  atlandı: "text-ink-3",
};

/** Fill light: white and 3000 K warm white, computed from colour temperature (not a fixed colour) */
const FILL_RGB: Record<Exclude<FillMode, "off">, [number, number, number]> = {
  white: [255, 255, 255],
  warm: kelvinToRgb(3000),
};

type Phase = "ready" | "running" | "done";

export function ProbeScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fillRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(-1);
  const [fill, setFill] = useState<FillMode>("off");
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (fill === "off" || !fillRef.current) return;
    const ctx = fillRef.current.getContext("2d");
    if (!ctx) return;
    const [r, g, b] = FILL_RGB[fill];
    ctx.putImageData(new ImageData(new Uint8ClampedArray([r, g, b, 255]), 1, 1), 0, 0);
  }, [fill]);

  // Leaving the page stops the camera
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      const s = v?.srcObject as MediaStream | null;
      s?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // iOS-style motion permission must be requested inside the tap; Android Chrome returns null
    const motion = requestMotionPermission();
    setPhase("running");
    setReport(null);
    setFatal(null);
    setMessage(null);
    setStep(0);
    runWebProbe({ video, setFill, onStep: setStep }, motion)
      .then((r) => setReport(r))
      .catch((e) => setFatal(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setFill("off");
        setPhase("done");
      });
  }, []);

  const json = report ? JSON.stringify(report, null, 2) : "";
  const fileName = report ? probeFileName("web", new Date(report.meta.zaman)) : "";
  const errors = report ? validateProbeReport(report) : [];

  const act = (fn: () => Promise<unknown> | unknown, ok: string) => async () => {
    try {
      const r = await fn();
      setMessage(typeof r === "string" ? `${ok}: ${r}` : ok);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const counts = report?.summary.sayım;
  const groups = counts
    ? [
        { label: t.groups.var, n: counts.var + counts.etkili, danger: false },
        { label: t.groups.etkisiz, n: counts["kabul-edildi-etkisiz"], danger: false },
        { label: t.groups.yok, n: counts.yok, danger: false },
        { label: t.groups.hata, n: counts.hata, danger: counts.hata > 0 },
      ]
    : [];

  return (
    <main className="min-h-[100dvh] bg-base px-4 pt-[calc(var(--safe-area-top)+20px)] pb-[calc(var(--safe-area-bottom)+32px)]">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-display text-ink-1">{t.title}</h1>
          <p className="text-subhead text-ink-2">{t.lead}</p>
        </header>

        {phase === "ready" && (
          <section className="material-card flex flex-col gap-3 rounded-lg p-4">
            <p className="text-headline text-ink-1">{t.beforeTitle}</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-subhead text-ink-2">
              {t.before.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {phase === "ready" && (
          <button type="button" onClick={start} className="press touch-target h-12 w-full rounded-full bg-accent-fill text-headline text-on-accent">
            {t.start}
          </button>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label={t.preview}
          className={phase === "running" ? "aspect-[4/3] w-full rounded-lg border border-separator bg-surface object-cover" : "hidden"}
        />

        {phase === "running" && (
          <ol className="material-card flex flex-col gap-2 rounded-lg p-4" aria-live="polite">
            {t.steps.map((label, i) => (
              <li key={label} className="flex items-center gap-3 text-subhead text-ink-1">
                {i < step ? (
                  <Check size={18} className="text-success" aria-hidden />
                ) : i === step ? (
                  <Loader2 size={18} className="animate-spin text-ink-1" aria-hidden />
                ) : (
                  <Circle size={18} className="text-ink-3" aria-hidden />
                )}
                <span className={i > step ? "text-ink-3" : ""}>{label}</span>
              </li>
            ))}
          </ol>
        )}

        {phase === "done" && fatal && (
          <p role="alert" className="material-card rounded-lg p-4 text-subhead text-danger">
            {t.stopped(fatal)}
          </p>
        )}

        {phase === "done" && report && (
          <>
            <p className="text-subhead text-ink-1" data-probe-done>
              {t.done(Math.round(report.meta.süreMs / 1000), report.tests.length)}
            </p>

            <section className="grid grid-cols-4 gap-2" aria-label={t.summary}>
              {groups.map((g) => (
                <div key={g.label} className="material-card flex flex-col items-center rounded-lg py-3">
                  <span className={`num-metric text-title ${g.danger ? "text-danger" : "text-ink-1"}`}>{g.n}</span>
                  <span className="text-caption text-ink-2">{g.label}</span>
                </div>
              ))}
            </section>

            <section className="material-card flex flex-col rounded-lg" aria-label={t.matrix}>
              <h2 className="px-4 pt-3 pb-1 text-headline text-ink-1">{t.matrix}</h2>
              <ul>
                {MATRIX_KEYS.map((k) => {
                  const m = report.summary.matris[k];
                  return (
                    <li key={k} className="flex flex-col gap-0.5 border-t border-separator px-4 py-2.5 first:border-t-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-subhead text-ink-1">{MATRIX_LABELS[k]}</span>
                        <span className={`text-subhead ${STATUS_CLASS[m.durum]}`}>{t.status[m.durum]}</span>
                      </div>
                      <span className="text-caption text-ink-3">{m.ayrıntı}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-2" aria-label={t.export}>
              <h2 className="text-headline text-ink-1">{t.export}</h2>
              <p className="num-metric text-caption text-ink-3">{fileName}</p>
              <button
                type="button"
                onClick={act(() => shareJson(fileName, json), t.shared)}
                className="press touch-target h-12 w-full gap-2 rounded-full bg-accent-fill text-headline text-on-accent"
              >
                <Share2 size={18} aria-hidden /> {t.share}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={act(() => downloadJson(fileName, json), t.downloaded)}
                  className="press touch-target h-11 gap-2 rounded-full bg-surface-2 text-subhead text-ink-1"
                >
                  <Download size={16} aria-hidden /> {t.download}
                </button>
                <button
                  type="button"
                  onClick={act(() => copyText(json), t.copied)}
                  className="press touch-target h-11 gap-2 rounded-full bg-surface-2 text-subhead text-ink-1"
                >
                  <Copy size={16} aria-hidden /> {t.copy}
                </button>
              </div>
              {message && (
                <p role="status" className="text-subhead text-ink-2">
                  {message}
                </p>
              )}
              <p className={`text-caption ${errors.length ? "text-danger" : "text-ink-3"}`}>
                {errors.length ? t.schemaBad(errors.join("; ")) : t.schemaOk}
              </p>
            </section>

            <details className="material-card rounded-lg">
              <summary className="touch-target cursor-pointer justify-start px-4 text-subhead text-ink-1">{t.allTests(report.tests.length)}</summary>
              <ul>
                {report.tests.map((x) => (
                  <li key={x.id} className="flex flex-col gap-0.5 border-t border-separator px-4 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-subhead text-ink-1">{x.ad}</span>
                      <span className={`shrink-0 text-caption ${STATUS_CLASS[x.durum]}`}>{t.status[x.durum]}</span>
                    </div>
                    <span className="break-words text-caption text-ink-3">{x.ayrıntı}</span>
                  </li>
                ))}
              </ul>
            </details>

            {report.meta.notlar.length > 0 && (
              <ul className="flex flex-col gap-1 text-caption text-ink-3">
                {report.meta.notlar.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}

            <details className="material-card rounded-lg">
              <summary className="touch-target cursor-pointer justify-start px-4 text-subhead text-ink-1">{t.rawJson}</summary>
              <pre data-probe-json className="max-h-[50dvh] select-text overflow-auto whitespace-pre-wrap break-all border-t border-separator p-4 text-caption text-ink-2">
                {json}
              </pre>
            </details>

            <button type="button" onClick={start} className="press touch-target h-11 w-full gap-2 rounded-full bg-surface-2 text-subhead text-ink-1">
              <RotateCcw size={16} aria-hidden /> {t.restart}
            </button>
          </>
        )}
      </div>

      {fill !== "off" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" aria-live="polite">
          <canvas ref={fillRef} width={1} height={1} className="absolute inset-0 h-full w-full" aria-hidden />
          <span className="relative text-subhead text-black/60">{t.fill(fill === "warm")}</span>
        </div>
      )}
    </main>
  );
}
