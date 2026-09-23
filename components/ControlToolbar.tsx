"use client";

import React, { useState, useRef } from "react";
import {
  CurateImage,
  AspectRatio,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
  ExportPreset,
  UpscaleMultiplier,
  BorderState,
  TimestampState,
} from "@/lib/types";
import {
  Crop,
  Sliders,
  Smartphone,
  Download,
  Sparkles,
  Sun,
  Flame,
  Grid3X3,
  Layers,
  ZoomIn,
  RotateCcw,
  Eye,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Frame,
  Calendar,
  CopyCheck,
  Check,
  Palette,
} from "lucide-react";
import { EXPORT_PRESETS } from "@/lib/export/zip-exporter";
import { getCropDimensions } from "@/lib/image/renderer";
import { getDefaultBorderState } from "@/lib/image/border";
import { getDefaultTimestampState, getFormattedTodayDate } from "@/lib/image/timestamp";

interface ControlToolbarProps {
  image: CurateImage | null;
  images: CurateImage[];
  referenceImageId: string | null;
  activeGuide: CompositionGuide;
  activeOverlay: SocialOverlayType;
  showOriginal: boolean;
  onUpdateCropRatio: (ratio: AspectRatio) => void;
  onUpdateZoom: (zoom: number) => void;
  onUpdateGuide: (guide: CompositionGuide) => void;
  onUpdateOverlay: (overlay: SocialOverlayType) => void;
  onUpdateFilters: (filters: Partial<CurateImage["filters"]>) => void;
  onUpdateBorder: (border: Partial<BorderState>) => void;
  onUpdateTimestamp: (timestamp: Partial<TimestampState>) => void;
  onBatchSync: () => void;
  onResetFilters: () => void;
  onSetShowOriginal: (show: boolean) => void;
  onUpdateUpscale: (multiplier: UpscaleMultiplier) => void;
  onExportSingle: (preset: ExportPreset) => void;
  onExportDump: () => void;
  onExitEdit: () => void;
}

