"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Wand2, Sparkles, Send, Loader2, Download, Eye, RotateCcw } from "lucide-react";
import {
  useStudio,
  getStudioSelection,
  createStudioItem,
  createExportCanvas,
  type AiLightPlan,
  extractImageTechnicalSchema,
  type ImageTechnicalSchema,
  interpretImageSemantics,
  generateIntelligentRepairPlan,
  resolveRepairTemplate,
  isRepairTemplateKey,
  REPAIR_STYLE_BY_TEMPLATE,
  templateFromDirective,
  schemaForAi,
  applyPlanInStrips,
  requestAiPlan,
  type AiPlanStyle,
  type AiRepairContext,
} from "@/lib";
import { tr } from "@/lib/i18n/tr";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { QuickExportSheet } from "./QuickExportSheet";

interface EditStudioProps {
  onBack: () => void;
  onOpenModule: (module: "edit" | "upscale" | "frame") => void;
}

const QUICK_DIRECTIVE_KEYS = [
  { key: "blownLight", label: tr.edit.directives.blownLight.title, prompt: tr.edit.directives.blownLight.text },
  { key: "illuminateSubject", label: tr.edit.directives.illuminateSubject.title, prompt: tr.edit.directives.illuminateSubject.text },
  { key: "dehaze", label: tr.edit.directives.dehaze.title, prompt: tr.edit.directives.dehaze.text },
  { key: "neutralizeColor", label: tr.edit.directives.neutralizeColor.title, prompt: tr.edit.directives.neutralizeColor.text },
  { key: "nightClarity", label: tr.edit.directives.nightClarity.title, prompt: tr.edit.directives.nightClarity.text },
];

