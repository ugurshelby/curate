"use client";

import React, { useState } from "react";
import {
  CurateImage,
  AspectRatio,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
  ExportPreset,
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
} from "lucide-react";
import { EXPORT_PRESETS } from "@/lib/export/zip-exporter";

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
  onResetFilters: () => void;
  onSetShowOriginal: (show: boolean) => void;
  onExportSingle: (preset: ExportPreset) => void;
  onExportDump: () => void;
}

type TabType = "crop" | "color" | "overlay" | "export";

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
  onResetFilters,
  onSetShowOriginal,
  onExportSingle,
  onExportDump,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("crop");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ig-retina");

  if (!image) return null;

  const { crop, filters } = image;
  const selectedPreset =
    EXPORT_PRESETS.find((p) => p.id === selectedPresetId) || EXPORT_PRESETS[0];

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30 pointer-events-none select-none">
      <div className="glass-toolbar rounded-2xl p-3 pointer-events-auto space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-1">
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
              <span>Analog & Renk</span>
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

          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline">
            {image.name.slice(0, 14)}
          </span>
        </div>

        {/* TAB 1: CROP & COMPOSITION */}
        {activeTab === "crop" && (
          <div className="space-y-3 pt-1">
            {/* Aspect Ratio Buttons */}
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

            {/* Guides & Zoom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              {/* Guides */}
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

              {/* Zoom Slider */}
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
            {/* Header controls: Compare Before/After & Reset */}
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

            {/* 1. Reinhard Color Transfer */}
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

            {/* 2. Luminance-Aware Organic Grain */}
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

            {/* 3. Halation (Işık Haresi) */}
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

        {/* TAB 3: SOCIAL MEDIA SIMULATOR */}
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

        {/* TAB 4: EXPORT & LANCZOS PRESETS */}
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
    </div>
  );
};
