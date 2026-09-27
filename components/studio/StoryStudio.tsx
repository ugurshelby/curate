"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  EyeOff, 
  Sliders, 
  Palette, 
  Grid, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { InstagramOverlay } from "./InstagramOverlay";
import { QuickExportSheet } from "./QuickExportSheet";
import { PLATFORM_SPECS } from "@/lib";

interface StoryStudioProps {
  onBack: () => void;
}

export function StoryStudio({ onBack }: StoryStudioProps) {
  // Mock / Yüklenen kareler (2-6 arası)
  const [storyPhotos, setStoryPhotos] = useState<string[]>([
    "/reference-images/gol-evi.jfif",
    "/reference-images/gun-batimi-gunese-dokunan-eleman.jfif",
    "/reference-images/ic-mekan-bar.jfif",
    "/reference-images/sehir-gokdelen.jfif",
  ]);

  const [slotCount, setSlotCount] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [spacing, setSpacing] = useState<number>(12); // Space slider
  const [bgMode, setBgMode] = useState<"black" | "white" | "charcoal" | "gradient">("gradient");
  const [showStoryOverlay, setShowStoryOverlay] = useState<boolean>(true);
  const [swapSelectedIdx, setSwapSelectedIdx] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // İki tıkla fotoğraf takası (Swap)
  const handleCellClick = (index: number) => {
    if (swapSelectedIdx === null) {
      setSwapSelectedIdx(index);
    } else if (swapSelectedIdx === index) {
      setSwapSelectedIdx(null); // Deselect
    } else {
      // Swap yap
      const copy = [...storyPhotos];
      const temp = copy[swapSelectedIdx];
      copy[swapSelectedIdx] = copy[index];
      copy[index] = temp;
      setStoryPhotos(copy);
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
    switch (bgMode) {
      case "black":
        return { backgroundColor: "#000000" };
      case "white":
        return { backgroundColor: "#ffffff" };
      case "charcoal":
        return { backgroundColor: "#18181b" };
      case "gradient":
        return {
          background: "radial-gradient(circle at 50% 30%, #3f2a1d 0%, #17110e 60%, #000000 100%)",
        };
    }
  };

  // Export render fonksiyonu
  const getStoryExportBlob = async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = PLATFORM_SPECS.ig_story_9_16.width;
    canvas.height = PLATFORM_SPECS.ig_story_9_16.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");

    // Zemin dolgusu
    if (bgMode === "white") ctx.fillStyle = "#ffffff";
    else if (bgMode === "charcoal") ctx.fillStyle = "#18181b";
    else if (bgMode === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#3f2a1d");
      grad.addColorStop(0.6, "#17110e");
      grad.addColorStop(1, "#000000");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#000000";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92);
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
          <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">Story Dump</span>
          <span className="text-[10px] text-[#71717a] font-mono">1080 × 1920 px (9:16)</span>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="touch-target px-3.5 py-1.5 rounded-md bg-[#f5a623] hover:bg-[#ffbc3c] text-black text-xs font-semibold active:scale-95 transition-all shadow-[0_0_16px_rgba(245,166,35,0.25)] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </header>

      {/* 2. DİKEY iPHONE MOCKUP SAHNESİ */}
      <main className="canvas-viewport flex items-center justify-center p-3">
        {/* iPhone Kasa Mockup */}
        <div 
          className="relative aspect-[9/16] h-[74vh] max-h-[720px] rounded-[44px] p-2 bg-[#121215] border-[5px] border-[#27272a] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* İç Ekran */}
          <div 
            className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col transition-all duration-300"
            style={getBackgroundStyle()}
          >
            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-24 h-6 rounded-full bg-black flex items-center justify-between px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#18181b]" />
              <div className="w-2 h-2 rounded-full bg-[#0a192f]/60" />
            </div>

            {/* Instagram Story Safe-Zone Katmanı */}
            {showStoryOverlay && <InstagramOverlay type="story" />}

            {/* Akıllı Grid & Space Tuvali */}
            <div 
              className={`w-full h-full grid ${getGridClasses()} transition-all duration-200`}
              style={{
                padding: `${spacing}px`,
                gap: `${spacing}px`,
              }}
            >
              {storyPhotos.slice(0, slotCount).map((src, idx) => {
                const isSelected = swapSelectedIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "ring-2 ring-white scale-[0.98] shadow-lg"
                        : "hover:opacity-90"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`slot-${idx}`}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded-full text-white">
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
        
        {/* Kontrol Paneli */}
        <div className="w-full p-3.5 rounded-2xl glass-panel border border-white/10 shadow-2xl flex flex-col gap-3">
          
          {/* Üst Satır: Slot Sayısı ve Zemin */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Slot Sayısı */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1aa] text-[11px]">Düzen:</span>
              <div className="flex bg-[#18181b] p-0.5 rounded-md border border-white/5">
                {([2, 3, 4, 5, 6] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setSlotCount(count)}
                    className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                      slotCount === count ? "bg-[#f5a623] text-black font-semibold" : "text-[#71717a] hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Zemin Seçenekleri */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1aa] text-[11px]">Zemin:</span>
              <div className="flex items-center gap-1">
                {(["gradient", "black", "white", "charcoal"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBgMode(m)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      bgMode === m ? "ring-2 ring-[#f5a623] scale-110" : "border-white/20"
                    } ${
                      m === "black" ? "bg-black" : m === "white" ? "bg-white" : m === "charcoal" ? "bg-[#18181b]" : "bg-gradient-to-tr from-amber-800 to-amber-950"
                    }`}
                    title={m}
                  />
                ))}
              </div>
            </div>

            {/* Story Overlay Toggle */}
            <button
              onClick={() => setShowStoryOverlay(!showStoryOverlay)}
              className="p-1.5 rounded-md hover:bg-white/10 text-[#a1a1aa] hover:text-white"
              title="Story Arayüz Katmanı"
            >
              {showStoryOverlay ? <Eye className="w-4 h-4 text-[#f5a623]" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Alt Satır: Tekil "Space" Slider'ı */}
          <div className="pt-2 border-t border-white/5">
            <ResettableSlider
              label="Space (Boşluk & Kenar Payı)"
              value={spacing}
              min={0}
              max={36}
              defaultValue={12}
              unit="px"
              onChange={(val) => setSpacing(val)}
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
          getBlob: getStoryExportBlob,
        }]}
      />
    </div>
  );
}
