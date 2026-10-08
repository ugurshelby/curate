"use client";

import { tr } from "@/lib/i18n/tr";
import React, { useEffect, useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { REFERENCE_IMAGES, referenceImageUrl, fetchReferenceFiles } from "@/lib";

interface ReferencePickerProps {
  open: boolean;
  onClose: () => void;
  /** Seçilen referanslar File olarak döner (image/jpeg) */
  onConfirm: (files: File[]) => void;
  /** Modül sınırı: Story için kalan boş yer, Çerçeve/Upscale için 1 */
  maxSelect: number;
}

/**
 * Test amaçlı ikincil eylem: public/reference-images/ içinden seçim.
 * Aynı kökten fetch edilir; görseller hiçbir yere gönderilmez (spec §4.4 K3).
 */
export function ReferencePicker({ open, onClose, onConfirm, maxSelect }: ReferencePickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelected([]);
      setError("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const single = maxSelect === 1;
  const limitReached = selected.length >= maxSelect;

  const toggle = (file: string) => {
    setSelected((prev) => {
      if (prev.includes(file)) return prev.filter((f) => f !== file);
      if (single) return [file];
      if (prev.length >= maxSelect) return prev;
      return [...prev, file];
    });
  };

  const selectAll = () => {
    setSelected(REFERENCE_IMAGES.slice(0, maxSelect).map((r) => r.file));
  };

  const confirm = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const files = await fetchReferenceFiles(selected);
      onConfirm(files);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.reference.loadFailed);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-base/70 animate-panel-in"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr.reference.title}
        className="w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-surface border border-separator shadow-2xl pb-[var(--safe-area-bottom)]"
      >
        <div className="shrink-0 flex items-center justify-between gap-2 pl-5 pr-2 pt-2">
          <div className="flex flex-col py-2">
            <span className="text-[15px] font-semibold text-ink-1">{tr.common.loadReference}</span>
            <span className="text-xs text-ink-3">
              {maxSelect <= 0
                ? tr.reference.noRoom
                : single
                  ? tr.reference.pickOne
                  : tr.reference.pickMax(maxSelect)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={tr.common.close}
            className="touch-target press rounded-full text-ink-2 hover:text-ink-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {REFERENCE_IMAGES.map((ref) => {
              const isOn = selected.includes(ref.file);
              const blocked = !isOn && !single && limitReached;
              return (
                <button
                  key={ref.file}
                  type="button"
                  onClick={() => toggle(ref.file)}
                  disabled={maxSelect <= 0 || blocked}
                  aria-pressed={isOn}
                  aria-label={ref.label}
                  className={`press relative aspect-[4/5] rounded-xl overflow-hidden border-2 ${
                    isOn ? "border-accent" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referenceImageUrl(ref.file)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  {isOn && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent-fill text-on-accent flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="px-5 pt-2 text-xs text-danger">{error}</p>}

        <div className="shrink-0 flex items-center gap-2 p-4">
          {!single && maxSelect > 0 && (
            <button
              type="button"
              onClick={selectAll}
              disabled={busy}
              className="touch-target press h-11 px-4 rounded-xl bg-surface-2 text-sm text-ink-1"
            >
              {maxSelect >= REFERENCE_IMAGES.length ? tr.reference.all : tr.reference.firstN(maxSelect)}
            </button>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={busy || selected.length === 0}
            className="touch-target press flex-1 h-11 rounded-xl bg-accent-fill text-on-accent text-sm font-semibold flex items-center justify-center gap-2"
          >
            {busy && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{busy ? tr.reference.loading : tr.reference.addN(selected.length)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
