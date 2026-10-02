"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Sliders, 
  Maximize2, 
  Minimize2, 
  Download, 
  Plus, 
  Trash2, 
  Star, 
  Palette, 
  X,
  Upload,
  FileCode,
  Smartphone,
  Layers,
  Sparkles
} from "lucide-react";
import { 
  useStudio, 
  getStudioSelection,
  CURATE_PRESETS, 
  extractColorMetrics, 
  parseCubeLUT,
  CubeLUT,
  PLATFORM_SPECS, 
  ColorMetrics,
  StudioItem,
  drawCarouselFrame,
  createStudioItem
} from "@/lib";
import { InstagramOverlay } from "./InstagramOverlay";
import { TikTokOverlay } from "./TikTokOverlay";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";

const PRESET_SWATCHES: Record<string, { gradient: string; tag: string }> = {
  moody_teal: { gradient: "from-teal-600/40 via-cyan-950/40 to-zinc-900", tag: "Mimari & Teal" },
  warm_silhouette: { gradient: "from-orange-500/40 via-amber-800/40 to-zinc-900", tag: "Siluet & Ters Işık" },
  night_cinematic: { gradient: "from-cyan-400/30 via-rose-950/40 to-black", tag: "Neon & Halation" },
  muted_coastal: { gradient: "from-sky-300/30 via-stone-500/20 to-zinc-900", tag: "Pastel & Ferah" },
  amber_grain: { gradient: "from-amber-400/40 via-yellow-900/30 to-zinc-900", tag: "35mm Analog Gren" },
  monochrome_noir: { gradient: "from-zinc-200/30 via-zinc-800/60 to-black", tag: "Grafik B&W" },
};

interface CarouselStudioProps {
  onBack: () => void;
}

