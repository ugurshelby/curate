"use client";

import React, { useEffect, useRef, useState } from "react";
import { Wand2, RotateCw, FlipHorizontal2, RotateCcw, ZoomIn, Undo2, Sparkles } from "lucide-react";
import {
  useStudio,
  getStudioSelection,
  createStudioItem,
  StudioModule,
  EditCrop,
  CarouselPreviewRenderer,
  CarouselRenderOptions,
  drawCarouselFrame,
  createExportCanvas,
  canvasToBlob,
  DEFAULT_EDIT_PARAMS,
  DEFAULT_EDIT_CROP,
  EDIT_ASPECTS,
  EDIT_MAX_ZOOM,
  EDIT_MAX_ANGLE,
  EDIT_PREVIEW_LONG_EDGE,
  cropGeometry,
  editOutputSize,
  editPreviewSize,
  frameRatio,
  maxCropWidth,
  panLimits,
  screenDeltaToImage,
  rubberband,
  upscaleFactorAllowed,
  derivedLabel,
  AiTask,
  AI_TASKS,
  SuspectRegion,
  prepareAiInput,
  suspectRegionFromImages,
  acceptAiResult,
} from "@/lib";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { QuickExportSheet } from "./QuickExportSheet";
import { ResettableSlider } from "./ResettableSlider";
import { PresetStrip, usePresetThumbs } from "./PresetStrip";
import { usePanPinch, PanPinchDelta } from "./usePanPinch";
import { reportRenderTime } from "./PerfHud";
import { DerivedBadge } from "./NoticeToast";
import { AiRepairSheet } from "./AiRepairSheet";
import { AiReviewScreen } from "./AiReviewScreen";

type EditTab = "preset" | "crop" | "fix";

/** Sekme çubuğu üç sekmeye göre kurulu; Düzeltme D2'de görünür olacak (spec §4.5 E10) */
const TABS: { id: EditTab; label: string; visible: boolean }[] = [
  { id: "preset", label: "Preset", visible: true },
  { id: "crop", label: "Kırp", visible: true },
  { id: "fix", label: "Düzeltme", visible: false },
];

const FRAME_PAD = 24;
const MIN_FRAME_PX = 48;
const HOLD_FOR_ORIGINAL_MS = 150;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

/** Kırp hareketi sırasında ekrandaki ham değerler (rubber-band için sınır dışına çıkabilir) */
interface LiveCrop {
  ox: number;
  oy: number;
  zoom: number;
}

interface CropBase {
  ox: number;
  oy: number;
  zoom: number;
  cwMax: number;
  ratio: number;
  theta: number;
  Wr: number;
  Hr: number;
}

/** AI sonucu: kontrol sayfasında bekler, "Kullan" denmeden kütüphaneye girmez */
interface AiReview {
  task: AiTask;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sourceId: string;
  originalUrl: string;
  suspect: SuspectRegion | null;
}

interface EditStudioProps {
  onBack: () => void;
  onOpenModule: (module: StudioModule) => void;
}

