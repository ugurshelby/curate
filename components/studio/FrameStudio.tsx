"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Crop, Sparkles, ChevronLeft, ChevronRight, Layers, Calendar, Palette } from "lucide-react";
import {
  extractEdgeColors,
  sampleSize,
  frameLayout,
  frameCoverCrop,
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
import { tr } from "@/lib/i18n/tr";
import { FRAME_MATTE_PRESETS } from "@/lib/ui/colors";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { QuickExportSheet } from "./QuickExportSheet";
import { ResettableSlider } from "./ResettableSlider";

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

const MATTE_OPTIONS = [
  { label: tr.frame.matteColors.white, color: FRAME_MATTE_PRESETS.white },
  { label: tr.frame.matteColors.cream, color: FRAME_MATTE_PRESETS.cream },
  { label: tr.frame.matteColors.black, color: FRAME_MATTE_PRESETS.black },
  { label: tr.frame.matteColors.charcoal, color: FRAME_MATTE_PRESETS.charcoal },
];

interface FrameStudioProps {
  onBack: () => void;
}

export function FrameStudio({ onBack }: FrameStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: activeItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);

  const { frameType, matteColor, gradientMode, borderWidth, borderRadius, showTimestamp, size, resolution } = state.frameConfig;
  const [edgeSample, setEdgeSample] = useState<ImageData | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>(matteColor || FRAME_MATTE_PRESETS.white);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((file, idx) => createStudioItem(file, state.items.length + idx));
    actions.addItems(newItems);
    actions.selectItem(newItems[0].id);
    e.target.value = "";
  };

  const handleClear = () => {
    if (window.confirm(tr.common.clearAllConfirm)) actions.clearItems();
  };

  const previewSrcRef = useRef<HTMLCanvasElement | null>(null);
  const [srcVersion, setSrcVersion] = useState(0);

  useEffect(() => {
    previewSrcRef.current = null;
    setSrcVersion((v) => v + 1);
    if (!photoPath) {
      setEdgeSample(null);
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

      const s = sampleSize(img.naturalWidth, img.naturalHeight);
      const sc = document.createElement("canvas");
      sc.width = s.width;
      sc.height = s.height;
      const sctx = sc.getContext("2d", { willReadFrequently: true });
      if (sctx) {
        sctx.drawImage(img, 0, 0, s.width, s.height);
        setEdgeSample(sctx.getImageData(0, 0, s.width, s.height));
      }
      setSrcVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  const out = frameOutputSize(size, resolution);
  const ratio = out.width / out.height;

  const edgeColors = useMemo(() => {
    if (!edgeSample || frameType !== "gradient" || gradientMode !== "adaptive") return null;
    const win = frameLayout(out.width, out.height, { frameType, borderWidth, borderRadius }).photo;
    const c = frameCoverCrop(edgeSample.width, edgeSample.height, win.w, win.h);
    return extractEdgeColors(edgeSample, { x: c.sx, y: c.sy, w: c.sw, h: c.sh });
  }, [edgeSample, frameType, gradientMode, out.width, out.height, borderWidth, borderRadius]);

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
      drawFrame(ctx, src, W, H, state.frameConfig, edgeColors, frameStampText());
    });
    return () => cancelAnimationFrame(raf);
  }, [hasPhoto, srcVersion, box, out.width, out.height, state.frameConfig, edgeColors]);

  const renderSingleExportCanvas = useCallback(async (path: string): Promise<HTMLCanvasElement> => {
    const { canvas, ctx } = createExportCanvas(out.width, out.height);
    const img = await loadImage(path);

    let imgEdgeColors = null;
    if (frameType === "gradient" && gradientMode === "adaptive") {
      const s = sampleSize(img.naturalWidth, img.naturalHeight);
      const sc = document.createElement("canvas");
      sc.width = s.width;
      sc.height = s.height;
      const sctx = sc.getContext("2d", { willReadFrequently: true });
      if (sctx) {
        sctx.drawImage(img, 0, 0, s.width, s.height);
        const samp = sctx.getImageData(0, 0, s.width, s.height);
        const win = frameLayout(out.width, out.height, { frameType, borderWidth, borderRadius }).photo;
        const c = frameCoverCrop(samp.width, samp.height, win.w, win.h);
        imgEdgeColors = extractEdgeColors(samp, { x: c.sx, y: c.sy, w: c.sw, h: c.sh });
      }
    }

    drawFrame(ctx, img, out.width, out.height, state.frameConfig, imgEdgeColors, frameStampText());
    return canvas;
  }, [out.width, out.height, frameType, gradientMode, borderWidth, borderRadius, state.frameConfig]);

  const itemsToExport = useMemo(() => {
    if (state.items.length === 0) return [];
    return state.items.map((item, idx) => ({
      id: item.id,
      order: idx,
      renderCanvas: () => renderSingleExportCanvas(item.originalUrl || item.proxyUrl),
    }));
  }, [state.items, renderSingleExportCanvas]);

  const currentIndex = state.items.findIndex((it) => it.id === activeItem?.id);
  const handlePrev = () => {
    if (currentIndex > 0) actions.selectItem(state.items[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < state.items.length - 1) actions.selectItem(state.items[currentIndex + 1].id);
  };

  const stage = (
    <div
      ref={stageRef}
      data-stage
      className="relative flex items-center justify-center overflow-hidden"
      style={{ aspectRatio: `${ratio}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
    >
      {hasPhoto && photoPath ? (
        <>
          <canvas ref={canvasRef} className="w-full h-full" />
          {state.items.length > 1 && (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="pointer-events-auto touch-target min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= state.items.length - 1}
                className="pointer-events-auto touch-target min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full rounded-xl border border-separator bg-base flex flex-col items-center justify-center p-4 text-center text-ink-3 gap-1">
          <Crop className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">{tr.frame.loadPhoto}</span>
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
    <div className="flex flex-col gap-3 p-3 max-h-[38dvh] overflow-y-auto hide-scrollbar">
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label={tr.frame.size} className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {FRAME_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={size === s.id}
              onClick={() => actions.setFrameConfig({ size: s.id })}
              className={`touch-target press shrink-0 min-h-[44px] min-w-[52px] px-2.5 rounded-xl text-xs font-semibold border num-metric ${
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
          onClick={() => actions.setFrameConfig({ resolution: resolution === "high" ? "standard" : "high" })}
          className={`touch-target press shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold border ${
            resolution === "high" ? "border-accent bg-accent/15 text-accent" : "border-separator text-ink-3"
          }`}
        >
          {tr.frame.resolutions.high}
        </button>
      </div>

      <div className="flex flex-col gap-2 bg-surface-2/60 border border-separator rounded-2xl p-2.5">
        <div className="text-caption text-ink-3 uppercase font-semibold px-1">{tr.frame.type}</div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "polaroid" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "polaroid" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.types.polaroid}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "polaroid_square" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "polaroid_square" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.types.polaroid_square}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "polaroid_wide" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "polaroid_wide" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.types.polaroid_wide}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "matte" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "matte" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.types.matte}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "gradient", gradientMode: "adaptive" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 ${
              frameType === "gradient" && gradientMode === "adaptive" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {tr.frame.gradients.adaptive}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "gradient", gradientMode: "sunset" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "gradient" && gradientMode === "sunset" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.gradients.sunset}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "gradient", gradientMode: "deep" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "gradient" && gradientMode === "deep" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.gradients.deep}
          </button>
          <button
            type="button"
            onClick={() => actions.setFrameConfig({ frameType: "gradient", gradientMode: "subtle" })}
            className={`touch-target press min-h-[44px] px-2 rounded-lg text-xs font-medium border ${
              frameType === "gradient" && gradientMode === "subtle" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            {tr.frame.gradients.subtle}
          </button>
        </div>

        {frameType === "matte" && (
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-separator">
            <span className="text-caption text-ink-3">{tr.frame.types.matte}:</span>
            <div className="flex items-center gap-1.5 flex-1">
              {MATTE_OPTIONS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  title={p.label}
                  onClick={() => {
                    setCustomColor(p.color);
                    actions.setFrameConfig({ matteColor: p.color });
                  }}
                  className={`touch-target w-8 h-8 min-h-[44px] rounded-full border-2 transition-transform flex items-center justify-center ${
                    (matteColor || FRAME_MATTE_PRESETS.white) === p.color ? "scale-110 border-accent" : "border-separator"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                </button>
              ))}
              <label className="relative cursor-pointer ml-auto flex items-center gap-1 text-xs text-ink-2 touch-target min-h-[44px]">
                <Palette className="w-4 h-4 text-accent" />
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    actions.setFrameConfig({ matteColor: e.target.value });
                  }}
                  className="w-5 h-5 opacity-0 absolute pointer-events-none"
                />
                <span>{tr.frame.matteColors.custom}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ResettableSlider
          label={tr.frame.spacing}
          value={borderWidth}
          min={10}
          max={64}
          defaultValue={24}
          unit="px"
          onChange={(val) => actions.setFrameConfig({ borderWidth: val })}
        />
        <ResettableSlider
          label={tr.frame.corner}
          value={borderRadius}
          min={0}
          max={48}
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
      <div className="flex-1 min-w-0 flex items-center justify-between px-3 text-xs text-ink-2 bg-surface-2 rounded-xl h-11 border border-separator">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-accent" />
          <span>{state.items.length > 1 ? tr.frame.batchTitle(state.items.length) : tr.frame.singleTitle}</span>
        </div>
        <button
          type="button"
          onClick={() => actions.setFrameConfig({ showTimestamp: !showTimestamp })}
          aria-pressed={showTimestamp}
          className={`touch-target press min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
            showTimestamp ? "border-accent bg-accent/15 text-accent" : "border-separator text-ink-3"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {tr.frame.stamp}
        </button>
      </div>
    </div>
  );

  return (
    <StudioShell
      title={tr.frame.moduleTitle}
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto}
      stage={stage}
      stageToolbar={
        <StageNote>
          {`${state.items.length > 1 ? `[${currentIndex + 1}/${state.items.length}] ` : ""}${out.width} × ${out.height}`}
        </StageNote>
      }
      panel={panel}
      bar={bar}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={(files) => {
          const newItems = files.map((file, idx) => createStudioItem(file, state.items.length + idx));
          actions.addItems(newItems);
          actions.selectItem(newItems[0].id);
        }}
        maxSelect={13}
      />

      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_post_4_5"
        filePrefix="curate_frame"
        sizeLabel={`${out.width} × ${out.height}`}
        itemsToExport={itemsToExport}
      />
    </StudioShell>
  );
}
