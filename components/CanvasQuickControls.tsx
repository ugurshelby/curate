"use client";

import React from "react";
import {
  Undo2,
  Redo2,
  Eye,
  Columns2,
  CopyCheck,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface CanvasQuickControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showOriginal: boolean;
  onSetShowOriginal: (show: boolean) => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  onBatchSync: () => void;
  syncSuccess?: boolean;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  onExitStudio: () => void;
  className?: string;
}

export const CanvasQuickControls: React.FC<CanvasQuickControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showOriginal,
  onSetShowOriginal,
  splitView,
  onToggleSplitView,
  onBatchSync,
  syncSuccess,
  isInspectorOpen,
  onToggleInspector,
  onExitStudio,
  className = "",
}) => {
  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none ${className}`}
    >
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-neutral-950/80 backdrop-blur-2xl border border-white/15 shadow-2xl">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="pressable p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-all"
            title="Geri Al (Ctrl/Cmd+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="pressable p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-all"
            title="İleri Al (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/15" />

        {/* Compare with Original */}
        <button
          type="button"
          onPointerDown={() => onSetShowOriginal(true)}
          onPointerUp={() => onSetShowOriginal(false)}
          onPointerLeave={() => onSetShowOriginal(false)}
          className={`pressable px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
            showOriginal
              ? "bg-amber-400 text-black font-semibold shadow-sm"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
          title="Orijinali Gör (Basılı Tut veya Boşluk Tuşu)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Orijinal</span>
        </button>

        {/* Split View */}
        <button
          type="button"
          onClick={onToggleSplitView}
          className={`pressable px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
            splitView
              ? "bg-amber-400 text-black font-semibold shadow-sm"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
          title="Yan Yana Karşılaştır (Split View)"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Split View</span>
        </button>

        <div className="h-4 w-[1px] bg-white/15" />

        {/* Batch Sync */}
        <button
          type="button"
          onClick={onBatchSync}
          className={`pressable px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
            syncSuccess
              ? "bg-emerald-500 text-black font-semibold shadow-sm"
              : "text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30"
          }`}
          title="Renk ve analog efektleri tüm seriye senkronize et"
        >
          {syncSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-current" />
              <span>Eşitlendi</span>
            </>
          ) : (
            <>
              <CopyCheck className="w-3.5 h-3.5 text-current" />
              <span>Seriye Eşitle</span>
            </>
          )}
        </button>

        <div className="h-4 w-[1px] bg-white/15" />

        {/* Toggle Studio Inspector Sidebar */}
        <button
          type="button"
          onClick={onToggleInspector}
          className={`pressable px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isInspectorOpen
              ? "bg-white text-black shadow-sm"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title="Düzenleme Panelini Göster / Gizle"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Düzenle</span>
        </button>

        {/* Exit Studio */}
        <button
          type="button"
          onClick={onExitStudio}
          className="pressable p-1.5 rounded-full text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
          title="Düzenlemeden Çık (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
