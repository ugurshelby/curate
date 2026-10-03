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
  Image as ImageIcon,
  Wand2
} from "lucide-react";
import { CarouselStudio } from "@/components/studio/CarouselStudio";
import { StoryStudio } from "@/components/studio/StoryStudio";
import { FrameStudio } from "@/components/studio/FrameStudio";
import { UpscaleStudio } from "@/components/studio/UpscaleStudio";
import { EditStudio } from "@/components/studio/EditStudio";
import { StudioModule, StudioItem, useStudio, createStudioItem } from "@/lib";
import { ReferencePicker } from "@/components/studio/ReferencePicker";

export default function CurateStudioMain() {
  const { state, actions } = useStudio();
  const [activeModule, setActiveModule] = useState<StudioModule | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
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
  if (activeModule === "edit") {
    return <EditStudio onBack={closeModule} onOpenModule={openModule} />;
  }

  const processUploadedFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newItems: StudioItem[] = validFiles.map((file, idx) => createStudioItem(file, idx));

    actions.addItems(newItems);
    if (newItems.length > 0) {
      actions.selectItem(newItems[0].id);
    }
    openModule("carousel");
  };

  // Referans görseller kütüphaneye eklenir; modül açılmaz (test amaçlı ikincil eylem)
  const addReferenceFiles = (files: File[]) => {
    const newItems: StudioItem[] = files.map((file, idx) => createStudioItem(file, state.items.length + idx));
    actions.addItems(newItems);
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
    <div className="relative min-h-[100dvh] w-full bg-base text-ink-1 select-none flex flex-col justify-between p-6 sm:p-12 overflow-x-hidden">
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
          <div className="w-8 h-8 rounded-lg bg-surface-2 border border-separator flex items-center justify-center text-ink-1 font-extrabold text-sm">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-ink-1">Curate Studio</span>
            <span className="text-xs text-ink-3 num-metric">Editorial Photo Darkroom</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {state.items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Kütüphanedeki tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
              }}
              className="touch-target px-3 py-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger text-xs font-medium flex items-center gap-1.5 transition-all border border-danger/20"
              title="Kütüphanedeki tüm fotoğrafları temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Temizle ({state.items.length})</span>
            </button>
          )}

          {/* Hızlı [+ Fotoğraf Yükle] Butonu */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-separator text-ink-1 text-xs font-medium flex items-center gap-1.5 transition-all border border-separator"
          >
            <Plus className="w-3.5 h-3.5 text-ink-2" />
            <span>Fotoğraf Yükle</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-ink-2 border border-separator">
            <span className="w-2 h-2 rounded-full bg-ink-3" />
            <span>Client-Side Engine Active</span>
          </div>
        </div>
      </header>

      {/* MERKEZ ALAN: Drag & Drop Yükleme Alanı + 4 Stüdyo Kartı */}
      <main className="w-full max-w-5xl mx-auto py-6 flex flex-col gap-6">
        
        {/* Başlık Alanı */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-1">
            Stüdyo Modülü Seçin
          </h1>
          <p className="text-xs sm:text-sm text-ink-2 max-w-xl">
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
              ? "border-accent bg-accent/10 scale-[1.01]"
              : "border-separator hover:border-ink-3 bg-surface/80 hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-1">Fotoğraflarınızı buraya sürükleyin</span>
                <span className="text-xs bg-surface-2 text-ink-2 px-2 py-0.5 rounded num-metric">
                  Hızlı Başla
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Veya cihazınızdan fotoğraf seçmek için tıklayın (JPEG, PNG, HEIC, WEBP)
              </p>
            </div>
          </div>

          <button className="touch-target px-4 py-2 rounded-xl bg-accent-fill text-on-accent text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Fotoğrafları Seç</span>
          </button>
        </div>

        {/* İkincil, test amaçlı: referans görsel yükleme (spec §4.4 K3) */}
        <div className="flex items-center justify-between gap-3 -mt-2">
          <button
            type="button"
            onClick={() => setIsReferenceOpen(true)}
            className="touch-target press px-1 text-sm text-ink-2 hover:text-ink-1 underline-offset-4 hover:underline"
          >
            Referans Görsel Yükle
          </button>
          {state.items.length > 0 && (
            <span className="text-xs text-ink-3 num-metric">Kütüphane: {state.items.length} fotoğraf</span>
          )}
        </div>

        {/* 4'lü Bento Kart Izgarası */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* KART 1: Carousel Dump (4:5) */}
          <div
            onClick={() => openModule("carousel")}
            className="group relative p-6 rounded-2xl bg-surface hover:bg-surface-2 border border-separator hover:border-ink-3 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs num-metric px-2 py-0.5 rounded bg-surface-2 text-ink-2">
                4:5 Post
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-1 group-hover:text-ink-1 transition-colors">
                  Carousel Dump
                </h2>
                <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-1 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Instagram ve TikTok için sıralı filmstrip, Safe-Zone önizleme, %20 nazik hero renk eşitleme ve tek tıkla 1080×1350 ZIP export.
              </p>
            </div>
          </div>

          {/* KART 2: Story Dump (9:16) */}
          <div
            onClick={() => openModule("story")}
            className="group relative p-6 rounded-2xl bg-surface hover:bg-surface-2 border border-separator hover:border-ink-3 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-xs num-metric px-2 py-0.5 rounded bg-surface-2 text-ink-2">
                9:16 Mockup
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-1 group-hover:text-ink-1 transition-colors">
                  Story Dump
                </h2>
                <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-1 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Gerçekçi iPhone Dynamic Island sahnesi, 2–6&apos;lı akıllı grid, tekil Space slider&apos;ı, akıllı gradyan ve iki tıkla fotoğraf takası.
              </p>
            </div>
          </div>

          {/* KART 3: Minimal Çerçeve */}
          <div
            onClick={() => openModule("frame")}
            className="group relative p-6 rounded-2xl bg-surface hover:bg-surface-2 border border-separator hover:border-ink-3 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform">
                <Crop className="w-5 h-5" />
              </div>
              <span className="text-xs num-metric px-2 py-0.5 rounded bg-surface-2 text-ink-2">
                Polaroid & Mat
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-1 group-hover:text-ink-1 transition-colors">
                  Minimal Çerçeve
                </h2>
                <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-1 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Tekil kareler için Polaroid, Matte ve görsel kenar piksellerinden türetilen Akıllı Gradyan; analog turuncu tarih damgası.
              </p>
            </div>
          </div>

          {/* KART 4: Kayıpsız Upscale */}
          <div
            onClick={() => openModule("upscale")}
            className="group relative p-6 rounded-2xl bg-surface hover:bg-surface-2 border border-separator hover:border-ink-3 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform">
                <ZoomIn className="w-5 h-5" />
              </div>
              <span className="text-xs num-metric px-2 py-0.5 rounded bg-surface-2 text-ink-2">
                Lanczos-3
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-1 group-hover:text-ink-1 transition-colors">
                  Kayıpsız Upscale
                </h2>
                <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-1 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Matematiksel Lanczos-3 konvolüsyonu ile 2x ve 4x büyütme; Before/After Split View ile canlı keskinlik analizi.
              </p>
            </div>
          </div>

          {/* KART 5: Düzenle (spec §4.5) */}
          <div
            onClick={() => openModule("edit")}
            className="group relative p-6 rounded-2xl bg-surface hover:bg-surface-2 border border-separator hover:border-ink-3 transition-colors duration-300 cursor-pointer shadow-xl flex flex-col justify-between gap-6 sm:col-span-2"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-separator flex items-center justify-center text-ink-2">
                <Wand2 className="w-5 h-5" />
              </div>
              <span className="text-xs num-metric px-2 py-0.5 rounded bg-surface-2 text-ink-2">
                Tek fotoğraf
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-1 group-hover:text-ink-1 transition-colors">
                  Düzenle
                </h2>
                <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-1 transition-colors" />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Tek fotoğrafa preset, kırpma, döndürme ve ufuk düzeltme; kendi çözünürlüğünde dışa aktarma.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addReferenceFiles}
        maxSelect={13}
      />

      {/* ALT FOOTER: Sistem Garantileri */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-separator text-xs text-ink-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <ShieldCheck className="w-3.5 h-3.5 text-ink-2" />
            Sıfır Sunucu Yükü (100% Client-Side)
          </span>
          <span>·</span>
          <span>EXIF & GPS Sanitized</span>
          <span>·</span>
          <span>Lanczos-3 Engine</span>
        </div>
        <div className="num-metric text-ink-3">
          Curate Design System (CDS) v2.0
        </div>
      </footer>
    </div>
  );
}
