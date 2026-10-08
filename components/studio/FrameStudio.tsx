"use client";

import { tr } from "@/lib/i18n/tr";
import React, { useState, useEffect, useRef } from "react";
import { Calendar, Crop } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import {
  extractAdaptiveGradient,
  AdaptiveGradientResult,
  useStudio,
  getStudioSelection,
  createStudioItem,
  createExportCanvas,
  FRAME_SIZES,
  frameOutputSize,
  drawFrame,
  frameStampText,
  previewRenderSize,
} from "@/lib";

/** Önizleme kaynağının uzun kenarı (export her zaman tam çözünürlükten çizer) */
const PREVIEW_SOURCE_MAX = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

interface FrameStudioProps {
  onBack: () => void;
}

export function FrameStudio({ onBack }: FrameStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: activeItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);

  const { frameType, borderWidth, borderRadius, showTimestamp, size, resolution } = state.frameConfig;
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fotoğraf Yükleme — Otomatik Proxy Pipeline ile
  // Çerçeve tek görsel çalışır: eklenen görsel kütüphaneye girer ve seçilir
  const addSingleFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const newItem = createStudioItem(file, state.items.length);
    actions.addItems([newItem]);
    actions.selectItem(newItem.id);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addSingleFile([file]);
    e.target.value = "";
  };

  const handleClear = () => {
    if (window.confirm(tr.common.clearAllConfirm)) actions.clearItems();
  };

  // Kaynak: önizleme için küçültülmüş kopya (uzun kenar ≤ 1600) ve gradyan; export tam çözünürlükten çizer
  const previewSrcRef = useRef<HTMLCanvasElement | null>(null);
  const [srcVersion, setSrcVersion] = useState(0);
  useEffect(() => {
    previewSrcRef.current = null;
    setSrcVersion((v) => v + 1);
    if (!photoPath) {
      setAdaptiveGradient(null);
      return;
    }
    let cancelled = false;
    loadImage(photoPath).then((img) => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const k = Math.min(1, PREVIEW_SOURCE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      previewSrcRef.current = c;
      setAdaptiveGradient(extractAdaptiveGradient(ctx.getImageData(0, 0, c.width, c.height)));
      setSrcVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  const out = frameOutputSize(size, resolution);
  const ratio = out.width / out.height;

  // Önizleme: export'la aynı drawFrame, ekranın gösterebildiği piksel kadar (previewRenderSize)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = (w: number, h: number) =>
      setBox((p) => (Math.abs(p.w - w) < 1 && Math.abs(p.h - h) < 1 ? p : { w, h }));
    measure(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const src = previewSrcRef.current;
    if (!canvas || !hasPhoto) return;
    const raf = requestAnimationFrame(() => {
      const { width: W, height: H } = previewRenderSize(out.width, out.height, box.w, box.h, window.devicePixelRatio || 1);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      drawFrame(ctx, src, W, H, state.frameConfig, adaptiveGradient, frameStampText());
    });
    return () => cancelAnimationFrame(raf);
  }, [hasPhoto, srcVersion, box, out.width, out.height, state.frameConfig, adaptiveGradient]);

  // Export: seçilen standart boyutta, aynı drawFrame; sRGB, kodlama export sayfasında
  const renderExportCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!photoPath) throw new Error("No photo to export");
    const { canvas, ctx } = createExportCanvas(out.width, out.height);
    const img = await loadImage(photoPath);
    drawFrame(ctx, img, out.width, out.height, state.frameConfig, adaptiveGradient, frameStampText());
    return canvas;
  };

  const stage = (
    <div
      ref={stageRef}
      data-stage
      className="relative flex items-center justify-center overflow-hidden"
      style={{ aspectRatio: `${ratio}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
    >
      {hasPhoto && photoPath ? (
        <canvas ref={canvasRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full rounded-xl border border-separator bg-base flex flex-col items-center justify-center p-4 text-center text-ink-3 gap-1">
          <Crop className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">{tr.frame.empty}</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 text-sm text-accent"
          >
            {tr.common.uploadPhoto}
          </button>
        </div>
      )}
    </div>
  );

  const panel = (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label={tr.frame.size} className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {FRAME_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={size === s.id}
              aria-label={`${tr.frame.sizeNames[s.id]} ${s.ratio}`}
              onClick={() => actions.setFrameConfig({ size: s.id })}
              className={`press shrink-0 h-11 min-w-[56px] px-3 rounded-xl text-sm font-semibold border num-metric ${
                size === s.id ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
              }`}
            >
              {s.ratio}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={resolution === "high"}
          aria-label={`${tr.frame.resolution}: ${tr.frame.resolutions.high}`}
          onClick={() => actions.setFrameConfig({ resolution: resolution === "high" ? "standard" : "high" })}
          className={`press shrink-0 h-11 min-w-[56px] px-3 rounded-xl text-sm font-semibold border ${
            resolution === "high" ? "border-accent bg-accent/15 text-accent" : "border-separator text-ink-3"
          }`}
        >
          {tr.frame.resolutions.high}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
      <ResettableSlider
        label={tr.frame.width}
        value={borderWidth}
        min={12}
        max={56}
        defaultValue={24}
        unit="px"
        onChange={(val) => actions.setFrameConfig({ borderWidth: val })}
      />
      <ResettableSlider
        label={tr.frame.corner}
        value={borderRadius}
        min={0}
        max={32}
        defaultValue={12}
        unit="px"
        onChange={(val) => actions.setFrameConfig({ borderRadius: val })}
      />
      </div>
    </div>
  );

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={state.items.length > 0 ? handleClear : undefined}
      />
      <div role="radiogroup" aria-label={tr.frame.type} className="flex-1 min-w-0 flex p-0.5 rounded-xl bg-surface-2 border border-separator">
        {(["polaroid", "matte", "gradient"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={frameType === t}
            onClick={() => actions.setFrameConfig({ frameType: t })}
            className={`press flex-1 h-11 px-1 rounded-[10px] text-xs font-semibold ${
              frameType === t ? "bg-accent-fill text-on-accent" : "text-ink-2"
            }`}
          >
            {tr.frame.types[t]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => actions.setFrameConfig({ showTimestamp: !showTimestamp })}
        aria-pressed={showTimestamp}
        aria-label={tr.frame.stamp}
        className={`touch-target press rounded-xl border ${
          showTimestamp ? "border-accent bg-accent/15 text-accent" : "border-separator text-ink-3"
        }`}
      >
        <Calendar className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <StudioShell
      title={tr.modules.frame.title}
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto}
      stage={stage}
      stageToolbar={<StageNote>{`${tr.frame.sizeNames[size]} · ${out.width} × ${out.height}`}</StageNote>}
      panel={panel}
      bar={bar}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addSingleFile}
        maxSelect={1}
      />

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_post_4_5"
        filePrefix="frame"
        sizeLabel={`${out.width} × ${out.height} (${FRAME_SIZES.find((s) => s.id === size)?.ratio ?? ""})`}
        itemsToExport={hasPhoto ? [{ id: "frame_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
