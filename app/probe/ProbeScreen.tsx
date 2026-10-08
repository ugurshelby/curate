"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Circle, Copy, Download, Loader2, RotateCcw, Share2 } from "lucide-react";
import { MATRIX_KEYS, MATRIX_LABELS, probeFileName, validateProbeReport, type ProbeReport, type ProbeStatus } from "@/lib/probe/schema";
import { WEB_STEPS, requestMotionPermission, runWebProbe, type FillMode } from "@/lib/probe/run-web";
import { kelvinToRgb } from "@/lib/probe/frame-stats";
import { copyText, downloadJson, shareJson } from "@/lib/probe/export";

const STATUS_LABEL: Record<ProbeStatus, string> = {
  var: "Var",
  yok: "Yok",
  "kabul-edildi-etkisiz": "Etkisiz",
  etkili: "Etkili",
  hata: "Hata",
  atlandı: "Atlandı",
};
// Yeşil yalnız başarı, kırmızı yalnız hata (CDS §2); diğerleri nötr
const STATUS_CLASS: Record<ProbeStatus, string> = {
  var: "text-ink-1",
  yok: "text-ink-3",
  "kabul-edildi-etkisiz": "text-ink-2",
  etkili: "text-success",
  hata: "text-danger",
  atlandı: "text-ink-3",
};

/** Dolgu ışığı renkleri: beyaz ve 3000 K sıcak beyaz (renk sıcaklığından hesaplanır, sabit renk değil) */
const FILL_RGB: Record<Exclude<FillMode, "kapalı">, [number, number, number]> = {
  beyaz: [255, 255, 255],
  sıcak: kelvinToRgb(3000),
};

type Phase = "hazır" | "çalışıyor" | "bitti";

