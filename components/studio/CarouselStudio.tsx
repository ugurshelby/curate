"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sliders, Star, Palette, X, FileCode, ChevronDown, Layers, Eye, EyeOff } from "lucide-react";
import {
  useStudio,
  getStudioSelection,
  CURATE_PRESETS,
  parseCubeLUT,
  PLATFORM_SPECS,
  StudioItem,
  drawCarouselFrame,
  createStudioItem,
  calculateAspectCrop,
  applyPresetToImageData,
  CarouselPreviewRenderer,
  CarouselRenderOptions,
  CAROUSEL_OUTPUT_WIDTH,
  extractHeroMetrics,
  createExportCanvas,
} from "@/lib";
import { InstagramOverlay } from "./InstagramOverlay";
import { TikTokOverlay } from "./TikTokOverlay";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { Filmstrip } from "./Filmstrip";
import { reportRenderTime } from "./PerfHud";

/** Fotoğraf yokken preset kartı yedeği (atmosfer rengi) */
const PRESET_SWATCHES: Record<string, string> = {
  moody_teal: "from-teal-600/40 via-cyan-950/40 to-zinc-900",
  warm_silhouette: "from-orange-500/40 via-amber-800/40 to-zinc-900",
  night_cinematic: "from-cyan-400/30 via-rose-950/40 to-black",
  muted_coastal: "from-sky-300/30 via-stone-500/20 to-zinc-900",
  amber_grain: "from-amber-400/40 via-yellow-900/30 to-zinc-900",
  monochrome_noir: "from-zinc-200/30 via-zinc-800/60 to-black",
};

const PRESET_TAGS: Record<string, string> = {
  moody_teal: "Mimari & Teal",
  warm_silhouette: "Siluet & Ters Işık",
  night_cinematic: "Neon & Halation",
  muted_coastal: "Pastel & Ferah",
  amber_grain: "35mm Analog Gren",
  monochrome_noir: "Grafik B&W",
};

const THUMB_W = 100;
const THUMB_H = 76;

/** Hedef → export platformu (spec §4.4 K1). Önizleme tam = export boyutu, taslak = yarısı (slider sürüklenirken). */
const TARGET_PLATFORM = { instagram: "ig_post_4_5", tiktok: "tiktok_9_16" } as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

interface CarouselStudioProps {
  onBack: () => void;
}

