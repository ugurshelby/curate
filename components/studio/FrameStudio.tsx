"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Calendar, Plus, Crop } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { extractAdaptiveGradient, AdaptiveGradientResult, useStudio, StudioItem } from "@/lib";

interface FrameStudioProps {
  onBack: () => void;
}

export function FrameStudio({ onBack }: FrameStudioProps) {
  const { state, actions } = useStudio();
  const activeItem = state.items.find((i) => i.id === state.selectedItemId) || state.items[0];
  const photoPath = activeItem ? (activeItem.originalUrl || activeItem.proxyUrl) : "";

  const { frameType, borderWidth, borderRadius, showTimestamp } = state.frameConfig;
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Günün analog tarih formatı: '26 10 01
  const getTodayStamp = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `'${yy} ${mm} ${dd}`;
  };

  // Fotoğraf Yükleme
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newItem: StudioItem = {
      id: `frame_photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      name: file.name,
      originalUrl: url,
      proxyUrl: url,
      dimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
      proxyDimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
      preset: null,
      harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
      order: state.items.length,
      createdAt: Date.now(),
    };

    actions.addItems([newItem]);
    actions.selectItem(newItem.id);
    e.target.value = "";
  };

  // Görsel yüklendiğinde gradyan çıkar
  useEffect(() => {
    if (!photoPath) {
      setAdaptiveGradient(null);
      return;
    }
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        setAdaptiveGradient(extractAdaptiveGradient(data));
      }
    };
  }, [photoPath]);

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

  // Dışa aktarma blobu — Tam 1080x1350 Çözünürlükte Zemin + İç Fotoğraf + Analog Tarih Damgası
  const getExportBlob = async (format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context failed");

    // 1. Çerçeve Zemini Çiz
    if (frameType === "gradient" && adaptiveGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, adaptiveGradient.colorTop);
      grad.addColorStop(1, adaptiveGradient.colorBottom);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frameType === "polaroid" ? "#fbfbfa" : "#111214";
    }
    ctx.fillRect(0, 0, W, H);

    // 2. Çerçeve Payları & Fotoğraf Alanı Hesabı
    const scale = 2.2;
    const padX = Math.round(borderWidth * scale);
    const padTop = Math.round(borderWidth * scale);
    const padBottom = frameType === "polaroid" ? Math.round(borderWidth * 2.2 * scale) : Math.round(borderWidth * scale);
    const photoX = padX;
    const photoY = padTop;
    const photoW = W - padX * 2;
    const photoH = H - padTop - padBottom;
    const innerRadius = Math.max(4, Math.round(borderRadius * scale));

    // 3. İç Fotoğrafı Yükle ve Cover Modunda Çiz
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = () => res(null);
    });

    if (img.naturalWidth && img.naturalHeight) {
      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, innerRadius);
      ctx.clip();

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = photoW / photoH;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > targetRatio) {
        sw = img.naturalHeight * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / targetRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
      ctx.restore();

      // Matte modunda ince sınır
      if (frameType === "matte") {
        ctx.save();
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, innerRadius);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. Analog Turuncu Tarih Damgası Çiz
    if (showTimestamp) {
      const stampText = getTodayStamp();
      ctx.save();
      ctx.font = "bold 26px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = frameType === "polaroid" ? "#d96b27" : "#f5a623";
      ctx.shadowColor = "rgba(245, 166, 35, 0.45)";
      ctx.shadowBlur = 8;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const stampX = W - padX - 16;
      const stampY = frameType === "polaroid" ? H - Math.round(padBottom / 2) : H - 24;

      ctx.fillText(stampText, stampX, stampY);
      ctx.restore();
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((res) => {
      canvas.toBlob(
        (b) => res(b!),
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
            title="Kendi Fotoğrafını Çerçevele"
          >
            <Plus className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Fotoğraf Yükle</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Minimal Çerçeve</span>
          <span className="text-[10px] text-[#71717a] font-mono">Analog & Akıllı Mat</span>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="touch-target px-3.5 py-1.5 rounded-lg bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </header>

      {/* 2. ÇERÇEVE SAHNESİ */}
      <main className="canvas-viewport flex items-center justify-center p-4 pb-24">
        <div 
          className="relative h-[68vh] aspect-[4/5] max-w-[90vw] shadow-2xl transition-all duration-300 flex flex-col items-center justify-center"
          style={{
            padding: `${borderWidth}px`,
            paddingBottom: frameType === "polaroid" ? `${borderWidth * 2.2}px` : `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            background: frameType === "gradient" && adaptiveGradient 
              ? adaptiveGradient.cssLinear 
              : frameType === "polaroid" ? "#fbfbfa" : "#111214",
            border: frameType === "matte" ? "1px solid rgba(255,255,255,0.1)" : "none",
          }}
        >
          {/* İç Fotoğraf veya Boş Durum */}
          <div className="relative w-full h-full rounded-sm overflow-hidden shadow-inner flex items-center justify-center bg-black">
            {photoPath ? (
              <img
                src={photoPath}
                alt="frame photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-[#71717a] gap-2">
                <Crop className="w-8 h-8 text-[#3f3f46]" />
                <span className="text-xs">Çerçeve için henüz fotoğraf yok</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#f5a623] hover:underline"
                >
                  Fotoğraf Yükle
                </button>
              </div>
            )}
          </div>

          {/* Analog Turuncu Tarih Damgası */}
          {showTimestamp && (
            <div 
              className={`absolute bottom-3 right-4 font-mono font-bold tracking-widest text-xs select-none ${
                frameType === "polaroid" ? "text-[#d96b27]" : "text-[#f5a623]"
              }`}
              style={{
                textShadow: "0 0 6px rgba(245,166,35,0.4)",
              }}
            >
              {getTodayStamp()}
            </div>
          )}
        </div>
      </main>

      {/* 3. ALT KONTROL PANELİ */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-xl mx-auto flex flex-col items-center">
        <div className="w-full p-4 rounded-2xl glass-panel border border-white/10 shadow-2xl flex flex-col gap-3.5">
          
          {/* Üst Sekmeler: Çerçeve Tipi & Tarih Damgası */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <div className="flex bg-[#18181b] p-0.5 rounded-md border border-white/5">
              {(["polaroid", "matte", "gradient"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => actions.setFrameConfig({ frameType: t })}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    frameType === t ? "bg-[#f5a623] text-black font-semibold" : "text-[#71717a] hover:text-white"
                  }`}
                >
                  {t === "polaroid" ? "Polaroid" : t === "matte" ? "Matte" : "Gradyan"}
                </button>
              ))}
            </div>

            {/* Tarih Damgası Butonu */}
            <button
              onClick={() => actions.setFrameConfig({ showTimestamp: !showTimestamp })}
              className={`px-3 py-1 rounded-md border text-xs flex items-center gap-1.5 transition-all ${
                showTimestamp ? "border-[#f5a623] bg-[#f5a623]/10 text-[#f5a623]" : "border-white/10 text-[#71717a]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tarih Damgası</span>
            </button>
          </div>

          {/* Slider'lar */}
          <div className="grid grid-cols-2 gap-4">
            <ResettableSlider
              label="Çerçeve Genişliği"
              value={borderWidth}
              min={12}
              max={56}
              defaultValue={24}
              unit="px"
              onChange={(val) => actions.setFrameConfig({ borderWidth: val })}
            />
            <ResettableSlider
              label="Köşe Yuvarlaklığı"
              value={borderRadius}
              min={0}
              max={32}
              defaultValue={12}
              unit="px"
              onChange={(val) => actions.setFrameConfig({ borderRadius: val })}
            />
          </div>
        </div>
      </footer>

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_post_4_5"
        itemsToExport={[{
          id: "frame_1",
          name: "minimal_frame",
          order: 0,
          getBlob: (fmt) => getExportBlob(fmt),
        }]}
      />
    </div>
  );
}
