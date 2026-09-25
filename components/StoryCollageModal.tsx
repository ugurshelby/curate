"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CurateImage, CollageSlot, StoryCollageLayout } from "@/lib/types";
import {
  STORY_COLLAGE_LAYOUTS,
  renderStoryCollage,
  CollageRenderOptions,
} from "@/lib/image/collage";
import { downloadBlob } from "@/lib/export/zip-exporter";
import {
  X,
  LayoutGrid,
  Download,
  Plus,
  Sliders,
  Sparkles,
  ZoomIn,
  Move,
  Palette,
  Check,
  Upload,
  Layers,
  ArrowLeftRight,
  Smartphone,
} from "lucide-react";
import { SocialOverlay } from "./SocialOverlay";
import { SocialOverlay as SocialOverlayType } from "@/lib/types";

interface StoryCollageModalProps {
  isOpen: boolean;
  images: CurateImage[];
  onClose: () => void;
  onAddCollageToStudio: (collageBlob: Blob, dataUrl: string) => void;
}

export const StoryCollageModal: React.FC<StoryCollageModalProps> = ({
  isOpen,
  images,
  onClose,
  onAddCollageToStudio,
}) => {
  const [photoCount, setPhotoCount] = useState<number>(3);
  const [activeLayoutId, setActiveLayoutId] = useState<string>("3-hero-top-2-bottom");
  const [slots, setSlots] = useState<CollageSlot[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  // Styling options
  const [outerPadding, setOuterPadding] = useState<number>(18);
  const [innerGap, setInnerGap] = useState<number>(14);
  const [borderRadius, setBorderRadius] = useState<number>(16);
  const [backgroundColor, setBackgroundColor] = useState<string>("#000000");
  const [socialOverlay, setSocialOverlay] = useState<SocialOverlayType>("instagram-story");
  const [pendingSwapIndex, setPendingSwapIndex] = useState<number | null>(null);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Cached HTMLImageElement map for rendering
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Interactive per-cell drag pan refs
  const isDraggingCellRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Swap two slots data and positioning
  const handleSwapSlots = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      setPendingSwapIndex(null);
      return;
    }
    setSlots((prev) => {
      const fromSlot = prev[fromIndex];
      const toSlot = prev[toIndex];
      if (!fromSlot || !toSlot) return prev;
      return prev.map((slot, i) => {
        if (i === fromIndex) {
          return {
            ...slot,
            imageId: toSlot.imageId,
            dataUrl: toSlot.dataUrl,
            panX: toSlot.panX,
            panY: toSlot.panY,
            zoom: toSlot.zoom,
          };
        }
        if (i === toIndex) {
          return {
            ...slot,
            imageId: fromSlot.imageId,
            dataUrl: fromSlot.dataUrl,
            panX: fromSlot.panX,
            panY: fromSlot.panY,
            zoom: fromSlot.zoom,
          };
        }
        return slot;
      });
    });
    loadedImagesRef.current.delete(`slot_${fromIndex}`);
    loadedImagesRef.current.delete(`slot_${toIndex}`);
    setSelectedSlotIndex(toIndex);
    setPendingSwapIndex(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter available layouts by photo count
  const availableLayouts = STORY_COLLAGE_LAYOUTS.filter(
    (l) => l.photoCount === photoCount
  );
  const activeLayout =
    availableLayouts.find((l) => l.id === activeLayoutId) || availableLayouts[0];

  // Initialize or re-layout slots
  useEffect(() => {
    if (!activeLayout) return;

    setSlots((prev) => {
      return activeLayout.slots.map((slotRect, idx) => {
        const existing = prev[idx];
        const defaultImage = images[idx % images.length];

        return {
          id: `slot_${idx}`,
          imageId: existing?.imageId || defaultImage?.id || null,
          dataUrl: existing?.dataUrl || defaultImage?.dataUrl || null,
          panX: existing?.panX || 0,
          panY: existing?.panY || 0,
          zoom: existing?.zoom || 1.0,
          rect: slotRect,
        };
      });
    });
  }, [activeLayout, images]);

  // Load image objects for canvas rendering
  const ensureImagesLoaded = useCallback(async () => {
    const map = loadedImagesRef.current;
    for (const slot of slots) {
      if (slot.dataUrl && !map.has(slot.id)) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = slot.dataUrl!;
          });
          map.set(slot.id, img);
        } catch (err) {
          console.error("Error loading collage image:", err);
        }
      }
    }
  }, [slots]);

  useEffect(() => {
    ensureImagesLoaded();
  }, [slots, ensureImagesLoaded]);

  if (!isOpen) return null;

  // Handle cell pointer drag (pan)
  const handleCellPointerDown = (index: number, e: React.PointerEvent) => {
    if (pendingSwapIndex !== null) {
      handleSwapSlots(pendingSwapIndex, index);
      return;
    }
    setSelectedSlotIndex(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingCellRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    const currentSlot = slots[index];
    dragStartPanRef.current = { x: currentSlot?.panX || 0, y: currentSlot?.panY || 0 };
  };

  const handleCellPointerMove = (index: number, e: React.PointerEvent) => {
    if (!isDraggingCellRef.current || selectedSlotIndex !== index) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;

    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index
          ? {
              ...slot,
              panX: dragStartPanRef.current.x + dx * 1.5,
              panY: dragStartPanRef.current.y + dy * 1.5,
            }
          : slot
      )
    );
  };

  const handleCellPointerUp = (e: React.PointerEvent) => {
    isDraggingCellRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Handle cell zoom
  const handleCellZoomChange = (index: number, zoom: number) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, zoom } : slot))
    );
  };

  // Handle changing slot image from gallery
  const handleAssignImageToSlot = (image: CurateImage) => {
    setSlots((prev) =>
      prev.map((slot, i) => {
        if (i === selectedSlotIndex) {
          // Remove from cache to force reload
          loadedImagesRef.current.delete(slot.id);
          return {
            ...slot,
            imageId: image.id,
            dataUrl: image.dataUrl,
            panX: 0,
            panY: 0,
            zoom: 1.0,
          };
        }
        return slot;
      })
    );
  };

  const activeSlot = slots[selectedSlotIndex] || null;

  // Render & Export
  const handleExport = async (addToStudio = false) => {
    try {
      setIsExporting(true);
      await ensureImagesLoaded();

      const exportScale = 1080 / 300;
      const options: CollageRenderOptions = {
        canvasWidth: 1080,
        canvasHeight: 1920,
        outerPadding: Math.round(outerPadding * exportScale),
        innerGap: Math.round(innerGap * exportScale),
        borderRadius: Math.round(borderRadius * exportScale),
        backgroundColor,
      };

      const blob = await renderStoryCollage(slots, loadedImagesRef.current, options);

      if (addToStudio) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onAddCollageToStudio(blob, dataUrl);
          setAddedSuccess(true);
          setTimeout(() => onClose(), 800);
        };
        reader.readAsDataURL(blob);
      } else {
        downloadBlob(blob, `story_dump_kolaj_${Date.now()}.jpg`);
      }
    } catch (err) {
      console.error("Collage export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Instagram Story Kolaj Stüdyosu</span>
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  9:16 Dikey Dump
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                2 ile 6 fotoğraf arası dikey story kolajları. Çerçeve içindeki fotoğrafları sürükleyip yakınlaştırabilir, takas edebilirsiniz.
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

        {/* Content Body: Left Canvas Preview, Right Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 p-6 gap-6">
          {/* LEFT: 9:16 Interactive Canvas Stage (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
            {/* Social Overlay Simulator Toggle Bar */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-sans">
              <span className="text-neutral-400 px-1.5 flex items-center gap-1 text-[10px]">
                <Smartphone className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Simülatör:</span>
              </span>
              <button
                type="button"
                onClick={() => setSocialOverlay("instagram-story")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  socialOverlay === "instagram-story"
                    ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Instagram Story
              </button>
              <button
                type="button"
                onClick={() => setSocialOverlay("tiktok-story")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  socialOverlay === "tiktok-story"
                    ? "bg-neutral-800 text-white font-semibold border border-white/20 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                TikTok Story
              </button>
              <button
                type="button"
                onClick={() => setSocialOverlay("none")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  socialOverlay === "none"
                    ? "bg-white/20 text-white font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Kapat
              </button>
            </div>

            {/* Active Swap Mode Helper Banner */}
            {pendingSwapIndex !== null && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-medium flex items-center justify-between gap-2 animate-pulse w-full max-w-[320px]">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Hücre #{pendingSwapIndex + 1} seçili: Hedefe dokunun</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingSwapIndex(null)}
                  className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-white hover:bg-black/60"
                >
                  İptal
                </button>
              </div>
            )}

            {/* 9:16 Canvas Outer Container with Outer Padding */}
            <div
              style={{
                backgroundColor,
                padding: `${outerPadding}px`,
                aspectRatio: "9/16",
              }}
              className="relative w-full max-w-[280px] sm:max-w-[320px] rounded-2xl shadow-2xl border border-white/20 overflow-hidden select-none flex flex-col"
            >
              {/* Inner wrapper that strictly bounds slots by outerPadding */}
              <div className="relative w-full h-full overflow-hidden">
                {slots.map((slot, index) => {
                  const isSelected = selectedSlotIndex === index;
                  const isPendingSwap = pendingSwapIndex === index;
                  const slotStyle: React.CSSProperties = {
                    position: "absolute",
                    left: `calc(${slot.rect.x * 100}% + ${slot.rect.x > 0 ? innerGap / 2 : 0}px)`,
                    top: `calc(${slot.rect.y * 100}% + ${slot.rect.y > 0 ? innerGap / 2 : 0}px)`,
                    width: `calc(${slot.rect.width * 100}% - ${
                      slot.rect.x > 0 || slot.rect.x + slot.rect.width < 1 ? innerGap / 2 : 0
                    }px)`,
                    height: `calc(${slot.rect.height * 100}% - ${
                      slot.rect.y > 0 || slot.rect.y + slot.rect.height < 1 ? innerGap / 2 : 0
                    }px)`,
                    borderRadius: `${borderRadius}px`,
                  };

                  return (
                    <div
                      key={slot.id}
                      style={slotStyle}
                      onPointerDown={(e) => handleCellPointerDown(index, e)}
                      onPointerMove={(e) => handleCellPointerMove(index, e)}
                      onPointerUp={handleCellPointerUp}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const src =
                          draggedSlotIndex ??
                          parseInt(e.dataTransfer.getData("text/plain"), 10);
                        if (!isNaN(src)) handleSwapSlots(src, index);
                        setDraggedSlotIndex(null);
                      }}
                      onWheel={(e) => {
                        const delta = -e.deltaY * 0.002;
                        const nextZoom = Math.min(3.0, Math.max(1.0, (slot.zoom || 1.0) + delta));
                        handleCellZoomChange(index, nextZoom);
                      }}
                      className={`relative overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                        isPendingSwap
                          ? "border-amber-400 ring-4 ring-amber-400/50 z-20 animate-pulse"
                          : isSelected
                          ? "border-amber-400 ring-2 ring-amber-400/30 z-10"
                          : "border-white/10 hover:border-white/40"
                      } bg-neutral-950 flex items-center justify-center`}
                    >
                      {slot.dataUrl ? (
                        <div
                          style={{
                            transform: `translate3d(${slot.panX * 0.3}px, ${slot.panY * 0.3}px, 0) scale(${
                              slot.zoom
                            })`,
                            transformOrigin: "center center",
                          }}
                          className="w-full h-full pointer-events-none transition-transform duration-75 flex items-center justify-center"
                        >
                          <img
                            src={slot.dataUrl}
                            alt={`Slot ${index + 1}`}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-sans font-medium">
                          +{index + 1}
                        </span>
                      )}

                      {/* Cell badge + Swap trigger draggable handle */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", String(index));
                          setDraggedSlotIndex(index);
                        }}
                        className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white font-sans text-[9px] font-semibold cursor-move hover:bg-amber-400 hover:text-black transition-colors"
                        title="Sürükleyip başka hücrenin üzerine bırakarak yer değiştirin"
                      >
                        <span>#{index + 1}</span>
                        <ArrowLeftRight className="w-2.5 h-2.5 opacity-70" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Persistent Social Media Story Overlay (Instagram / TikTok) */}
              <SocialOverlay type={socialOverlay} />
            </div>

            <span className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1 font-sans">
              <Move className="w-3 h-3 text-amber-400" />
              <span>Sürükle: Kadraj / Badge: Takas (Swap)</span>
            </span>
          </div>

          {/* RIGHT: Layout & Customization Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Photo Count Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                Kolaj Fotoğraf Sayısı
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setPhotoCount(count);
                      const firstMatching = STORY_COLLAGE_LAYOUTS.find(
                        (l) => l.photoCount === count
                      );
                      if (firstMatching) setActiveLayoutId(firstMatching.id);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all ${
                      photoCount === count
                        ? "bg-amber-400 text-black border-amber-400 font-bold shadow-sm"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm">{count}</div>
                    <div className="text-[9px] opacity-80">Foto</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Layout Variation Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                Şablon Düzeni Seçin ({availableLayouts.length} Varyasyon)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableLayouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setActiveLayoutId(layout.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      activeLayoutId === layout.id
                        ? "bg-white text-black border-white font-semibold shadow-sm"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-xs">{layout.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Active Slot Zoom & Framing Controls */}
            {activeSlot && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">
                      Seçili Hücre #{selectedSlotIndex + 1} Yakınlaştırma
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-300">
                    {activeSlot.zoom.toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={activeSlot.zoom}
                    onChange={(e) =>
                      handleCellZoomChange(
                        selectedSlotIndex,
                        parseFloat(e.target.value)
                      )
                    }
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingSwapIndex(
                          pendingSwapIndex === selectedSlotIndex ? null : selectedSlotIndex
                        )
                      }
                      className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                        pendingSwapIndex === selectedSlotIndex
                          ? "bg-amber-400 text-black font-bold shadow-sm"
                          : "bg-black/40 text-amber-300 hover:text-white"
                      }`}
                      title="Bu hücredeki görseli başka bir hücreyle takas et"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>
                        {pendingSwapIndex === selectedSlotIndex ? "Hedefe Dokunun" : "Takas (Swap)"}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSlots((prev) =>
                          prev.map((s, i) =>
                            i === selectedSlotIndex ? { ...s, panX: 0, panY: 0, zoom: 1 } : s
                          )
                        );
                      }}
                      className="px-2 py-1 rounded bg-black/40 text-[10px] text-amber-300 hover:text-white transition-colors"
                    >
                      Merkezle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Slot Image Selector from Dump */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-300">
                  Hücre #{selectedSlotIndex + 1} İçin Fotoğraf Ata
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Cihazdan Yükle</span>
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
                        const dataUrl = ev.target?.result as string;
                        setSlots((prev) =>
                          prev.map((slot, i) =>
                            i === selectedSlotIndex
                              ? {
                                  ...slot,
                                  imageId: `uploaded_${Date.now()}`,
                                  dataUrl,
                                  panX: 0,
                                  panY: 0,
                                  zoom: 1.0,
                                }
                              : slot
                          )
                        );
                        loadedImagesRef.current.delete(slots[selectedSlotIndex].id);
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {images.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleAssignImageToSlot(img)}
                      className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-white/20 hover:border-amber-400 transition-all opacity-80 hover:opacity-100"
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

            {/* 5. Spacing, Radius & Background Color */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              {/* Outer Padding */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Dış Kenarlık</span>
                  <span className="font-mono">{outerPadding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  value={outerPadding}
                  onChange={(e) => setOuterPadding(parseInt(e.target.value, 10))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              {/* Inner Gap */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>İç Boşluk</span>
                  <span className="font-mono">{innerGap}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="28"
                  value={innerGap}
                  onChange={(e) => setInnerGap(parseInt(e.target.value, 10))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              {/* Corner Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Köşe Yuvarlaklığı</span>
                  <span className="font-mono">{borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(parseInt(e.target.value, 10))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>

            {/* Background Color Palette */}
            <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5">
              <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-neutral-400" />
                <span>Arka Plan Rengi</span>
              </span>
              <div className="flex items-center gap-2">
                {[
                  { label: "Siyah", hex: "#000000" },
                  { label: "Grafit", hex: "#18181b" },
                  { label: "Krem", hex: "#f4ede4" },
                  { label: "Beyaz", hex: "#ffffff" },
                ].map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setBackgroundColor(color.hex)}
                    style={{ backgroundColor: color.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      backgroundColor === color.hex
                        ? "border-amber-400 scale-110 shadow-sm"
                        : "border-white/20 hover:scale-105"
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 font-sans">
            Çıktı Formatı: 1080 × 1920 px (Instagram Story 9:16 Dikey)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport(true)}
              disabled={isExporting || addedSuccess}
              className={`pressable px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                addedSuccess
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Stüdyoya Eklendi!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Stüdyo Serisine Ekle</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleExport(false)}
              disabled={isExporting}
              className="pressable px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 transition-all shadow-glass-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? "İşleniyor..." : "Kolajı İndir (9:16 HD)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
