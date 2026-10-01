"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  EyeOff, 
  Palette, 
  Grid, 
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  Smartphone
} from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { InstagramOverlay } from "./InstagramOverlay";
import { TikTokOverlay } from "./TikTokOverlay";
import { QuickExportSheet } from "./QuickExportSheet";
import { 
  PLATFORM_SPECS, 
  extractAdaptiveGradient, 
  AdaptiveGradientResult, 
  useStudio, 
  StudioItem 
} from "@/lib";

interface StoryStudioProps {
  onBack: () => void;
}

export function StoryStudio({ onBack }: StoryStudioProps) {
  const { state, actions } = useStudio();
  const storyPhotos = state.items;
  const { slotCount, spacing, backgroundMode } = state.storyLayout;

  const [previewMode, setPreviewMode] = useState<"none" | "instagram" | "tiktok">("instagram");
  const [swapSelectedIdx, setSwapSelectedIdx] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Görseller değiştikçe Akıllı Gradyan türet
  useEffect(() => {
    if (storyPhotos.length === 0) return;
    const heroImg = new window.Image();
    const firstItem = storyPhotos[0];
    const targetSrc = firstItem.originalUrl || firstItem.proxyUrl;
    if (!targetSrc.startsWith("data:") && !targetSrc.startsWith("blob:")) {
      heroImg.crossOrigin = "anonymous";
    }
    heroImg.src = targetSrc;
    heroImg.onload = () => {
      const c = document.createElement("canvas");
      c.width = heroImg.naturalWidth;
      c.height = heroImg.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(heroImg, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        setAdaptiveGradient(extractAdaptiveGradient(data));
      }
    };
  }, [storyPhotos]);

  // Fotoğraf Yükleme
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newItems: StudioItem[] = validFiles.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return {
        id: `story_photo_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        originalUrl: url,
        proxyUrl: url,
        dimensions: { width: 1080, height: 1920, aspectRatio: 9 / 16 },
        proxyDimensions: { width: 1080, height: 1920, aspectRatio: 9 / 16 },
        preset: null,
        harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
        order: storyPhotos.length + idx,
        createdAt: Date.now() + idx,
      };
    });

    actions.addItems(newItems);
    e.target.value = "";
  };

  // İki tıkla fotoğraf takası (Swap)
  const handleCellClick = (index: number) => {
    if (swapSelectedIdx === null) {
      setSwapSelectedIdx(index);
    } else if (swapSelectedIdx === index) {
      setSwapSelectedIdx(null); // Deselect
    } else {
      actions.swapItems(swapSelectedIdx, index);
      setSwapSelectedIdx(null);
    }
  };

  // Dinamik Grid şablonu (Slot sayısına göre)
  const getGridClasses = () => {
    switch (slotCount) {
      case 2:
        return "grid-rows-2 grid-cols-1";
      case 3:
        return "grid-rows-3 grid-cols-1";
      case 4:
        return "grid-rows-2 grid-cols-2";
      case 5:
        return "grid-rows-3 grid-cols-2";
      case 6:
        return "grid-rows-3 grid-cols-2";
      default:
        return "grid-rows-2 grid-cols-2";
    }
  };

  // Zemin stili
  const getBackgroundStyle = () => {
    switch (backgroundMode) {
      case "black":
        return { backgroundColor: "#000000" };
      case "white":
        return { backgroundColor: "#ffffff" };
      case "charcoal":
        return { backgroundColor: "#18181b" };
      case "adaptive-gradient":
      default:
        return {
          background: adaptiveGradient
            ? adaptiveGradient.cssLinear
            : "linear-gradient(180deg, #2e201b 0%, #141113 100%)",
        };
    }
  };

  const isDarkBg = backgroundMode !== "white";

  // Helper: Yuvarlatılmış dikdörtgen çizici
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
  };

  // Export render fonksiyonu — Tam 1080x1920 Çözünürlükte Zemin + Grid Fotoğrafları
  const getStoryExportBlob = async (format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    const W = PLATFORM_SPECS.ig_story_9_16.width; // 1080
    const H = PLATFORM_SPECS.ig_story_9_16.height; // 1920

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");

    // 1. Zemin dolgusu
    if (backgroundMode === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
    } else if (backgroundMode === "charcoal") {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, W, H);
    } else if (backgroundMode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
    } else {
      // Adaptive Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (adaptiveGradient) {
        grad.addColorStop(0, adaptiveGradient.colorTop);
        grad.addColorStop(1, adaptiveGradient.colorBottom);
      } else {
        grad.addColorStop(0, "#2e201b");
        grad.addColorStop(1, "#141113");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Grid Hücre Geometrileri Hesabı (Safe area & Space slider ölçekli)
    const topSafe = 140; // Dynamic Island safe area
    const bottomSafe = 130; // Instagram story alt etkileşim alanı
    const usableH = H - topSafe - bottomSafe;
    const gap = Math.round(spacing * 2.5); // Ölçeklenmiş piksel boşluğu
    const sidePadding = Math.max(28, gap);
    const usableW = W - sidePadding * 2;

    interface CellRect {
      x: number;
      y: number;
      w: number;
      h: number;
    }
    const cells: CellRect[] = [];

    if (slotCount === 2) {
      const cellH = (usableH - gap) / 2;
      const cellW = usableW;
      cells.push({ x: sidePadding, y: topSafe, w: cellW, h: cellH });
      cells.push({ x: sidePadding, y: topSafe + cellH + gap, w: cellW, h: cellH });
    } else if (slotCount === 3) {
      const cellH = (usableH - gap * 2) / 3;
      const cellW = usableW;
      for (let r = 0; r < 3; r++) {
        cells.push({ x: sidePadding, y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
      }
    } else if (slotCount === 4) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap) / 2;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
    } else if (slotCount === 5) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap * 2) / 3;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
      // 5. hücre: 3. satırda tam genişlikte yatay kart
      cells.push({ x: sidePadding, y: topSafe + 2 * (cellH + gap), w: usableW, h: cellH });
    } else if (slotCount === 6) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap * 2) / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
    }

    // 3. Her hücreye görseli cover modunda ve yuvarlatılmış köşelerle çiz
    const cornerRadius = 32;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const photoItem = storyPhotos[i];
      if (!photoItem) continue;

      const photoSrc = photoItem.originalUrl || photoItem.proxyUrl;
      const img = new window.Image();
      if (!photoSrc.startsWith("data:") && !photoSrc.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.src = photoSrc;

      await new Promise((resolve) => {
        img.onload = () => resolve(null);
        img.onerror = () => resolve(null);
      });

      if (!img.naturalWidth || !img.naturalHeight) continue;

      ctx.save();
      drawRoundedRect(ctx, cell.x, cell.y, cell.w, cell.h, cornerRadius);
      ctx.clip();

      // Cover kırpması hesabı
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const cellRatio = cell.w / cell.h;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > cellRatio) {
        sw = img.naturalHeight * cellRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / cellRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, cell.x, cell.y, cell.w, cell.h);
      ctx.restore();
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        mimeType,
        mimeType === "image/jpeg" ? 0.92 : undefined
      );
    });
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f5f5f7] select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* 1. ÜST HEADER */}
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
            title="Telefondan veya Bilgisayardan Fotoğraf Yükle"
          >
            <Plus className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Fotoğraf Yükle</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Story Dump</span>
          <span className="text-[10px] text-[#71717a] font-mono">1080 × 1920 px (9:16)</span>
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
              title="Instagram Story Önizleme"
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

      {/* 2. DİKEY iPHONE MOCKUP SAHNESİ: TAM 9:16 EN-BOY KİLİDİ */}
      <main className="canvas-viewport flex items-center justify-center p-3 pb-24">
        {/* iPhone Kasa Mockup (Aspect Ratio 9:16) */}
        <div 
          className="relative aspect-[9/16] h-[78vh] max-h-[760px] w-auto rounded-[46px] p-2.5 bg-[#121215] border-[5px] border-[#27272a] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* İç Ekran */}
          <div 
            className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col transition-all duration-300"
            style={getBackgroundStyle()}
          >
            {/* Dynamic Island Safe-Area Çentiği */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-24 h-6 rounded-full bg-black flex items-center justify-between px-2.5 shadow-md">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e]" />
              <div className="w-2 h-2 rounded-full bg-[#0a192f]/80" />
            </div>

            {/* Platform Safe-Zone Katmanları */}
            {previewMode === "instagram" && <InstagramOverlay type="story" isDarkBg={isDarkBg} />}
            {previewMode === "tiktok" && <TikTokOverlay type="story" />}

            {/* Akıllı Grid & Space Tuvali (Safe-Area ile Çentik Altından Başlar) */}
            <div 
              className={`w-full h-full grid ${getGridClasses()} transition-all duration-200 pt-10 pb-8 px-2`}
              style={{
                gap: `${spacing}px`,
                paddingLeft: `${Math.max(8, spacing)}px`,
                paddingRight: `${Math.max(8, spacing)}px`,
              }}
            >
              {storyPhotos.slice(0, slotCount).map((photoItem, idx) => {
                const isSelected = swapSelectedIdx === idx;
                const photoSrc = photoItem.proxyUrl || photoItem.originalUrl;
                return (
                  <div
                    key={photoItem.id || idx}
                    onClick={() => handleCellClick(idx)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
                      slotCount === 5 && idx === 4 ? "col-span-2" : ""
                    } ${
                      isSelected
                        ? "ring-2 ring-[#f5a623] scale-[0.98] shadow-lg"
                        : "hover:opacity-95 shadow-md"
                    }`}
                  >
                    <img
                      src={photoSrc}
                      alt={`slot-${idx}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[10px] font-bold bg-[#f5a623] text-black px-2 py-0.5 rounded-full">
                          Takas İçin Seçildi
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* 3. YÜZEN ALT KONTROL BARLARI */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-xl mx-auto flex flex-col items-center gap-2">
        <div className="w-full p-3.5 rounded-2xl glass-panel border border-white/10 shadow-2xl flex flex-col gap-3">
          
          {/* Üst Satır: Slot Sayısı ve Zemin Seçimi */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Slot Sayısı (2-6) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1aa] text-[11px]">Grid:</span>
              <div className="flex bg-[#18181b] p-0.5 rounded-md border border-white/5">
                {([2, 3, 4, 5, 6] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => actions.setStoryLayout({ slotCount: count })}
                    className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                      slotCount === count ? "bg-[#f5a623] text-black font-semibold" : "text-[#71717a] hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Zemin Seçenekleri: Akıllı Gradyan, Siyah, Beyaz, Kömür */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1aa] text-[11px]">Zemin:</span>
              <div className="flex items-center gap-1.5 bg-[#18181b] p-1 rounded-lg border border-white/5">
                {/* Akıllı Gradyan Butonu */}
                <button
                  onClick={() => actions.setStoryLayout({ backgroundMode: "adaptive-gradient" })}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                    backgroundMode === "adaptive-gradient"
                      ? "bg-[#f5a623] text-black font-semibold"
                      : "text-[#a1a1aa] hover:text-white"
                  }`}
                  title="Fotoğraf Kenarlarından Türetilen Akıllı Gradyan"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Gradyan</span>
                </button>

                {(["black", "white", "charcoal"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => actions.setStoryLayout({ backgroundMode: m })}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      backgroundMode === m ? "ring-2 ring-[#f5a623] scale-110" : "border-white/20"
                    } ${
                      m === "black" ? "bg-black" : m === "white" ? "bg-white" : "bg-[#18181b]"
                    }`}
                    title={m === "black" ? "OLED Siyah" : m === "white" ? "Beyaz" : "Kömür"}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Alt Satır: Tekil "Space" Slider'ı */}
          <div className="pt-2 border-t border-white/5">
            <ResettableSlider
              label="Space (Boşluk & Kenar Payı)"
              value={spacing}
              min={0}
              max={32}
              defaultValue={10}
              unit="px"
              onChange={(val) => actions.setStoryLayout({ spacing: val })}
            />
          </div>
        </div>
      </footer>

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_story_9_16"
        itemsToExport={[{
          id: "story_1",
          name: "story_dump",
          order: 0,
          getBlob: (fmt) => getStoryExportBlob(fmt),
        }]}
      />
    </div>
  );
}
