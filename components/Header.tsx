"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Sparkles,
  Upload,
  FolderArchive,
  Layers,
  ArrowLeft,
  Grid,
  Scissors,
  LayoutGrid,
  MoreHorizontal,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refImage = images.find((img) => img.id === referenceImageId);
  const activeImage = images.find((img) => img.id === activeImageId);
  const editing = Boolean(activeImageId);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <header className="h-14 shrink-0 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-40 select-none">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {editing && onExitEdit ? (
          <button
            onClick={onExitEdit}
            className="pressable min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-2 sm:px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center gap-1.5 transition-colors"
            title="Seri Galerisine Don (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Seriye Don</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-glass-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-sm text-white">Curate</span>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono hidden sm:inline px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              Studio
            </span>
          </div>
        )}

        {!editing && (
          <div className="text-xs text-neutral-400 font-mono hidden sm:flex items-center gap-1.5 ml-1">
            <Grid className="w-3.5 h-3.5" />
            <span>{images.length} fotograf</span>
          </div>
        )}

        {refImage && (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Ref: {refImage.name.slice(0, 16)}</span>
          </div>
        )}
      </div>

      {/* Center title (edit mode, mobile) */}
      {editing && (
        <div className="absolute left-1/2 -translate-x-1/2 max-w-[40%] sm:max-w-xs truncate text-center pointer-events-none">
          <span className="text-xs font-medium text-white/90 truncate">
            {activeImage?.name || "Duzenle"}
          </span>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={menuRef}>
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

        {/* Desktop secondary actions */}
        <div className="hidden sm:flex items-center gap-2">
          {images.length === 0 && (
            <button
              onClick={onLoadSamples}
              className="pressable text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ornek Fotograflar</span>
            </button>
          )}
          <button
            onClick={onOpenPanoramaModal}
            className="pressable text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-colors"
            title="Panorama Bolucu"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Panorama</span>
          </button>
          <button
            onClick={onOpenCollageModal}
            className="pressable text-xs px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 transition-colors"
            title="Story Kolaj"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Story Kolaji</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="pressable text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Yukle</span>
          </button>
        </div>

        {/* Mobile: samples icon when empty */}
        {images.length === 0 && (
          <button
            onClick={onLoadSamples}
            className="sm:hidden pressable min-h-[44px] min-w-[44px] rounded-lg bg-white/5 border border-white/10 text-amber-400 flex items-center justify-center"
            title="Ornek seriyi yukle"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Mobile overflow menu for secondary tools */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="sm:hidden pressable min-h-[44px] min-w-[44px] rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center"
          title="Daha fazla"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="sm:hidden absolute right-0 top-12 w-48 rounded-xl bg-neutral-900 border border-white/15 shadow-glass z-50 p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-white hover:bg-white/10 min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>Yukle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenPanoramaModal();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-amber-300 hover:bg-white/10 min-h-[44px]"
            >
              <Scissors className="w-4 h-4" />
              <span>Panorama</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenCollageModal();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-purple-300 hover:bg-white/10 min-h-[44px]"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Story Kolaj</span>
            </button>
          </div>
        )}

        <button
          onClick={onOpenExportModal}
          disabled={images.length === 0}
          className={`pressable min-h-[44px] sm:min-h-0 text-xs px-3 sm:px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-glass-sm ${
            images.length > 0
              ? "bg-white text-black hover:bg-neutral-200 active:scale-95"
              : "bg-white/10 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Disa Aktar</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
};
