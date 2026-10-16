"use client";

import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, Sparkles, Cpu, Loader2 } from "lucide-react";
import { 
  useStudio, 
  getStudioSelection, 
  calculateUpscaleSplitPos, 
  createStudioItem,
  workerBridge,
  createExportCanvas,
  upscaleFactorAllowed,
  derivedLabel,
} from "@/lib";
import { tr } from "@/lib/i18n/tr";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { DerivedBadge } from "./NoticeToast";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";

interface UpscaleStudioProps {
  onBack: () => void;
}

export function UpscaleStudio({ onBack }: UpscaleStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);
  const { scaleFactor, mode } = state.upscaleConfig;

  const [splitPos, setSplitPos] = useState<number>(50); // %0 - %100
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedItem) return;
    const { width, height } = selectedItem.dimensions;
    if (!upscaleFactorAllowed(width, height, scaleFactor) && scaleFactor === 4 && upscaleFactorAllowed(width, height, 2)) {
      actions.setUpscaleScale(2);
    }
  }, [selectedItem, scaleFactor, actions]);

  const addSingleFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const newItem = createStudioItem(file, state.items.length);
    actions.addItems([newItem]);
    actions.selectItem(newItem.id);
    setAiPreviewUrl(null);
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

  const handleRunAiUpscale = async () => {
    if (!photoPath || isAiProcessing) return;
    setIsAiProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
        img.src = photoPath;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          const factor = luma > 128 ? 1.05 : 0.95;
          data[i] = Math.min(255, Math.max(0, data[i] * factor));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor));
        }
        ctx.putImageData(imgData, 0, 0);
        setAiPreviewUrl(canvas.toDataURL("image/jpeg", 0.92));
      }
    } catch {
      // Hata durumunda standart mod devam eder
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSplitPos(calculateUpscaleSplitPos(e.clientX, rect.left, rect.width));
  };

  const handleDividerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSplitPos(calculateUpscaleSplitPos(e.clientX, rect.left, rect.width));
  };

  const handleDividerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const renderExportCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!photoPath) throw new Error("No photo to export");
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(tr.common.imageLoadFailed));
      img.src = mode === "ai" && aiPreviewUrl ? aiPreviewUrl : photoPath;
    });

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const srcData = ctx.getImageData(0, 0, c.width, c.height);
    const upscaledData = await workerBridge.upscaleLanczos(srcData, scaleFactor);

    const { canvas: outC, ctx: outCtx } = createExportCanvas(upscaledData.width, upscaledData.height);
    outCtx.putImageData(upscaledData, 0, 0);
    return outC;
  };

  const w = selectedItem?.dimensions.width || 0;
  const h = selectedItem?.dimensions.height || 0;
  const targetW = w * scaleFactor;
  const targetH = h * scaleFactor;
  const badge = derivedLabel(selectedItem?.derivedBy);

  const stage = (
    <div
      ref={containerRef}
      data-stage
      tabIndex={0}
      className="relative w-full h-full flex items-center justify-center overflow-hidden outline-none cursor-ew-resize select-none"
    >
      {hasPhoto && photoPath ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mode === "ai" && aiPreviewUrl ? aiPreviewUrl : photoPath}
            alt={tr.upscale.upscaledNote}
            className="absolute max-w-full max-h-full object-contain pointer-events-none"
            style={{
              clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPath}
            alt={tr.upscale.originalNote}
            className="absolute max-w-full max-h-full object-contain pointer-events-none"
            style={{
              clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
            }}
          />

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-auto"
            style={{ left: `${splitPos}%` }}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-black/80 border-2 border-white flex items-center justify-center text-xs text-white font-bold shadow-md">
              ◀ ▶
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full rounded-xl border border-separator bg-base flex flex-col items-center justify-center p-4 text-center text-ink-3 gap-1">
          <ZoomIn className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">{tr.upscale.loadPhoto}</span>
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
      <div className="flex flex-col gap-2">
        <div className="text-caption text-ink-3 uppercase font-semibold px-1">{tr.upscale.engineTitle}</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => actions.setUpscaleMode("standard")}
            className={`touch-target press min-h-[44px] h-12 px-3 rounded-xl border flex items-center gap-2.5 text-left ${
              mode === "standard" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            <Cpu className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">{tr.upscale.standardTitle}</span>
              <span className="text-xs opacity-80">{tr.upscale.standardDesc}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              actions.setUpscaleMode("ai");
              if (!aiPreviewUrl) handleRunAiUpscale();
            }}
            className={`touch-target press min-h-[44px] h-12 px-3 rounded-xl border flex items-center gap-2.5 text-left ${
              mode === "ai" ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">{tr.upscale.aiTitle}</span>
              <span className="text-xs opacity-80">{tr.upscale.aiDesc}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-xs text-ink-2 flex items-center gap-2">
          <span>{tr.export.target}:</span>
          <span className="font-semibold text-white num-metric">{targetW} × {targetH} px</span>
        </div>

        <div className="flex gap-2">
          {[2, 4].map((f) => {
            const factor = f as 2 | 4;
            const allowed = selectedItem ? upscaleFactorAllowed(w, h, factor) : true;
            return (
              <button
                key={factor}
                type="button"
                disabled={!allowed}
                onClick={() => actions.setUpscaleScale(factor)}
                className={`touch-target press min-h-[44px] px-4 rounded-xl text-xs font-bold border disabled:opacity-30 ${
                  scaleFactor === factor ? "bg-accent-fill text-on-accent border-accent-fill" : "bg-surface-2 text-ink-2 border-separator"
                }`}
              >
                {factor}X
              </button>
            );
          })}
        </div>
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
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>{mode === "ai" ? tr.upscale.aiTag : tr.upscale.standardTag}</span>
        </div>
        {isAiProcessing && (
          <div className="flex items-center gap-1.5 text-accent text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{tr.upscale.processing}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <StudioShell
      title={tr.upscale.moduleTitle}
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto || isAiProcessing}
      stage={stage}
      stageToolbar={
        <StageNote>
          {badge && <DerivedBadge label={badge} />}
          {`${w}×${h} ➔ ${targetW}×${targetH} (${scaleFactor}X)`}
        </StageNote>
      }
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

      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="edit"
        filePrefix="curate_upscale"
        sizeLabel={`${targetW} × ${targetH} (${scaleFactor}X)`}
        itemsToExport={hasPhoto ? [{ id: "upscale_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
