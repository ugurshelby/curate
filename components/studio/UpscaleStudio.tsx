"use client";

import React, { useState, useRef } from "react";
import { ZoomIn } from "lucide-react";
import { 
  useStudio, 
  getStudioSelection, 
  calculateUpscaleSplitPos, 
  stepUpscaleSplitPos,
  createStudioItem,
  workerBridge
} from "@/lib";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";

interface UpscaleStudioProps {
  onBack: () => void;
}

export function UpscaleStudio({ onBack }: UpscaleStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);
  const scaleFactor = state.upscaleConfig.scaleFactor;

  const [splitPos, setSplitPos] = useState<number>(50); // %0 - %100
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fotoğraf Yükleme
  // Upscale tek görsel çalışır: eklenen görsel kütüphaneye girer ve seçilir
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
    if (window.confirm("Tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
  };

  // Split view slider: Pointer capture ve dokunmatik desteği
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

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSplitPos(calculateUpscaleSplitPos(e.clientX, rect.left, rect.width));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setSplitPos((curr) => stepUpscaleSplitPos(curr, "left"));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setSplitPos((curr) => stepUpscaleSplitPos(curr, "right"));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSplitPos((curr) => stepUpscaleSplitPos(curr, "home"));
    } else if (e.key === "End") {
      e.preventDefault();
      setSplitPos((curr) => stepUpscaleSplitPos(curr, "end"));
    }
  };

  const getExportBlob = async (format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    if (!photoPath) throw new Error("No photo to export");
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    await new Promise((res) => { img.onload = res; });

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const srcData = ctx.getImageData(0, 0, c.width, c.height);
    const upscaledData = await workerBridge.upscaleLanczos(srcData, scaleFactor);

    const outC = document.createElement("canvas");
    outC.width = upscaledData.width;
    outC.height = upscaledData.height;
    const outCtx = outC.getContext("2d")!;
    outCtx.putImageData(upscaledData, 0, 0);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((res) => {
      outC.toBlob(
        (b) => res(b!),
        mimeType,
        mimeType === "image/jpeg" ? 0.94 : undefined
      );
    });
  };

  const outW = selectedItem ? selectedItem.dimensions.width * scaleFactor : 0;
  const outH = selectedItem ? selectedItem.dimensions.height * scaleFactor : 0;

  const stage = (
    <div
      ref={containerRef}
      data-stage
      className="relative aspect-[4/5] w-[min(100cqw,calc(100cqh*4/5))] rounded-xl overflow-hidden border border-white/10 bg-[#0f0f11] cursor-ew-resize select-none"
      onPointerDown={hasPhoto ? handleContainerPointerDown : undefined}
      style={{ touchAction: "none" }}
    >
      {hasPhoto && photoPath ? (
        <>
          {/* Alttaki Katman: Orijinal */}
          <div className="absolute inset-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPath} alt="" draggable={false} className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-xs bg-black/75 px-2 py-0.5 rounded text-[#a1a1aa] pointer-events-none">
              1x orijinal
            </span>
          </div>

          {/* Üstteki Katman: kontrast simülasyonu (Lanczos değil; export'ta gerçek Lanczos-3) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPath}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              style={{ filter: "contrast(1.04) brightness(1.02)" }}
            />
            <span className="absolute bottom-2 right-2 text-xs bg-black/75 px-2 py-0.5 rounded text-[#f5a623] pointer-events-none">
              Önizleme kontrast ({scaleFactor}x)
            </span>
          </div>

          {/* Bölücü Çizgi ve Kulakçık (Erişilebilir Slider) */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Öncesi / Sonrası Karşılaştırma Bölücüsü"
            aria-valuenow={splitPos}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`%${splitPos}`}
            onKeyDown={handleKeyDown}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            onPointerCancel={handleDividerPointerUp}
            className="absolute top-0 bottom-0 z-30 w-11 -ml-[22px] flex items-center justify-center cursor-ew-resize outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] select-none"
            style={{ left: `${splitPos}%`, touchAction: "none" }}
          >
            <div className="w-[2px] h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none" />
            <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center text-black text-sm font-bold select-none pointer-events-none">
              ↔
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-[#71717a] gap-1 p-4">
          <ZoomIn className="w-8 h-8 text-[#3f3f46]" />
          <span className="text-sm">Büyütülecek fotoğraf henüz seçilmedi</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 text-sm text-[#f5a623]"
          >
            Fotoğraf Yükle
          </button>
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
      <span className="ml-auto text-sm text-[#a1a1aa]">Büyütme</span>
      <div role="radiogroup" aria-label="Büyütme oranı" className="flex p-0.5 rounded-xl bg-white/5 border border-white/10">
        {([2, 4] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={scaleFactor === f}
            onClick={() => actions.setUpscaleScale(f)}
            className={`press w-14 h-11 rounded-[10px] text-sm num-metric ${
              scaleFactor === f ? "bg-[#f5a623] text-black font-semibold" : "text-[#a1a1aa]"
            }`}
          >
            {f}x
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <StudioShell
      title="Kayıpsız Upscale"
      onBack={onBack}
      exportLabel={`Export ${scaleFactor}x`}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto}
      stage={stage}
      stageToolbar={hasPhoto ? <StageNote>Çıktı {outW} × {outH} · Lanczos-3</StageNote> : undefined}
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
        platform="original"
        itemsToExport={[{
          id: "upscale_1",
          name: `upscaled_${scaleFactor}x`,
          order: 0,
          getBlob: (fmt) => getExportBlob(fmt),
        }]}
      />
    </StudioShell>
  );
}
