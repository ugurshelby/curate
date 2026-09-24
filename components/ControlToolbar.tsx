"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Star,
  Film,
  SunMedium,
  Sparkle,
} from "lucide-react";
import { EXPORT_PRESETS } from "@/lib/export/zip-exporter";
import { getCropDimensions } from "@/lib/image/renderer";
import { getDefaultBorderState } from "@/lib/image/border";
import {
  getDefaultTimestampState,
  getFormattedTodayDate,
  getFormattedTodayWithTime,
} from "@/lib/image/timestamp";
import { FILM_PRESETS, getFavoritePresetIds, toggleFavoritePreset } from "@/lib/image/film-presets";
import { LightLeakType, FocusCategory, AestheticPreset } from "@/lib/types";
import { ResettableSlider } from "./ResettableSlider";
import {
  SLIDER_DEFAULTS,
  TOGGLE_DEFAULTS,
  applyToggleDefaults,
} from "@/lib/image/defaults";
/* Aesthetic presets are managed by page.tsx; toolbar receives them via props */

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
  focusCategory: FocusCategory;
  onCloseFocus: () => void;
  aestheticPresets: AestheticPreset[];
  onSaveAesthetic: (name: string) => void;
  onApplyAesthetic: (preset: AestheticPreset) => void;
  onDeleteAesthetic: (id: string) => void;
  /** floating = desktop overlay; sheet = mobile bottom sheet; sidebar = docked desktop inspector */
  layout?: "floating" | "sheet" | "sidebar";
}

type TabType = "presets" | "color" | "analog" | "crop" | "frame" | "overlay" | "upscale" | "export";

const SIDEBAR_TABS: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "presets", label: "Filtreler", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "color", label: "Renk & Işık", icon: <Sun className="w-3.5 h-3.5" /> },
  { id: "analog", label: "Analog", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "crop", label: "Kırpma", icon: <Crop className="w-3.5 h-3.5" /> },
  { id: "frame", label: "Çerçeve", icon: <Frame className="w-3.5 h-3.5" /> },
  { id: "upscale", label: "Lanczos", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "export", label: "Dışa Aktar", icon: <Download className="w-3.5 h-3.5" /> },
];