export function CarouselStudio({ onBack }: CarouselStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: activePhoto } = getStudioSelection(state.items, state.selectedItemId);
  const photos = state.items;
  const activePhotoId = activePhoto?.id || null;

  const [fitMode, setFitMode] = useState<"fill" | "fit">("fill");
  const [previewMode, setPreviewMode] = useState<"none" | "instagram" | "tiktok">("none");
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Sürükle - Bırak (Drag to Reorder)
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lutInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPresetId = state.globalPreset?.id ?? null;
  const itemIntensity = Math.round((state.globalPreset?.intensity ?? 1.0) * 100);

  // Aktif görseli canvas üzerinde çiz ve filtreleri uygula (Tekil Render Çekirdeği)
  useEffect(() => {
    if (!activePhoto) return;
    const img = new window.Image();
    const photoSrc = activePhoto.originalUrl || activePhoto.proxyUrl;
    if (!photoSrc.startsWith("data:") && !photoSrc.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Hem önizleme hem export aynı tekil çizim fonksiyonunu çağırır (Single Draw Call Parity)
      drawCarouselFrame(ctx, img, canvas.width, canvas.height, {
        fitMode: "fill",
        heroColorMetrics: state.heroColorMetrics,
        customLut: state.customLut,
        presetId: selectedPresetId,
        presetIntensity: itemIntensity / 100,
      });
    };
  }, [activePhoto, selectedPresetId, state.customLut, itemIntensity, state.heroColorMetrics]);

  // Wheel zoom (izole)
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomScale((prev) => Math.min(3, Math.max(1, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  // Fotoğraf Yükleme (Dosya Seçici & Drop) — Otomatik Proxy Pipeline ile
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newItems: StudioItem[] = validFiles.map((file, idx) =>
      createStudioItem(file, photos.length + idx)
    );

    actions.addItems(newItems);
    e.target.value = "";
  };

  // .CUBE LUT Yükleme
  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedLut = parseCubeLUT(text, file.name.replace(/\.[^/.]+$/, ""));
        actions.setCustomLut(parsedLut);
        actions.setGlobalPreset({ id: "custom_lut", intensity: itemIntensity / 100 });
      } catch (err) {
        console.error("LUT parse hatası:", err);
        alert("Geçersiz .cube dosyası: Lütfen standart 3D LUT dosyası seçin.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Drag-and-Drop Reorder İşlemleri
  const handleDragStart = (index: number) => {
    setDraggedPhotoIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedPhotoIndex === null || draggedPhotoIndex === dropIndex) return;
    actions.reorderItems(draggedPhotoIndex, dropIndex);
    setDraggedPhotoIndex(null);
  };

  // Çift Dokunma (Mobile Double-Tap) veya Masaüstü Sağ Tık (ContextMenu)
  const handleCardClick = (photoId: string) => {
    actions.selectItem(photoId);

    // Mobil için Double-Tap algılama
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === photoId && now - lastTapRef.current.time < 320) {
      setContextMenu({ id: photoId, x: window.innerWidth / 2 - 85, y: window.innerHeight - 200 });
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: photoId, time: now };
    }
  };

  const handleContextMenu = (photoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ id: photoId, x: e.clientX, y: e.clientY });
  };

  // Context Menu Eylemleri
  const handleMakeCover = (id: string) => {
    actions.makeCover(id);
    setContextMenu(null);
  };

  const handleHeroHarmonize = (id: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const metrics = extractColorMetrics(ctx.getImageData(0, 0, canvas.width, canvas.height));
        actions.setHeroColorMetrics(metrics);
        actions.setHarmonizeReference(id, 0.20);
      }
    }
    setContextMenu(null);
  };

  const handleRemovePhoto = (id: string) => {
    if (photos.length <= 1) return;
    actions.removeItem(id);
    setContextMenu(null);
  };

  // Export için Blob oluşturucu — Yüksek Çözünürlüklü ve Filtreleri İşlenmiş Çıktı (Single Render Parity)
  const getExportBlob = async (item: StudioItem, format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    const targetW = PLATFORM_SPECS.ig_post_4_5.width; // 1080
    const targetH = PLATFORM_SPECS.ig_post_4_5.height; // 1350

    const expCanvas = document.createElement("canvas");
    expCanvas.width = targetW;
    expCanvas.height = targetH;
    const ctx = expCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context failed");

    const img = new window.Image();
    const photoPath = item.originalUrl || item.proxyUrl;
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = () => rej(new Error(`Failed to load ${item.name}`));
    });

    const activePresetId = item.preset?.id ?? state.globalPreset?.id ?? null;
    const activeIntensity = item.preset?.intensity ?? state.globalPreset?.intensity ?? 1.0;

    // Tekil render fonksiyonu preview ile birebir aynı matematik ve filtreleri yürütür
    drawCarouselFrame(ctx, img, targetW, targetH, {
      fitMode,
      heroColorMetrics: state.heroColorMetrics,
      customLut: state.customLut,
      presetId: activePresetId,
      presetIntensity: activeIntensity,
    });

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((resolve, reject) => {
      expCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Blob generation failed"));
        },
        mimeType,
        mimeType === "image/jpeg" ? 0.92 : undefined
      );
    });
  };

  return (
    <div 
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f5f5f7] select-none"
      onClick={() => { if (contextMenu) setContextMenu(null); }}
    >
      {/* Gizli Dosya Inputları */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      <input
        ref={lutInputRef}
        type="file"
        accept=".cube"
        className="hidden"
        onChange={handleLutUpload}
      />

      {/* 1. ÜST HEADER: Minimal Nav, Fotoğraf Yükle & Export */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between px-3.5 py-2 rounded-xl glass-panel max-w-4xl mx-auto border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="touch-target text-xs text-[#a1a1aa] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Stüdyo</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* [+ Fotoğraf Yükle] Butonu */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-all border border-white/10"
            title="Bilgisayar veya Telefondan Fotoğraf Ekle"
          >
            <Plus className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Fotoğraf Yükle</span>
          </button>

          {photos.length > 0 && (
            <button
              onClick={() => actions.clearItems()}
              className="touch-target px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/15 text-[#a1a1aa] hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-all border border-white/10"
              title="Tüm Seriyi Temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Temizle</span>
            </button>
          )}
        </div>

        {/* Başlık ve Platform Bilgisi */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Carousel Dump</span>
          <span className="text-[10px] text-[#71717a] font-mono">1080 × 1350 px (4:5)</span>
        </div>

        {/* Sağ Taraf: Önizleme Modu & Export */}
        <div className="flex items-center gap-2">
          {/* Önizleme Seçici */}
          <div className="flex bg-[#18181b] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setPreviewMode(previewMode === "instagram" ? "none" : "instagram")}
              className={`px-2 py-1 text-[11px] rounded-md transition-all flex items-center gap-1 ${
                previewMode === "instagram" ? "bg-[#f5a623] text-black font-semibold" : "text-[#a1a1aa] hover:text-white"
              }`}
              title="Instagram Önizleme"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden md:inline">IG</span>
            </button>
            <button
              onClick={() => setPreviewMode(previewMode === "tiktok" ? "none" : "tiktok")}
              className={`px-2 py-1 text-[11px] rounded-md transition-all flex items-center gap-1 ${
                previewMode === "tiktok" ? "bg-[#fe2c55] text-white font-semibold" : "text-[#a1a1aa] hover:text-white"
              }`}
              title="TikTok Önizleme"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden md:inline">TikTok</span>
            </button>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="touch-target px-3 py-1.5 rounded-lg bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* 2. GÖRSEL SAHNESİ (STAGE): Görsel asla altta ezilmez */}
      <main 
        className={`canvas-viewport transition-transform duration-300 ${
          isEditSheetOpen ? "canvas-viewport-sheet-open" : ""
        }`}
        onWheel={handleWheelZoom}
      >
        <div 
          className={`relative max-w-full max-h-[70vh] aspect-[4/5] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0c] flex items-center justify-center transition-all duration-300 ${
            isEditSheetOpen ? "-translate-y-2 scale-[0.88]" : ""
          }`}
        >
          {/* Canlı Çizilen Canvas veya Boş Durum */}
          {hasPhoto && activePhoto ? (
            <canvas
              ref={canvasRef}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "center center",
                transition: "transform 0.1s ease-out",
              }}
              className={`max-w-full max-h-full ${
                fitMode === "fill" ? "w-full h-full object-cover" : "w-full h-full object-contain"
              }`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[#71717a] gap-2">
              <Layers className="w-8 h-8 text-[#3f3f46]" />
              <span className="text-xs">Seride henüz fotoğraf yok</span>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="text-xs text-[#f5a623] hover:underline"
              >
                Fotoğraf Yükle
              </button>
            </div>
          )}

          {/* Platform Safe-Zone Overlays (Yalnızca görsel varken aktif) */}
          {hasPhoto && previewMode === "instagram" && <InstagramOverlay type="post" />}
          {hasPhoto && previewMode === "tiktok" && <TikTokOverlay type="post" />}

          {/* Sol Alt: Fill / Fit Toggle (Yalnızca görsel varken aktif) */}
          {hasPhoto && (
            <button
              onClick={() => setFitMode(fitMode === "fill" ? "fit" : "fill")}
              className="absolute bottom-3 left-3 z-30 px-2.5 py-1.5 rounded-md glass-panel text-[11px] font-mono text-white/90 hover:text-white flex items-center gap-1.5 transition-all border border-white/10 shadow-lg"
              title="Fill / Fit Değiştir"
            >
              {fitMode === "fill" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span className="uppercase font-semibold">{fitMode}</span>
            </button>
          )}
        </div>
      </main>

      {/* 3. ALT FİLMSTRIP & DÜZENLEME PANELİ */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Düzenleme Modu (Edit Sheet) */}
        {isEditSheetOpen && (
          <div className="w-full mb-3 p-4 rounded-2xl glass-panel animate-sheet-slide-up border border-white/10 flex flex-col gap-4 shadow-2xl">
            {/* 1. Başlık & Kapatma */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f5a623]" />
                <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Editoryal Karakter & Atmosfer</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono">
                  6 Kürasyon
                </span>
              </div>
              <button 
                onClick={() => setIsEditSheetOpen(false)}
                className="p-1.5 rounded-full text-[#71717a] hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                title="Paneli Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Apple Bento Izgarası: Ham + 6 Editoryal Preset Kartı */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {/* RAW / Doğal Ham Kart */}
              <button
                type="button"
                onClick={() => { actions.setGlobalPreset(null); actions.setCustomLut(null); }}
                className={`relative flex flex-col justify-between p-2.5 rounded-xl border text-left min-h-[58px] active:scale-[0.96] transition-all cursor-pointer ${
                  selectedPresetId === null && !state.customLut
                    ? "border-[#f5a623] bg-[#f5a623]/15 shadow-[0_0_16px_rgba(245,166,35,0.25)] ring-1 ring-[#f5a623]/50"
                    : "border-white/10 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-xs font-medium text-white">Doğal (Ham)</span>
                <span className="text-[9px] text-zinc-400 font-normal">Orijinal Renk</span>
              </button>

              {/* 6 Editoryal Karakter */}
              {CURATE_PRESETS.map((p) => {
                const swatch = PRESET_SWATCHES[p.id];
                const isActive = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => actions.setGlobalPreset({ id: p.id, intensity: itemIntensity / 100 })}
                    className={`relative flex flex-col justify-between p-2.5 rounded-xl border text-left min-h-[58px] bg-gradient-to-br active:scale-[0.96] transition-all cursor-pointer ${
                      swatch?.gradient ?? "from-zinc-800 to-zinc-900"
                    } ${
                      isActive
                        ? "border-[#f5a623] shadow-[0_0_16px_rgba(245,166,35,0.3)] ring-1 ring-[#f5a623]"
                        : "border-white/10 hover:border-white/25 hover:brightness-110"
                    }`}
                  >
                    <span className="text-xs font-semibold text-white leading-tight">{p.name}</span>
                    <span className="text-[9px] text-zinc-300/80 font-medium tracking-tight">
                      {swatch?.tag ?? p.category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. Katmanlı İfşa (Progressive Disclosure): Preset veya LUT seçiliyse İnce Ayar Slider'ı */}
            {selectedPresetId && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2 transition-all animate-scale-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-medium">Yoğunluk Derecesi</span>
                  {selectedPresetId === "night_cinematic" && (
                    <span className="text-[9px] font-mono text-[#f5a623] bg-[#f5a623]/10 px-2 py-0.5 rounded-full border border-[#f5a623]/20">
                      Optik Halation Aktif
                    </span>
                  )}
                  {selectedPresetId === "amber_grain" && (
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      35mm Gümüş Gren Aktif
                    </span>
                  )}
                </div>
                <ResettableSlider
                  label="Preset & LUT Yoğunluğu"
                  value={itemIntensity}
                  min={0}
                  max={100}
                  defaultValue={100}
                  unit="%"
                  onChange={(val) => {
                    if (selectedPresetId) {
                      actions.setGlobalPreset({ id: selectedPresetId, intensity: val / 100 });
                    }
                  }}
                />
              </div>
            )}

            {/* 4. İkincil Araç Çubuğu: .CUBE LUT & Hero Harmonize */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lutInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    state.customLut
                      ? "border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]"
                      : "border-white/15 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="Dışarıdan 3D LUT (.cube) dosyası içe aktar"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#f5a623]" />
                  <span>{state.customLut ? `LUT: ${state.customLut.title}` : "3D LUT (.CUBE) Yükle"}</span>
                </button>

                {state.customLut && (
                  <button
                    type="button"
                    onClick={() => actions.setCustomLut(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Yüklü LUT'u kaldır"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activePhoto && (
                <button
                  type="button"
                  onClick={() => handleHeroHarmonize(activePhoto.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    state.heroColorMetrics
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/15 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="Seçili karenin renk tonlarını tüm seriye referans olarak bağla"
                >
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{state.heroColorMetrics ? "Hero Uyum Aktif (%20)" : "Kareden Hero Renk Al"}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filmstrip Barı */}
        <div className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl glass-panel border border-white/10 shadow-2xl">
          
          {/* Yatay Kaydırılabilir & Sürükle-Bırak Sıralanabilir Filmstrip */}
          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-0.5 max-w-full">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onClick={() => handleCardClick(photo.id)}
                onContextMenu={(e) => handleContextMenu(photo.id, e)}
                className={`relative group w-14 h-16 rounded-xl overflow-hidden shrink-0 cursor-grab active:cursor-grabbing border transition-all ${
                  activePhotoId === photo.id
                    ? "border-[#f5a623] scale-105 shadow-[0_0_14px_rgba(245,166,35,0.4)]"
                    : "border-white/15 opacity-75 hover:opacity-100"
                }`}
                title="Sıralamak için sürükleyin · Masaüstü: Sağ tık menü · Mobil: Çift dokunma"
              >
                {/* Standart <img> ile sıfır kırık görsel / blob desteği */}
                <img
                  src={photo.proxyUrl || photo.originalUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="eager"
                />

                {/* Temiz Sıra Numarası Rozeti */}
                <span className="absolute top-1 left-1 text-[9px] font-mono bg-black/75 px-1 py-0.2 rounded text-white font-bold tracking-tight">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Alt Kısımda Dosya Adı (text-xs truncate) */}
                <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1 py-0.5">
                  <p className="text-[8px] text-zinc-300 truncate text-center leading-tight">
                    {photo.name}
                  </p>
                </div>
              </div>
            ))}

            {/* Filmstrip İçinde Hızlı Ekle Kartı */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-16 rounded-xl border border-dashed border-white/20 hover:border-[#f5a623]/60 bg-white/5 hover:bg-white/10 shrink-0 flex flex-col items-center justify-center gap-1 text-[#a1a1aa] hover:text-white transition-all"
              title="Yeni Fotoğraf Ekle"
            >
              <Plus className="w-4 h-4 text-[#f5a623]" />
              <span className="text-[8px]">Ekle</span>
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/10 shrink-0" />

          {/* Düzenle Butonu */}
          <button
            onClick={() => setIsEditSheetOpen(!isEditSheetOpen)}
            className={`touch-target px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              isEditSheetOpen ? "bg-[#f5a623] text-black" : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Düzenle</span>
          </button>
        </div>
      </footer>

      {/* Context Menu (Masaüstü Sağ Tık / Mobil Çift Dokunma) */}
      {contextMenu && (
        <div 
          className="fixed z-50 rounded-xl glass-panel border border-white/15 p-1 shadow-2xl flex flex-col gap-0.5 min-w-[180px] animate-scale-in"
          style={{ 
            top: Math.min(window.innerHeight - 160, contextMenu.y), 
            left: Math.min(window.innerWidth - 190, contextMenu.x) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleMakeCover(contextMenu.id)}
            className="w-full text-left px-2.5 py-2 text-xs text-[#f5f5f7] hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>01 Kapak Yap</span>
          </button>
          <button
            onClick={() => handleHeroHarmonize(contextMenu.id)}
            className="w-full text-left px-2.5 py-2 text-xs text-[#f5f5f7] hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Seriyi Bu Renge Eşitle</span>
          </button>
          <div className="h-[1px] bg-white/10 my-0.5" />
          <button
            onClick={() => handleRemovePhoto(contextMenu.id)}
            className="w-full text-left px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Seriden Çıkar</span>
          </button>
        </div>
      )}

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_post_4_5"
        itemsToExport={photos.map((p, idx) => ({
          id: p.id,
          name: p.name,
          order: idx,
          getBlob: (fmt) => getExportBlob(p, fmt),
        }))}
      />
    </div>
  );
}
