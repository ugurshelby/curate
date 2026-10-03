"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar, Crop } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { extractAdaptiveGradient, AdaptiveGradientResult, useStudio, getStudioSelection, createStudioItem } from "@/lib";

interface FrameStudioProps {
  onBack: () => void;
}

export function FrameStudio({ onBack }: FrameStudioProps) {
  const { state, actions } = useStudio();
  const { hasPhoto, selectedItem: activeItem, photoUrl: photoPath } = getStudioSelection(state.items, state.selectedItemId);

  const { frameType, borderWidth, borderRadius, showTimestamp } = state.frameConfig;
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Günün analog tarih formatı: '26 10 01
  const getTodayStamp = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `'${yy} ${mm} ${dd}`;
  };

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
    if (window.confirm("Tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
  };

  // Görsel yüklendiğinde gradyan çıkar
  useEffect(() => {
    if (!photoPath) {
      setAdaptiveGradient(null);
      return;
    }
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        setAdaptiveGradient(extractAdaptiveGradient(data));
      }
    };
  }, [photoPath]);

  // Helper: Yuvarlatılmış dikdörtgen çizici
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
  };

  // Dışa aktarma blobu — Tam 1080x1350 Çözünürlükte Zemin + İç Fotoğraf + Analog Tarih Damgası
  const getExportBlob = async (format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context failed");
    if (!photoPath) throw new Error("No photo to export");

    // 1. Çerçeve Zemini Çiz
    if (frameType === "gradient" && adaptiveGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, adaptiveGradient.colorTop);
      grad.addColorStop(1, adaptiveGradient.colorBottom);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frameType === "polaroid" ? "#fbfbfa" : "#111214";
    }
    ctx.fillRect(0, 0, W, H);

    // 2. Çerçeve Payları & Fotoğraf Alanı Hesabı
    const scale = 2.2;
    const padX = Math.round(borderWidth * scale);
    const padTop = Math.round(borderWidth * scale);
    const padBottom = frameType === "polaroid" ? Math.round(borderWidth * 2.2 * scale) : Math.round(borderWidth * scale);
    const photoX = padX;
    const photoY = padTop;
    const photoW = W - padX * 2;
    const photoH = H - padTop - padBottom;
    const innerRadius = Math.max(4, Math.round(borderRadius * scale));

    // 3. İç Fotoğrafı Yükle ve Cover Modunda Çiz
    const img = new window.Image();
    if (!photoPath.startsWith("data:") && !photoPath.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = photoPath;
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = () => res(null);
    });

    if (img.naturalWidth && img.naturalHeight) {
      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, innerRadius);
      ctx.clip();

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = photoW / photoH;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > targetRatio) {
        sw = img.naturalHeight * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / targetRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
      ctx.restore();

      // Matte modunda ince sınır
      if (frameType === "matte") {
        ctx.save();
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, innerRadius);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. Analog Turuncu Tarih Damgası Çiz
    if (showTimestamp) {
      const stampText = getTodayStamp();
      ctx.save();
      ctx.font = "bold 26px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = frameType === "polaroid" ? "#d96b27" : "#f5a623";
      ctx.shadowColor = "rgba(245, 166, 35, 0.45)";
      ctx.shadowBlur = 8;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const stampX = W - padX - 16;
      const stampY = frameType === "polaroid" ? H - Math.round(padBottom / 2) : H - 24;

      ctx.fillText(stampText, stampX, stampY);
      ctx.restore();
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((res) => {
      canvas.toBlob(
        (b) => res(b!),
        mimeType,
        mimeType === "image/jpeg" ? 0.92 : undefined
      );
    });
  };

  const stage = (
    <div
      data-stage
      className="relative aspect-[4/5] w-[min(100cqw,calc(100cqh*4/5))] flex flex-col items-center justify-center"
      style={{
        padding: `${borderWidth}px`,
        paddingBottom: frameType === "polaroid" ? `${borderWidth * 2.2}px` : `${borderWidth}px`,
        borderRadius: `${borderRadius}px`,
        background: frameType === "gradient" && adaptiveGradient
          ? adaptiveGradient.cssLinear
          : frameType === "polaroid" ? "#fbfbfa" : "#111214",
        border: frameType === "matte" ? "1px solid rgba(255,255,255,0.1)" : "none",
      }}
    >
      <div className="relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center bg-black">
        {hasPhoto && photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPath} alt="" draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-[#71717a] gap-1">
            <Crop className="w-8 h-8 text-[#3f3f46]" />
            <span className="text-sm">Çerçeve için henüz fotoğraf yok</span>
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

      {/* Analog tarih damgası: görüntünün parçası (export'taki monospace çizimle aynı), arayüz metni değil */}
      {hasPhoto && showTimestamp && (
        <div
          className={`absolute bottom-3 right-4 font-mono font-bold tracking-widest text-xs select-none ${
            frameType === "polaroid" ? "text-[#d96b27]" : "text-[#f5a623]"
          }`}
          style={{ textShadow: "0 0 6px rgba(245,166,35,0.4)" }}
        >
          {getTodayStamp()}
        </div>
      )}
    </div>
  );

  const panel = (
    <div className="grid grid-cols-2 gap-4 p-3">
      <ResettableSlider
        label="Genişlik"
        value={borderWidth}
        min={12}
        max={56}
        defaultValue={24}
        unit="px"
        onChange={(val) => actions.setFrameConfig({ borderWidth: val })}
      />
      <ResettableSlider
        label="Köşe"
        value={borderRadius}
        min={0}
        max={32}
        defaultValue={12}
        unit="px"
        onChange={(val) => actions.setFrameConfig({ borderRadius: val })}
      />
    </div>
  );

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={state.items.length > 0 ? handleClear : undefined}
      />
      <div role="radiogroup" aria-label="Çerçeve tipi" className="flex-1 min-w-0 flex p-0.5 rounded-xl bg-white/5 border border-white/10">
        {(["polaroid", "matte", "gradient"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={frameType === t}
            onClick={() => actions.setFrameConfig({ frameType: t })}
            className={`press flex-1 h-11 px-1 rounded-[10px] text-xs font-semibold ${
              frameType === t ? "bg-[#f5a623] text-black" : "text-[#a1a1aa]"
            }`}
          >
            {t === "polaroid" ? "Polaroid" : t === "matte" ? "Matte" : "Gradyan"}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => actions.setFrameConfig({ showTimestamp: !showTimestamp })}
        aria-pressed={showTimestamp}
        aria-label="Tarih damgası"
        className={`touch-target press rounded-xl border ${
          showTimestamp ? "border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]" : "border-white/10 text-[#71717a]"
        }`}
      >
        <Calendar className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <StudioShell
      title="Minimal Çerçeve"
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={!hasPhoto}
      stage={stage}
      stageToolbar={<StageNote>1080 × 1350 · 4:5</StageNote>}
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
        itemsToExport={[{
          id: "frame_1",
          name: "minimal_frame",
          order: 0,
          getBlob: (fmt) => getExportBlob(fmt),
        }]}
      />
    </StudioShell>
  );
}
