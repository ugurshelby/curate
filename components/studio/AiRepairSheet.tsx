"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Lock } from "lucide-react";
import {
  AI_TASKS,
  AI_TASK_IDS,
  AI_ASPECT_WARN,
  AiTask,
  AiErrorCode,
  nearestAspectRatio,
  loadAiPassword,
  saveAiPassword,
  fetchAiStatus,
  requestAiRepair,
} from "@/lib";

interface AiRepairSheetProps {
  open: boolean;
  onClose: () => void;
  /** Aktif fotoğrafın boyutu (oran uyarısı için) */
  size: { w: number; h: number } | null;
  /** Gönderilecek JPEG'i hazırlar (aktif fotoğrafın kendi pikselleri, ayarsız) */
  prepareInput: () => Promise<Blob>;
  /** Sonuç geldi: kontrol sayfası açılır (kütüphaneye henüz eklenmez) */
  onResult: (task: AiTask, blob: Blob) => void;
}

type Step = "checking" | "password" | "pick" | "running";
/** Bu hatalarda satırlar kapalı kalır */
const BLOCKING: AiErrorCode[] = ["disabled", "not_configured", "password_locked", "quota_day", "quota_month"];

/** "AI ile onar" alt sayfası (spec §4.5 E12): dört görev, süre ve ~₺; tek istek, iptal */
export function AiRepairSheet({ open, onClose, size, prepareInput, onResult }: AiRepairSheetProps) {
  const [step, setStep] = useState<Step>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ code: AiErrorCode; message: string } | null>(null);
  const [remaining, setRemaining] = useState<{ day: number; month: number } | null>(null);
  const [running, setRunning] = useState<{ task: AiTask; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Açılışta: kayıtlı şifre varsa doğrula ve kalan hakkı oku (para harcamaz)
  useEffect(() => {
    if (!open) return;
    setError(null);
    const stored = loadAiPassword();
    if (!stored) {
      setStep("password");
      return;
    }
    setStep("checking");
    let cancelled = false;
    fetchAiStatus(stored).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setRemaining({ day: r.remainingDay, month: r.remainingMonth });
        setStep("pick");
      } else if (r.code === "wrong_password") {
        saveAiPassword(null);
        setError(r);
        setStep("password");
      } else {
        setError(r);
        setStep("pick");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Çalışırken geçen süre
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((Date.now() - running.startedAt) / 1000), 250);
    return () => window.clearInterval(t);
  }, [running]);

  if (!open) return null;

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busyRef.current) return;
    busyRef.current = true;
    setStep("checking");
    const r = await fetchAiStatus(password);
    busyRef.current = false;
    if (r.ok) {
      saveAiPassword(password);
      setPassword("");
      setError(null);
      setRemaining({ day: r.remainingDay, month: r.remainingMonth });
      setStep("pick");
    } else {
      setError(r);
      setStep(r.code === "wrong_password" || r.code === "password_locked" || r.code === "network" ? "password" : "pick");
    }
  };

  const run = async (task: AiTask) => {
    // Çift dokunuş ikinci isteği göndermez
    if (busyRef.current) return;
    const stored = loadAiPassword();
    if (!stored) {
      setStep("password");
      return;
    }
    busyRef.current = true;
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning({ task, startedAt: Date.now() });
    setStep("running");
    try {
      const input = await prepareInput();
      // Hazırlık sırasında iptal: istek hiç gitmez (ücret yok)
      if (controller.signal.aborted) {
        setError({ code: "canceled", message: "İptal edildi." });
        setStep("pick");
        return;
      }
      const r = await requestAiRepair(task, input, stored, controller.signal);
      if (r.ok) {
        if (r.remainingDay !== null && r.remainingMonth !== null) {
          setRemaining({ day: r.remainingDay, month: r.remainingMonth });
        }
        onResult(task, r.blob);
        return;
      }
      if (r.code === "wrong_password") {
        saveAiPassword(null);
        setError(r);
        setStep("password");
        return;
      }
      setError(r);
      setStep("pick");
    } catch {
      setError({ code: "bad_image", message: "Fotoğraf hazırlanamadı." });
      setStep("pick");
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      setRunning(null);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const aspect = size ? nearestAspectRatio(size.w, size.h) : null;
  const blocked = !!error && BLOCKING.includes(error.code);
  const est = running ? AI_TASKS[running.task].estSeconds : 0;
  const pct = running ? Math.min(95, (elapsed / est) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-base/70 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI ile onar"
        data-ai-sheet
        className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-sheet sm:rounded-sheet bg-surface p-5 pb-[calc(var(--safe-area-bottom)+20px)] border border-separator shadow-2xl animate-panel-in flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-ink-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ink-2" />
            AI ile onar
          </span>
          {step !== "running" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="touch-target press rounded-full text-ink-2 hover:text-ink-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === "checking" && <p className="text-sm text-ink-2 h-11 flex items-center">Kontrol ediliyor…</p>}

        {step === "password" && (
          <form onSubmit={submitPassword} className="flex flex-col gap-2">
            <label htmlFor="ai-password" className="text-sm text-ink-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              AI şifresi (bir kez sorulur, bu tarayıcıda saklanır)
            </label>
            <div className="flex gap-2">
              <input
                id="ai-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-surface-2 border border-separator text-base text-ink-1"
              />
              <button
                type="submit"
                disabled={!password}
                className="press h-11 px-4 rounded-xl bg-accent-fill text-on-accent text-sm font-semibold"
              >
                Devam
              </button>
            </div>
          </form>
        )}

        {step === "pick" && (
          <>
            <p className="text-xs text-ink-2">En iyi sıra: önce AI ile onar, sonra kırp ve preset uygula.</p>
            {aspect && aspect.deviation > AI_ASPECT_WARN && (
              <p className="text-xs text-ink-1">
                Bu fotoğrafın oranı desteklenen oranlardan farklı; model kareyi kırpabilir veya uzatabilir.
              </p>
            )}
            <div className="flex flex-col rounded-xl bg-surface-2 border border-separator divide-y divide-separator">
              {AI_TASK_IDS.map((id) => {
                const t = AI_TASKS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={blocked}
                    onClick={() => run(id)}
                    className="press min-h-[52px] px-3 py-2 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-semibold text-ink-1">{t.label}</span>
                    <span className="shrink-0 text-xs text-ink-2 num-metric">
                      ~{t.estSeconds} sn · ~₺{t.costTry}
                    </span>
                  </button>
                );
              })}
            </div>
            {remaining && (
              <p className="text-xs text-ink-2 num-metric">
                Bugün kalan: {remaining.day} · Bu ay: {remaining.month}
              </p>
            )}
          </>
        )}

        {step === "running" && running && (
          <div role="status" className="flex flex-col gap-2">
            <span className="text-sm text-ink-1">{AI_TASKS[running.task].label} çalışıyor…</span>
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-ink-2 num-metric">
              {Math.floor(elapsed)} sn / ~{est} sn
            </span>
            <button
              type="button"
              onClick={cancel}
              className="press h-11 rounded-xl bg-surface-2 text-ink-1 text-sm font-semibold"
            >
              İptal
            </button>
          </div>
        )}

        {error && step !== "running" && (
          <p role="alert" className="text-sm text-danger">
            {error.message}
          </p>
        )}

        <p className="text-xs text-ink-3">Bu işlem için fotoğraf Google&apos;a gönderilir.</p>
      </div>
    </div>
  );
}
