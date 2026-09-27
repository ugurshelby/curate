"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Sliders, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Download, 
  Plus, 
  Trash2, 
  Star, 
  Palette, 
  X,
  Check
} from "lucide-react";
import { 
  useStudio, 
  CURATE_PRESETS, 
  extractColorMetrics, 
  applyHarmonizeSync, 
  applyPresetToImageData, 
  PLATFORM_SPECS, 
  calculateAspectCrop,
  ColorMetrics
} from "@/lib";
import { InstagramOverlay } from "./InstagramOverlay";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";

interface CarouselStudioProps {
  onBack: () => void;
}

export function CarouselStudio({ onBack }: CarouselStudioProps) {
  const { state, actions } = useStudio();

  // Test veya yüklenen görseller
  const [photos, setPhotos] = useState<{ id: string; name: string; path: string }[]>([
    { id: "p1", name: "Kapak", path: "/reference-images/ic-mekan-bar.jfif" },
    { id: "p2", name: "Saha", path: "/reference-images/cim-saha.jfif" },
    { id: "p3", name: "Gökdelen", path: "/reference-images/sehir-gokdelen.jfif" },
    { id: "p4", name: "Günbatımı", path: "/reference-images/gun-batimi-gunese-dokunan-eleman.jfif" },
    { id: "p5", name: "Tren", path: "/reference-images/tren.jfif" },
  ]);

  const [activePhotoId, setActivePhotoId] = useState<string>("p1");
  const [fitMode, setFitMode] = useState<"fill" | "fit">("fill");
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Düzenleme Değerleri
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [itemIntensity, setItemIntensity] = useState<number>(100);
  const [heroColorMetrics, setHeroColorMetrics] = useState<ColorMetrics | null>(null);

  // Long press context menu
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  // Aktif görseli canvas üzerinde çiz ve filtreleri uygula
  useEffect(() => {
    if (!activePhoto) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = activePhoto.path;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Hero harmonize varsa uygula (%20)
      if (heroColorMetrics) {
        imgData = applyHarmonizeSync(imgData, heroColorMetrics, 0.20);
      }

      // Preset varsa uygula
      if (selectedPresetId) {
        const preset = CURATE_PRESETS.find((p) => p.id === selectedPresetId);
        if (preset) {
          imgData = applyPresetToImageData(imgData, preset, itemIntensity / 100);
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };
  }, [activePhoto, selectedPresetId, itemIntensity, heroColorMetrics]);

  // Wheel zoom (izole)
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomScale((prev) => Math.min(3, Math.max(1, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  // Long-press başlangıcı
  const handleTouchStart = (photoId: string, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    longPressTimer.current = setTimeout(() => {
      setContextMenu({ id: photoId, x: clientX, y: clientY });
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Context Menu Eylemleri
  const handleMakeCover = (id: string) => {
    const targetIdx = photos.findIndex((p) => p.id === id);
    if (targetIdx <= 0) return;
    const copy = [...photos];
    const [item] = copy.splice(targetIdx, 1);
    copy.unshift(item);
    setPhotos(copy);
    setActivePhotoId(id);
    setContextMenu(null);
  };

  const handleHeroHarmonize = (id: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const metrics = extractColorMetrics(ctx.getImageData(0, 0, canvas.width, canvas.height));
        setHeroColorMetrics(metrics);
      }
    }
    setContextMenu(null);
  };

  const handleRemovePhoto = (id: string) => {
    if (photos.length <= 1) return;
    const filtered = photos.filter((p) => p.id !== id);
    setPhotos(filtered);
    if (activePhotoId === id) {
      setActivePhotoId(filtered[0].id);
    }
    setContextMenu(null);
  };

  // Export için Blob oluşturucu
  const getExportBlob = async (photoPath: string): Promise<Blob> => {
    const expCanvas = document.createElement("canvas");
    expCanvas.width = PLATFORM_SPECS.ig_post_4_5.width;
    expCanvas.height = PLATFORM_SPECS.ig_post_4_5.height;
    const ctx = expCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = photoPath;
    await new Promise((res) => { img.onload = res; });

    const crop = calculateAspectCrop(
      img.naturalWidth,
      img.naturalHeight,
      PLATFORM_SPECS.ig_post_4_5.width,
      PLATFORM_SPECS.ig_post_4_5.height
    );

    ctx.drawImage(
      img,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      PLATFORM_SPECS.ig_post_4_5.width,
      PLATFORM_SPECS.ig_post_4_5.height
    );

    return new Promise((resolve) => {
      expCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92);
    });
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f5f5f7] select-none">
      
      {/* 1. ÜST HEADER: Minimal Nav & Export */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between px-4 py-2.5 rounded-lg glass-panel max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="touch-target text-xs text-[#a1a1aa] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Stüdyo</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Carousel Dump</span>
          <span className="text-[10px] text-[#71717a] font-mono">1080 × 1350 px (4:5)</span>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="touch-target px-3.5 py-1.5 rounded-md bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </header>

      {/* 2. GÖRSEL SAHNESİ (STAGE): Görsel asla altta ezilmez */}
      <main 
        className={`canvas-viewport transition-transform duration-300 ${
          isEditSheetOpen ? "canvas-viewport-sheet-open" : ""
        }`}
        onWheel={handleWheelZoom}
      >
        <div 
          className={`relative max-w-full max-h-[70vh] aspect-[4/5] rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0c] flex items-center justify-center transition-all duration-300 ${
            isEditSheetOpen ? "-translate-y-2 scale-[0.88]" : ""
          }`}
        >
          {/* Canlı Çizilen Canvas */}
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

          {/* Instagram Post Safe-Zone Overlay */}
          {showOverlay && <InstagramOverlay type="post" />}

          {/* Sağ Üst: Yüzen Göz İkonu (Safe-Zone) */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="absolute top-3 right-3 z-30 p-2 rounded-full glass-panel hover:bg-white/10 text-white/80 hover:text-white transition-all"
            title="Instagram Safe-Zone Önizleme"
          >
            {showOverlay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Sağ Alt: Fill / Fit Toggle */}
          <button
            onClick={() => setFitMode(fitMode === "fill" ? "fit" : "fill")}
            className="absolute bottom-3 right-3 z-30 px-2.5 py-1.5 rounded-md glass-panel text-[11px] font-mono text-white/90 hover:text-white flex items-center gap-1.5 transition-all"
            title="Fill / Fit Değiştir"
          >
            {fitMode === "fill" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="uppercase">{fitMode}</span>
          </button>
        </div>
      </main>

      {/* 3. ALT FİLMSTRIP & DÜZENLEME PANELİ */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Düzenleme Modu (Edit Sheet) */}
        {isEditSheetOpen && (
          <div className="w-full mb-3 p-4 rounded-sheet glass-panel animate-sheet-slide-up border border-white/10 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#f5a623]" />
                <span className="text-xs font-semibold text-[#f5f5f7]">Seri & Kare Düzenleme</span>
              </div>
              <button 
                onClick={() => setIsEditSheetOpen(false)}
                className="p-1 rounded-full text-[#71717a] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Global Preset Seçici */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-[#a1a1aa]">Global Preset (Tüm Seriye):</span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                <button
                  onClick={() => setSelectedPresetId(null)}
                  className={`p-1.5 rounded-md text-[11px] border text-center transition-all ${
                    selectedPresetId === null ? "border-[#f5a623] bg-[#f5a623]/10 text-white" : "border-white/5 bg-[#18181b]/60 text-[#a1a1aa]"
                  }`}
                >
                  Ham
                </button>
                {CURATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPresetId(p.id)}
                    className={`p-1.5 rounded-md text-[11px] border text-center transition-all truncate ${
                      selectedPresetId === p.id ? "border-[#f5a623] bg-[#f5a623]/10 text-white" : "border-white/5 bg-[#18181b]/60 text-[#a1a1aa]"
                    }`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Seçili Kare İnce Ayar Slider'ı */}
            <div className="pt-1 border-t border-white/5">
              <ResettableSlider
                label="Seçili Kare Yoğunluk"
                value={itemIntensity}
                min={0}
                max={100}
                defaultValue={100}
                unit="%"
                onChange={(val) => setItemIntensity(val)}
              />
            </div>
          </div>
        )}

        {/* Filmstrip Barı */}
        <div className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl glass-panel border border-white/10 shadow-2xl">
          
          {/* Yatay Kaydırılabilir Filmstrip */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5 max-w-full">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setActivePhotoId(photo.id)}
                onMouseDown={(e) => handleTouchStart(photo.id, e)}
                onMouseUp={handleTouchEnd}
                onTouchStart={(e) => handleTouchStart(photo.id, e)}
                onTouchEnd={handleTouchEnd}
                className={`relative w-12 h-14 rounded-md overflow-hidden shrink-0 cursor-pointer border transition-all ${
                  activePhotoId === photo.id
                    ? "border-[#f5a623] scale-105 shadow-[0_0_12px_rgba(245,166,35,0.3)]"
                    : "border-white/10 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={photo.path}
                  alt={photo.name}
                  fill
                  className="object-cover"
                />
                <span className="absolute top-0.5 left-1 text-[9px] font-mono bg-black/60 px-1 rounded text-white font-bold">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
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
            <span>{isEditSheetOpen ? "Kapat" : "Düzenle"}</span>
          </button>
        </div>
      </footer>

      {/* Long-Press Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 rounded-lg glass-panel border border-white/15 p-1 shadow-2xl flex flex-col gap-0.5 min-w-[170px] animate-scale-in"
          style={{ 
            top: Math.min(window.innerHeight - 150, contextMenu.y - 120), 
            left: Math.min(window.innerWidth - 180, contextMenu.x) 
          }}
        >
          <button
            onClick={() => handleMakeCover(contextMenu.id)}
            className="w-full text-left px-2.5 py-1.5 text-xs text-[#f5f5f7] hover:bg-white/10 rounded-md flex items-center gap-2"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>01 Kapak Yap</span>
          </button>
          <button
            onClick={() => handleHeroHarmonize(contextMenu.id)}
            className="w-full text-left px-2.5 py-1.5 text-xs text-[#f5f5f7] hover:bg-white/10 rounded-md flex items-center gap-2"
          >
            <Palette className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Seriyi Bu Renge Eşitle</span>
          </button>
          <button
            onClick={() => handleRemovePhoto(contextMenu.id)}
            className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-md flex items-center gap-2"
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
          getBlob: () => getExportBlob(p.path),
        }))}
      />
    </div>
  );
}
