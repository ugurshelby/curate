"use client";

import { tr } from "@/lib/i18n/tr";
import React, { useEffect, useState } from "react";
import { X, Download, RefreshCw, ChevronDown, Check } from "lucide-react";
import {
  ExportPlatform,
  PLATFORM_SPECS,
  packageDumpZip,
  downloadBlob,
  sanitizeImageBlob,
  ExportFormat,
  mimeForFormat,
  planExportDownload,
  encodeWithinLimit,
  canvasToBlob,
  formatBytes,
} from "@/lib";

export interface ExportSheetItem {
  id: string;
  order: number;
  /** Export tuvalini üretir (sRGB, hedef boyutta). Kodlama ve kalite sınırı bu sayfada. */
  renderCanvas: () => Promise<HTMLCanvasElement>;
}

interface QuickExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  platform: ExportPlatform;
  itemsToExport: ExportSheetItem[];
  /** Dosya adı öneki; verilmezse platformun öneki (dump, tiktok, story) */
  filePrefix?: string;
  /** Upscale gibi değişken boyutlarda gösterilecek hedef boyut */
  sizeLabel?: string;
}

interface ExportResult {
  fileName: string;
  bytes: number;
  quality: number | null;
  reduced: boolean;
  overLimit: boolean;
}

/**
 * Dışa aktarma sayfası (spec §4.4 S-b): tek görsel doğrudan dosya, çoklu Carousel serisi zip.
 * Varsayılan JPEG %97; dosya platform sınırını (8 MB) aşarsa kalite kademeli düşer ve burada gösterilir.
 */
export function QuickExportSheet({
  isOpen,
  onClose,
  platform,
  itemsToExport,
  filePrefix,
  sizeLabel,
}: QuickExportSheetProps) {
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExportResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError("");
      setProgress("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.ig_post_4_5;
  const prefix = filePrefix ?? spec.filePrefix;
  const count = itemsToExport.length;
  const targetLabel = sizeLabel ?? `${spec.width} × ${spec.height} (${spec.aspectRatio})`;
  const plan = count > 0 ? planExportDownload(count, prefix, format) : null;

  const handleDownload = async () => {
    if (!plan) return;
    setIsExporting(true);
    setError("");
    setResult(null);
    const mime = mimeForFormat(format);

    try {
      const sorted = [...itemsToExport].sort((a, b) => a.order - b.order);
      const encoded: { id: string; blob: Blob; order: number; quality: number | null; reduced: boolean; overLimit: boolean }[] = [];
      for (let i = 0; i < sorted.length; i++) {
        setProgress(count > 1 ? tr.export.preparingN(i + 1, count) : tr.common.preparing);
        const canvas = await sorted[i].renderCanvas();
        const out = await encodeWithinLimit((q) => canvasToBlob(canvas, mime, q), format, spec.maxBytes);
        const clean = await sanitizeImageBlob(out.blob);
        encoded.push({ id: sorted[i].id, blob: clean, order: i, quality: out.quality, reduced: out.reduced, overLimit: out.overLimit });
      }

      const lowestQuality = encoded.reduce<number | null>(
        (min, e) => (e.quality === null ? min : min === null ? e.quality : Math.min(min, e.quality)),
        null
      );
      const summary = {
        quality: lowestQuality,
        reduced: encoded.some((e) => e.reduced),
        overLimit: encoded.some((e) => e.overLimit),
      };

      if (plan.kind === "single") {
        downloadBlob(encoded[0].blob, plan.fileName);
        setResult({ fileName: plan.fileName, bytes: encoded[0].blob.size, ...summary });
      } else {
        setProgress(tr.export.zipping);
        const zip = await packageDumpZip(encoded, prefix);
        downloadBlob(zip, plan.zipName);
        setResult({ fileName: plan.zipName, bytes: zip.size, ...summary });
      }
    } catch (err) {
      console.error("Export failed", err);
      setError(tr.export.failed);
    } finally {
      setIsExporting(false);
      setProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-base/70 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr.export.title}
        className="w-full max-w-lg rounded-t-sheet sm:rounded-sheet bg-surface p-5 pb-[calc(var(--safe-area-bottom)+20px)] border border-separator shadow-2xl animate-panel-in flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-ink-1">{tr.export.title}</span>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            aria-label={tr.common.close}
            className="touch-target press rounded-full text-ink-2 hover:text-ink-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="rounded-xl bg-surface-2 border border-separator divide-y divide-separator text-sm">
          <div className="flex items-center justify-between gap-3 px-3 h-11">
            <dt className="text-ink-2">{tr.export.target}</dt>
            <dd className="text-ink-1 num-metric truncate">
              {spec.name} · {targetLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 h-11">
            <dt className="text-ink-2">{tr.export.count}</dt>
            <dd className="text-ink-1 num-metric">{count}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 h-11">
            <dt className="text-ink-2">{tr.export.file}</dt>
            <dd className="text-ink-1 num-metric truncate">
              {plan ? (plan.kind === "single" ? plan.fileName : `${plan.zipName} (${count} dosya)`) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 h-11">
            <dt className="text-ink-2">{tr.export.quality}</dt>
            <dd className="text-ink-1 num-metric">
              {format === "png" ? tr.export.png : tr.export.jpeg(spec.quality)}
            </dd>
          </div>
        </dl>

        {!spec.verified && (
          <p className="text-xs text-ink-2">
            {spec.name} boyutu ({spec.width} × {spec.height}) telefonda henüz doğrulanmadı.
          </p>
        )}

        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((v) => !v)}
            aria-expanded={isAdvancedOpen}
            className="h-11 flex items-center justify-between text-sm text-ink-2"
          >
            <span>{tr.common.advanced}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAdvancedOpen ? "rotate-180" : ""}`} />
          </button>
          {isAdvancedOpen && (
            <div role="radiogroup" aria-label={tr.export.format} className="flex p-0.5 rounded-xl bg-surface-2 border border-separator animate-panel-in">
              {(["jpeg", "png"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={format === f}
                  onClick={() => setFormat(f)}
                  className={`press flex-1 h-11 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-1.5 ${
                    format === f ? "bg-accent-fill text-on-accent" : "text-ink-2"
                  }`}
                >
                  {format === f && <Check className="w-4 h-4" />}
                  {f === "jpeg" ? "JPEG" : "PNG"}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-ink-3">{tr.export.privacy}</p>

        {result && (
          <div role="status" className="rounded-xl bg-surface-2 border border-separator px-3 py-2 text-sm text-ink-1 flex flex-col gap-0.5">
            <span className="num-metric break-all">
              {tr.export.done(result.fileName, formatBytes(result.bytes))}
            </span>
            {result.reduced && result.quality !== null && (
              <span className="text-xs text-ink-2 num-metric">
                {tr.export.reduced(result.quality)}
              </span>
            )}
            {result.overLimit && (
              <span className="text-xs text-ink-1">{tr.export.overLimit}</span>
            )}
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          onClick={result ? onClose : handleDownload}
          disabled={isExporting || count === 0}
          className="touch-target press w-full h-12 rounded-xl bg-accent-fill text-on-accent font-semibold text-sm flex items-center justify-center gap-2"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : !result && <Download className="w-4 h-4" />}
          <span className="num-metric">
            {isExporting ? progress || tr.common.preparing : result ? tr.common.done : count > 1 ? tr.export.downloadZip(count) : tr.export.download}
          </span>
        </button>
      </div>
    </div>
  );
}
