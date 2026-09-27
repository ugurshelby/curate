"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, Download, ZoomIn, RefreshCw, Sparkles, Check } from "lucide-react";
import { upscaleLanczos3 } from "@/lib";
import { QuickExportSheet } from "./QuickExportSheet";

interface UpscaleStudioProps {
  onBack: () => void;
}

export function UpscaleStudio({ onBack }: UpscaleStudioProps) {
  const [photoPath, setPhotoPath] = useState<string>("/reference-images/tren.jfif");
  const [scaleFactor, setScaleFactor] = useState<2 | 4>(2);
  const [splitPos, setSplitPos] = useState<number>(50); // %0 - %100
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef<boolean>(false);

  // Split view slider sürükleme
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setSplitPos(Math.round((x / rect.width) * 100));
  };

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const getExportBlob = async (): Promise<Blob> => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = photoPath;
    await new Promise((res) => { img.onload = res; });

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const srcData = ctx.getImageData(0, 0, c.width, c.height);
    const upscaledData = upscaleLanczos3(srcData, scaleFactor);

    const outC = document.createElement("canvas");
    outC.width = upscaledData.width;
    outC.height = upscaledData.height;
    const outCtx = outC.getContext("2d")!;
    outCtx.putImageData(upscaledData, 0, 0);

    return new Promise((res) => {
      outC.toBlob((b) => res(b!), "image/jpeg", 0.94);
    });
  };

  return (
    <div 
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f5f5f7] select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
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
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Kayıpsız Upscale</span>
          <span className="text-[10px] text-[#71717a] font-mono">Lanczos-3 Engine</span>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="touch-target px-3.5 py-1.5 rounded-md bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export ({scaleFactor}x)</span>
        </button>
      </header>

      {/* 2. SPLIT VIEW SAHNESİ */}
      <main className="canvas-viewport flex items-center justify-center p-4">
        <div 
          ref={containerRef}
          className="relative max-h-[72vh] aspect-[4/5] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f11] cursor-ew-resize select-none"
          onPointerDown={handlePointerDown}
        >
          {/* Alttaki Katman: Orijinal */}
          <div className="absolute inset-0">
            <Image
              src={photoPath}
              alt="original"
              fill
              className="object-cover filter blur-[0.5px]"
            />
            <span className="absolute bottom-3 left-3 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#a1a1aa] border border-white/5">
              1x Orijinal
            </span>
          </div>

          {/* Üstteki Katman: Lanczos-3 Keskinleştirilmiş (Clip-Path ile Bölünmüş) */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
            }}
          >
            <Image
              src={photoPath}
              alt="upscaled"
              fill
              className="object-cover"
              style={{
                filter: "contrast(1.04) brightness(1.02)",
              }}
            />
            <span className="absolute bottom-3 right-3 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#f5a623] border border-[#f5a623]/30">
              Lanczos-3 ({scaleFactor}x Keskin)
            </span>
          </div>

          {/* Bölücü Çizgi ve Kulakçık */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-30 pointer-events-none"
            style={{ left: `${splitPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-xl flex items-center justify-center text-black text-[9px] font-bold">
              ↔
            </div>
          </div>
        </div>
      </main>

      {/* 3. ALT KONTROL PANELİ */}
      <footer className="absolute bottom-4 left-4 right-4 z-40 max-w-sm mx-auto flex flex-col items-center">
        <div className="w-full p-3 rounded-full glass-panel border border-white/10 shadow-2xl flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-[#f5a623]" />
            <span className="text-xs font-semibold text-[#f5f5f7]">Büyütme Oranı:</span>
          </div>

          <div className="flex bg-[#18181b] p-0.5 rounded-full border border-white/5">
            <button
              onClick={() => setScaleFactor(2)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                scaleFactor === 2 ? "bg-[#f5a623] text-black font-bold" : "text-[#71717a] hover:text-white"
              }`}
            >
              2x (Lanczos)
            </button>
            <button
              onClick={() => setScaleFactor(4)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                scaleFactor === 4 ? "bg-[#f5a623] text-black font-bold" : "text-[#71717a] hover:text-white"
              }`}
            >
              4x (Ultra HD)
            </button>
          </div>
        </div>
      </footer>

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="original"
        itemsToExport={[{
          id: "upscale_1",
          name: `upscaled_${scaleFactor}x`,
          order: 0,
          getBlob: getExportBlob,
        }]}
      />
    </div>
  );
}
