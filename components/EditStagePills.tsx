"use client";

import React from "react";
import { FocusCategory } from "@/lib/types";
import { Palette, Sparkles, Frame, Crop, Columns2, Undo2, Redo2 } from "lucide-react";

interface EditStagePillsProps {
  activeCategory: FocusCategory;
  onSelect: (category: FocusCategory) => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBatchSync: () => void;
  syncSuccess?: boolean;
  layout?: "floating" | "sheet";
}

const PILLS: Array<{
  id: NonNullable<FocusCategory>;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "preset-color", label: "Preset / Renk", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "analog", label: "Analog Doku", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "frame", label: "Çerçeve", icon: <Frame className="w-3.5 h-3.5" /> },
  { id: "size-crop", label: "Boyut / Kırp", icon: <Crop className="w-3.5 h-3.5" /> },
];

export const EditStagePills: React.FC<EditStagePillsProps> = ({
  activeCategory,
  onSelect,
  splitView,
  onToggleSplitView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBatchSync,
  syncSuccess,
  layout = "floating",
}) => {
  const isSheet = layout === "sheet";

  return (
    <div
      className={
        isSheet
          ? "relative w-full z-30 pointer-events-none px-2 py-1"
          : "absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3 w-full max-w-2xl hidden sm:block"
      }
    >
      <div className={`pointer-events-auto flex flex-wrap items-center justify-center gap-2 ${isSheet ? "gap-1.5" : ""}`}>
        {PILLS.map((pill) => {
          const active = activeCategory === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onSelect(active ? null : pill.id)}
              className={`pressable min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 border shadow-glass transition-all ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-black/70 backdrop-blur-xl text-white border-white/15 hover:bg-white/15"
              }`}
            >
              {pill.icon}
              <span>{pill.label}</span>
            </button>
          );
        })}

        <div className="h-6 w-px bg-white/20 mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={onToggleSplitView}
          className={`pressable p-2 rounded-full border shadow-glass transition-all ${
            splitView
              ? "bg-amber-400 text-black border-amber-400"
              : "bg-black/70 backdrop-blur-xl text-white border-white/15 hover:bg-white/15"
          }`}
          title="Split View (kilitli zoom/pan)"
        >
          <Columns2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="pressable p-2 rounded-full bg-black/70 backdrop-blur-xl text-white border border-white/15 hover:bg-white/15 disabled:opacity-30"
          title="Geri Al (Ctrl/Cmd+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="pressable p-2 rounded-full bg-black/70 backdrop-blur-xl text-white border border-white/15 hover:bg-white/15 disabled:opacity-30"
          title="İleri Al (Ctrl/Cmd+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onBatchSync}
          className={`pressable px-3 py-2 rounded-full text-[11px] font-medium border shadow-glass transition-all ${
            syncSuccess
              ? "bg-emerald-500 text-black border-emerald-500"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-400 hover:text-black"
          }`}
          title="Efektleri serinin tamamına kopyala (kırpma/oran hariç)"
        >
          {syncSuccess ? "Eşitlendi" : "Batch Sync"}
        </button>
      </div>
    </div>
  );
};
