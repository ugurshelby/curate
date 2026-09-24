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
  FocusCategory,
  AestheticPreset,
  FilmPreset,
} from "@/lib/types";
import {
  Crop,
  Sliders,
  Download,
  Sparkles,
  Grid3X3,
  Layers,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Eye,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Frame,
  Calendar,
  CopyCheck,
  Check,
  Palette,
  Film,
  Sparkle,
  Columns2,
  Bookmark,
} from "lucide-react";
import { EXPORT_PRESETS } from "@/lib/export/zip-exporter";
import { getCropDimensions } from "@/lib/image/renderer";
import { getDefaultBorderState } from "@/lib/image/border";
import {
  getDefaultTimestampState,
  getFormattedTodayDate,
  getFormattedTodayWithTime,
} from "@/lib/image/timestamp";
import {
  FILM_PRESETS,
  SIGNATURE_PRESETS,
  CLASSIC_FILM_PRESETS,
  applySignaturePresetToFilterState,
} from "@/lib/image/film-presets";
import { ResettableSlider } from "./ResettableSlider";
import { SignaturePresetCards } from "./SignaturePresetCards";
import { generatePresetPreviews } from "@/lib/image/preset-preview";
import { analyzeImageForPreset, RecommendedPresetId } from "@/lib/image/preset-analyzer";

const FILM_GRADIENTS: Record<string, string> = {
  "kodak-portra-400": "from-amber-600/35 via-orange-500/20 to-neutral-900/60",
  "cinestill-800t": "from-cyan-600/35 via-sky-700/20 to-rose-950/60",
  "fuji-pro-400h": "from-emerald-600/30 via-teal-500/20 to-neutral-900/60",
  "kodak-gold-200": "from-yellow-500/35 via-amber-600/25 to-stone-900/60",
  "kodak-tri-x-400": "from-neutral-600/40 via-neutral-700/25 to-black/80",
  "ilford-hp5": "from-stone-400/35 via-neutral-600/20 to-neutral-950/70",
  "kodak-ektar-100": "from-red-600/35 via-amber-500/25 to-neutral-900/60",
  "fuji-velvia-50": "from-purple-600/30 via-emerald-600/25 to-neutral-900/60",
  "polaroid-600": "from-blue-600/25 via-amber-500/20 to-neutral-900/60",
  "kodachrome-64": "from-rose-600/30 via-yellow-600/25 to-neutral-900/60",
};

interface ControlToolbarProps {
  image: CurateImage | null;
  images: CurateImage[];
  referenceImageId: string | null;
  activeGuide: CompositionGuide;
  activeOverlay: SocialOverlayType;
  showOriginal: boolean;
  onUpdateCropRatio: (ratio: AspectRatio) => void;
  onUpdateZoom: (zoom: number) => void;
  onRotate90?: () => void;
  onToggleFlipHorizontal?: () => void;
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
  splitView?: boolean;
  onToggleSplitView?: () => void;
  onSetReference?: (id: string) => void;
}

type TabType = "presets" | "crop" | "frame" | "analog" | "tools" | "export";