export function EditStudio({ onBack }: EditStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: item, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);

  const [promptText, setPromptText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<AiLightPlan | null>(null);
  const [schema, setSchema] = useState<ImageTechnicalSchema | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Görsel yüklendiğinde matematiksel teknik şemayı anında çıkar
  useEffect(() => {
    setProcessedUrl(null);
    setCurrentPlan(null);
    setStatusMessage(null);
    setSchema(null);

    if (!photoPath) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const s = extractImageTechnicalSchema(img);
      setSchema(s);
    };
    img.src = photoPath;
  }, [item?.id, photoPath]);

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

  // İki Aşamalı Akıllı AI Onarım Pipeline
  const handleApplyAiRepair = async (templateKey?: string, customPrompt?: string) => {
    const textToUse = customPrompt !== undefined ? customPrompt : promptText;
    if (!photoPath || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(tr.edit.stage1Interpret);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
        img.src = photoPath;
      });

      // 1. Aşama: Matematiksel Teknik Şema (Mevcut değilse hesapla)
      const currentSchema = schema || extractImageTechnicalSchema(img);
      if (!schema) setSchema(currentSchema);

      const effectiveTemplate = resolveRepairTemplate(currentSchema, templateKey, textToUse);
      const style: AiPlanStyle =
        templateKey && isRepairTemplateKey(templateKey)
          ? REPAIR_STYLE_BY_TEMPLATE[templateKey]
          : (templateFromDirective(textToUse)
              ? REPAIR_STYLE_BY_TEMPLATE[templateFromDirective(textToUse)!]
              : (textToUse?.trim() ? "repair_auto" : REPAIR_STYLE_BY_TEMPLATE[effectiveTemplate]));

      setStatusMessage(tr.edit.stage2Optimize);

      // 2. Aşama: Görsel Yorumlayıcı Model (Interpreter) — Önce Vertex AI Proxy
      let plan: AiLightPlan | null = null;
      try {
        const aiContext: AiRepairContext = {
          directive: textToUse?.trim() || undefined,
          schema: schemaForAi(currentSchema),
        };
        const aiRes = await requestAiPlan(style, img, undefined, fetch, aiContext);
        if (aiRes.ok && aiRes.record?.plan) {
          plan = aiRes.record.plan;
        }
      } catch {
        // Model bağlantısı yoksa veya başarısız olursa sezgisel yedek motora geç
      }

      // Model yoksa veya çevrimdışıysa akıllı yerel optimizasyon fallback'i
      if (!plan) {
        const interpretation = interpretImageSemantics(currentSchema, templateKey, textToUse);
        plan = generateIntelligentRepairPlan(currentSchema, interpretation, templateKey, textToUse);
      }

      // 3. Aşama: Curate Yerel Piksel Motoru ile Kayıpsız Uygulama (Strip processing)
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context");

      ctx.drawImage(img, 0, 0);
      applyPlanInStrips(ctx, canvas.width, canvas.height, plan, 1.0);

      const resultDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setProcessedUrl(resultDataUrl);
      setCurrentPlan(plan);
      setStatusMessage(tr.edit.successMsg);
    } catch {
      setStatusMessage(tr.edit.errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderExportCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    if (!photoPath) throw new Error("No photo to export");

    const img = new Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = rej;
      img.src = photoPath;
    });

    const { canvas, ctx } = createExportCanvas(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);

    if (currentPlan) {
      applyPlanInStrips(ctx, canvas.width, canvas.height, currentPlan, 1.0);
    }

    return canvas;
  }, [currentPlan, photoPath]);

  const stage = (
    <div
      data-stage
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      onPointerDown={() => processedUrl && setIsHoldingOriginal(true)}
      onPointerUp={() => setIsHoldingOriginal(false)}
      onPointerLeave={() => setIsHoldingOriginal(false)}
    >
      {hasPhoto && photoPath ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isHoldingOriginal || !processedUrl ? photoPath : processedUrl}
            alt={tr.common.original}
            className="max-w-full max-h-full object-contain pointer-events-none transition-opacity duration-150"
          />

          {processedUrl && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur border border-white/10 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5 text-accent" />
              <span>{isHoldingOriginal ? tr.edit.beforeLabel : tr.edit.afterLabel}</span>
              <span className="text-xs text-ink-3 ml-1">· {tr.edit.holdToCompare}</span>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-sm font-semibold text-white">{statusMessage || tr.edit.analyzing}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full rounded-xl border border-separator bg-base flex flex-col items-center justify-center p-4 text-center text-ink-3 gap-1">
          <Wand2 className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">{tr.edit.empty}</span>
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
    <div className="flex flex-col gap-3 p-3 max-h-[40dvh] overflow-y-auto hide-scrollbar">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="ai-prompt-input" className="text-caption text-ink-3 uppercase font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            {tr.edit.promptTitle}
          </label>
          {processedUrl && (
            <button
              type="button"
              onClick={() => {
                setProcessedUrl(null);
                setCurrentPlan(null);
                setStatusMessage(null);
              }}
              className="touch-target text-xs text-ink-3 hover:text-ink-1 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {tr.edit.reset}
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <input
            id="ai-prompt-input"
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleApplyAiRepair(undefined, promptText);
              }
            }}
            placeholder={tr.edit.promptPlaceholder}
            className="w-full h-12 pl-3.5 pr-12 bg-surface-2 border border-separator rounded-xl text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={!hasPhoto || !promptText.trim() || isProcessing}
            onClick={() => handleApplyAiRepair(undefined, promptText)}
            className="touch-target absolute right-1.5 w-11 h-11 rounded-lg bg-accent-fill text-on-accent flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-transform press"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-caption text-ink-3 px-1">{tr.edit.quickDirectives}</span>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {QUICK_DIRECTIVE_KEYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                setPromptText(d.prompt);
                handleApplyAiRepair(d.key, d.prompt);
              }}
              className={`touch-target press shrink-0 min-h-[44px] px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                schema?.suggestedTemplateKey === d.key
                  ? "bg-accent/15 border-accent text-accent font-semibold"
                  : "bg-surface-2 border-separator text-ink-2 hover:text-ink-1 hover:border-accent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="px-3 py-2 rounded-lg bg-surface-2/40 border border-separator text-xs text-ink-2 flex items-center justify-between">
          <span>{statusMessage}</span>
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
      <div className="flex-1 min-w-0 flex items-center justify-between px-3 text-xs text-ink-2 bg-surface-2 rounded-xl h-11 border border-separator">
        <span className="truncate">
          {processedUrl ? tr.edit.readyExport : tr.edit.waitingDirective}
        </span>
        {processedUrl && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="touch-target press min-h-[44px] px-3 py-1.5 rounded-lg bg-accent-fill text-on-accent text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {tr.edit.download}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <StudioShell
      title={tr.edit.title}
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto || isProcessing}
      stage={stage}
      stageToolbar={
        <StageNote>
          {item ? `${item.dimensions.width} × ${item.dimensions.height}` : ""}
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
        filePrefix="curate_ai_repair"
        sizeLabel={`${item?.dimensions.width || 0} × ${item?.dimensions.height || 0}`}
        itemsToExport={hasPhoto ? [{ id: "repair_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
