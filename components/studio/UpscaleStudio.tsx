"use client";

import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, Sparkles, Cpu } from "lucide-react";
import {
  useStudio,
  getStudioSelection,
  calculateUpscaleSplitPos,
  createStudioItem,
  workerBridge,
  createExportCanvas,
  upscaleFactorAllowed,
  derivedLabel,
  AI_TASKS,
  AI_UPSCALE_MAX_SOURCE_EDGE,
  aiUpscaleAllowed,
  prepareAiInput,
  suspectRegionFromImages,
  registerUrl,
  revokeUrl,
  type AiTask,
  type SuspectRegion,
} from "@/lib";
import { tr } from "@/lib/i18n/tr";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { DerivedBadge } from "./NoticeToast";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { AiRepairSheet } from "./AiRepairSheet";
import { AiReviewScreen } from "./AiReviewScreen";

/** Image task A (lib/ai/config.ts): the only AI task Büyüt sends (D38) */
const AI_UPSCALE_TASK: AiTask = "A";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(tr.common.imageLoadFailed));
    img.src = src;
  });
}

/** AI result waiting on the review screen; nothing is kept until "Kullan" */
interface AiReview {
  url: string;
  width: number;
  height: number;
  sourceId: string;
  originalUrl: string;
  suspect: SuspectRegion | null;
}

interface UpscaleStudioProps {
  onBack: () => void;
}

export function UpscaleStudio({ onBack }: UpscaleStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);
  const { scaleFactor, mode } = state.upscaleConfig;
  const aiResult = selectedItem && state.upscaleAi?.sourceId === selectedItem.id ? state.upscaleAi : null;

  const [splitPos, setSplitPos] = useState<number>(50); // %0 - %100
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);

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

  // --- AI ile Büyüt (D38): the active photo's own pixels go to /api/ai only after the user taps the task row ---
  const prepareAiPixels = async (): Promise<Blob> => {
    if (!photoPath) throw new Error("No photo");
    return prepareAiInput(await loadImage(photoPath));
  };

  /** Opens the review screen; false when the result cannot be opened (the sheet says so) */
  const handleAiResult = async (_task: AiTask, blob: Blob): Promise<boolean> => {
    if (!selectedItem || !photoPath) return false;
    const originalUrl = selectedItem.proxyUrl || photoPath;
    const url = registerUrl(URL.createObjectURL(blob));
    try {
      const img = await loadImage(url);
      let suspect: SuspectRegion | null = null;
      try {
        suspect = suspectRegionFromImages(await loadImage(originalUrl), img);
      } catch {
        suspect = null;
      }
      setIsAiOpen(false);
      setAiReview({ url, width: img.naturalWidth, height: img.naturalHeight, sourceId: selectedItem.id, originalUrl, suspect });
      return true;
    } catch {
      revokeUrl(url);
      return false;
    }
  };

  const discardAiReview = () => {
    if (aiReview) revokeUrl(aiReview.url);
    setAiReview(null);
  };

  const acceptAiReview = () => {
    if (!aiReview) return;
    const { url, width, height, sourceId } = aiReview;
    actions.setUpscaleAi({ sourceId, url, width, height });
    actions.setUpscaleMode("ai");
    setAiReview(null);
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

  const w = selectedItem?.dimensions.width || 0;
  const h = selectedItem?.dimensions.height || 0;
  const targetW = w * scaleFactor;
  const targetH = h * scaleFactor;
  const badge = derivedLabel(selectedItem?.derivedBy);
  const aiAllowed = selectedItem ? aiUpscaleAllowed(w, h) : false;
  const aiTask = AI_TASKS[AI_UPSCALE_TASK];
  const showAi = mode === "ai" && !!aiResult;

  const renderExportCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!photoPath) throw new Error("No photo to export");
    // AI mode: the model output is fitted to the chosen target in one resample; no Lanczos after it (D38)
    if (mode === "ai") {
      if (!aiResult) throw new Error("No AI result");
      const img = await loadImage(aiResult.url);
      const { canvas, ctx } = createExportCanvas(targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);
      return canvas;
    }

    const img = await loadImage(photoPath);
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

  const stage = (
    <div
      ref={containerRef}
      data-stage
      tabIndex={0}
      role="slider"
      aria-label={tr.upscale.divider}
      aria-valuenow={splitPos}
      aria-valuemin={0}
      aria-valuemax={100}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSplitPos((p) => Math.max(0, p - 5));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSplitPos((p) => Math.min(100, p + 5));
        }
      }}
      className="relative w-full h-full flex items-center justify-center overflow-hidden outline-none cursor-ew-resize select-none"
    >
      {hasPhoto && photoPath ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showAi && aiResult ? aiResult.url : photoPath}
            alt={showAi ? tr.upscale.aiResultAlt : tr.upscale.upscaledNote}
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
              if (!aiResult && aiAllowed) setIsAiOpen(true);
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

      {mode === "ai" && hasPhoto && (
        <div data-ai-upscale-row className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-2 num-metric min-w-0">
            {aiResult
              ? tr.upscale.aiReady(aiResult.width, aiResult.height)
              : aiAllowed
                ? tr.upscale.aiCostNote(aiTask.estSeconds, aiTask.costTry)
                : tr.upscale.aiTooLarge(AI_UPSCALE_MAX_SOURCE_EDGE)}
          </p>
          {aiAllowed && (
            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className={`touch-target press shrink-0 min-h-[44px] px-4 rounded-xl text-xs font-bold ${
                aiResult ? "bg-surface-2 text-ink-1 border border-separator" : "bg-accent-fill text-on-accent"
              }`}
            >
              {aiResult ? tr.upscale.aiRerun : tr.upscale.aiRun}
            </button>
          )}
        </div>
      )}

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
      </div>
    </div>
  );

  return (
    <StudioShell
      title={tr.upscale.moduleTitle}
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto || (mode === "ai" && !aiResult)}
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

      <AiRepairSheet
        open={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        title={tr.upscale.aiTitle}
        tasks={[AI_UPSCALE_TASK]}
        hint={tr.upscale.aiSheetHint}
        size={selectedItem ? { w, h } : null}
        prepareInput={prepareAiPixels}
        onResult={handleAiResult}
      />

      {aiReview && (
        <AiReviewScreen
          resultUrl={aiReview.url}
          originalUrl={aiReview.originalUrl}
          width={aiReview.width}
          height={aiReview.height}
          taskLabel={tr.upscale.aiReviewLabel(aiReview.width, aiReview.height)}
          suspect={aiReview.suspect}
          onUse={acceptAiReview}
          onDiscard={discardAiReview}
        />
      )}

      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="original"
        filePrefix="curate_upscale"
        sizeLabel={`${targetW} × ${targetH} (${scaleFactor}X)`}
        itemsToExport={hasPhoto ? [{ id: "upscale_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
