"use client";

import React, { useState } from "react";
import { ExportPreset, CurateImage } from "@/lib/types";
import { EXPORT_PRESETS } from "@/lib/export/zip-exporter";
import { X, FolderArchive, Download, Check, ShieldCheck, Zap } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: CurateImage[];
  activeImage: CurateImage | null;
  onExportDump: (preset: ExportPreset) => void;
  onExportSingle: (preset: ExportPreset) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  images,
  activeImage,
  onExportDump,
  onExportSingle,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(EXPORT_PRESETS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel w-full max-w-md rounded-2xl p-5 space-y-4 shadow-glass border border-white/15">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <FolderArchive className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Dışa Aktarma Motoru</h3>
              <p className="text-[11px] text-neutral-400">
                Lanczos-3 enterpolasyonu & EXIF temizleyici
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selection List */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-300">Hedef Platform & Kalite</label>
          <div className="space-y-1.5">
            {EXPORT_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPreset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-white/10 border-white text-white shadow-sm"
                      : "bg-white/[0.02] border-white/10 text-neutral-300 hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <span>{preset.name}</span>
                      {preset.useLanczos && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Lanczos-3
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {preset.description}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "bg-white border-white text-black"
                        : "border-white/30 text-transparent"
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata & Privacy notice */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>
            Tüm GPS koordinatları, cihaz seri numaraları ve çekim meta verileri istemci tarafında
            otomatik olarak temizlenir.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {activeImage && (
            <button
              onClick={() => {
                onExportSingle(selectedPreset);
                onClose();
              }}
              className="pressable flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Seçili Görseli İndir</span>
            </button>
          )}

          <button
            onClick={() => {
              onExportDump(selectedPreset);
              onClose();
            }}
            disabled={images.length === 0}
            className="pressable flex-1 py-2.5 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-glass-sm"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Tüm Seriyi .ZIP İndir ({images.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
