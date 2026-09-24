"use client";

import React from "react";
import { CurateImage } from "@/lib/types";
import {
  Layers,
  Star,
  Trash2,
  Edit3,
  Plus,
  FolderArchive,
  ArrowRight,
  Sparkles,
  CopyCheck,
  Check,
} from "lucide-react";

import { SIGNATURE_PRESETS } from "@/lib/image/film-presets";
import { FilmPreset } from "@/lib/types";

interface DumpGalleryViewProps {
  images: CurateImage[];
  referenceImageId: string | null;
  onSelectImage: (id: string) => void;
  onSetReference: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onUploadClick: () => void;
  onOpenExportModal: () => void;
  onBatchSync?: () => void;
  onBatchApplyPreset?: (preset: FilmPreset) => void;
  syncSuccess?: boolean;
  hasActiveEffects?: boolean;
}

export const DumpGalleryView: React.FC<DumpGalleryViewProps> = ({
  images,
  referenceImageId,
  onSelectImage,
  onSetReference,
  onDeleteImage,
  onUploadClick,
  onOpenExportModal,
  onBatchSync,
  onBatchApplyPreset,
  syncSuccess,
  hasActiveEffects,
}) => {
  const [batchPresetSuccess, setBatchPresetSuccess] = React.useState<string | null>(null);

  const handleQuickBatchApply = (preset: FilmPreset) => {
    if (onBatchApplyPreset) {
      onBatchApplyPreset(preset);
      setBatchPresetSuccess(preset.name);
      setTimeout(() => setBatchPresetSuccess(null), 2200);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Gallery Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Kürasyon Galerisi
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                {images.length} fotoğraf
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Stage 1 Dump — film şeridi kartları, tek tıkla seri preset eşitleme ve export.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onUploadClick}
              className="pressable text-xs px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Fotoğraf Ekle</span>
            </button>

            {onBatchSync && (
              <button
                onClick={onBatchSync}
                className={`pressable text-xs px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                  syncSuccess
                    ? "bg-emerald-500 text-black border-emerald-500 font-semibold"
                    : "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-400 hover:text-black"
                }`}
                title="Efektleri serinin tamamına kopyala (kırpma/oran hariç)"
              >
                {syncSuccess ? <Check className="w-3.5 h-3.5" /> : <CopyCheck className="w-3.5 h-3.5" />}
                <span>{syncSuccess ? "Eşitlendi" : "Batch Sync"}</span>
              </button>
            )}

            <button
              onClick={onOpenExportModal}
              className="pressable text-xs px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold flex items-center gap-1.5 transition-all shadow-glass-sm"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 1-Click Signature Series Curation Bar (Spec 3.4) */}
        {onBatchApplyPreset && images.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white tracking-tight">
                  Tüm Seriye Tek Tıkla Preset Uygula
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Uğur&apos;un İmzaları
                </span>
              </div>

              {batchPresetSuccess && (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  <span>{batchPresetSuccess} tüm seriye uygulandı!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {SIGNATURE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickBatchApply(preset)}
                  className="pressable p-2 rounded-xl bg-white/[0.04] hover:bg-amber-400/15 border border-white/10 hover:border-amber-400/40 text-left transition-all active:scale-[0.97] group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                      {preset.name}
                    </span>
                    <CopyCheck className="w-3 h-3 text-white/40 group-hover:text-amber-400" />
                  </div>
                  <span className="text-[10px] text-neutral-400 group-hover:text-neutral-300 truncate">
                    {preset.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Responsive Photo Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((item, index) => {
            const isReference = item.id === referenceImageId;

            return (
              <div
                key={item.id}
                onClick={() => onSelectImage(item.id)}
                className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-glass-sm flex flex-col aspect-[4/5]"
              >
                {/* Image Preview */}
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Top Badges */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-white font-medium">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetReference(item.id);
                    }}
                    className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
                      isReference
                        ? "bg-amber-500 text-black shadow-md"
                        : "bg-black/60 text-white/70 hover:text-amber-400 hover:bg-black/80"
                    }`}
                    title={isReference ? "Aktif Referans Kare" : "Referans Kare Olarak Belirle"}
                  >
                    <Star className={`w-3.5 h-3.5 ${isReference ? "fill-black" : ""}`} />
                  </button>
                </div>

                {/* Hover Gradient Overlay with Quick Action Button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-10">
                  <div className="space-y-1 mb-2">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                      <span>Oran: {item.crop.aspectRatio}</span>
                      {item.filters.reinhardEnabled && <span>• Renk Aktif</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-1 text-xs font-medium text-white">
                      <Edit3 className="w-3.5 h-3.5 text-white" />
                      <span>Düzenle</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteImage(item.id);
                      }}
                      className="p-1 rounded text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Görseli Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add More Card */}
          <button
            onClick={onUploadClick}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-white/35 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-3 p-6 text-neutral-400 hover:text-white transition-all aspect-[4/5] pressable group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-white/10 border border-white/10 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-xs font-semibold text-white">Yeni Fotoğraf Ekle</p>
              <p className="text-[10px] text-neutral-500">Sürükleyin veya seçin</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