export function ProbeScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fillRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("hazır");
  const [step, setStep] = useState(-1);
  const [fill, setFill] = useState<FillMode>("kapalı");
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (fill === "kapalı" || !fillRef.current) return;
    const ctx = fillRef.current.getContext("2d");
    if (!ctx) return;
    const [r, g, b] = FILL_RGB[fill];
    ctx.putImageData(new ImageData(new Uint8ClampedArray([r, g, b, 255]), 1, 1), 0, 0);
  }, [fill]);

  // Sayfadan çıkılırsa kamera kapanır
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      const s = v?.srcObject as MediaStream | null;
      s?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // iOS tarzı hareket izni dokunuşun içinde istenmeli; Android Chrome'da null döner
    const motion = requestMotionPermission();
    setPhase("çalışıyor");
    setReport(null);
    setFatal(null);
    setMessage(null);
    setStep(0);
    runWebProbe({ video, setFill, onStep: setStep }, motion)
      .then((r) => setReport(r))
      .catch((e) => setFatal(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setFill("kapalı");
        setPhase("bitti");
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
        { label: "Var", n: counts.var + counts.etkili, cls: "text-ink-1" },
        { label: "Etkisiz", n: counts["kabul-edildi-etkisiz"], cls: "text-ink-1" },
        { label: "Yok", n: counts.yok, cls: "text-ink-1" },
        { label: "Hata", n: counts.hata, cls: counts.hata ? "text-danger" : "text-ink-1" },
      ]
    : [];

  return (
    <main className="min-h-[100dvh] bg-base px-4 pt-[calc(var(--safe-area-top)+20px)] pb-[calc(var(--safe-area-bottom)+32px)]">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] leading-tight text-ink-1">Donanım yoklaması</h1>
          <p className="text-sm leading-snug tracking-[-0.01em] text-ink-2">
            Kameranın ve donanımın tarayıcıya ne verdiğini ölçer. Görüntü kaydedilmez, hiçbir veri gönderilmez; rapor yalnız bu telefonda oluşur.
          </p>
        </header>

        {phase === "hazır" && (
          <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 text-sm leading-snug text-ink-2">
            <p className="text-ink-1 font-medium">Başlamadan önce</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>Arka kamerayı hem aydınlık hem karanlık bölgesi olan sabit bir sahneye tut (ör. pencere ve duvar). Test boyunca telefonu kıpırdatma.</li>
              <li>Kamera izni istenecek; hareket izni sorulursa onu da ver.</li>
              <li>Sonda ekran bir süre beyaz ve sıcak beyaz yanar (ön kamera dolgu ışığı testi). Ekranı 20 cm uzaktaki bir duvara ya da avucuna çevir.</li>
              <li>Toplam yaklaşık 1–2 dakika sürer.</li>
            </ul>
          </section>
        )}

        {phase === "hazır" && (
          <button
            type="button"
            onClick={start}
            className="press touch-target h-12 w-full rounded-full bg-accent-fill text-base font-semibold text-on-accent"
          >
            Testi başlat
          </button>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Kamera önizlemesi"
          className={phase === "çalışıyor" ? "aspect-[4/3] w-full rounded-lg border border-separator bg-surface object-cover" : "hidden"}
        />

        {phase === "çalışıyor" && (
          <ol className="flex flex-col gap-2 rounded-lg border border-separator bg-surface p-4" aria-live="polite">
            {WEB_STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-3 text-sm text-ink-1">
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

        {phase === "bitti" && fatal && (
          <p role="alert" className="rounded-lg border border-separator bg-surface p-4 text-sm text-danger">
            Test durdu: {fatal}
          </p>
        )}

        {phase === "bitti" && report && (
          <>
            <p className="text-sm font-medium text-ink-1" data-probe-done>
              Test bitti · {Math.round(report.meta.süreMs / 1000)} sn · {report.tests.length} ölçüm
            </p>

            <section className="grid grid-cols-4 gap-2" aria-label="Özet">
              {groups.map((g) => (
                <div key={g.label} className="flex flex-col items-center rounded-lg border border-separator bg-surface py-3">
                  <span className={`num-metric text-xl font-semibold ${g.cls}`}>{g.n}</span>
                  <span className="text-xs text-ink-2">{g.label}</span>
                </div>
              ))}
            </section>

            <section className="flex flex-col rounded-lg border border-separator bg-surface" aria-label="Ne mümkün">
              <h2 className="px-4 pt-3 pb-1 text-base font-semibold tracking-[-0.02em] text-ink-1">Ne mümkün</h2>
              <ul>
                {MATRIX_KEYS.map((k) => {
                  const m = report.summary.matris[k];
                  return (
                    <li key={k} className="flex flex-col gap-0.5 border-t border-separator px-4 py-2.5 first:border-t-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink-1">{MATRIX_LABELS[k]}</span>
                        <span className={`text-sm font-medium ${STATUS_CLASS[m.durum]}`}>{STATUS_LABEL[m.durum]}</span>
                      </div>
                      <span className="text-xs leading-snug text-ink-3">{m.ayrıntı}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-2" aria-label="Dışa aktar">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-ink-1">Dışa aktar</h2>
              <p className="text-xs text-ink-3 num-metric">{fileName}</p>
              <button
                type="button"
                onClick={act(() => shareJson(fileName, json), "Paylaşıldı")}
                className="press touch-target h-12 w-full gap-2 rounded-full bg-accent-fill text-base font-semibold text-on-accent"
              >
                <Share2 size={18} aria-hidden /> Paylaş
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={act(() => downloadJson(fileName, json), "İndirildi")}
                  className="press touch-target h-11 gap-2 rounded-full bg-surface-2 text-sm font-medium text-ink-1"
                >
                  <Download size={16} aria-hidden /> İndir
                </button>
                <button
                  type="button"
                  onClick={act(() => copyText(json), "Panoya kopyalandı")}
                  className="press touch-target h-11 gap-2 rounded-full bg-surface-2 text-sm font-medium text-ink-1"
                >
                  <Copy size={16} aria-hidden /> Kopyala
                </button>
              </div>
              {message && (
                <p role="status" className="text-sm text-ink-2">
                  {message}
                </p>
              )}
              <p className={`text-xs ${errors.length ? "text-danger" : "text-ink-3"}`}>
                Şema doğrulaması: {errors.length ? errors.join("; ") : "geçti (probe/v1)"}
              </p>
            </section>

            <details className="rounded-lg border border-separator bg-surface">
              <summary className="touch-target cursor-pointer justify-start px-4 text-sm font-medium text-ink-1">Tüm ölçümler ({report.tests.length})</summary>
              <ul>
                {report.tests.map((t) => (
                  <li key={t.id} className="flex flex-col gap-0.5 border-t border-separator px-4 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-ink-1">{t.ad}</span>
                      <span className={`shrink-0 text-xs font-medium ${STATUS_CLASS[t.durum]}`}>{STATUS_LABEL[t.durum]}</span>
                    </div>
                    <span className="break-words text-xs leading-snug text-ink-3">{t.ayrıntı}</span>
                  </li>
                ))}
              </ul>
            </details>

            {report.meta.notlar.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs leading-snug text-ink-3">
                {report.meta.notlar.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}

            <details className="rounded-lg border border-separator bg-surface">
              <summary className="touch-target cursor-pointer justify-start px-4 text-sm font-medium text-ink-1">Ham JSON</summary>
              <pre data-probe-json className="max-h-[50dvh] overflow-auto border-t border-separator p-4 font-mono text-xs leading-snug text-ink-2 select-text">
                {json}
              </pre>
            </details>
          </>
        )}
        {phase === "bitti" && (
          <button
            type="button"
            onClick={start}
            className="press touch-target h-11 w-full gap-2 rounded-full bg-surface-2 text-sm font-medium text-ink-1"
          >
            <RotateCcw size={16} aria-hidden /> Testi yeniden başlat
          </button>
        )}
      </div>

      {fill !== "kapalı" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" aria-live="polite">
          <canvas ref={fillRef} width={1} height={1} className="absolute inset-0 h-full w-full" aria-hidden />
          <span className="relative text-sm font-medium text-black/60">Dolgu ışığı testi: {fill === "beyaz" ? "beyaz" : "sıcak beyaz"}</span>
        </div>
      )}
    </main>
  );
}
