"use client";

import { tr } from "@/lib/i18n/tr";
import React, { useState, useRef, useEffect } from "react";
import { Sliders, Star, Palette, X, FileCode, ChevronDown, Layers, Eye, EyeOff } from "lucide-react";
import {
  useStudio,
  getStudioSelection,
  parseCubeLUT,
  PLATFORM_SPECS,
  StudioItem,
  drawCarouselFrame,
  createStudioItem,
  CarouselPreviewRenderer,
  CarouselRenderOptions,
  CAROUSEL_OUTPUT_WIDTH,
  extractHeroMetrics,
  createExportCanvas,
  previewRenderSize,
  whenIdle,
} from "@/lib";
import { InstagramOverlay } from "./InstagramOverlay";
import { TikTokOverlay } from "./TikTokOverlay";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { Filmstrip } from "./Filmstrip";
import { PresetStrip, usePresetThumbs } from "./PresetStrip";
import { reportRenderTime } from "./PerfHud";

/** Hedef → export platformu (spec §4.4 K1). Önizleme tam = export boyutu, taslak = yarısı (slider sürüklenirken). */
const TARGET_PLATFORM = { instagram: "ig_post_4_5", tiktok: "tiktok_9_16" } as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(tr.common.imageLoadFailed));
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

  // Görünüm tercihleri store'da (cihazda hatırlanır, lib/core/prefs.ts)
  const { fitMode, target, showOverlay } = state.carouselView;
  const setFitMode = (m: "fill" | "fit") => actions.setCarouselView({ fitMode: m });
  const setTarget = (t: "instagram" | "tiktok") => actions.setCarouselView({ target: t });
  const setShowOverlay = (fn: (v: boolean) => boolean) => actions.setCarouselView({ showOverlay: fn(showOverlay) });
  // Sahip kararı: her zaman bir hedef seçili, varsayılan Instagram (export hedefi Faz S'de bağlanır)
  // Platform arayüz katmanı yalnız önizlemede; renk değerlendirmesi için gizlenebilir (sahip kararı 2026-10-03)
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState<boolean>(false);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);

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
  // Sahnenin CSS kutusu: önizleme ekranın gösterebildiği piksel kadar çizilir (previewRenderSize)
  const stageBoxRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

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
  const warmCancelRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  // Kare başına en çok bir çizim: bekleyen istekler birleşir, her zaman en güncel durum çizilir
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source) return;
    const draft = draggingRef.current;
    const box = stageBoxRef.current;
    const { width: W, height: H } = previewRenderSize(FULL_W, FULL_H, box.w, box.h, window.devicePixelRatio || 1, draft);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const t0 = performance.now();
    rendererRef.current.render(ctx, source.img, source.key, W, H, optionsRef.current);
    reportRenderTime(performance.now() - t0);
    // Boşta taslak tabanı hazırla: kaydırıcının ilk karesi tam kaynağı küçültmek zorunda kalmasın
    if (!draft) {
      warmCancelRef.current?.();
      warmCancelRef.current = whenIdle(() => {
        const s = sourceRef.current;
        if (!s) return;
        const d = previewRenderSize(FULL_W, FULL_H, box.w, box.h, window.devicePixelRatio || 1, true);
        const c = document.createElement("canvas");
        c.width = d.width;
        c.height = d.height;
        const wctx = c.getContext("2d", { willReadFrequently: true });
        if (wctx) rendererRef.current.prepareBase(wctx, s.img, s.key, d.width, d.height, optionsRef.current);
      });
    }
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
      warmCancelRef.current?.();
    };
  }, []);

  // Preset kartı önizlemeleri: filmstrip proxy'sinden küçük boyutta (ortak PresetStrip)
  const thumbSrc = activePhoto ? activePhoto.proxyUrl || activePhoto.originalUrl : null;
  const presetThumbs = usePresetThumbs(thumbSrc);

  // Sahne boyutu değişince (panel açıldı, döndürüldü) önizleme çözünürlüğü yeniden hesaplanır
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = (w: number, h: number) => {
      const prev = stageBoxRef.current;
      if (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1) return;
      stageBoxRef.current = { w, h };
      scheduleRender();
    };
    measure(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto, target]);

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
    if (window.confirm(tr.carousel.clearConfirm)) actions.clearItems();
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
        alert(tr.gelismis.lutInvalid);
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
      className={`relative rounded-xl overflow-hidden border border-separator bg-base flex items-center justify-center ${
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
        <div className="flex flex-col items-center justify-center p-6 text-center text-ink-3 gap-1">
          <Layers className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">{tr.carousel.emptySeries}</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 text-sm text-accent"
          >
            {tr.common.uploadPhoto}
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
      <div role="radiogroup" aria-label={tr.carousel.target} className="flex p-0.5 rounded-xl bg-surface-2 border border-separator">
        {(["instagram", "tiktok"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={target === t}
            onClick={() => setTarget(t)}
            className={`press h-11 px-2.5 rounded-[10px] text-xs font-semibold ${
              target === t ? "bg-accent-fill text-on-accent" : "text-ink-2"
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
        aria-label={showOverlay ? tr.carousel.overlayHide : tr.carousel.overlayShow}
        title={showOverlay ? tr.carousel.overlayHide : tr.carousel.overlayShow}
        className={`touch-target press shrink-0 rounded-xl border ${
          showOverlay ? "bg-surface-2 border-separator text-ink-1" : "bg-accent/15 border-accent text-accent"
        }`}
      >
        {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={() => setFitMode(fitMode === "fill" ? "fit" : "fill")}
        disabled={!hasPhoto}
        aria-label={tr.carousel.fitToggle}
        className="press shrink-0 h-11 px-3 rounded-xl bg-surface-2 border border-separator text-xs font-semibold text-ink-1"
      >
        {fitMode === "fill" ? tr.carousel.fill : tr.carousel.fit}
      </button>
    </>
  );

  const panel = isEditSheetOpen ? (
    <div className="flex flex-col gap-3 p-3">
      {/* Preset'ler: yatay kaydırmalı tek satır (CDS §6.3) */}
      <PresetStrip
        thumbs={presetThumbs}
        activeId={state.customLut && selectedPresetId === "custom_lut" ? "__lut" : selectedPresetId}
        onSelect={(id) => {
          if (id === null) {
            actions.setGlobalPreset(null);
            actions.setCustomLut(null);
          } else {
            actions.setGlobalPreset({ id, intensity: itemIntensity / 100 });
          }
        }}
      />

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
          label={tr.common.amount}
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
      <div className="flex flex-col border-t border-separator pt-1">
        <button
          type="button"
          onClick={() => setIsToolsOpen((v) => !v)}
          aria-expanded={isToolsOpen}
          className="h-11 flex items-center justify-between text-sm text-ink-2"
        >
          <span>{tr.common.tools}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
        </button>

        {isToolsOpen && (
          <div className="flex flex-wrap items-center gap-2 pb-1 animate-panel-in">
            <button
              type="button"
              onClick={() => lutInputRef.current?.click()}
              className={`press h-11 px-3 rounded-xl text-sm border flex items-center gap-2 ${
                state.customLut
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-separator bg-surface-2 text-ink-1"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span className="max-w-[160px] truncate">
                {state.customLut ? tr.gelismis.lutLoaded(state.customLut.title) : tr.gelismis.lutUpload}
              </span>
            </button>

            {state.customLut && (
              <button
                type="button"
                onClick={() => actions.setCustomLut(null)}
                aria-label={tr.gelismis.lutRemove}
                className="touch-target press rounded-xl text-ink-2"
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
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-separator bg-surface-2 text-ink-1"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>{state.heroColorMetrics ? tr.carousel.syncOn : tr.carousel.syncToFrame}</span>
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
          isEditSheetOpen ? "bg-accent-fill text-on-accent" : "bg-surface-2 text-ink-1"
        }`}
      >
        <Sliders className="w-4 h-4" />
        <span>{tr.carousel.editToggle}</span>
      </button>
    </div>
  );

  return (
    <StudioShell
      title={tr.modules.carousel.title}
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
            className="fixed z-50 rounded-xl bg-surface border border-separator p-1 shadow-2xl flex flex-col min-w-[200px] animate-panel-in"
            style={{
              top: Math.max(8, Math.min(window.innerHeight - 160, contextMenu.y)),
              left: Math.max(8, Math.min(window.innerWidth - 208, contextMenu.x)),
            }}
          >
            <button
              type="button"
              onClick={() => handleMakeCover(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-ink-1 hover:bg-separator rounded-lg flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-ink-2" />
              <span>{tr.carousel.makeCover}</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeroHarmonize(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-ink-1 hover:bg-separator rounded-lg flex items-center gap-2"
            >
              <Palette className="w-4 h-4 text-ink-2" />
              <span>{tr.carousel.syncToFrame}</span>
            </button>
            <div className="h-px bg-surface-2 my-0.5" />
            <button
              type="button"
              onClick={() => handleRemovePhoto(contextMenu.id)}
              className="h-11 px-3 text-left text-sm text-danger hover:bg-danger/10 rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>{tr.carousel.removeFromSeries}</span>
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
