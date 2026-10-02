"use client";

import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  Layers, 
  Smartphone, 
  Crop, 
  ZoomIn, 
  ArrowRight,
  ShieldCheck,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import { CarouselStudio } from "@/components/studio/CarouselStudio";
import { StoryStudio } from "@/components/studio/StoryStudio";
import { FrameStudio } from "@/components/studio/FrameStudio";
import { UpscaleStudio } from "@/components/studio/UpscaleStudio";
import { StudioModule, studioStore, StudioItem, useStudio } from "@/lib";

export default function CurateStudioMain() {
  const { state, actions } = useStudio();
  const [activeModule, setActiveModule] = useState<StudioModule | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openModule = (mod: StudioModule) => {
    actions.setModule(mod);
    setActiveModule(mod);
  };

  const closeModule = () => {
    setActiveModule(null);
  };

  // 1. Modül Ekranları (Tam Ekran Açılış)
  if (activeModule === "carousel") {
    return <CarouselStudio onBack={closeModule} />;
  }
  if (activeModule === "story") {
    return <StoryStudio onBack={closeModule} />;
  }
  if (activeModule === "frame") {
    return <FrameStudio onBack={closeModule} />;
  }
  if (activeModule === "upscale") {
    return <UpscaleStudio onBack={closeModule} />;
  }

  const processUploadedFiles = (files: FileList | File[]) => {
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
        order: idx,
        createdAt: Date.now() + idx,
      };
    });

    actions.addItems(newItems);
    if (newItems.length > 0) {
      actions.selectItem(newItems[0].id);
    }
    openModule("carousel");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
      e.target.value = "";
    }
  };

  // 2. Karşılama Ekranı (Studio Hub View)
  return (
    <div className="relative min-h-screen w-screen bg-black text-[#f5f5f7] select-none flex flex-col justify-between p-6 sm:p-12 overflow-x-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

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

        <div className="flex items-center gap-3">
          {state.items.length > 0 && (
            <button
              onClick={() => actions.clearItems()}
              className="touch-target px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all border border-rose-500/20"
              title="Kütüphanedeki tüm fotoğrafları temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Temizle ({state.items.length})</span>
            </button>
          )}

          {/* Hızlı [+ Fotoğraf Yükle] Butonu */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-all border border-white/10"
          >
            <Plus className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Fotoğraf Yükle</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-[11px] text-[#a1a1aa] border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Client-Side Engine Active</span>
          </div>
        </div>
      </header>

      {/* MERKEZ ALAN: Drag & Drop Yükleme Alanı + 4 Stüdyo Kartı */}
      <main className="w-full max-w-5xl mx-auto py-6 flex flex-col gap-6">
        
        {/* Başlık Alanı */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Stüdyo Modülü Seçin
          </h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa] max-w-xl">
            Sosyal medya kürasyonu, iPhone kolaj tuvali, analog çerçeveleme ve Lanczos-3 süper çözünürlük motoru.
          </p>
        </div>

        {/* DRAG & DROP FOTOĞRAF YÜKLEME ALANI */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-5 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
            isDragging
              ? "border-[#f5a623] bg-[#f5a623]/10 scale-[1.01]"
              : "border-white/15 hover:border-[#f5a623]/50 bg-[#0f0f11]/80 hover:bg-[#141418]"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f5a623] shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Fotoğraflarınızı buraya sürükleyin</span>
                <span className="text-[10px] bg-[#f5a623]/15 text-[#f5a623] px-2 py-0.5 rounded font-mono">
                  Hızlı Başla
                </span>
              </div>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Veya cihazınızdan fotoğraf seçmek için tıklayın (JPEG, PNG, HEIC, WEBP)
              </p>
            </div>
          </div>

          <button className="touch-target px-4 py-2 rounded-xl bg-[#f5a623] text-black text-xs font-semibold hover:bg-[#ffbc3c] transition-all shrink-0 flex items-center gap-1.5 shadow-[0_0_16px_rgba(245,166,35,0.25)]">
            <Plus className="w-4 h-4" />
            <span>Fotoğrafları Seç</span>
          </button>
        </div>

        {/* 4'lü Bento Kart Izgarası */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* KART 1: Carousel Dump (4:5) */}
          <div
            onClick={() => openModule("carousel")}
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
            onClick={() => openModule("story")}
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
            onClick={() => openModule("frame")}
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
            onClick={() => openModule("upscale")}
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
