"use client";

import React, { useState } from "react";
import { X, Download, ShieldCheck, RefreshCw, FileArchive, Check } from "lucide-react";
import { ExportPlatform, PLATFORM_SPECS, packageDumpZip, downloadBlob, sanitizeImageBlob } from "@/lib";

interface QuickExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  platform: ExportPlatform;
  itemsToExport: { id: string; name?: string; getBlob: (format: "jpeg" | "png") => Promise<Blob>; order: number }[];
}

export function QuickExportSheet({
  isOpen,
  onClose,
  platform,
  itemsToExport,
}: QuickExportSheetProps) {
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [isExporting, setIsExporting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");

  if (!isOpen) return null;

  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.ig_post_4_5;

  const handleDownload = async () => {
    if (itemsToExport.length === 0) return;
    setIsExporting(true);
    setProgressStatus("Piksel blokları hazırlanıyor...");

    try {
      const exportableItems = [];
      for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i];
        setProgressStatus(`İşleniyor (${i + 1}/${itemsToExport.length})...`);
        const rawBlob = await item.getBlob(format);
        const cleanBlob = await sanitizeImageBlob(rawBlob);
        exportableItems.push({
          id: item.id,
          name: item.name,
          blob: cleanBlob,
          order: item.order,
        });
      }

      const zipBlob = await packageDumpZip(
        exportableItems,
        "dump",
        (p) => setProgressStatus(p.status)
      );

      downloadBlob(zipBlob, `curate_${platform}_${format}_archive.zip`);
      setTimeout(() => {
        setIsExporting(false);
        setProgressStatus("");
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Export failed", err);
      setIsExporting(false);
      setProgressStatus("Dışa aktarma hatası oluştu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-t-sheet sm:rounded-sheet glass-panel p-6 border border-white/10 shadow-2xl animate-sheet-slide-up flex flex-col gap-5"
      >
        {/* Başlık ve Kapat */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#f5a623]/20 text-[#f5a623] flex items-center justify-center">
              <FileArchive className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#f5f5f7]">Quick Export Sheet</span>
              <span className="text-[11px] text-[#71717a]">Zero-Waste Platform Standartları</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#71717a] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Çözünürlük Özeti */}
        <div className="p-3.5 rounded-lg bg-[#18181b]/80 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a1a1aa]">Hedef Platform:</span>
            <span className="font-medium text-[#f5f5f7]">{spec.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a1a1aa]">Kilitli Çözünürlük:</span>
            <span className="font-mono text-emerald-400 font-medium">
              {spec.width > 0 ? `${spec.width} × ${spec.height} px (${spec.aspectRatio})` : "Orijinal"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a1a1aa]">Görsel Sayısı:</span>
            <span className="font-mono text-[#f5f5f7]">{itemsToExport.length} Kare</span>
          </div>
        </div>

        {/* Format Seçimi */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[#a1a1aa]">Format & Sıkıştırma:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat("jpeg")}
              className={`p-3 rounded-md border text-left flex flex-col gap-1 transition-all ${
                format === "jpeg" 
                  ? "border-[#f5a623] bg-[#f5a623]/10" 
                  : "border-white/5 bg-[#18181b]/60 hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#f5f5f7]">
                <span>JPEG (%92 Optimize)</span>
                {format === "jpeg" && <Check className="w-3.5 h-3.5 text-[#f5a623]" />}
              </div>
              <span className="text-[10px] text-[#71717a]">
                Meta sıkıştırma algoritmasını tetiklemeyen standart
              </span>
            </button>

            <button
              onClick={() => setFormat("png")}
              className={`p-3 rounded-md border text-left flex flex-col gap-1 transition-all ${
                format === "png" 
                  ? "border-[#f5a623] bg-[#f5a623]/10" 
                  : "border-white/5 bg-[#18181b]/60 hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#f5f5f7]">
                <span>PNG (Kayıpsız)</span>
                {format === "png" && <Check className="w-3.5 h-3.5 text-[#f5a623]" />}
              </div>
              <span className="text-[10px] text-[#71717a]">
                Maksimum piksel sadakati, büyük dosya boyutu
              </span>
            </button>
          </div>
        </div>

        {/* EXIF Gizlilik Garantisi */}
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>GPS ve cihaz EXIF verileri otomatik olarak sıfırlanır.</span>
        </div>

        {/* İlerleme ve İndir Butonu */}
        <div className="flex flex-col gap-2 pt-2">
          {progressStatus && (
            <span className="text-xs font-mono text-[#f5a623] text-center">
              {progressStatus}
            </span>
          )}

          <button
            onClick={handleDownload}
            disabled={isExporting || itemsToExport.length === 0}
            className="w-full py-3 rounded-md bg-[#f5a623] hover:bg-[#ffbc3c] text-black font-semibold text-xs transition-all shadow-[0_0_24px_rgba(245,166,35,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Paketleniyor..." : `İndir (.zip) — ${itemsToExport.length} Fotoğraf`}
          </button>
        </div>
      </div>
    </div>
  );
}
