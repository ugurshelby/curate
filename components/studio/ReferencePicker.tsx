"use client";

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
      setError(err instanceof Error ? err.message : "Referans görseller yüklenemedi.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 animate-panel-in"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Referans görsel seç"
        className="w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-[#18181b] border border-white/10 shadow-2xl pb-[var(--safe-area-bottom)]"
      >
        <div className="shrink-0 flex items-center justify-between gap-2 pl-5 pr-2 pt-2">
          <div className="flex flex-col py-2">
            <span className="text-[15px] font-semibold text-[#f5f5f7]">Referans Görsel Yükle</span>
            <span className="text-xs text-[#71717a]">
              {maxSelect <= 0
                ? "Bu modülde yer kalmadı."
                : single
                  ? "Bir görsel seç."
                  : `En çok ${maxSelect} görsel seçebilirsin.`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Kapat"
            className="touch-target press rounded-full text-[#a1a1aa] hover:text-white"
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
                    isOn ? "border-[#f5a623]" : "border-transparent"
                  } disabled:opacity-40`}
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
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#f5a623] text-black flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="px-5 pt-2 text-xs text-rose-400">{error}</p>}

        <div className="shrink-0 flex items-center gap-2 p-4">
          {!single && maxSelect > 0 && (
            <button
              type="button"
              onClick={selectAll}
              disabled={busy}
              className="touch-target press h-11 px-4 rounded-xl bg-white/10 text-sm text-[#f5f5f7]"
            >
              {maxSelect >= REFERENCE_IMAGES.length ? "Hepsi" : `İlk ${maxSelect}`}
            </button>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={busy || selected.length === 0}
            className="touch-target press flex-1 h-11 rounded-xl bg-[#f5a623] text-black text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {busy && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{busy ? "Yükleniyor" : `Ekle (${selected.length})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
