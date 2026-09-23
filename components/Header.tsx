"use client";

import React, { useRef } from "react";
import {
  Sparkles,
  Upload,
  FolderArchive,
  Layers,
  Image as ImageIcon,
  ArrowLeft,
  Grid,
  Scissors,
  LayoutGrid,
} from "lucide-react";
import { CurateImage } from "@/lib/types";

interface HeaderProps {
  images: CurateImage[];
  activeImageId: string | null;
  referenceImageId: string | null;
  onUpload: (files: FileList) => void;
  onLoadSamples: () => void;
  onOpenExportModal: () => void;
  onOpenPanoramaModal: () => void;
  onOpenCollageModal: () => void;
  onExitEdit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  images,
  activeImageId,
  referenceImageId,
  onUpload,
  onLoadSamples,
  onOpenExportModal,
  onOpenPanoramaModal,
  onOpenCollageModal,
  onExitEdit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refImage = images.find((img) => img.id === referenceImageId);

  return (
    <header className="h-14 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-glass-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm text-white">
            Curate
          </span>
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono hidden sm:inline px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            Studio
          </span>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

        {/* Exit Edit Mode / Return to Gallery Button */}
        {activeImageId && onExitEdit ? (
          <button
            onClick={onExitEdit}
            className="pressable text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center gap-1.5 transition-colors shadow-glass-sm"
            title="Seri Galerisine Dön (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Seriye Dön</span>
          </button>
        ) : (
          /* Counter Badge */
          <div className="text-xs text-neutral-400 font-mono hidden sm:flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-neutral-400" />
            <span>{images.length} fotoğraf</span>
          </div>
        )}

        {/* Reference Image Badge */}
        {refImage && (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Ref: {refImage.name.slice(0, 16)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUpload(e.target.files);
              e.target.value = "";
            }
          }}
        />

        {images.length === 0 && (
          <button
            onClick={onLoadSamples}
            className="pressable text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Örnek Fotoğraflar</span>
          </button>
        )}

        {/* Standalone Panorama Splitter Button */}
        <button
          onClick={onOpenPanoramaModal}
          className="pressable text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-colors"
          title="Kesintisiz Panorama Bölücü (4:5 Karusel Slaytları)"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Panorama</span>
        </button>

        {/* Standalone Story Dump Collage Studio Button */}
        <button
          onClick={onOpenCollageModal}
          className="pressable text-xs px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 transition-colors"
          title="9:16 Dikey Instagram Story Kolaj Stüdyosu"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Story Kolajı</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="pressable text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Yükle</span>
        </button>

        <button
          onClick={onOpenExportModal}
          disabled={images.length === 0}
          className={`pressable text-xs px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-glass-sm ${
            images.length > 0
              ? "bg-white text-black hover:bg-neutral-200 active:scale-95"
              : "bg-white/10 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dışa Aktar</span>
          <span className="sm:hidden">Aktar</span>
        </button>
      </div>
    </header>
  );
};