type TabType = "crop" | "color" | "frame" | "overlay" | "upscale" | "export";

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  image,
  images,
  referenceImageId,
  activeGuide,
  activeOverlay,
  showOriginal,
  onUpdateCropRatio,
  onUpdateZoom,
  onUpdateGuide,
  onUpdateOverlay,
  onUpdateFilters,
  onUpdateBorder,
  onUpdateTimestamp,
  onBatchSync,
  onResetFilters,
  onSetShowOriginal,
  onUpdateUpscale,
  onExportSingle,
  onExportDump,
  onExitEdit,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("crop");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ig-retina");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Dragging state
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  if (!image) return null;

  const { crop, filters } = image;
  const currentUpscale = image.upscaleFactor || 1;

  const selectedPreset =
    EXPORT_PRESETS.find((p) => p.id === selectedPresetId) || EXPORT_PRESETS[0];

  // Calculate resolution metrics
  const baseCrop = getCropDimensions(image.originalWidth, image.originalHeight, crop.aspectRatio);
  const curW = Math.round(baseCrop.width);
  const curH = Math.round(baseCrop.height);

  const targetW = curW * currentUpscale;
  const targetH = curH * currentUpscale;

  const handleTriggerBatchSync = () => {
    onBatchSync();
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  };

  const border = image.border || getDefaultBorderState();
  const timestamp = image.timestamp || getDefaultTimestampState();

  const handleDragPointerDown = (e: React.PointerEvent) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("select")
    ) {
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
    dragStartOffsetRef.current = { ...offset };
  };

  const handleDragPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartPointerRef.current.x;
    const dy = e.clientY - dragStartPointerRef.current.y;

    const newX = dragStartOffsetRef.current.x + dx;
    const newY = dragStartOffsetRef.current.y + dy;

    setOffset({ x: newX, y: newY });
  };

  const handleDragPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      style={{
        transform: `translate3d(calc(-50% + ${offset.x}px), ${offset.y}px, 0)`,
      }}
      className="absolute bottom-20 left-1/2 w-full max-w-xl px-4 z-30 pointer-events-none select-none transition-transform duration-75"
    >
      {/* 1. COLLAPSED COMPACT PILL MODE */}
      {isCollapsed ? (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          className="glass-toolbar rounded-full py-2 px-4 mx-auto w-fit flex items-center gap-3 pointer-events-auto cursor-grab active:cursor-grabbing shadow-glass border border-white/15"
        >
          <GripHorizontal className="w-4 h-4 text-white/40" />

          <button
            onClick={() => setIsCollapsed(false)}
            className="pressable flex items-center gap-2 text-xs font-semibold text-white hover:text-amber-300 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Paneli Aç</span>
            <ChevronUp className="w-3.5 h-3.5 text-white/60" />
          </button>

          <div className="h-3 w-[1px] bg-white/20" />

          <button
            onClick={handleTriggerBatchSync}
            className={`pressable text-xs flex items-center gap-1.5 transition-colors ${
              syncSuccess ? "text-emerald-400" : "text-amber-400 hover:text-amber-300"
            }`}
            title="Tüm Seriye Eşitle (Ratio Hariç)"
          >
            {syncSuccess ? <Check className="w-3.5 h-3.5" /> : <CopyCheck className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{syncSuccess ? "Eşitlendi!" : "Seriye Eşitle"}</span>
          </button>

          <div className="h-3 w-[1px] bg-white/20" />

          <button
            onClick={onExitEdit}
            className="pressable text-xs text-white/60 hover:text-rose-400 flex items-center gap-1 transition-colors"
            title="Düzenlemeyi Kapat (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Kapat</span>
          </button>
        </div>
      ) : (
        /* 2. FULL EXPANDED TOOLBAR */
        <div className="glass-toolbar rounded-2xl p-3 pointer-events-auto space-y-2.5 shadow-glass border border-white/15">
          {/* Drag Handle & Top Controls Row */}
          <div
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            className="flex items-center justify-between cursor-grab active:cursor-grabbing py-0.5 border-b border-white/10 group select-none"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              <button
                onClick={handleTriggerBatchSync}
                className={`pressable px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 transition-all ${
                  syncSuccess
                    ? "bg-emerald-500 text-black font-semibold"
                    : "bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-400 hover:text-black"
                }`}
                title="Analog filtreleri, çerçeve ve tarih damgasını serideki tüm fotoğraflara senkronize eder (En-boy oranları korunur)"
              >
                {syncSuccess ? (
                  <>
                    <Check className="w-3 h-3 text-current" />
                    <span>Seriye Eşitlendi!</span>
                  </>
                ) : (
                  <>
                    <CopyCheck className="w-3 h-3 text-current" />
                    <span>Tüm Seriye Eşitle (Ratio Hariç)</span>
                  </>
                )}
              </button>
            </div>

            <div className="w-8 h-1 bg-white/20 group-hover:bg-white/40 rounded-full transition-colors hidden sm:block" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Paneli Küçült (Görseli Gör)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onExitEdit}
                className="p-1 rounded-md text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                title="Düzenlemeyi Kapat (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setActiveTab("crop")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "crop"
                    ? "bg-white text-black shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Kırpma</span>
              </button>

              <button
                onClick={() => setActiveTab("color")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "color"
                    ? "bg-white text-black shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Analog</span>
              </button>

              {/* Dedicated FRAME & TIMESTAMP Tab */}
              <button
                onClick={() => setActiveTab("frame")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "frame"
                    ? "bg-white text-black shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Frame className="w-3.5 h-3.5" />
                <span>Çerçeve & Tarih</span>
              </button>

              <button
                onClick={() => setActiveTab("overlay")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "overlay"
                    ? "bg-white text-black shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simülatör</span>
              </button>

              {/* Dedicated UPSCALE Tab */}
              <button
                onClick={() => setActiveTab("upscale")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "upscale"
                    ? "bg-amber-400 text-black shadow-sm font-semibold"
                    : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-400/10"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Upscale</span>
              </button>

              <button
                onClick={() => setActiveTab("export")}
                className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "export"
                    ? "bg-white text-black shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Dışa Aktar</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden md:inline">
              {image.name.slice(0, 10)}
            </span>
          </div>

          {/* TAB 1: CROP & COMPOSITION */}
          {activeTab === "crop" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">En-Boy Oranı</span>
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  {(["4:5", "9:16", "1:1", "original"] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => onUpdateCropRatio(ratio)}
                      className={`pressable px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                        crop.aspectRatio === ratio
                          ? "bg-white/20 text-white font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {ratio === "original" ? "Orijinal" : ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                    <Grid3X3 className="w-3.5 h-3.5" />
                    <span>Kılavuz</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                    <button
                      onClick={() => onUpdateGuide("none")}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        activeGuide === "none" ? "bg-white/20 text-white" : "text-neutral-400"
                      }`}
                    >
                      Yok
                    </button>
                    <button
                      onClick={() => onUpdateGuide("thirds")}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        activeGuide === "thirds" ? "bg-white/20 text-white" : "text-neutral-400"
                      }`}
                    >
                      3x3
                    </button>
                    <button
                      onClick={() => onUpdateGuide("golden")}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        activeGuide === "golden" ? "bg-white/20 text-white" : "text-neutral-400"
                      }`}
                    >
                      Phi
                    </button>
                    <button
                      onClick={() => onUpdateGuide("frame")}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        activeGuide === "frame" ? "bg-white/20 text-white" : "text-neutral-400"
                      }`}
                    >
                      Çerçeve
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] text-neutral-300 w-7">
                      {crop.zoom.toFixed(1)}x
                    </span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={crop.zoom}
                    onChange={(e) => onUpdateZoom(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALOG & REINHARD COLOR TRANSFER */}
          {activeTab === "color" && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-neutral-400">Renk & Doku Katmanları</span>
                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={() => onSetShowOriginal(true)}
                    onMouseUp={() => onSetShowOriginal(false)}
                    onTouchStart={() => onSetShowOriginal(true)}
                    onTouchEnd={() => onSetShowOriginal(false)}
                    className={`pressable px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 transition-all ${
                      showOriginal
                        ? "bg-amber-400 text-black font-semibold"
                        : "bg-white/10 text-neutral-300 hover:text-white"
                    }`}
                    title="Basılı tutarak orijinal görseli görüntüleyin"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Basılı Tut: Önce</span>
                  </button>

                  <button
                    onClick={onResetFilters}
                    className="pressable px-2 py-0.5 rounded-md text-[10px] font-mono text-neutral-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors"
                    title="Tüm analog filtreleri sıfırla"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Sıfırla</span>
                  </button>
                </div>
              </div>

              {/* Reinhard Color Transfer */}
              <div className="space-y-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white">Reinhard Renk Transferi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {referenceImageId ? (
                      <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Ref Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500">Ref Seçilmedi (Şeritten ⭐)</span>
                    )}
                    <input
                      type="checkbox"
                      checked={filters.reinhardEnabled}
                      onChange={(e) =>
                        onUpdateFilters({
                          reinhardEnabled: e.target.checked,
                          referenceImageId: referenceImageId,
                        })
                      }
                      className="w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {filters.reinhardEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-neutral-400 w-16">Eşleşme</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.reinhardStrength}
                      onChange={(e) =>
                        onUpdateFilters({ reinhardStrength: parseInt(e.target.value, 10) })
                      }
                      className="flex-1"
                    />
                    <span className="font-mono text-[10px] text-neutral-300 w-8 text-right">
                      %{filters.reinhardStrength}
                    </span>
                  </div>
                )}
              </div>

              {/* Luminance-Aware Organic Grain */}
              <div className="space-y-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs font-medium text-white">Organik Film Greni</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.grainEnabled}
                    onChange={(e) => onUpdateFilters({ grainEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                </div>

                {filters.grainEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 w-10">Miktar</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filters.grainAmount}
                        onChange={(e) =>
                          onUpdateFilters({ grainAmount: parseInt(e.target.value, 10) })
                        }
                        className="flex-1"
                      />
                      <span className="font-mono text-[10px] text-neutral-300 w-6">
                        {filters.grainAmount}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 w-10">Boyut</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="1"
                        value={filters.grainSize}
                        onChange={(e) =>
                          onUpdateFilters({ grainSize: parseInt(e.target.value, 10) })
                        }
                        className="flex-1"
                      />
                      <span className="font-mono text-[10px] text-neutral-300 w-4">
                        {filters.grainSize}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Halation */}
              <div className="space-y-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-medium text-white">Halation (Işık Haresi)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.halationEnabled}
                    onChange={(e) => onUpdateFilters({ halationEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
                  />
                </div>

                {filters.halationEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 w-10">Yayılma</span>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        value={filters.halationRadius}
                        onChange={(e) =>
                          onUpdateFilters({ halationRadius: parseInt(e.target.value, 10) })
                        }
                        className="flex-1"
                      />
                      <span className="font-mono text-[10px] text-neutral-300 w-6">
                        {filters.halationRadius}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 w-12">Sıcaklık</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filters.halationTemp}
                        onChange={(e) =>
                          onUpdateFilters({ halationTemp: parseInt(e.target.value, 10) })
                        }
                        className="flex-1"
                      />
                      <span className="font-mono text-[10px] text-neutral-300 w-6">
                        {filters.halationTemp}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FRAME & TIMESTAMP */}
          {activeTab === "frame" && (
            <div className="space-y-2.5 pt-1">
              {/* 1. Minimalist Frame & Polaroid */}
              <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Frame className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">Çerçeve & Kenarlık</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={border.enabled}
                    onChange={(e) => onUpdateBorder({ enabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                </div>

                {border.enabled && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    {/* Frame Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateBorder({ type: "matte" })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          border.type === "matte"
                            ? "bg-white text-black border-white font-semibold"
                            : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        Matte (Eşit Kenar)
                      </button>

                      <button
                        onClick={() => onUpdateBorder({ type: "polaroid" })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          border.type === "polaroid"
                            ? "bg-white text-black border-white font-semibold"
                            : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        Polaroid (Fiziksel Baskı)
                      </button>
                    </div>

                    {/* Frame Color */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">Çerçeve Rengi</span>
                      <div className="flex items-center gap-2">
                        {[
                          { label: "Beyaz", hex: "#ffffff" },
                          { label: "Arşiv Kağıdı", hex: "#f7f5f0" },
                          { label: "Mat Siyah", hex: "#0d0d0d" },
                          { label: "Grafit", hex: "#1c1c1e" },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => onUpdateBorder({ color: c.hex })}
                            style={{ backgroundColor: c.hex }}
                            className={`w-5 h-5 rounded-full border transition-all ${
                              border.color === c.hex
                                ? "border-amber-400 scale-110 shadow-sm ring-2 ring-amber-400/20"
                                : "border-white/20"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Width & Radius Sliders */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400 w-12">Genişlik</span>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          value={border.widthPercent}
                          onChange={(e) =>
                            onUpdateBorder({ widthPercent: parseInt(e.target.value, 10) })
                          }
                          className="flex-1 accent-white"
                        />
                        <span className="font-mono text-[10px] text-neutral-300 w-6">
                          %{border.widthPercent}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400 w-12">Yumuşaklık</span>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={border.radius}
                          onChange={(e) =>
                            onUpdateBorder({ radius: parseInt(e.target.value, 10) })
                          }
                          className="flex-1 accent-white"
                        />
                        <span className="font-mono text-[10px] text-neutral-300 w-6">
                          {border.radius}px
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Nostalgic 90s Film Timestamp */}
              <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-white">90s Analog Tarih Damgası</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={timestamp.enabled}
                    onChange={(e) => onUpdateTimestamp({ enabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
                  />
                </div>

                {timestamp.enabled && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    {/* Date Text Input & Presets */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={timestamp.dateText}
                          onChange={(e) => onUpdateTimestamp({ dateText: e.target.value })}
                          className="flex-1 bg-black/60 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-400"
                          placeholder="'26 09 23"
                        />
                        <button
                          onClick={() =>
                            onUpdateTimestamp({
                              dateText: getFormattedTodayDate(timestamp.format),
                            })
                          }
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-[10px] text-neutral-300 hover:text-white transition-colors"
                          title="Bugünün tarihine sıfırla"
                        >
                          Bugün
                        </button>
                      </div>

                      {/* Format quick picks */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-neutral-500 mr-1">Biçim:</span>
                        {(["YY MM DD", "DD MM YY", "YYYY.MM.DD"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() =>
                              onUpdateTimestamp({
                                format: fmt,
                                dateText: getFormattedTodayDate(fmt),
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                              timestamp.format === fmt
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                : "text-neutral-400 hover:text-white"
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LED Color & Position */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">LED Rengi</span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { hex: "#ff8c00", label: "Amber" },
                            { hex: "#ff3b30", label: "Kırmızı" },
                            { hex: "#34c759", label: "Yeşil" },
                          ].map((col) => (
                            <button
                              key={col.hex}
                              onClick={() => onUpdateTimestamp({ color: col.hex })}
                              style={{ backgroundColor: col.hex }}
                              className={`w-4 h-4 rounded-full border transition-all ${
                                timestamp.color === col.hex
                                  ? "border-white scale-125 shadow-sm"
                                  : "border-white/20 opacity-70 hover:opacity-100"
                              }`}
                              title={col.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Konum</span>
                        <select
                          value={timestamp.position}
                          onChange={(e) =>
                            onUpdateTimestamp({
                              position: e.target.value as TimestampState["position"],
                            })
                          }
                          className="bg-black/60 border border-white/20 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 focus:outline-none"
                        >
                          <option value="bottom-right">Sağ Alt</option>
                          <option value="bottom-left">Sol Alt</option>
                          <option value="top-right">Sağ Üst</option>
                          <option value="top-left">Sol Üst</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Batch Sync Card */}
              <div className="p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <CopyCheck className="w-3.5 h-3.5" />
                    <span>Tüm Seriye Eşitle (Ratio Hariç)</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Filtreleri, çerçeveyi ve tarihi tüm seriye kopyalar. Fotoğrafların orijinal en-boy oranı (kırpması) bozulmaz.
                  </p>
                </div>

                <button
                  onClick={handleTriggerBatchSync}
                  className="pressable flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold transition-all shadow-sm"
                >
                  {syncSuccess ? "Eşitlendi!" : "Uygula"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SOCIAL MEDIA SIMULATOR */}
          {activeTab === "overlay" && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-neutral-400">Canlı Arayüz Şablonu</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onUpdateOverlay("none")}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    activeOverlay === "none"
                      ? "bg-white text-black border-white shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">Kapalı</div>
                  <div className="text-[10px] opacity-70">Salt Görsel</div>
                </button>

                <button
                  onClick={() => {
                    onUpdateOverlay("instagram-story");
                    onUpdateCropRatio("9:16");
                  }}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    activeOverlay === "instagram-story"
                      ? "bg-white text-black border-white shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">IG Story</div>
                  <div className="text-[10px] opacity-70">9:16 Dikey</div>
                </button>

                <button
                  onClick={() => {
                    onUpdateOverlay("tiktok-story");
                    onUpdateCropRatio("9:16");
                  }}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    activeOverlay === "tiktok-story"
                      ? "bg-white text-black border-white shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">TikTok</div>
                  <div className="text-[10px] opacity-70">9:16 Story/Video</div>
                </button>

                <button
                  onClick={() => {
                    onUpdateOverlay("instagram-post");
                    onUpdateCropRatio("4:5");
                  }}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    activeOverlay === "instagram-post"
                      ? "bg-white text-black border-white shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold">IG Post</div>
                  <div className="text-[10px] opacity-70">4:5 Feed/Carousel</div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: UPSCALE ENGINE (LANCZOS-3) */}
          {activeTab === "upscale" && (
            <div className="space-y-3 pt-1">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-white">
                      Lanczos-3 Akıllı Upscale
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    sinc(x) konvolüsyonu ile yapay zeka halüsinasyonsuz kayıpsız kenar keskinleştirme
                  </p>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUpscale}x Aktif
                </span>
              </div>

              {/* Upscale Factor Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onUpdateUpscale(1)}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    currentUpscale === 1
                      ? "bg-white text-black border-white shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-bold">1x Doğal</div>
                  <div className="text-[10px] opacity-70">{curW} × {curH} px</div>
                </button>

                <button
                  onClick={() => onUpdateUpscale(2)}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    currentUpscale === 2
                      ? "bg-amber-400 text-black border-amber-400 shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span>2x Retina</span>
                    <Sparkles className="w-3 h-3 text-current" />
                  </div>
                  <div className="text-[10px] opacity-80">{curW * 2} × {curH * 2} px</div>
                </button>

                <button
                  onClick={() => onUpdateUpscale(4)}
                  className={`pressable p-2.5 rounded-xl border text-left transition-all ${
                    currentUpscale === 4
                      ? "bg-amber-400 text-black border-amber-400 shadow-sm font-semibold"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-bold">4x Ultra 4K</div>
                  <div className="text-[10px] opacity-80">{curW * 4} × {curH * 4} px</div>
                </button>
              </div>

              {/* Resolution Metrics Card */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] font-mono">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-neutral-400 block">Kırpma Boyutu</span>
                  <span className="text-neutral-300 font-semibold">{curW} × {curH} px</span>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] text-neutral-400 block">Lanczos-3 Hedef</span>
                  <span className="text-white font-bold">{targetW} × {targetH} px</span>
                </div>
              </div>

              {/* Instant Upscale Action */}
              <button
                onClick={() => {
                  const upscalePreset: ExportPreset = {
                    id: `${currentUpscale}x-lanczos`,
                    name: `${currentUpscale}x Lanczos-3 Upscale`,
                    description: `${targetW} × ${targetH} px kayıpsız büyütme`,
                    scaleMultiplier: currentUpscale,
                    aspectRatio: crop.aspectRatio,
                    useLanczos: currentUpscale > 1,
                  };
                  onExportSingle(upscalePreset);
                }}
                className="pressable w-full py-2.5 px-4 rounded-xl bg-amber-400 text-black hover:bg-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-glass-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Lanczos-3 ile Hemen Upscale Et & İndir ({targetW} × {targetH})</span>
              </button>
            </div>
          )}

          {/* TAB 5: EXPORT & ARCHIVE */}
          {activeTab === "export" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">Çözünürlük & Format</span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="bg-neutral-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                >
                  {EXPORT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-neutral-400 font-mono">
                {selectedPreset.description}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onExportSingle(selectedPreset)}
                  className="pressable flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Bu Görseli İndir</span>
                </button>

                <button
                  onClick={onExportDump}
                  className="pressable flex-1 py-2 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-glass-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tüm Seriyi İndir ({images.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
