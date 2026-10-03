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
          open ? "bg-[#f5a623] text-black border-[#f5a623]" : "bg-white/10 text-white border-white/10"
        }`}
      >
        <Plus className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] p-1 rounded-xl bg-[#18181b] border border-white/15 shadow-2xl flex flex-col animate-panel-in"
        >
          {addDisabled && (
            <p className="px-3 py-2 text-xs text-[#a1a1aa]">{addDisabledReason}</p>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={addDisabled}
            onClick={() => run(onUpload)}
            className="h-11 px-3 rounded-lg text-left text-sm text-[#f5f5f7] flex items-center gap-2.5 hover:bg-white/10 disabled:opacity-40"
          >
            <ImagePlus className="w-4 h-4 text-[#f5a623]" />
            <span>Fotoğraf Yükle</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={addDisabled}
            onClick={() => run(onReference)}
            className="h-11 px-3 rounded-lg text-left text-sm text-[#a1a1aa] flex items-center gap-2.5 hover:bg-white/10 disabled:opacity-40"
          >
            <Images className="w-4 h-4" />
            <span>Referans Görsel Yükle</span>
          </button>
          {onClear && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => run(onClear)}
                className="h-11 px-3 rounded-lg text-left text-sm text-rose-400 flex items-center gap-2.5 hover:bg-rose-500/10"
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