export function CarouselStudio({ onBack }: CarouselStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: activePhoto } = getStudioSelection(state.items, state.selectedItemId);
  const photos = state.items;
  const activePhotoId = activePhoto?.id || null;

  const [fitMode, setFitMode] = useState<"fill" | "fit">("fill");
  // Sahip kararı: her zaman bir hedef seçili, varsayılan Instagram (export hedefi Faz S'de bağlanır)
  const [target, setTarget] = useState<"instagram" | "tiktok">("instagram");
  // Platform arayüz katmanı yalnız önizlemede; renk değerlendirmesi için gizlenebilir (sahip kararı 2026-10-03)
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState<boolean>(false);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [presetThumbs, setPresetThumbs] = useState<Record<string, string>>({});

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lutInputRef = useRef<HTMLInputElement | null>(null);

  const spec = PLATFORM_SPECS[TARGET_PLATFORM[target]];
  const FULL_W = spec.width;
  const FULL_H = spec.height;
  const DRAFT_W = FULL_W / 2;
  const DRAFT_H = FULL_H / 2;

  const selectedPresetId = state.globalPreset?.id ?? null;
  const itemIntensity = Math.round((state.globalPreset?.intensity ?? 1.0) * 100);

  /**
   * Önizleme ve export için TEK parametre şeması (spec §4.4 M2-a).
   * Export: aynı seçeneklerle drawCarouselFrame, 1080×1350.
   * Önizleme: aynı seçeneklerle CarouselPreviewRenderer, 1080×1350 (sürüklerken 540×675).
   */
  const buildRenderOptions = (item: StudioItem | null): CarouselRenderOptions => ({
    fitMode,
    heroColorMetrics: state.heroColorMetrics,
    customLut: state.customLut,
    presetId: item?.preset?.id ?? state.globalPreset?.id ?? null,
    presetIntensity: item?.preset?.intensity ?? state.globalPreset?.intensity ?? 1.0,
    outputWidth: CAROUSEL_OUTPUT_WIDTH,
  });

  const rendererRef = useRef(new CarouselPreviewRenderer());
  const sourceRef = useRef<{ key: string; img: HTMLImageElement } | null>(null);
  const optionsRef = useRef<CarouselRenderOptions>(buildRenderOptions(activePhoto));
  optionsRef.current = buildRenderOptions(activePhoto);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Kare başına en çok bir çizim: bekleyen istekler birleşir, her zaman en güncel durum çizilir
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source) return;
    const draft = draggingRef.current;
    const W = draft ? DRAFT_W : FULL_W;
    const H = draft ? DRAFT_H : FULL_H;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const t0 = performance.now();
    rendererRef.current.render(ctx, source.img, source.key, W, H, optionsRef.current);
    reportRenderTime(performance.now() - t0);
  };
  const scheduleRender = () => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => flushRef.current());
    }
  };

  // Aktif fotoğrafın orijinali bir kez çözülür; kırpılmış taban renderer içinde önbelleklenir
  const activeSrc = activePhoto ? activePhoto.originalUrl || activePhoto.proxyUrl : null;
  useEffect(() => {
    if (!activeSrc) {
      sourceRef.current = null;
      rendererRef.current.reset();
      return;
    }
    let cancelled = false;
    loadImage(activeSrc)
      .then((img) => {
        if (cancelled) return;
        sourceRef.current = { key: activeSrc, img };
        scheduleRender();
      })
      .catch(() => {
        /* görsel çözülemedi: sahne boş kalır */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc]);

  // Görünüm parametreleri değişince yeniden çiz (rAF ile birleşir)
  useEffect(() => {
    scheduleRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitMode, state.heroColorMetrics, state.customLut, selectedPresetId, itemIntensity, hasPhoto, target]);

  useEffect(() => {
    return () => {
      // StrictMode effect'i iki kez çalıştırır: iptalden sonra ref sıfırlanmazsa sonraki çizimler kilitlenir
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Preset kartı önizlemeleri: filmstrip proxy'sinden küçük boyutta, preset fonksiyonunun kendisiyle
  const thumbSrc = activePhoto ? activePhoto.proxyUrl || activePhoto.originalUrl : null;
  useEffect(() => {
    if (!thumbSrc) {
      setPresetThumbs({});
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.src = thumbSrc;
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = THUMB_W;
      c.height = THUMB_H;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const crop = calculateAspectCrop(img.naturalWidth, img.naturalHeight, THUMB_W, THUMB_H);
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, THUMB_W, THUMB_H);
      const base = ctx.getImageData(0, 0, THUMB_W, THUMB_H);
      const out: Record<string, string> = { raw: c.toDataURL("image/jpeg", 0.8) };
      for (const p of CURATE_PRESETS) {
        const copy = new ImageData(new Uint8ClampedArray(base.data), THUMB_W, THUMB_H);
        ctx.putImageData(applyPresetToImageData(copy, p, 1), 0, 0);
        out[p.id] = c.toDataURL("image/jpeg", 0.8);
      }
      setPresetThumbs(out);
    };
    return () => {
      cancelled = true;
    };
  }, [thumbSrc]);

  // Wheel zoom: native, non-passive dinleyici (React onWheel passive olduğu için preventDefault hatası veriyordu)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomScale((prev) => Math.min(3, Math.max(1, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const addFiles = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;
    const newItems: StudioItem[] = validFiles.map((file, idx) => createStudioItem(file, photos.length + idx));
    actions.addItems(newItems);
  };

  // Fotoğraf Yükleme (Dosya Seçici) — Otomatik Proxy Pipeline ile
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(Array.from(files));
    e.target.value = "";
  };

  const handleClear = () => {
    if (window.confirm("Serideki tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
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

  // Dokunma: seç; 320ms içinde ikinci dokunma menüyü açar
  const handleCardTap = (photoId: string) => {
    actions.selectItem(photoId);
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === photoId && now - lastTapRef.current.time < 320) {
      setContextMenu({ id: photoId, x: window.innerWidth / 2 - 100, y: window.innerHeight - 260 });
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: photoId, time: now };
    }
  };

  // Context Menu Eylemleri
  const handleMakeCover = (id: string) => {
    actions.makeCover(id);
    setContextMenu(null);
  };

  // Hero metrikleri ham kareden (kırp/sığdır, harmonize ve preset ÖNCESİ) alınır — denetim bulgusu #5
  const handleHeroHarmonize = async (id: string) => {
    setContextMenu(null);
    const item = photos.find((p) => p.id === id);
    if (!item) return;
    const src = item.originalUrl || item.proxyUrl;
    const img = sourceRef.current?.key === src ? sourceRef.current.img : await loadImage(src);
    const c = document.createElement("canvas");
    c.width = FULL_W;
    c.height = FULL_H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    actions.setHeroColorMetrics(extractHeroMetrics(ctx, img, FULL_W, FULL_H, fitMode));
    actions.setHarmonizeReference(id, 0.20);
  };

  const handleRemovePhoto = (id: string) => {
    if (photos.length <= 1) return;
    actions.removeItem(id);
    setContextMenu(null);
  };

  // Export tuvali: önizleme ile aynı parametre şeması, hedefin tam boyutu, sRGB (kodlama export sayfasında)
  const renderExportCanvas = async (item: StudioItem): Promise<HTMLCanvasElement> => {
    const { canvas, ctx } = createExportCanvas(FULL_W, FULL_H);
    const img = await loadImage(item.originalUrl || item.proxyUrl);
    drawCarouselFrame(ctx, img, FULL_W, FULL_H, buildRenderOptions(item));
    return canvas;
  };

  const stage = (
    <div
      ref={stageRef}
      data-stage
      className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c] flex items-center justify-center ${
        target === "tiktok"
          ? "aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))]"
          : "aspect-[4/5] w-[min(100cqw,calc(100cqh*4/5))]"
      }`}
      style={{ touchAction: "none" }}
    >
      {hasPhoto && activePhoto ? (
        <canvas
          ref={canvasRef}
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: "center center",
            transition: "transform 100ms ease-out",
          }}
          className="w-full h-full"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-[#71717a] gap-1">
          <Layers className="w-8 h-8 text-[#3f3f46]" />
          <span className="text-sm">Seride henüz fotoğraf yok</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 text-sm text-[#f5a623]"
          >
            Fotoğraf Yükle
          </button>
        </div>
      )}

      {hasPhoto && showOverlay && target === "instagram" && <InstagramOverlay type="post" />}
      {/* TikTok arayüz güvenli alanı yalnız önizlemede; export'a yazılmaz */}
      {hasPhoto && showOverlay && target === "tiktok" && <TikTokOverlay type="story" />}
    </div>
  );

  const stageToolbar = (
    <>
      <div role="radiogroup" aria-label="Hedef platform" className="flex p-0.5 rounded-xl bg-white/5 border border-white/10">
        {(["instagram", "tiktok"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={target === t}
            onClick={() => setTarget(t)}
            className={`press h-11 px-2.5 rounded-[10px] text-xs font-semibold ${
              target === t ? "bg-[#f5a623] text-black" : "text-[#a1a1aa]"
            }`}
          >
            {t === "instagram" ? "Instagram" : "TikTok"}
          </button>
        ))}
      </div>

      <StageNote>{FULL_W}×{FULL_H}</StageNote>

      <button
        type="button"
        onClick={() => setShowOverlay((v) => !v)}
        disabled={!hasPhoto}
        aria-pressed={!showOverlay}
        aria-label={showOverlay ? "Arayüz katmanını gizle" : "Arayüz katmanını göster"}
        title={showOverlay ? "Arayüz katmanını gizle" : "Arayüz katmanını göster"}
        className={`touch-target press shrink-0 rounded-xl border disabled:opacity-40 ${
          showOverlay ? "bg-white/5 border-white/10 text-[#f5f5f7]" : "bg-[#f5a623]/15 border-[#f5a623] text-[#f5a623]"
        }`}
      >
        {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={() => setFitMode(fitMode === "fill" ? "fit" : "fill")}
        disabled={!hasPhoto}
        aria-label="Doldur veya sığdır"
        className="press shrink-0 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[#f5f5f7] disabled:opacity-40"
      >
        {fitMode === "fill" ? "Doldur" : "Sığdır"}
      </button>
    </>
  );

  const panel = isEditSheetOpen ? (
    <div className="flex flex-col gap-3 p-3">
      {/* Preset'ler: yatay kaydırmalı tek satır (CDS §6.3) */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-3 px-3">
        {[{ id: null as string | null, name: "Doğal", tag: "Orijinal renk" }, ...CURATE_PRESETS.map((p) => ({
          id: p.id as string | null,
          name: p.name,
          tag: PRESET_TAGS[p.id] ?? p.category,
        }))].map((p) => {
          const isActive = p.id === null ? selectedPresetId === null && !state.customLut : selectedPresetId === p.id;
          const thumb = presetThumbs[p.id ?? "raw"];
          return (
            <button
              key={p.id ?? "raw"}
              type="button"
              title={p.tag}
              aria-pressed={isActive}
              onClick={() => {
                if (p.id === null) {
                  actions.setGlobalPreset(null);
                  actions.setCustomLut(null);
                } else {
                  actions.setGlobalPreset({ id: p.id, intensity: itemIntensity / 100 });
                }
              }}
              className={`press relative shrink-0 snap-start rounded-xl overflow-hidden border-2 bg-gradient-to-br ${
                (p.id && PRESET_SWATCHES[p.id]) || "from-zinc-800 to-zinc-900"
              } ${isActive ? "border-[#f5a623]" : "border-white/10"}`}
              style={{ width: THUMB_W, height: THUMB_H }}
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4 bg-gradient-to-t from-black/85 to-transparent text-left text-xs font-semibold leading-tight text-white">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Katmanlı ifşa: preset veya LUT seçiliyse yoğunluk */}
      {selectedPresetId && (
        <ResettableSlider
          onInteractionStart={() => {
            draggingRef.current = true;
          }}
          onInteractionEnd={() => {
            draggingRef.current = false;
            scheduleRender();
          }}
          label="Yoğunluk"
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
      )}

      {/* Araçlar: .cube LUT ve Hero Harmonize, varsayılan kapalı */}
      <div className="flex flex-col border-t border-white/10 pt-1">
        <button
          type="button"
          onClick={() => setIsToolsOpen((v) => !v)}
          aria-expanded={isToolsOpen}
          className="h-11 flex items-center justify-between text-sm text-[#a1a1aa]"
        >
          <span>Araçlar</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
        </button>

        {isToolsOpen && (
          <div className="flex flex-wrap items-center gap-2 pb-1 animate-panel-in">
            <button
              type="button"
              onClick={() => lutInputRef.current?.click()}
              className={`press h-11 px-3 rounded-xl text-sm border flex items-center gap-2 ${
                state.customLut
                  ? "border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]"
                  : "border-white/15 bg-white/5 text-[#f5f5f7]"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span className="max-w-[160px] truncate">
                {state.customLut ? `LUT: ${state.customLut.title}` : "3D LUT (.cube) yükle"}
              </span>
            </button>

            {state.customLut && (
              <button
                type="button"
                onClick={() => actions.setCustomLut(null)}
                aria-label="Yüklü LUT'u kaldır"
                className="touch-target press rounded-xl text-[#a1a1aa]"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {activePhoto && (
              <button
                type="button"
                onClick={() => handleHeroHarmonize(activePhoto.id)}
                className={`press h-11 px-3 rounded-xl text-sm border flex items-center gap-2 ${
                  state.heroColorMetrics
                    ? "border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]"
                    : "border-white/15 bg-white/5 text-[#f5f5f7]"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>{state.heroColorMetrics ? "Hero uyumu açık (%20)" : "Kareden hero renk al"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  ) : undefined;

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={photos.length > 0 ? handleClear : undefined}
      />
      <div className="flex-1 min-w-0">
        <Filmstrip
          items={photos}
          activeId={activePhotoId}
          onTap={handleCardTap}
          onReorder={(from, to) => actions.reorderItems(from, to)}
          onContextMenu={(id, x, y) => setContextMenu({ id, x, y })}
        />
      </div>
      <button
        type="button"
        onClick={() => setIsEditSheetOpen(!isEditSheetOpen)}
        aria-expanded={isEditSheetOpen}
        className={`touch-target press shrink-0 h-11 px-3 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${
          isEditSheetOpen ? "bg-[#f5a623] text-black" : "bg-white/10 text-white"
        }`}
      >
        <Sliders className="w-4 h-4" />
        <span>Düzenle</span>
      </button>
    </div>
  );

  return (
    <StudioShell
      title="Carousel Dump"
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto}
      stage={stage}
      stageToolbar={stageToolbar}
      panel={panel}
      bar={bar}
    >
      {/* Gizli Dosya Inputları */}
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input ref={lutInputRef} type="file" accept=".cube" className="hidden" onChange={handleLutUpload} />

      {/* Context Menu (Masaüstü Sağ Tık / Mobil Çift Dokunma) — cam değil, düz yüzey */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setContextMenu(null)} />
          <div
            className="fixed z-50 rounded-xl bg-[#18181b] border border-white/15 p-1 shadow-2xl flex flex-col min-w-[200px] animate-panel-in"
            style={{
              top: Math.max(8, Math.min(window.innerHeight - 160, contextMenu.y)),
              left: Math.max(8, Math.min(window.innerWidth - 208, contextMenu.x)),
            }}
          >
            <button
              type="button"
              onClick={() => handleMakeCover(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-[#f5f5f7] hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-[#f5a623]" />
              <span>Kapak yap</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeroHarmonize(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-[#f5f5f7] hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Palette className="w-4 h-4 text-[#f5a623]" />
              <span>Seriyi bu renge eşitle</span>
            </button>
            <div className="h-px bg-white/10 my-0.5" />
            <button
              type="button"
              onClick={() => handleRemovePhoto(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Seriden çıkar</span>
            </button>
          </div>
        </>
      )}

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addFiles}
        maxSelect={13}
      />

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform={TARGET_PLATFORM[target]}
        itemsToExport={photos.map((p, idx) => ({
          id: p.id,
          order: idx,
          renderCanvas: () => renderExportCanvas(p),
        }))}
      />
    </StudioShell>
  );
}