const SIDEBAR_TABS: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "presets", label: "Presetler", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "crop", label: "Kırpma", icon: <Crop className="w-3.5 h-3.5" /> },
  { id: "frame", label: "Çerçeve", icon: <Frame className="w-3.5 h-3.5" /> },
  { id: "analog", label: "Analog", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "tools", label: "Araçlar", icon: <Sliders className="w-3.5 h-3.5" /> },
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
  onRotate90,
  onToggleFlipHorizontal,
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
  splitView = false,
  onToggleSplitView,
  onSetReference,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => focusToTab(focusCategory));
  const [aesName, setAesName] = useState("");
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ig-retina");

  // Spec 3.1: "Slider hiçbir zaman varsayılan görünümde açık olmamalı. Preset uygulandıktan sonra 'ince ayar' katlanmış bir bölüm olmalı."
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [classicPresetsOpen, setClassicPresetsOpen] = useState(false);
  const [myAestheticOpen, setMyAestheticOpen] = useState(true);

  // Live real-time preview thumbnails & auto recommendation state
  const [previewThumbs, setPreviewThumbs] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<{
    presetId: RecommendedPresetId;
    reason: string;
  } | null>(null);

  // Dragging state for desktop floating layout
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  // Sync tab when focus category changes (Stage 3)
  useEffect(() => {
    if (focusCategory) {
      setActiveTab(focusToTab(focusCategory));
    }
  }, [focusCategory]);

  // Compute live thumbnail previews and auto-recommendation when active image changes
  const activeImgId = image?.id;
  const activeImgDataUrl = image?.dataUrl;

  useEffect(() => {
    if (!activeImgId || !activeImgDataUrl) return;

    // Generate real-time thumbnail previews on user's actual photo for all presets
    generatePresetPreviews(activeImgDataUrl, FILM_PRESETS).then((thumbs) => {
      setPreviewThumbs(thumbs);
    });

    // Run lighting/contrast analyzer for auto recommendation (Spec 3.2)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const res = analyzeImageForPreset(img, activeImgId);
      setRecommendation({ presetId: res.presetId, reason: res.reason });
    };
    img.src = activeImgDataUrl;
  }, [activeImgId, activeImgDataUrl]);

  if (!image) return null;

  const isSidebar = layout === "sidebar";
  const isSheet = layout === "sheet";

  // Tab visibility rules
  const showPresets = isSidebar ? activeTab === "presets" : (focusCategory === "preset-color" || activeTab === "presets");
  const showCrop = isSidebar ? activeTab === "crop" : (focusCategory === "size-crop" && activeTab === "crop");
  const showFrame = isSidebar ? activeTab === "frame" : (focusCategory === "frame" || activeTab === "frame");
  const showAnalog = isSidebar ? activeTab === "analog" : (focusCategory === "analog" || activeTab === "analog");
  const showTools = isSidebar ? activeTab === "tools" : (activeTab === "tools");
  const showExport = isSidebar ? activeTab === "export" : (activeTab === "export");

  const { crop, filters } = image;
  const currentUpscale = image.upscaleFactor || 1;
  const border = image.border || getDefaultBorderState();
  const timestamp = image.timestamp || getDefaultTimestampState();
  const selectedPreset =
    EXPORT_PRESETS.find((p) => p.id === selectedPresetId) || EXPORT_PRESETS[0];

  const handleTriggerBatchSync = () => {
    onBatchSync();
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  };

  const handleSelectSignaturePreset = (preset: FilmPreset) => {
    const updates = applySignaturePresetToFilterState(preset);
    onUpdateFilters(updates);
  };

  const handleBatchApplySignaturePreset = (preset: FilmPreset) => {
    const updates = applySignaturePresetToFilterState(preset);
    onUpdateFilters(updates);
    handleTriggerBatchSync();
  };

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
    setOffset({
      x: dragStartOffsetRef.current.x + dx,
      y: dragStartOffsetRef.current.y + dy,
    });
  };

  const handleDragPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const tabPanels = (
    <>
      {/* TAB 1: PRESETLER (SENİN PRESETLERİN + İNCE AYAR + DİĞERLERİ + MY AESTHETIC) */}
      {showPresets && (
        <div className="space-y-4 pt-1">
          {/* 1.1 SENİN PRESETLERİN (SPEC 2 & 3.1) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                <h3 className="text-xs font-semibold text-white tracking-tight">
                  Senin Presetlerin
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  5 Estetik Aile
                </span>
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

            <SignaturePresetCards
              activePresetId={filters.activePresetId}
              onSelectPreset={handleSelectSignaturePreset}
              onBatchApplyPreset={handleBatchApplySignaturePreset}
              recommendedPresetId={recommendation?.presetId}
              recommendationReason={recommendation?.reason}
              previewThumbs={previewThumbs}
              isCompact={false}
            />
          </div>

          {/* 1.2 İNCE AYAR (COLLAPSED BY DEFAULT - SPEC 3.1) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setFineTuneOpen(!fineTuneOpen)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs font-medium">İnce Ayar (İsteğe Bağlı)</span>
                {filters.activePresetId && (
                  <span className="text-[10px] font-mono text-amber-400/90 bg-amber-400/10 px-1.5 py-0.2 rounded">
                    {filters.presetAmount ?? 100}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 font-mono">
                  {fineTuneOpen ? "Kapat" : "Aç"}
                </span>
                {fineTuneOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </div>
            </button>

            {fineTuneOpen && (
              <div className="p-3 pt-1 space-y-3 border-t border-white/5 bg-black/20">
                {filters.activePresetId && (
                  <ResettableSlider
                    label={`${
                      FILM_PRESETS.find((p) => p.id === filters.activePresetId)?.name || "Preset"
                    } Yoğunluğu`}
                    value={filters.presetAmount ?? 100}
                    min={0}
                    max={100}
                    defaultValue={100}
                    onChange={(v) => onUpdateFilters({ presetAmount: v })}
                    suffix="%"
                    accentClassName="accent-amber-400"
                  />
                )}

                <ResettableSlider
                  label="Gren (Film Grain)"
                  value={filters.grainEnabled ? filters.grainAmount : 0}
                  min={0}
                  max={60}
                  defaultValue={15}
                  onChange={(v) =>
                    onUpdateFilters({
                      grainAmount: v,
                      grainEnabled: v > 0,
                    })
                  }
                  suffix="%"
                />

                <ResettableSlider
                  label="Halation (Işık Taşması)"
                  value={filters.halationEnabled ? filters.halationAmount : 0}
                  min={0}
                  max={50}
                  defaultValue={12}
                  onChange={(v) =>
                    onUpdateFilters({
                      halationAmount: v,
                      halationEnabled: v > 0,
                    })
                  }
                  suffix="%"
                />

                <ResettableSlider
                  label="Vinyet (Kenar Karartması)"
                  value={filters.vignetteEnabled ? filters.vignetteAmount : 0}
                  min={0}
                  max={50}
                  defaultValue={15}
                  onChange={(v) =>
                    onUpdateFilters({
                      vignetteAmount: v,
                      vignetteEnabled: v > 0,
                    })
                  }
                  suffix="%"
                />
              </div>
            )}
          </div>

          {/* 1.3 DİĞER FİLM PRESETLERİ (10) - COLLAPSED SECONDARY (SPEC 3.1) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setClassicPresetsOpen(!classicPresetsOpen)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs font-medium">Diğer Film Presetleri</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                  {CLASSIC_FILM_PRESETS.length} Klasik
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {classicPresetsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </div>
            </button>

            {classicPresetsOpen && (
              <div className="p-3 pt-2 space-y-2 border-t border-white/5 bg-black/20">
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {CLASSIC_FILM_PRESETS.map((preset) => {
                    const isActive = filters.activePresetId === preset.id;
                    const thumbUrl = previewThumbs[preset.id];
                    const grad = FILM_GRADIENTS[preset.id] || "from-amber-600/25 to-neutral-900/40";
                    return (
                      <div
                        key={preset.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          onUpdateFilters({
                            activePresetId: preset.id,
                            presetAmount: filters.presetAmount ?? 100,
                          })
                        }
                        className={`group relative overflow-hidden p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                          isActive
                            ? "bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/40"
                            : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
                        }`}
                      >
                        {thumbUrl ? (
                          <div className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
                            <img
                              src={thumbUrl}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                          </div>
                        ) : (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-35 group-hover:opacity-55 transition-opacity pointer-events-none`}
                          />
                        )}
                        <div className="relative z-10">
                          <div className="text-[11px] font-semibold text-white truncate">
                            {preset.name}
                          </div>
                          <div className="text-[9px] text-neutral-300/80 truncate">
                            {preset.tag}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 1.4 MY AESTHETIC — ADLANDIRILMIŞ ÇOKLU PROFİL LİSTESİ (SPEC 3.3) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setMyAestheticOpen(!myAestheticOpen)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">My Aesthetic</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                  {aestheticPresets.length} Profil
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {myAestheticOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </div>
            </button>

            {myAestheticOpen && (
              <div className="p-3 pt-2 space-y-2.5 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={aesName}
                    onChange={(e) => setAesName(e.target.value)}
                    placeholder="Mevcut ayarları kaydet/güncelle..."
                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!aesName.trim()) return;
                      onSaveAesthetic(aesName.trim());
                      setAesName("");
                    }}
                    className="pressable px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[10px] font-semibold hover:bg-amber-300 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>

                {aestheticPresets.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    {aestheticPresets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onApplyAesthetic(p)}
                          className="flex-1 text-left text-[11px] font-medium text-amber-300 hover:text-amber-200 truncate pr-2"
                          title="Tüm seriye uygula (kırpma hariç)"
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onApplyAesthetic(p)}
                            className="pressable px-2 py-0.5 rounded text-[9px] bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-black transition-colors"
                            title="Tüm seriye uygula"
                          >
                            Uygula
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAesthetic(p.id)}
                            className="text-neutral-500 hover:text-rose-400 p-1 text-[11px] transition-colors"
                            title="Sil"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

          {/* Rotate & Flip controls */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[11px] font-medium text-neutral-400">Yön & Açı</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRotate90}
                className="pressable px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors active:scale-95"
                title="90° Saat Yönünde Döndür"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>90° Döndür</span>
              </button>
              <button
                type="button"
                onClick={onToggleFlipHorizontal}
                className={`pressable px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors active:scale-95 ${
                  crop.flipHorizontal
                    ? "bg-amber-400/20 border-amber-400 text-amber-300"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                }`}
                title="Yatay Çevir"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Yatay Çevir</span>
              </button>
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

      {/* TAB 3: FRAME & TIMESTAMP */}
      {showFrame && (
        <div className="space-y-3 pt-1">
          {/* Border Styles */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Çerçeve & Mat</span>
              <input
                type="checkbox"
                checked={border.enabled}
                onChange={(e) => onUpdateBorder({ enabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
              />
            </div>

            {border.enabled && (
              <div className="space-y-2.5 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  {(["matte", "polaroid", "smart-gradient"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => onUpdateBorder({ type })}
                      className={`pressable flex-1 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                        border.type === type
                          ? "bg-white text-black border-white font-semibold"
                          : "text-neutral-400 hover:text-white bg-white/5 border-white/10"
                      }`}
                    >
                      {type === "matte"
                        ? "Matte"
                        : type === "polaroid"
                        ? "Polaroid"
                        : "Ambient"}
                    </button>
                  ))}
                </div>

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

          {/* Nostalgic 90s Film Timestamp */}
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
                  >
                    + Saat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ANALOG KATMAN (GRAIN, HALATION, VIGNETTE, LIGHT LEAK) */}
      {showAnalog && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-neutral-400">Analog Doku Katmanları</span>
            <button
              onClick={onResetFilters}
              className="pressable px-2 py-0.5 rounded-md text-[11px] font-sans text-neutral-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* Halation */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">35mm Halation</span>
              {filters.halationEnabled && filters.halationAmount > 0 && (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  Aktif
                </span>
              )}
            </div>
            <ResettableSlider
              label="Halation Yoğunluğu"
              value={filters.halationEnabled ? filters.halationAmount : 0}
              min={0}
              max={40}
              defaultValue={0}
              onChange={(v) =>
                onUpdateFilters({
                  halationEnabled: v > 0,
                  halationAmount: v,
                })
              }
              suffix="%"
            />
          </div>

          {/* Grain */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Organik Film Greni</span>
              {filters.grainEnabled && filters.grainAmount > 0 && (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  Aktif
                </span>
              )}
            </div>
            <ResettableSlider
              label="Gren Yoğunluğu"
              value={filters.grainEnabled ? filters.grainAmount : 0}
              min={0}
              max={50}
              defaultValue={0}
              onChange={(v) =>
                onUpdateFilters({
                  grainEnabled: v > 0,
                  grainAmount: v,
                })
              }
              suffix="%"
            />
          </div>

          {/* Vignette */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Vintage Vinyet</span>
              {filters.vignetteEnabled && filters.vignetteAmount > 0 && (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  Aktif
                </span>
              )}
            </div>
            <ResettableSlider
              label="Vinyet Miktarı"
              value={filters.vignetteEnabled ? filters.vignetteAmount : 0}
              min={0}
              max={50}
              defaultValue={0}
              onChange={(v) =>
                onUpdateFilters({
                  vignetteEnabled: v > 0,
                  vignetteAmount: v,
                })
              }
              suffix="%"
            />
          </div>

          {/* Light Leak */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Analog Işık Sızması</span>
              {filters.lightLeakEnabled && filters.lightLeakAmount > 0 && (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  Aktif
                </span>
              )}
            </div>
            <ResettableSlider
              label="Işık Sızması Yoğunluğu"
              value={filters.lightLeakEnabled ? filters.lightLeakAmount : 0}
              min={0}
              max={100}
              defaultValue={0}
              onChange={(v) =>
                onUpdateFilters({
                  lightLeakEnabled: v > 0,
                  lightLeakAmount: v,
                })
              }
              suffix="%"
            />
          </div>
        </div>
      )}

      {/* TAB 5: ARAÇLAR & GELİŞMİŞ (REINHARD, SPLIT VIEW, LANCZOS - SPEC 3.5) */}
      {showTools && (
        <div className="space-y-3 pt-1">
          <div className="px-1">
            <h3 className="text-xs font-semibold text-white">Gelişmiş Stüdyo Araçları</h3>
            <p className="text-[10px] text-neutral-400">
              Reinhard renk eşleştirme, split view ve Lanczos upscale gibi ileri düzey araçlar.
            </p>
          </div>

          {/* Reinhard Renk Transferi (Spec 3.5: Gelişmiş altına alındı) */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">Reinhard Renk Transferi</span>
              </div>
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

            {filters.reinhardEnabled && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Referans Görsel:</span>
                  <span className="font-mono text-amber-300">
                    {referenceImageId
                      ? images.find((i) => i.id === referenceImageId)?.name.slice(0, 16) || "Aktif"
                      : "Seçilmedi (Aşağıdan Seçin)"}
                  </span>
                </div>

                {/* Series reference picker */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        if (onSetReference) onSetReference(img.id);
                        onUpdateFilters({ referenceImageId: img.id, reinhardEnabled: true });
                      }}
                      className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border transition-all ${
                        referenceImageId === img.id
                          ? "border-amber-400 ring-2 ring-amber-400/40"
                          : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <ResettableSlider
                  label="Eşleşme Oranı"
                  value={filters.reinhardStrength}
                  min={0}
                  max={100}
                  defaultValue={70}
                  onChange={(v) => onUpdateFilters({ reinhardStrength: v })}
                  suffix="%"
                />
              </div>
            )}
          </div>

          {/* Split View Toggle */}
          {onToggleSplitView && (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Columns2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Split View Karşılaştırma</span>
                </span>
                <p className="text-[10px] text-neutral-400">
                  Yan yana iki kareyi tuvalde karşılaştırarak düzenleyin
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleSplitView}
                className={`pressable px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  splitView
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {splitView ? "Açık" : "Kapalı"}
              </button>
            </div>
          )}

          {/* Lanczos Upscale */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-white">Lanczos-3 Keskin Upscale</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 4] as UpscaleMultiplier[]).map((factor) => (
                <button
                  key={factor}
                  onClick={() => onUpdateUpscale(factor)}
                  className={`pressable py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    currentUpscale === factor
                      ? "bg-amber-400 text-black shadow-sm"
                      : "bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {factor}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DIŞA AKTAR */}
      {showExport && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white">Dışa Aktarma Profili</span>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {EXPORT_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
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
              className="pressable flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Bu Görseli İndir</span>
            </button>

            <button
              onClick={onExportDump}
              className="pressable flex-1 py-2.5 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-glass-sm"
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
              title="Preset, analog ve çerçeve ayarlarını serideki tüm fotoğraflara eşitle"
            >
              {syncSuccess ? (
                <Check className="w-3 h-3 text-current" />
              ) : (
                <CopyCheck className="w-3 h-3 text-current" />
              )}
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

  // Floating / Mobile Sheet fallback
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
            >
              {syncSuccess ? <Check className="w-3 h-3" /> : <CopyCheck className="w-3 h-3" />}
              <span>{syncSuccess ? "Eşitlendi" : "Seriye Eşitle"}</span>
            </button>
          </div>

          <button
            onClick={onCloseFocus}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab panels */}
        <div className="p-1">{tabPanels}</div>
      </div>
    </div>
  );
};