function focusToTab(cat: FocusCategory): TabType {
  if (cat === "preset-color") return "presets";
  if (cat === "analog") return "analog";
  if (cat === "frame") return "frame";
  if (cat === "size-crop") return "crop";
  return "presets";
}

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
  focusCategory,
  onCloseFocus,
  aestheticPresets,
  onSaveAesthetic,
  onApplyAesthetic,
  onDeleteAesthetic,
  layout = "floating",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => focusToTab(focusCategory));
  const [aesName, setAesName] = useState("");

  // Sync tab when focus category changes (Stage 3)
  useEffect(() => {
    if (focusCategory) {
      setActiveTab(focusToTab(focusCategory));
    }
  }, [focusCategory]);

  const isSidebar = layout === "sidebar";
  const isSheet = layout === "sheet";

  // Reinhard lives only under Preset/Color; Analog focus is texture-only
  const showPresets = isSidebar ? activeTab === "presets" : (focusCategory === "preset-color" && activeTab === "presets");
  const showReinhard = isSidebar ? activeTab === "color" : (focusCategory === "preset-color" && activeTab === "color");
  const showAnalog = isSidebar ? activeTab === "analog" : (focusCategory === "analog");
  const showCrop = isSidebar ? activeTab === "crop" : (focusCategory === "size-crop" && activeTab === "crop");
  const showFrame = isSidebar ? activeTab === "frame" : (focusCategory === "frame");
  const showOverlay = isSidebar ? activeTab === "overlay" : (focusCategory === "size-crop" && activeTab === "overlay");
  const showUpscale = isSidebar ? activeTab === "upscale" : (focusCategory === "size-crop" && activeTab === "upscale");
  const showExport = isSidebar ? activeTab === "export" : (focusCategory === "size-crop" && activeTab === "export");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ig-retina");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false); // unused in Stage 3 focus
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Preset favorites and filter state
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoritePresetIds());
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Dragging state
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  if (!image) return null;

  // In sidebar mode, panel is always accessible. In floating mode, wait for focus.
  if (!isSidebar && !focusCategory) return null;

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

  const tabPanels = (
    <>
      {/* TAB 1: 35mm ANALOG FILM PRESETS */}
          {showPresets && (
            <div className="space-y-2.5 pt-1">
              {/* Header & Filter Controls */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setOnlyFavorites(false)}
                    className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      !onlyFavorites
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "text-neutral-400 hover:text-white bg-white/5"
                    }`}
                  >
                    Tüm Filmler ({FILM_PRESETS.length})
                  </button>
                  <button
                    onClick={() => setOnlyFavorites(true)}
                    className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                      onlyFavorites
                        ? "bg-amber-400 text-black font-semibold shadow-sm"
                        : "text-amber-400/80 hover:text-amber-300 bg-amber-400/10"
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    <span>Favoriler ({favoriteIds.length})</span>
                  </button>
                </div>

                {filters.activePresetId && (
                  <button
                    onClick={() => onUpdateFilters({ activePresetId: null })}
                    className="pressable px-2 py-0.5 rounded text-[10px] text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Preset Sıfırla
                  </button>
                )}
              </div>


              {/* My Aesthetic Presets (localStorage) */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white">My Aesthetic</span>
                  <span className="text-[9px] text-neutral-500 font-mono">localStorage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={aesName}
                    onChange={(e) => setAesName(e.target.value)}
                    placeholder="Preset adı..."
                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!aesName.trim()) return;
                      onSaveAesthetic(aesName.trim());
                      setAesName("");
                    }}
                    className="pressable px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[10px] font-semibold"
                  >
                    Kaydet
                  </button>
                </div>
                {aestheticPresets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {aestheticPresets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => onApplyAesthetic(p)}
                          className="text-[10px] text-amber-300 hover:text-amber-200 font-medium"
                          title="Tüm seriye uygula (kırpma hariç)"
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAesthetic(p.id)}
                          className="text-neutral-500 hover:text-rose-400 text-[10px]"
                          title="Sil"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Preset Intensity (Amount) Slider */}
              {filters.activePresetId && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <ResettableSlider
                    label={`${FILM_PRESETS.find((p) => p.id === filters.activePresetId)?.name || "Film LUT"} Yoğunluğu`}
                    value={filters.presetAmount ?? 100}
                    min={0}
                    max={100}
                    defaultValue={100}
                    onChange={(v) => onUpdateFilters({ presetAmount: v })}
                    suffix="%"
                    accentClassName="accent-amber-400"
                  />
                </div>
              )}

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {[...FILM_PRESETS]
                  .sort((a, b) => {
                    const aFav = favoriteIds.includes(a.id) ? 1 : 0;
                    const bFav = favoriteIds.includes(b.id) ? 1 : 0;
                    return bFav - aFav;
                  })
                  .filter((p) => !onlyFavorites || favoriteIds.includes(p.id))
                  .map((preset) => {
                    const isActive = filters.activePresetId === preset.id;
                    const isFav = favoriteIds.includes(preset.id);

                    // Tone swatches for thumbnail preview
                    const toneGradients: Record<string, string> = {
                      "kodak-portra-400": "linear-gradient(135deg, #fcd5b5 0%, #e89a66 50%, #b8623b 100%)",
                      "cinestill-800t": "linear-gradient(135deg, #0e2f44 0%, #1e555c 40%, #ff8c42 100%)",
                      "fuji-pro-400h": "linear-gradient(135deg, #d8f3dc 0%, #95d5b2 50%, #52b788 100%)",
                      "kodak-gold-200": "linear-gradient(135deg, #ffe066 0%, #f77f00 60%, #d62828 100%)",
                      "kodak-tri-x-400": "linear-gradient(135deg, #ffffff 0%, #495057 50%, #000000 100%)",
                      "ilford-hp5": "linear-gradient(135deg, #e9ecef 0%, #adb5bd 50%, #212529 100%)",
                      "polaroid-600": "linear-gradient(135deg, #f4f1de 0%, #ccd5ae 50%, #e07a5f 100%)",
                      "fuji-velvia-50": "linear-gradient(135deg, #0077b6 0%, #0096c7 40%, #e63946 100%)",
                      "agfa-vista-200": "linear-gradient(135deg, #e63946 0%, #f4a261 50%, #2a9d8f 100%)",
                      "leica-monochrom": "linear-gradient(135deg, #f8f9fa 0%, #6c757d 60%, #111111 100%)",
                    };

                    const gradient =
                      toneGradients[preset.id] ||
                      "linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)";

                    return (
                      <div
                        key={preset.id}
                        onClick={() =>
                          onUpdateFilters({
                            activePresetId: preset.id,
                            presetAmount: filters.presetAmount ?? 100,
                          })
                        }
                        className={`group relative p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isActive
                            ? "bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40"
                            : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
                        }`}
                      >
                        {/* Film Swatch Thumbnail Preview */}
                        <div
                          style={{ background: gradient }}
                          className="w-full h-11 rounded-lg mb-2 relative overflow-hidden shadow-inner flex items-end p-1.5"
                        >
                          {/* Grain & film perforation texture overlay */}
                          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />

                          {/* Film Type Tag Pill */}
                          <span className="relative z-10 text-[8px] font-mono px-1 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white/90">
                            {preset.filmType === "black-white"
                              ? "S/B"
                              : preset.filmType === "instant"
                              ? "Instant"
                              : "Color"}
                          </span>

                          {/* Favorite Star Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = toggleFavoritePreset(preset.id);
                              setFavoriteIds([...updated]);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-black/90 transition-colors"
                            title={isFav ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                          >
                            <Star
                              className={`w-3 h-3 ${
                                isFav
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-white/50 hover:text-amber-300"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Title & Tag */}
                        <div className="text-[11px] font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[9px] text-neutral-400 truncate">
                          {preset.tag}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2: CROP & COMPOSITION */}
          {showCrop && (
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

                <div className="pt-1 w-full">
                  <ResettableSlider
                    label="Yakınlaştırma (Zoom)"
                    value={crop.zoom}
                    min={1}
                    max={3}
                    step={0.05}
                    defaultValue={1}
                    onChange={(v) => onUpdateZoom(v)}
                    suffix="x"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALOG & REINHARD COLOR TRANSFER */}
          {(showReinhard || showAnalog) && (
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

              {/* Reinhard Color Transfer — Preset/Color focus only */}
              {showReinhard && (
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
                  <div className="pt-1 w-full">
                    <ResettableSlider
                      label="Renk Eşleşme Oranı"
                      value={filters.reinhardStrength}
                      min={0}
                      max={100}
                      defaultValue={70}
                      onChange={(v) => onUpdateFilters({ reinhardStrength: v })}
                      suffix="%"
                      accentClassName="accent-amber-400"
                    />
                  </div>
                )}
              </div>
              )}

              {/* Analog textures — Analog focus only */}
              {showAnalog && (
              <>
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
                    onChange={(e) =>
                      onUpdateFilters(
                        e.target.checked
                          ? applyToggleDefaults(filters, "grainEnabled")
                          : { grainEnabled: false }
                      )
                    }
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                </div>

                {filters.grainEnabled && (
                  <div className="flex flex-col gap-2.5 pt-1 w-full">
                    <ResettableSlider
                      label="Miktar"
                      value={filters.grainAmount}
                      min={0}
                      max={100}
                      defaultValue={SLIDER_DEFAULTS.grainAmount}
                      onChange={(v) => onUpdateFilters({ grainAmount: v })}
                      suffix="%"
                    />
                    <ResettableSlider
                      label="Boyut"
                      value={filters.grainSize}
                      min={1}
                      max={3}
                      step={1}
                      defaultValue={SLIDER_DEFAULTS.grainSize}
                      onChange={(v) => onUpdateFilters({ grainSize: v })}
                      suffix="px"
                    />
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
                    onChange={(e) =>
                      onUpdateFilters(
                        e.target.checked
                          ? applyToggleDefaults(filters, "halationEnabled")
                          : { halationEnabled: false }
                      )
                    }
                    className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
                  />
                </div>

                {filters.halationEnabled && (
                  <div className="flex flex-col gap-2.5 pt-1 w-full">
                    <ResettableSlider
                      label="Miktar"
                      value={filters.halationAmount ?? TOGGLE_DEFAULTS.halationAmount}
                      min={0}
                      max={100}
                      defaultValue={SLIDER_DEFAULTS.halationAmount}
                      onChange={(v) => onUpdateFilters({ halationAmount: v })}
                      suffix="%"
                      accentClassName="accent-rose-400"
                    />
                    <ResettableSlider
                      label="Yayılma"
                      value={filters.halationRadius}
                      min={2}
                      max={30}
                      defaultValue={SLIDER_DEFAULTS.halationRadius}
                      onChange={(v) => onUpdateFilters({ halationRadius: v })}
                      suffix="px"
                      accentClassName="accent-rose-400"
                    />
                    <ResettableSlider
                      label="Sıcaklık"
                      value={filters.halationTemp}
                      min={0}
                      max={100}
                      defaultValue={SLIDER_DEFAULTS.halationTemp}
                      onChange={(v) => onUpdateFilters({ halationTemp: v })}
                      suffix="°"
                      accentClassName="accent-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Vintage Lens Vignette */}
              <div className="space-y-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SunMedium className="w-3.5 h-3.5 text-neutral-300" />
                    <span className="text-xs font-medium text-white">Vintage Lens Vinyeti</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.vignetteEnabled}
                    onChange={(e) =>
                      onUpdateFilters(
                        e.target.checked
                          ? applyToggleDefaults(filters, "vignetteEnabled")
                          : { vignetteEnabled: false }
                      )
                    }
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                </div>

                {filters.vignetteEnabled && (
                  <div className="pt-1">
                    <ResettableSlider
                      label="Karartma"
                      value={filters.vignetteAmount}
                      min={0}
                      max={100}
                      defaultValue={SLIDER_DEFAULTS.vignetteAmount}
                      onChange={(v) => onUpdateFilters({ vignetteAmount: v })}
                      suffix="%"
                    />
                  </div>
                )}
              </div>

              {/* 35mm Light Leak */}
              <div className="space-y-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white">35mm Işık Sızıntısı (Light Leak)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.lightLeakEnabled}
                    onChange={(e) =>
                      onUpdateFilters(
                        e.target.checked
                          ? applyToggleDefaults(filters, "lightLeakEnabled")
                          : { lightLeakEnabled: false }
                      )
                    }
                    className="w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
                  />
                </div>

                {filters.lightLeakEnabled && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: "warm-side", label: "Kenar" },
                        { id: "corner-flare", label: "Köşe" },
                        { id: "streak", label: "Şerit" },
                        { id: "subtle", label: "Yumuşak" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() =>
                            onUpdateFilters({ lightLeakType: t.id as LightLeakType })
                          }
                          className={`py-1 px-1 rounded-md text-[10px] font-mono border text-center transition-all ${
                            (filters.lightLeakType || "warm-side") === t.id
                              ? "bg-amber-400 text-black border-amber-400 font-semibold"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <ResettableSlider
                      label="Miktar"
                      value={filters.lightLeakAmount}
                      min={0}
                      max={100}
                      defaultValue={SLIDER_DEFAULTS.lightLeakAmount}
                      onChange={(v) => onUpdateFilters({ lightLeakAmount: v })}
                      suffix="%"
                      accentClassName="accent-amber-400"
                    />
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {/* TAB 4: FRAME & TIMESTAMP */}
          {showFrame && (
            <div className="space-y-2.5 pt-1">
              {/* 1. Minimalist Frame, Polaroid & Smart Ambient Gradient */}
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
                    {/* Frame Type (3 options: Matte, Polaroid, Smart Ambient Gradient) */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => onUpdateBorder({ type: "matte" })}
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                          border.type === "matte"
                            ? "bg-white text-black border-white font-semibold shadow-sm"
                            : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        Matte (Eşit)
                      </button>

                      <button
                        onClick={() => onUpdateBorder({ type: "polaroid" })}
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                          border.type === "polaroid"
                            ? "bg-white text-black border-white font-semibold shadow-sm"
                            : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        Polaroid
                      </button>

                      <button
                        onClick={() => onUpdateBorder({ type: "smart-gradient" })}
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                          border.type === "smart-gradient"
                            ? "bg-amber-400 text-black border-amber-400 font-semibold shadow-sm"
                            : "bg-white/5 border-white/10 text-amber-400/90 hover:bg-amber-400/10"
                        }`}
                      >
                        ✨ Akıllı Gradyan
                      </button>
                    </div>

                    {border.type === "smart-gradient" ? (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 leading-tight">
                        Fotoğrafın kenarlarındaki renk tonları taranarak geçişi kusursuzlaştıran yumuşak bir ambient gradyan uygulanır.
                      </div>
                    ) : (
                      /* Frame Color (for solid matte / polaroid) */
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
                    )}

                    {/* Width & Radius Sliders */}
                    <div className="flex flex-col gap-2.5 pt-1 w-full">
                      <ResettableSlider
                        label="Çerçeve Kalınlığı"
                        value={border.widthPercent}
                        min={2}
                        max={20}
                        defaultValue={6}
                        onChange={(v) => onUpdateBorder({ widthPercent: v })}
                        suffix="%"
                      />
                      <ResettableSlider
                        label="Köşe Yumuşaklığı"
                        value={border.radius}
                        min={0}
                        max={30}
                        defaultValue={0}
                        onChange={(v) => onUpdateBorder({ radius: v })}
                        suffix="px"
                      />
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
                        <button
                          onClick={() =>
                            onUpdateTimestamp({
                              dateText: getFormattedTodayWithTime(timestamp.format),
                            })
                          }
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-[10px] text-amber-300 hover:text-amber-200 transition-colors font-mono"
                          title="Tarihin yanına güncel saati ekle"
                        >
                          + Saat
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
          {showOverlay && (
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
          {showUpscale && (
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
          {showExport && (
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
    </>
  );

  if (isSidebar) {
    return (
      <div className="w-full h-full flex flex-col bg-neutral-950/85 backdrop-blur-2xl text-white select-none overflow-hidden border-l border-white/10">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-neutral-900/40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
            <span className="text-xs font-semibold tracking-tight text-white">Studio Inspector</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
              {crop.aspectRatio.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTriggerBatchSync}
              className={`pressable px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all ${
                syncSuccess
                  ? "bg-emerald-500 text-black font-semibold"
                  : "bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-400 hover:text-black"
              }`}
              title="Analog filtreleri, çerçeve ve tarih damgasını serideki tüm fotoğraflara uygula"
            >
              {syncSuccess ? <Check className="w-3 h-3 text-current" /> : <CopyCheck className="w-3 h-3 text-current" />}
              <span>{syncSuccess ? "Eşitlendi" : "Seriye Eşitle"}</span>
            </button>

            <button
              onClick={onResetFilters}
              className="pressable p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Filtreleri Sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onCloseFocus}
              className="pressable p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Paneli Gizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Tab Selector */}
        <div className="px-3 pt-2.5 pb-2 border-b border-white/10 shrink-0 overflow-x-auto scrollbar-none bg-neutral-900/20">
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5 min-w-max">
            {SIDEBAR_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pressable px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tabPanels}
        </div>
      </div>
    );
  }

  // Floating / Mobile Sheet fallback:
  return (
    <div
      style={
        isSheet
          ? undefined
          : {
              transform: `translate3d(calc(-50% + ${offset.x}px), ${offset.y}px, 0)`,
            }
      }
      className={
        isSheet
          ? "relative w-full px-3 z-30 pointer-events-auto select-none"
          : "absolute bottom-20 left-1/2 w-full max-w-xl px-4 z-30 pointer-events-none select-none transition-transform duration-75 hidden sm:block"
      }
    >
      <div
        className={`pointer-events-auto space-y-2.5 ${
          isSheet
            ? "p-2 max-h-[48vh] overflow-y-auto pr-1"
            : "glass-toolbar rounded-2xl p-3 shadow-glass border border-white/15"
        }`}
        onPointerDown={(e) => {
          if (isSheet) e.stopPropagation();
        }}
      >
        {/* Drag Handle & Top Controls Row — desktop floating only */}
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          className={`flex items-center justify-between cursor-grab active:cursor-grabbing py-0.5 border-b border-white/10 group select-none ${
            isSheet ? "hidden" : ""
          }`}
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
              title="Analog filtreleri, cerceve ve tarih damgasini serideki tum fotografara senkronize eder (En-boy oranlari korunur)"
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
              onClick={onCloseFocus}
              className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Pillere Dön (Esc)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onCloseFocus}
              className="p-1 rounded-md text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Odaktan Çık"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Focus Category Header (Stage 3) — hidden on mobile sheet */}
        <div
          className={`flex items-center justify-between border-b border-white/10 pb-2 ${
            isSheet ? "hidden" : ""
          }`}
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {focusCategory === "preset-color" && (
              <>
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "presets"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Film LUT
                </button>
                <button
                  onClick={() => setActiveTab("color")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "color"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Renk Eşle
                </button>
              </>
            )}
            {focusCategory === "analog" && (
              <span className="text-xs font-semibold text-white px-1">
                Analog Doku
              </span>
            )}
            {focusCategory === "frame" && (
              <span className="text-xs font-semibold text-white px-1">
                Cerceve & Damga
              </span>
            )}
            {focusCategory === "size-crop" && (
              <>
                <button
                  onClick={() => setActiveTab("crop")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "crop"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400"
                  }`}
                >
                  Kırpma
                </button>
                <button
                  onClick={() => setActiveTab("upscale")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "upscale"
                      ? "bg-amber-400 text-black font-semibold"
                      : "text-amber-400/90"
                  }`}
                >
                  Upscale
                </button>
                <button
                  onClick={() => setActiveTab("export")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "export"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400"
                  }`}
                >
                  Export
                </button>
                <button
                  onClick={() => setActiveTab("overlay")}
                  className={`pressable px-2.5 py-1 rounded-lg text-xs font-medium ${
                    activeTab === "overlay"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400"
                  }`}
                >
                  Simülatör
                </button>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden md:inline">
            {image.name.slice(0, 10)}
          </span>
        </div>

        {tabPanels}
      </div>
    </div>
  );
};
