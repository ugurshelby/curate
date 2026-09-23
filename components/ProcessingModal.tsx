"use client";

import React from "react";
import { ExportProgress } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface ProcessingModalProps {
  progress: ExportProgress;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ progress }) => {
  if (!progress.isExporting) return null;

  const percentage =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-glass">
        {/* Animated Icon */}
        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>

        {/* Title & Phase */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Kayıpsız Dışa Aktarma
          </h3>
          <p className="text-xs text-neutral-400 font-mono">
            {progress.phase || "İşleniyor..."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-1.5">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>
              {progress.current} / {progress.total}
            </span>
            <span>%{percentage}</span>
          </div>
        </div>

        <p className="text-[10px] text-neutral-500">
          EXIF ve GPS meta verileri temizleniyor, Lanczos-3 keskinleştirmesi uygulanıyor.
        </p>
      </div>
    </div>
  );
};
