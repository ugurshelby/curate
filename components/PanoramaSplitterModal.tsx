"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CurateImage, PanoramaSlice } from "@/lib/types";
import {
  splitPanoramaImage,
  createPanoramaZip,
  PanoramaSplitOptions,
} from "@/lib/image/panorama";
import { downloadBlob } from "@/lib/export/zip-exporter";
import {
  X,
  Scissors,
  Download,
  Plus,
  Sliders,
  Sparkles,
  ChevronRight,
  Upload,
  Check,
} from "lucide-react";

interface PanoramaSplitterModalProps {
  isOpen: boolean;
  images: CurateImage[];
  onClose: () => void;
  onAddSlicesToStudio: (slices: PanoramaSlice[]) => void;
}

export const PanoramaSplitterModal: React.FC<PanoramaSplitterModalProps> = ({
  isOpen,
  images,
  onClose,
  onAddSlicesToStudio,
}) => {
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [sliceCount, setSliceCount] = useState<2 | 3 | 4>(3);
  const [verticalPan, setVerticalPan] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [slices, setSlices] = useState<PanoramaSlice[]>([]);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first image if available when opening
  useEffect(() => {
    if (isOpen && !selectedImageSrc && images.length > 0) {
      setSelectedImageSrc(images[0].dataUrl);
    }
  }, [isOpen, selectedImageSrc, images]);

  // Compute slices whenever image, slice count, or vertical pan changes
  const computeSlices = useCallback(async () => {
    if (!selectedImageSrc) {
      setSlices([]);
      return;
    }

    try {
      setIsProcessing(true);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = selectedImageSrc;
      });

      const options: PanoramaSplitOptions = {
        sliceCount,
        verticalPanPercent: verticalPan,
        targetSlideWidth: 1080,
      };

      const result = await splitPanoramaImage(img, options);
      setSlices(result);
      setAddedSuccess(false);
    } catch (err) {
      console.error("Panorama split error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImageSrc, sliceCount, verticalPan]);

  useEffect(() => {
    if (isOpen && selectedImageSrc) {
      computeSlices();
    }
  }, [isOpen, selectedImageSrc, sliceCount, verticalPan, computeSlices]);

  if (!isOpen) return null;

  const handleDownloadAllZip = async () => {
    if (slices.length === 0) return;
    const zipBlob = await createPanoramaZip(slices);
    downloadBlob(zipBlob, `curate_panorama_${sliceCount}x_instagram.zip`);
  };

  const handleDownloadSingle = (slice: PanoramaSlice) => {
    downloadBlob(slice.blob, slice.filename);
  };

  const handleAddSlices = () => {
    if (slices.length === 0) return;
    onAddSlicesToStudio(slices);
    setAddedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Kesintisiz Panorama Bölücü</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  Instagram 4:5 Swipe
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Geniş açı fotoğrafları sıfır kayıpla yan yana akan kesintisiz 4:5 karusel slaytlarına böler.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Image Picker Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-300">Kaynak Görsel Seçin</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Cihazdan Yeni Fotoğraf Yükle</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setSelectedImageSrc(ev.target?.result as string);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
            </div>

            {images.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageSrc(img.dataUrl)}
                    className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageSrc === img.dataUrl
                        ? "border-amber-400 shadow-md scale-105"
                        : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Slicing Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            {/* Slice Count */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Bölünecek Slayt Sayısı</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setSliceCount(count)}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      sliceCount === count
                        ? "bg-amber-400 text-black border-amber-400 font-bold shadow-sm"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm">{count} Slayt</div>
                    <div className="text-[10px] opacity-70">
                      {count === 2 ? "8:5 Oran" : count === 3 ? "12:5 Oran" : "16:5 Oran"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Pan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Dikey Kadraj Konumu</span>
                </label>
                <span className="font-mono text-neutral-400 text-[11px]">%{verticalPan}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={verticalPan}
                onChange={(e) => setVerticalPan(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 py-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>Üst Kadraj</span>
                <span>Merkez</span>
                <span>Alt Kadraj</span>
              </div>
            </div>
          </div>

          {/* 3. Interactive Seamless Carousel Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Kesintisiz Karusel Önizlemesi ({sliceCount} Parça)</span>
              <span className="text-[11px] font-mono text-amber-300">
                Instagram Karusel Akışı (Soldan Sağa)
              </span>
            </div>

            {isProcessing ? (
              <div className="h-64 rounded-2xl bg-neutral-950 flex flex-col items-center justify-center gap-3 text-neutral-400 border border-white/10">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Kesintisiz slaytlar hesaplanıyor...</span>
              </div>
            ) : slices.length > 0 ? (
              <div className="relative rounded-2xl bg-neutral-950 p-3 border border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {slices.map((slice) => (
                    <div
                      key={slice.index}
                      className="group relative rounded-xl overflow-hidden border border-white/15 bg-black flex flex-col"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden">
                        <img
                          src={slice.dataUrl}
                          alt={slice.filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                        {/* Slide Number Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold shadow-md">
                          Slayt {slice.index}
                        </div>

                        {/* Quick single download overlay */}
                        <button
                          onClick={() => handleDownloadSingle(slice)}
                          className="absolute bottom-2 right-2 p-2 rounded-lg bg-black/75 hover:bg-amber-400 hover:text-black text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-md"
                          title={`${slice.filename} indir`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2 text-center text-[10px] font-mono text-neutral-400 border-t border-white/10 bg-neutral-900/80 truncate">
                        {slice.filename}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-2xl bg-neutral-950 flex items-center justify-center text-neutral-500 text-xs border border-white/10">
                Önizleme oluşturmak için bir görsel seçin
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 font-mono">
            {slices.length > 0 && `${slices.length} adet 1080×1350 px (4:5) slayt hazır`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSlices}
              disabled={slices.length === 0 || addedSuccess}
              className={`pressable px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                addedSuccess
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Stüdyo Serisine Eklendi!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Stüdyo Serisine Ekle (+{sliceCount})</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadAllZip}
              disabled={slices.length === 0}
              className="pressable px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold flex items-center gap-1.5 transition-all shadow-glass-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Numaralı İndir (ZIP)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
