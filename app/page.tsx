"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Sparkles, 
  Layers, 
  Smartphone, 
  Crop, 
  ZoomIn, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Camera
} from "lucide-react";
import { CarouselStudio } from "@/components/studio/CarouselStudio";
import { StoryStudio } from "@/components/studio/StoryStudio";
import { FrameStudio } from "@/components/studio/FrameStudio";
import { UpscaleStudio } from "@/components/studio/UpscaleStudio";
import { StudioModule } from "@/lib";

export default function CurateStudioMain() {
  const [activeModule, setActiveModule] = useState<StudioModule | null>(null);

  // 1. Modül Ekranları (Tam Ekran Açılış)
  if (activeModule === "carousel") {
    return <CarouselStudio onBack={() => setActiveModule(null)} />;
  }
  if (activeModule === "story") {
    return <StoryStudio onBack={() => setActiveModule(null)} />;
  }
  if (activeModule === "frame") {
    return <FrameStudio onBack={() => setActiveModule(null)} />;
  }
  if (activeModule === "upscale") {
    return <UpscaleStudio onBack={() => setActiveModule(null)} />;
  }

  // 2. Karşılama Ekranı (Studio Hub View)
  return (
    <div className="relative min-h-screen w-screen bg-black text-[#f5f5f7] select-none flex flex-col justify-between p-6 sm:p-12 overflow-x-hidden">
      
      {/* ÜST BAR: Minimal Curate Logosu */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f5a623] flex items-center justify-center text-black font-extrabold text-sm shadow-[0_0_20px_rgba(245,166,35,0.4)]">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-[#f5f5f7]">Curate Studio</span>
            <span className="text-[11px] text-[#71717a] font-mono">Editorial Photo Darkroom</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-[11px] text-[#a1a1aa] border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Client-Side Engine Active</span>
        </div>
      </header>

      {/* MERKEZ ALAN: 4 Temiz, Yüksek Kontrastlı Stüdyo Kartı */}
      <main className="w-full max-w-5xl mx-auto py-8 flex flex-col gap-8">
        
        {/* Başlık Alanı */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Stüdyo Modülü Seçin
          </h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa] max-w-xl">
            Sosyal medya kürasyonu, iPhone kolaj tuvali, analog çerçeveleme ve Lanczos-3 süper çözünürlük motoru.
          </p>
        </div>

        {/* 4'lü Bento Kart Izgarası */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* KART 1: Carousel Dump (4:5) */}
          <div
            onClick={() => setActiveModule("carousel")}
            className="group relative p-6 rounded-2xl bg-[#0f0f11] hover:bg-[#141418] border border-white/10 hover:border-[#f5a623]/50 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f5a623] group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa]">
                4:5 Post
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white group-hover:text-[#f5a623] transition-colors">
                  Carousel Dump
                </h2>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#f5a623] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Instagram ve TikTok için sıralı filmstrip, Safe-Zone önizleme, %20 nazik hero renk eşitleme ve tek tıkla 1080×1350 ZIP export.
              </p>
            </div>
          </div>

          {/* KART 2: Story Dump (9:16) */}
          <div
            onClick={() => setActiveModule("story")}
            className="group relative p-6 rounded-2xl bg-[#0f0f11] hover:bg-[#141418] border border-white/10 hover:border-[#f5a623]/50 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f5a623] group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa]">
                9:16 Mockup
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white group-hover:text-[#f5a623] transition-colors">
                  Story Dump
                </h2>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#f5a623] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Gerçekçi iPhone Dynamic Island sahnesi, 2–6&apos;lı akıllı grid, tekil Space slider&apos;ı, akıllı gradyan ve iki tıkla fotoğraf takası.
              </p>
            </div>
          </div>

          {/* KART 3: Minimal Çerçeve */}
          <div
            onClick={() => setActiveModule("frame")}
            className="group relative p-6 rounded-2xl bg-[#0f0f11] hover:bg-[#141418] border border-white/10 hover:border-[#f5a623]/50 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f5a623] group-hover:scale-110 transition-transform">
                <Crop className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa]">
                Polaroid & Mat
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white group-hover:text-[#f5a623] transition-colors">
                  Minimal Çerçeve
                </h2>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#f5a623] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Tekil kareler için Polaroid, Matte ve görsel kenar piksellerinden türetilen Akıllı Gradyan; analog turuncu tarih damgası.
              </p>
            </div>
          </div>

          {/* KART 4: Kayıpsız Upscale */}
          <div
            onClick={() => setActiveModule("upscale")}
            className="group relative p-6 rounded-2xl bg-[#0f0f11] hover:bg-[#141418] border border-white/10 hover:border-[#f5a623]/50 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f5a623] group-hover:scale-110 transition-transform">
                <ZoomIn className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa]">
                Lanczos-3
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white group-hover:text-[#f5a623] transition-colors">
                  Kayıpsız Upscale
                </h2>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#f5a623] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Matematiksel Lanczos-3 konvolüsyonu ile 2x ve 4x büyütme; Before/After Split View ile canlı keskinlik analizi.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ALT FOOTER: Sistem Garantileri */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-white/5 text-[11px] text-[#71717a]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-white/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Sıfır Sunucu Yükü (100% Client-Side)
          </span>
          <span>·</span>
          <span>EXIF & GPS Sanitized</span>
          <span>·</span>
          <span>Lanczos-3 Engine</span>
        </div>
        <div className="font-mono text-[#71717a]">
          Curate Design System (CDS) v1.0
        </div>
      </footer>
    </div>
  );
}