export function EditStudio({ onBack, onOpenModule }: EditStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: item } = getStudioSelection(state.items, state.selectedItemId);
  const params = (item && state.edits[item.id]) || DEFAULT_EDIT_PARAMS;
  const crop = params.crop;

  const [tab, setTab] = useState<EditTab>("preset");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [srcDims, setSrcDims] = useState<{ w: number; h: number } | null>(null);
  const [cropBox, setCropBox] = useState<{ w: number; h: number } | null>(null);
  const [liveCrop, setLiveCrop] = useState<LiveCrop | null>(null);
  const [liveFrame, setLiveFrame] = useState<{ w: number; h: number } | null>(null);
  const [isEnlarging, setIsEnlarging] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lookCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const cropBaseRef = useRef<CropBase | null>(null);

  const setParams = (patch: Parameters<typeof actions.setEditParams>[1]) => {
    if (item) actions.setEditParams(item.id, patch);
  };
  const setCrop = (patch: Partial<EditCrop>) => setParams({ crop: patch });

  // --- Kaynak: orijinal bir kez çözülür ---
  const src = item ? item.originalUrl || item.proxyUrl : null;
  const sourceRef = useRef<{ key: string; img: HTMLImageElement } | null>(null);

  const out = srcDims ? editOutputSize(srcDims.w, srcDims.h, crop) : null;
  const preview = out ? editPreviewSize(out) : null;

  /**
   * Önizleme ve export için TEK parametre şeması: Carousel'deki taban + görünüm adımları,
   * taban adımında kırp geometrisi (lib/engine/carousel-render.ts, edit-geometry.ts).
   */
  const buildOptions = (): CarouselRenderOptions => ({
    fitMode: "fill",
    crop,
    presetId: params.presetId,
    presetIntensity: params.intensity,
    outputWidth: out?.width,
  });

  // --- Önizleme çizimi: rAF ile birleşir, sürüklerken yarı çözünürlük ---
  const rendererRef = useRef(new CarouselPreviewRenderer());
  const lookRendererRef = useRef(new CarouselPreviewRenderer());
  const optionsRef = useRef<CarouselRenderOptions>(buildOptions());
  optionsRef.current = buildOptions();
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    rafRef.current = null;
    const source = sourceRef.current;
    if (!source) return;
    const t0 = performance.now();
    if (tabRef.current === "crop") {
      // Kırp görünümü: kırpılmamış fotoğraf, preset uygulanmış; hareket CSS dönüşümüyle
      const canvas = lookCanvasRef.current;
      if (!canvas) return;
      const w = source.img.naturalWidth;
      const h = source.img.naturalHeight;
      const s = Math.min(1, EDIT_PREVIEW_LONG_EDGE / Math.max(w, h));
      const W = Math.max(1, Math.round(w * s));
      const H = Math.max(1, Math.round(h * s));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const o = optionsRef.current;
      lookRendererRef.current.render(ctx, source.img, source.key, W, H, {
        fitMode: "fill",
        presetId: o.presetId,
        presetIntensity: o.presetIntensity,
        outputWidth: w,
      });
    } else {
      const canvas = canvasRef.current;
      const p = previewRef.current;
      if (!canvas || !p) return;
      const draft = draggingRef.current;
      const W = draft ? Math.max(1, Math.round(p.width / 2)) : p.width;
      const H = draft ? Math.max(1, Math.round(p.height / 2)) : p.height;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      rendererRef.current.render(ctx, source.img, source.key, W, H, optionsRef.current);
    }
    reportRenderTime(performance.now() - t0);
  };
  const scheduleRender = () => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => flushRef.current());
    }
  };

  useEffect(() => {
    if (!src) {
      sourceRef.current = null;
      setSrcDims(null);
      rendererRef.current.reset();
      lookRendererRef.current.reset();
      return;
    }
    let cancelled = false;
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        sourceRef.current = { key: src, img };
        setSrcDims({ w: img.naturalWidth, h: img.naturalHeight });
        scheduleRender();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const cropKey = JSON.stringify(crop);
  useEffect(() => {
    scheduleRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropKey, params.presetId, params.intensity, tab, srcDims, hasPhoto]);

  useEffect(() => {
    return () => {
      // StrictMode iki kez çalıştırır: iptal sonrası ref sıfırlanmazsa çizimler kilitlenir (M2 bulgusu)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Kırp kutusunun ekran ölçüsü
  useEffect(() => {
    const el = cropBoxRef.current;
    if (!el || tab !== "crop") return;
    // İlk ölçü eşzamanlı (ResizeObserver ilk kareyi beklemesin), sonrası gözlemciyle
    setCropBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([entry]) => {
      setCropBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, hasPhoto]);

  // --- Kırp geometrisi (ekran) ---
  const geom = srcDims ? cropGeometry(srcDims.w, srcDims.h, crop) : null;
  const ratioForFrame = geom ? geom.ratio : 1;
  const frame = (() => {
    if (!cropBox) return null;
    const availW = Math.max(MIN_FRAME_PX, cropBox.w - FRAME_PAD * 2);
    const availH = Math.max(MIN_FRAME_PX, cropBox.h - FRAME_PAD * 2);
    const w = Math.min(availW, availH * ratioForFrame);
    return { w, h: w / ratioForFrame, availW, availH };
  })();

  const cropGesture = usePanPinch<"crop">({
    onStart: () => {
      if (!geom || !frame) return false;
      cropBaseRef.current = {
        ox: geom.ox,
        oy: geom.oy,
        zoom: Math.max(1, Math.min(EDIT_MAX_ZOOM, crop.zoom)),
        cwMax: geom.cwMax,
        ratio: geom.ratio,
        theta: geom.theta,
        Wr: geom.Wr,
        Hr: geom.Hr,
      };
    },
    onMove: (_k, d) => {
      const b = cropBaseRef.current;
      if (b && frame) setLiveCrop(liveCropFrom(b, d, frame.w));
    },
    onEnd: (_k, d) => {
      const b = cropBaseRef.current;
      cropBaseRef.current = null;
      if (b && frame && !d.tap) {
        const l = liveCropFrom(b, d, frame.w);
        const zoom = Math.max(1, Math.min(EDIT_MAX_ZOOM, l.zoom));
        const cw = b.cwMax / zoom;
        const lim = panLimits(b.Wr, b.Hr, cw, cw / b.ratio, b.theta);
        setCrop({
          zoom,
          panX: lim.limX ? Math.max(-1, Math.min(1, l.ox / lim.limX)) : 0,
          panY: lim.limY ? Math.max(-1, Math.min(1, l.oy / lim.limY)) : 0,
        });
      }
      setLiveCrop(null); // sınıra 240ms geçişle döner
    },
    onCancel: () => {
      cropBaseRef.current = null;
      setLiveCrop(null);
    },
  });

  /** Parmak hareketi → çerçeve merkezinin görsel koordinatı; sınır dışında rubber-band (apple-design §9) */
  function liveCropFrom(b: CropBase, d: PanPinchDelta, frameWpx: number): LiveCrop {
    let zoom = b.zoom * d.scale;
    if (zoom > EDIT_MAX_ZOOM) zoom = EDIT_MAX_ZOOM + rubberband(zoom - EDIT_MAX_ZOOM, 1);
    if (zoom < 1) zoom = 1 - rubberband(1 - zoom, 1);
    const cw = b.cwMax / zoom;
    const ch = cw / b.ratio;
    const ss = frameWpx / cw;
    const v = screenDeltaToImage(d.dx, d.dy, b.theta, crop.flipH);
    let ox = b.ox - v.x / ss;
    let oy = b.oy - v.y / ss;
    const { limX, limY } = panLimits(b.Wr, b.Hr, cw, ch, b.theta);
    if (Math.abs(ox) > limX) ox = Math.sign(ox) * (limX + rubberband(Math.abs(ox) - limX, cw));
    if (Math.abs(oy) > limY) oy = Math.sign(oy) * (limY + rubberband(Math.abs(oy) - limY, ch));
    return { ox, oy, zoom };
  }

  // Serbest oran: köşeden boyutlandırma (merkez sabit, iki yana simetrik)
  const handleRef = useRef<{ pointerId: number; cx: number; cy: number } | null>(null);
  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const box = cropBoxRef.current?.getBoundingClientRect();
    if (!box) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer artık aktif değil */
    }
    handleRef.current = { pointerId: e.pointerId, cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
  };
  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = handleRef.current;
    if (!h || h.pointerId !== e.pointerId || !frame) return;
    e.stopPropagation();
    const w = Math.max(MIN_FRAME_PX, Math.min(frame.availW, Math.abs(e.clientX - h.cx) * 2));
    const hh = Math.max(MIN_FRAME_PX, Math.min(frame.availH, Math.abs(e.clientY - h.cy) * 2));
    setLiveFrame({ w, h: hh });
  };
  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = handleRef.current;
    if (!h || h.pointerId !== e.pointerId) return;
    e.stopPropagation();
    handleRef.current = null;
    if (liveFrame && geom && frame) {
      // Ekrandaki ölçek sabit kaldı; seçilen bölgeyi yeni orana ve yakınlaştırmaya çevir
      const ss = frame.w / geom.cw;
      const cwN = liveFrame.w / ss;
      const chN = liveFrame.h / ss;
      const rN = cwN / chN;
      const cwMaxN = maxCropWidth(geom.Wr, geom.Hr, rN, geom.theta);
      const zoom = Math.max(1, Math.min(EDIT_MAX_ZOOM, cwMaxN / cwN));
      const cw = cwMaxN / zoom;
      const lim = panLimits(geom.Wr, geom.Hr, cw, cw / rN, geom.theta);
      setCrop({
        aspect: "free",
        freeRatio: rN,
        zoom,
        panX: lim.limX ? Math.max(-1, Math.min(1, geom.ox / lim.limX)) : 0,
        panY: lim.limY ? Math.max(-1, Math.min(1, geom.oy / lim.limY)) : 0,
      });
    }
    setLiveFrame(null);
  };

  // Masaüstü: tekerlekle kırp yakınlaştırma (non-passive)
  const wheelRef = useRef({ crop, setCrop });
  wheelRef.current = { crop, setCrop };
  useEffect(() => {
    const el = cropBoxRef.current;
    if (!el || tab !== "crop") return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = wheelRef.current.crop;
      const zoom = Math.max(1, Math.min(EDIT_MAX_ZOOM, c.zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
      wheelRef.current.setCrop({ zoom });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [tab, hasPhoto]);

  // --- Yükleme (sınır 1 fotoğraf: eklenen seçilir) ---
  const addSingleFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const newItem = createStudioItem(file, state.items.length);
    actions.addItems([newItem]);
    actions.selectItem(newItem.id);
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addSingleFile([file]);
    e.target.value = "";
  };
  const handleClear = () => {
    if (window.confirm("Tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
  };

  // --- Export: kırpım kendi çözünürlüğünde, uzun kenar ≤ 4096; önizlemeyle aynı fonksiyon ---
  const renderExportCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!item || !out) throw new Error("No photo to export");
    const img = sourceRef.current?.img ?? (await loadImage(item.originalUrl || item.proxyUrl));
    const { canvas, ctx } = createExportCanvas(out.width, out.height);
    drawCarouselFrame(ctx, img, out.width, out.height, { ...buildOptions(), outputWidth: out.width });
    return canvas;
  };

  // Büyüt: düzenlenmiş hâl yeni fotoğraf olarak eklenir ve Upscale onunla açılır (spec §4.5 E9)
  // Upscale'in en küçük çarpanı (2x) bile güvenli sınırı aşıyorsa Büyüt kapalı
  const canEnlarge = !!out && upscaleFactorAllowed(out.width, out.height, 2);
  const handleEnlarge = async () => {
    if (!out) return;
    setIsEnlarging(true);
    try {
      const canvas = await renderExportCanvas();
      const blob = await canvasToBlob(canvas, "image/png");
      const file = new File([blob], "duzenle_buyut.png", { type: "image/png" });
      const newItem = createStudioItem(file, state.items.length);
      newItem.dimensions = { width: out.width, height: out.height, aspectRatio: out.width / out.height };
      // Ortak "sonuç ekle" yolu: kaynağa bağlı kayıt, seçilir; ayarları sıfır başlar (çift preset olmaz)
      if (item) actions.addResultItem(newItem, item.id, "upscale");
      onOpenModule("upscale");
    } finally {
      setIsEnlarging(false);
    }
  };

  // --- AI ile onar (spec §4.5 E12): aktif fotoğrafın kendi pikselleri gider (ayarsız) ---
  const prepareAiPixels = async (): Promise<Blob> => {
    if (!item) throw new Error("No photo");
    const img = sourceRef.current?.img ?? (await loadImage(item.originalUrl || item.proxyUrl));
    return prepareAiInput(img);
  };
  const handleAiResult = async (task: AiTask, blob: Blob) => {
    if (!item) return;
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      const original = sourceRef.current?.img ?? null;
      let suspect: SuspectRegion | null = null;
      try {
        suspect = original ? suspectRegionFromImages(original, img) : null;
      } catch {
        suspect = null;
      }
      setIsAiOpen(false);
      setAiReview({
        task,
        blob,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sourceId: item.id,
        originalUrl: item.proxyUrl || item.originalUrl,
        suspect,
      });
    } catch {
      URL.revokeObjectURL(url);
    }
  };
  const discardAiReview = () => {
    if (aiReview) URL.revokeObjectURL(aiReview.url);
    setAiReview(null);
  };
  const acceptAiReview = () => {
    if (!aiReview) return;
    const { blob, task, width, height } = aiReview;
    const makeItem = () => {
      const file = new File([blob], `ai_${task.toLowerCase()}.jpg`, { type: "image/jpeg" });
      const newItem = createStudioItem(file, state.items.length);
      newItem.dimensions = { width, height, aspectRatio: width / height };
      return newItem;
    };
    // Ortak "sonuç ekle" yolu; silinecek en eski kopya AI sonucuysa önce onay (reddedilirse kontrol sayfası açık kalır)
    if (acceptAiResult(actions, makeItem, aiReview.sourceId, (m) => window.confirm(m)) === "declined") return;
    URL.revokeObjectURL(aiReview.url);
    setAiReview(null);
    setTab("preset");
  };

  // --- Önce/sonra: Preset sekmesinde basılı tut → orijinal (kırpılmamış, preset'siz) ---
  const startHold = () => {
    if (tab !== "preset" || !hasPhoto) return;
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => setShowOriginal(true), HOLD_FOR_ORIGINAL_MS);
  };
  const endHold = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setShowOriginal(false);
  };

  const thumbs = usePresetThumbs(item ? item.proxyUrl || item.originalUrl : null);
  const intensityPct = Math.round(params.intensity * 100);

  // --- Sahne ---
  let stage: React.ReactNode;
  if (!hasPhoto || !item) {
    stage = (
      <div data-stage className="relative w-[min(100cqw,calc(100cqh*4/5))] aspect-[4/5] rounded-xl border border-white/10 bg-[#0a0a0c] flex flex-col items-center justify-center gap-1 p-4 text-center text-[#71717a]">
        <Wand2 className="w-8 h-8 text-[#3f3f46]" />
        <span className="text-sm">Düzenlemek için bir fotoğraf ekle</span>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="touch-target px-3 text-sm text-[#f5a623]">
          Fotoğraf Yükle
        </button>
      </div>
    );
  } else if (tab === "crop") {
    // Kırp görünümü: çerçeve sabit, fotoğraf altında hareket eder
    let imageStyle: React.CSSProperties = { display: "none" };
    if (geom && frame && srcDims) {
      const zoom = liveCrop ? liveCrop.zoom : geom.cwMax / geom.cw;
      const cw = geom.cwMax / zoom;
      const ss = frame.w / cw;
      const ox = liveCrop ? liveCrop.ox : geom.ox;
      const oy = liveCrop ? liveCrop.oy : geom.oy;
      const cx = (cropBox?.w ?? 0) / 2;
      const cy = (cropBox?.h ?? 0) / 2;
      imageStyle = {
        position: "absolute",
        left: 0,
        top: 0,
        width: srcDims.w * ss,
        height: srcDims.h * ss,
        transformOrigin: "0 0",
        transform: `translate(${cx}px, ${cy}px) scale(${crop.flipH ? -1 : 1}, 1) rotate(${crop.angle}deg) translate(${-ox * ss}px, ${-oy * ss}px) rotate(${crop.rotation}deg) translate(${(-srcDims.w * ss) / 2}px, ${(-srcDims.h * ss) / 2}px)`,
        transition: liveCrop ? "none" : "transform 240ms cubic-bezier(0.23, 1, 0.32, 1)",
        maxWidth: "none",
      };
    }
    const fw = liveFrame ? liveFrame.w : frame?.w ?? 0;
    const fh = liveFrame ? liveFrame.h : frame?.h ?? 0;
    stage = (
      <div
        ref={cropBoxRef}
        data-stage
        className="relative w-full h-full overflow-hidden rounded-xl bg-[#0a0a0c] cursor-grab"
        style={{ touchAction: "none" }}
        {...cropGesture.bind("crop")}
      >
        <canvas ref={lookCanvasRef} style={imageStyle} className="pointer-events-none" />
        {frame && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/90 pointer-events-none"
            style={{ width: fw, height: fh, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }}
          >
            {/* Üçler kuralı çizgileri */}
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
            {crop.aspect === "free" &&
              (["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                  key={pos}
                  role="slider"
                  aria-label="Kırp köşesi"
                  aria-valuenow={Math.round(fw)}
                  tabIndex={-1}
                  onPointerDown={onHandleDown}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  className="absolute w-11 h-11 pointer-events-auto flex items-center justify-center"
                  style={{
                    left: pos.endsWith("l") ? -22 : undefined,
                    right: pos.endsWith("r") ? -22 : undefined,
                    top: pos.startsWith("t") ? -22 : undefined,
                    bottom: pos.startsWith("b") ? -22 : undefined,
                    touchAction: "none",
                  }}
                >
                  <span className="w-4 h-4 rounded-full bg-white border-2 border-[#f5a623]" />
                </div>
              ))}
          </div>
        )}
      </div>
    );
  } else {
    const ratio = out ? out.width / out.height : 4 / 5;
    stage = (
      <div
        data-stage
        className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c]"
        style={{ aspectRatio: `${ratio}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        {showOriginal && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.proxyUrl || item.originalUrl} alt="" draggable={false} className="max-w-full max-h-full object-contain" />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">Orijinal</span>
          </div>
        )}
      </div>
    );
  }

  // Türetilmiş fotoğraf: rozet ve "Kaynağa dön" (kaynak ayarlarıyla birlikte açılır)
  const badge = item ? derivedLabel(item.derivedBy) : null;
  const source = item?.sourceId ? state.items.find((i) => i.id === item.sourceId) ?? null : null;

  const stageToolbar = hasPhoto ? (
    <>
      <StageNote>{out ? `${out.width}×${out.height}` : "—"}</StageNote>
      {badge || source ? (
        <div className="flex items-center gap-1.5 min-w-0">
          {badge && <DerivedBadge label={badge} />}
          {source && (
            <button
              type="button"
              onClick={() => {
                endHold();
                actions.selectItem(source.id);
              }}
              className="touch-target press shrink-0 h-11 px-3 rounded-xl text-sm font-semibold bg-white/10 text-white flex items-center gap-1.5"
            >
              <Undo2 className="w-4 h-4" />
              <span>Kaynağa dön</span>
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-[#71717a] text-right truncate min-w-0">
          {tab === "crop" ? "Sürükle, iki parmakla yakınlaştır" : "Basılı tut: orijinal"}
        </span>
      )}
    </>
  ) : undefined;

  const ratioNow = srcDims ? frameRatio(crop, srcDims.w, srcDims.h) : 1;

  const panel = (
    <div className="flex flex-col gap-3 p-3">
      <div role="tablist" aria-label="Düzenle sekmeleri" className="flex p-0.5 rounded-xl bg-white/5 border border-white/10">
        {TABS.filter((t) => t.visible).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              endHold();
              setTab(t.id);
            }}
            className={`press flex-1 h-11 rounded-[10px] text-sm font-semibold ${
              tab === t.id ? "bg-[#f5a623] text-black" : "text-[#a1a1aa]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "preset" && (
        <div role="tabpanel" className="flex flex-col gap-2">
          <PresetStrip thumbs={thumbs} activeId={params.presetId} onSelect={(id) => setParams({ presetId: id })} />
          {params.presetId && (
            <ResettableSlider
              label="Miktar"
              value={intensityPct}
              min={0}
              max={100}
              defaultValue={100}
              unit="%"
              onInteractionStart={() => {
                draggingRef.current = true;
              }}
              onInteractionEnd={() => {
                draggingRef.current = false;
                scheduleRender();
              }}
              onChange={(v) => setParams({ intensity: v / 100 })}
            />
          )}
        </div>
      )}

      {tab === "crop" && (
        <div role="tabpanel" className="flex flex-col gap-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-3 px-3">
            {EDIT_ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={crop.aspect === a.id}
                onClick={() =>
                  setCrop({
                    aspect: a.id,
                    freeRatio: a.id === "free" ? ratioNow : crop.freeRatio,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                  })
                }
                className={`press shrink-0 h-11 min-w-[56px] px-3 rounded-xl text-sm font-semibold border ${
                  crop.aspect === a.id ? "bg-[#f5a623] text-black border-[#f5a623]" : "bg-white/5 text-[#a1a1aa] border-white/10"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCrop({
                  rotation: (((crop.rotation + 90) % 360) as EditCrop["rotation"]),
                  freeRatio: crop.aspect === "free" && crop.freeRatio > 0 ? 1 / crop.freeRatio : crop.freeRatio,
                  zoom: 1,
                  panX: 0,
                  panY: 0,
                })
              }
              className="press h-11 px-3 rounded-xl text-sm border border-white/15 bg-white/5 text-[#f5f5f7] flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>90°</span>
            </button>
            <button
              type="button"
              aria-pressed={crop.flipH}
              onClick={() => setCrop({ flipH: !crop.flipH })}
              className={`press h-11 px-3 rounded-xl text-sm border flex items-center gap-2 ${
                crop.flipH ? "border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]" : "border-white/15 bg-white/5 text-[#f5f5f7]"
              }`}
            >
              <FlipHorizontal2 className="w-4 h-4" />
              <span>Çevir</span>
            </button>
            <button
              type="button"
              onClick={() => setCrop(DEFAULT_EDIT_CROP)}
              className="press ml-auto h-11 px-3 rounded-xl text-sm border border-white/15 bg-white/5 text-[#f5f5f7] flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sıfırla</span>
            </button>
          </div>
          <ResettableSlider
            label="Düzelt (ufuk)"
            value={Math.round(crop.angle * 10) / 10}
            min={-EDIT_MAX_ANGLE}
            max={EDIT_MAX_ANGLE}
            step={0.1}
            defaultValue={0}
            unit="°"
            onChange={(v) => setCrop({ angle: v })}
          />
        </div>
      )}
    </div>
  );

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={state.items.length > 0 ? handleClear : undefined}
      />
      <button
        type="button"
        onClick={() => {
          endHold();
          setIsAiOpen(true);
        }}
        disabled={!hasPhoto || !srcDims}
        className="press ml-auto h-11 px-3 rounded-xl text-sm font-semibold bg-white/10 text-white flex items-center gap-1.5 disabled:opacity-40"
      >
        <Sparkles className="w-4 h-4 text-[#f5a623]" />
        <span>AI ile onar</span>
      </button>
      {out && !canEnlarge && (
        <span className="text-xs text-[#f5a623] text-right">Büyütmek için çok büyük</span>
      )}
      <button
        type="button"
        onClick={handleEnlarge}
        disabled={!hasPhoto || !out || isEnlarging || !canEnlarge}
        title={out && !canEnlarge ? "Bu boyut için çok büyük" : undefined}
        className={`press h-11 px-3 rounded-xl text-sm font-semibold bg-white/10 text-white flex items-center gap-1.5 disabled:opacity-40`}
      >
        <ZoomIn className="w-4 h-4" />
        <span>{isEnlarging ? "Hazırlanıyor" : "Büyüt"}</span>
      </button>
    </div>
  );

  return (
    <StudioShell
      title="Düzenle"
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto || !out}
      stage={stage}
      stageToolbar={stageToolbar}
      panel={panel}
      bar={bar}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addSingleFile}
        maxSelect={1}
      />

      <AiRepairSheet
        open={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        size={srcDims ? { w: srcDims.w, h: srcDims.h } : null}
        prepareInput={prepareAiPixels}
        onResult={handleAiResult}
      />

      {aiReview && (
        <AiReviewScreen
          resultUrl={aiReview.url}
          originalUrl={aiReview.originalUrl}
          width={aiReview.width}
          height={aiReview.height}
          taskLabel={AI_TASKS[aiReview.task].label}
          suspect={aiReview.suspect}
          onUse={acceptAiReview}
          onDiscard={discardAiReview}
        />
      )}

      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="edit"
        sizeLabel={out ? `${out.width} × ${out.height}` : undefined}
        itemsToExport={hasPhoto && out ? [{ id: "edit_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
