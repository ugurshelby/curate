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
  Sparkles,
  Upload,
  Check,
  MoveVertical,
  Hand,
} from "lucide-react";

interface PanoramaSplitterModalProps {
  isOpen: boolean;
  images: CurateImage[];
  onClose: () => void;
  onAddSlicesToStudio: (slices: PanoramaSlice[], sourceImage?: CurateImage | null) => void;
}

export const PanoramaSplitterModal: React.FC<PanoramaSplitterModalProps> = ({
  isOpen,
  images,
  onClose,
  onAddSlicesToStudio,
}) => {
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [sliceCount, setSliceCount] = useState<2 | 3 | 4>(3);
  const [aspectRatio, setAspectRatio] = useState<"4:5" | "1:1">("4:5");
  const [verticalPan, setVerticalPan] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [slices, setSlices] = useState<PanoramaSlice[]>([]);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Drag-to-pan gesture state
  const isDraggingPanRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const startPanValueRef = useRef<number>(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first image if available when opening
  useEffect(() => {
    if (isOpen && !selectedImageSrc && images.length > 0) {
      setSelectedImageSrc(images[0].dataUrl);
      setSelectedImageId(images[0].id);
    }
  }, [isOpen, selectedImageSrc, images]);

  // Compute slices whenever image, slice count, aspect ratio, or vertical pan changes
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
        aspectRatio,
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
  }, [selectedImageSrc, sliceCount, aspectRatio, verticalPan]);

  useEffect(() => {
    if (isOpen && selectedImageSrc) {
      computeSlices();
    }
  }, [isOpen, selectedImageSrc, sliceCount, aspectRatio, verticalPan, computeSlices]);

  if (!isOpen) return null;

  const currentSourceImage =
    images.find((img) => img.id === selectedImageId || img.dataUrl === selectedImageSrc) || null;

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
    onAddSlicesToStudio(slices, currentSourceImage);
    setAddedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Direct Touch/Mouse Drag-to-Pan (Item 4)
  const handlePanPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingPanRef.current = true;
    dragStartYRef.current = e.clientY;
    startPanValueRef.current = verticalPan;
  };

  const handlePanPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPanRef.current) return;
    const dy = e.clientY - dragStartYRef.current;
    // Map vertical pixel drag to percentage offset
    const deltaPercent = (dy / 200) * 100;
    const nextPan = Math.max(0, Math.min(100, Math.round(startPanValueRef.current + deltaPercent)));
    setVerticalPan(nextPan);
  };

  const handlePanPointerUp = (e: React.PointerEvent) => {
    isDraggingPanRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
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
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  Instagram 4:5 Swipe
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Görsel üzerine dokunup yukarı/aşağı sürükleyerek kadrajı belirleyin. Slaytlar kesintisiz bölünür.
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
                      setSelectedImageId(null);
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
                    onClick={() => {
                      setSelectedImageSrc(img.dataUrl);
                      setSelectedImageId(img.id);
                    }}
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

          {/* 2. Slicing Controls & Direct Touch Framing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            {/* Carousel Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300">
                Karusel Formatı
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setAspectRatio("4:5")}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    aspectRatio === "4:5"
                      ? "bg-amber-400 text-black border-amber-400 font-bold shadow-sm"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">4:5 Dikey</div>
                  <div className="text-[9px] opacity-70">IG Standart</div>
                </button>

                <button
                  onClick={() => setAspectRatio("1:1")}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    aspectRatio === "1:1"
                      ? "bg-amber-400 text-black border-amber-400 font-bold shadow-sm"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">1:1 Kare</div>
                  <div className="text-[9px] opacity-70">Klasik</div>
                </button>
              </div>
            </div>

            {/* Slice Count */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Slayt Sayısı</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setSliceCount(count)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      sliceCount === count
                        ? "bg-amber-400 text-black border-amber-400 font-bold shadow-sm"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-xs font-bold">{count} Slayt</div>
                    <div className="text-[9px] opacity-70">
                      {aspectRatio === "4:5"
                        ? count === 2
                          ? "8:5"
                          : count === 3
                          ? "12:5"
                          : "16:5"
                        : `${count}:1`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Touch Framing Info HUD (Item 4: Hantal slider kaldırıldı) */}
            <div className="space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dikey Kadraj Konumu</span>
                </span>
                <span className="font-mono text-amber-300 text-xs font-semibold">
                  %{verticalPan}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-tight">
                Önizleme görseline dokunup <strong>yukarı/aşağı sürükleyerek</strong> dikey kadrajı serbestçe ayarlayın.
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 font-sans">
                <button
                  type="button"
                  onClick={() => setVerticalPan(0)}
                  className="hover:text-white transition-colors"
                >
                  Üst (%0)
                </button>
                <button
                  type="button"
                  onClick={() => setVerticalPan(50)}
                  className="hover:text-white transition-colors"
                >
                  Merkez (%50)
                </button>
                <button
                  type="button"
                  onClick={() => setVerticalPan(100)}
                  className="hover:text-white transition-colors"
                >
                  Alt (%100)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Interactive Seamless Carousel Preview (Drag-to-Pan Enabled) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-sans">
              <span className="font-medium text-white/90">
                Kesintisiz Karusel Önizlemesi ({sliceCount} Parça)
              </span>
              <span className="text-[11px] font-sans font-medium text-amber-300 flex items-center gap-1">
                <Hand className="w-3 h-3 animate-bounce" />
                <span>Görseli Yukarı/Aşağı Sürükleyerek Kadrajlayın</span>
              </span>
            </div>

            {isProcessing ? (
              <div className="h-64 rounded-2xl bg-neutral-950 flex flex-col items-center justify-center gap-3 text-neutral-400 border border-white/10">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Kesintisiz slaytlar hesaplanıyor...</span>
              </div>
            ) : slices.length > 0 ? (
              <div
                className="relative rounded-2xl bg-neutral-950 p-3 border border-white/15 cursor-ns-resize touch-none select-none group"
                onPointerDown={handlePanPointerDown}
                onPointerMove={handlePanPointerMove}
                onPointerUp={handlePanPointerUp}
                onPointerCancel={handlePanPointerUp}
              >
                {/* Floating Gesture Helper Tag */}
                <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white font-sans text-[10px] font-medium flex items-center gap-1.5 pointer-events-none shadow-md">
                  <MoveVertical className="w-3 h-3 text-amber-400" />
                  <span>Sürükle: %{verticalPan}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {slices.map((slice) => (
                    <div
                      key={slice.index}
                      className="group/slide relative rounded-xl overflow-hidden border border-white/15 bg-black flex flex-col pointer-events-none"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden">
                        <img
                          src={slice.dataUrl}
                          alt={slice.filename}
                          className="w-full h-full object-cover pointer-events-none"
                        />

                        {/* Slide Number Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-white font-sans font-semibold text-[10px] shadow-md">
                          Slayt {slice.index}
                        </div>

                        {/* Quick single download overlay */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(slice);
                          }}
                          className="pointer-events-auto absolute bottom-2 right-2 p-2 rounded-lg bg-black/75 hover:bg-amber-400 hover:text-black text-white border border-white/20 transition-all opacity-0 group-hover/slide:opacity-100 shadow-md"
                          title={`${slice.filename} indir`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2 text-center text-[10px] font-sans text-neutral-400 border-t border-white/10 bg-neutral-900/80 truncate">
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
          <div className="text-xs text-neutral-400 font-sans flex items-center gap-2">
            {slices.length > 0 && (
              <span>
                {slices.length} adet 1080×1350 px ({aspectRatio}) kesintisiz karusel slaytı hazır
              </span>
            )}
            {currentSourceImage?.filters.activePresetId && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Preset aktarılacak
              </span>
            )}
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
