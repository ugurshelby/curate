"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowLeft, Download, Sliders, Calendar, Sparkles } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { extractAdaptiveGradient, AdaptiveGradientResult } from "@/lib";

interface FrameStudioProps {
  onBack: () => void;
}

export function FrameStudio({ onBack }: FrameStudioProps) {
  const [photoPath, setPhotoPath] = useState<string>("/reference-images/kovboy.jfif");
  const [frameType, setFrameType] = useState<"polaroid" | "matte" | "gradient">("polaroid");
  const [borderWidth, setBorderWidth] = useState<number>(24);
  const [borderRadius, setBorderRadius] = useState<number>(12);
  const [showTimestamp, setShowTimestamp] = useState<boolean>(true);
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Günün analog tarih formatı: '26 09 27
  const getTodayStamp = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `'${yy} ${mm} ${dd}`;
  };

  // Görsel yüklendiğinde gradyan çıkar
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
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

  // Dışa aktarma blobu
  const getExportBlob = async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context failed");

    // Zemin
    if (frameType === "gradient" && adaptiveGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, adaptiveGradient.colorTop);
      grad.addColorStop(1, adaptiveGradient.colorBottom);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frameType === "polaroid" ? "#fbfbfa" : "#111214";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return new Promise((res) => {
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.92);
    });
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f5f5f7] select-none">
      {/* 1. ÜST HEADER */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between px-4 py-2.5 rounded-lg glass-panel max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="touch-target text-xs text-[#a1a1aa] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Stüdyo</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Minimal Çerçeve</span>
          <span className="text-[10px] text-[#71717a] font-mono">Analog & Akıllı Mat</span>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="touch-target px-3.5 py-1.5 rounded-md bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </header>

      {/* 2. ÇERÇEVE SAHNESİ */}
      <main className="canvas-viewport flex items-center justify-center p-4">
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
          {/* İç Fotoğraf */}
          <div className="relative w-full h-full rounded-sm overflow-hidden shadow-inner flex items-center justify-center bg-black">
            <Image
              src={photoPath}
              alt="frame photo"
              fill
              className="object-cover"
            />
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
        <div className="w-full p-4 rounded-sheet glass-panel border border-white/10 shadow-2xl flex flex-col gap-3.5">
          
          {/* Üst Sekmeler: Çerçeve Tipi & Tarih Damgası */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <div className="flex bg-[#18181b] p-0.5 rounded-md border border-white/5">
              {(["polaroid", "matte", "gradient"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFrameType(t)}
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
              onClick={() => setShowTimestamp(!showTimestamp)}
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
              onChange={(val) => setBorderWidth(val)}
            />
            <ResettableSlider
              label="Köşe Yuvarlaklığı"
              value={borderRadius}
              min={0}
              max={32}
              defaultValue={12}
              unit="px"
              onChange={(val) => setBorderRadius(val)}
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
          getBlob: getExportBlob,
        }]}
      />
    </div>
  );
}
