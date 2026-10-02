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
  Layers
} from "lucide-react";
import { 
  useStudio, 
  CURATE_PRESETS, 
  extractColorMetrics, 
  applyHarmonizeSync, 
  applyPresetToImageData, 
  applyCubeLutToImageData,
  parseCubeLUT,
  CubeLUT,
  PLATFORM_SPECS, 
  calculateAspectCrop,
  ColorMetrics
} from "@/lib";
import { InstagramOverlay } from "./InstagramOverlay";
import { TikTokOverlay } from "./TikTokOverlay";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";

import { StudioItem } from "@/lib";

interface CarouselStudioProps {
  onBack: () => void;
}

export function CarouselStudio({ onBack }: CarouselStudioProps) {
  const { state, actions } = useStudio();
  const photos = state.items;
  const activePhotoId = state.selectedItemId || (photos.length > 0 ? photos[0].id : null);
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

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

  // Aktif görseli canvas üzerinde çiz ve filtreleri uygula
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
      ctx.drawImage(img, 0, 0);

      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 1. Hero harmonize varsa uygula (%20)
      if (state.heroColorMetrics) {
        imgData = applyHarmonizeSync(imgData, state.heroColorMetrics, 0.20);
      }

      // 2. Custom 3D LUT (.CUBE) varsa uygula
      if (state.customLut && selectedPresetId === "custom_lut") {
        imgData = applyCubeLutToImageData(imgData, state.customLut, itemIntensity / 100);
      }
      // 3. Standart Preset varsa uygula
      else if (selectedPresetId && selectedPresetId !== "custom_lut") {
        const preset = CURATE_PRESETS.find((p) => p.id === selectedPresetId);
        if (preset) {
          imgData = applyPresetToImageData(imgData, preset, itemIntensity / 100);
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };
  }, [activePhoto, selectedPresetId, state.customLut, itemIntensity, state.heroColorMetrics]);

  // Wheel zoom (izole)
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomScale((prev) => Math.min(3, Math.max(1, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  // Fotoğraf Yükleme (Dosya Seçici & Drop)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newItems: StudioItem[] = validFiles.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return {
        id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        originalUrl: url,
        proxyUrl: url,
        dimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
        proxyDimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
        preset: null,
        harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
        order: photos.length + idx,
        createdAt: Date.now() + idx,
      };
    });

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

  // Export için Blob oluşturucu — Yüksek Çözünürlüklü ve Filtreleri İşlenmiş Çıktı
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

    let targetX = 0;
    let targetY = 0;
    let targetDrawW = targetW;
    let targetDrawH = targetH;

    if (fitMode === "fit") {
      // Önizlemedeki bg-[#0a0a0c] zemin rengiyle eşle
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, targetW, targetH);

      const targetRatio = targetW / targetH;
      const imgRatio = img.naturalWidth / img.naturalHeight;

      if (imgRatio > targetRatio) {
        // Yatay görsel -> üst ve altta letterbox
        targetDrawW = targetW;
        targetDrawH = Math.round(targetW / imgRatio);
        targetX = 0;
        targetY = Math.round((targetH - targetDrawH) / 2);
      } else {
        // Dikey görsel -> sol ve sağda pillarbox
        targetDrawH = targetH;
        targetDrawW = Math.round(targetH * imgRatio);
        targetX = Math.round((targetW - targetDrawW) / 2);
        targetY = 0;
      }

      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, targetX, targetY, targetDrawW, targetDrawH);
    } else {
      // Fill modu -> 4:5 tam dolgu cover kırpma
      const crop = calculateAspectCrop(
        img.naturalWidth,
        img.naturalHeight,
        targetW,
        targetH
      );

      ctx.drawImage(
        img,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        targetW,
        targetH
      );
    }

    // Ekranda görülen canlı filtrelerin birebir aynısını yalnızca fotoğraf piksellerine uygula
    let imgData = ctx.getImageData(targetX, targetY, targetDrawW, targetDrawH);

    // 1. Hero harmonize varsa uygula (%20)
    if (state.heroColorMetrics) {
      imgData = applyHarmonizeSync(imgData, state.heroColorMetrics, 0.20);
    }

    // 2. Custom 3D LUT (.CUBE) varsa uygula
    if (state.customLut && (item.preset?.id === "custom_lut" || (!item.preset && state.globalPreset?.id === "custom_lut"))) {
      const intensity = item.preset?.intensity ?? state.globalPreset?.intensity ?? 1.0;
      imgData = applyCubeLutToImageData(imgData, state.customLut, intensity);
    }
    // 3. Standart Preset varsa uygula
    else {
      const activePresetId = item.preset?.id ?? state.globalPreset?.id;
      if (activePresetId && activePresetId !== "custom_lut") {
        const preset = CURATE_PRESETS.find((p) => p.id === activePresetId);
        if (preset) {
          const intensity = item.preset?.intensity ?? state.globalPreset?.intensity ?? 1.0;
          imgData = applyPresetToImageData(imgData, preset, intensity);
        }
      }
    }

    ctx.putImageData(imgData, targetX, targetY);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((resolve) => {
      expCanvas.toBlob(
        (b) => resolve(b!),
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
          {activePhoto ? (
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

          {/* Platform Safe-Zone Overlays */}
          {previewMode === "instagram" && <InstagramOverlay type="post" />}
          {previewMode === "tiktok" && <TikTokOverlay type="post" />}

          {/* Sol Alt: Fill / Fit Toggle (Instagram Kaydet butonuyla çakışmaz) */}
          <button
            onClick={() => setFitMode(fitMode === "fill" ? "fit" : "fill")}
            className="absolute bottom-3 left-3 z-30 px-2.5 py-1.5 rounded-md glass-panel text-[11px] font-mono text-white/90 hover:text-white flex items-center gap-1.5 transition-all border border-white/10 shadow-lg"
            title="Fill / Fit Değiştir"
          >
            {fitMode === "fill" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="uppercase font-semibold">{fitMode}</span>
          </button>
        </div>
      </main>

      {/* 3. ALT FİLMSTRIP & DÜZENLEME PANELİ */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Düzenleme Modu (Edit Sheet) */}
        {isEditSheetOpen && (
          <div className="w-full mb-3 p-4 rounded-2xl glass-panel animate-sheet-slide-up border border-white/10 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#f5a623]" />
                <span className="text-xs font-semibold text-[#f5f5f7]">Seri & Kare Düzenleme</span>
              </div>
              <button 
                onClick={() => setIsEditSheetOpen(false)}
                className="p-1.5 rounded-full text-[#71717a] hover:text-white hover:bg-white/10 transition-colors"
                title="Paneli Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Global Preset & .CUBE LUT Seçici */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#a1a1aa]">Global Preset & 3D LUT (Tüm Seriye):</span>
                {state.customLut && (
                  <span className="text-[10px] text-[#f5a623] font-mono truncate max-w-[150px]">
                    LUT: {state.customLut.title}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                <button
                  onClick={() => { actions.setGlobalPreset(null); actions.setCustomLut(null); }}
                  className={`p-1.5 rounded-md text-[11px] border text-center transition-all ${
                    selectedPresetId === null ? "border-[#f5a623] bg-[#f5a623]/10 text-white font-medium" : "border-white/5 bg-[#18181b]/60 text-[#a1a1aa]"
                  }`}
                >
                  Ham
                </button>

                {CURATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => actions.setGlobalPreset({ id: p.id, intensity: itemIntensity / 100 })}
                    className={`p-1.5 rounded-md text-[11px] border text-center transition-all truncate ${
                      selectedPresetId === p.id ? "border-[#f5a623] bg-[#f5a623]/10 text-white font-medium" : "border-white/5 bg-[#18181b]/60 text-[#a1a1aa]"
                    }`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}

                {/* [+ LUT / Preset Yükle] Butonu */}
                <button
                  onClick={() => lutInputRef.current?.click()}
                  className={`p-1.5 rounded-md text-[11px] border text-center transition-all flex items-center justify-center gap-1 ${
                    selectedPresetId === "custom_lut"
                      ? "border-[#f5a623] bg-[#f5a623]/20 text-[#f5a623] font-semibold"
                      : "border-dashed border-white/20 bg-white/5 text-[#a1a1aa] hover:text-white"
                  }`}
                  title="Dışarıdan .cube dosyası yükle"
                >
                  <FileCode className="w-3 h-3 shrink-0 text-[#f5a623]" />
                  <span className="truncate">.CUBE</span>
                </button>
              </div>
            </div>

            {/* Seçili Kare İnce Ayar Slider'ı */}
            <div className="pt-1 border-t border-white/5">
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
                className={`relative group w-13 h-15 rounded-lg overflow-hidden shrink-0 cursor-grab active:cursor-grabbing border transition-all ${
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
              className="w-13 h-15 rounded-lg border border-dashed border-white/20 hover:border-[#f5a623]/60 bg-white/5 hover:bg-white/10 shrink-0 flex flex-col items-center justify-center gap-1 text-[#a1a1aa] hover:text-white transition-all"
              title="Yeni Fotoğraf Ekle"
            >
              <Plus className="w-4 h-4 text-[#f5a623]" />
              <span className="text-[8px]">Ekle</span>
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/10 shrink-0" />

          {/* Düzenle Butonu (Gereksiz Kapat butonu kaldırıldı) */}
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
