"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, ImagePlus, Images, Trash2 } from "lucide-react";

interface AddMenuProps {
  onUpload: () => void;
  onReference: () => void;
  onClear?: () => void;
  /** Ekleme kapalıysa (ör. Story 6 dolu) kısa açıklama */
  addDisabledReason?: string;
}

/** Alt çubuktaki "+" menüsü: Fotoğraf Yükle, Referans Görsel Yükle, Temizle. Cam değil, düz yüzey (CDS §5). */
export function AddMenu({ onUpload, onReference, onClear, addDisabledReason }: AddMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const addDisabled = !!addDisabledReason;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ekle"
        aria-expanded={open}
        className={`touch-target press rounded-xl border ${
          open ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-1 border-separator"
        }`}
      >
        <Plus className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] p-1 rounded-xl bg-surface border border-separator shadow-2xl flex flex-col animate-panel-in"
        >
          {addDisabled && (
            <p className="px-3 py-2 text-xs text-ink-2">{addDisabledReason}</p>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={addDisabled}
            onClick={() => run(onUpload)}
            className="h-11 px-3 rounded-lg text-left text-sm text-ink-1 flex items-center gap-2.5 hover:bg-separator"
          >
            <ImagePlus className="w-4 h-4 text-ink-2" />
            <span>Fotoğraf Yükle</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={addDisabled}
            onClick={() => run(onReference)}
            className="h-11 px-3 rounded-lg text-left text-sm text-ink-2 flex items-center gap-2.5 hover:bg-separator"
          >
            <Images className="w-4 h-4" />
            <span>Referans Görsel Yükle</span>
          </button>
          {onClear && (
            <>
              <div className="h-px bg-surface-2 my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => run(onClear)}
                className="h-11 px-3 rounded-lg text-left text-sm text-danger flex items-center gap-2.5 hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4" />
                <span>Seriyi Temizle</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
