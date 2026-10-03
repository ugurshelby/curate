"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Smartphone } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { InstagramOverlay } from "./InstagramOverlay";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { ReferencePicker } from "./ReferencePicker";
import { 
  PLATFORM_SPECS, 
  extractAdaptiveGradient, 
  AdaptiveGradientResult, 
  useStudio, 
  StudioItem,
  createStudioItem 
} from "@/lib";

interface StoryStudioProps {
  onBack: () => void;
}

export function StoryStudio({ onBack }: StoryStudioProps) {
  const { state, actions } = useStudio();
  const storyPhotos = state.items;
  const { slotCount, spacing, backgroundMode } = state.storyLayout;

  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  // Story en fazla 6 fotoğraf (spec §4.4 K2); referans seçimi kalan yerle sınırlı
  const referenceSlots = Math.max(0, 6 - storyPhotos.length);
  const [swapSelectedIdx, setSwapSelectedIdx] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Görseller değiştikçe Akıllı Gradyan türet
  useEffect(() => {
    if (storyPhotos.length === 0) return;
    const heroImg = new window.Image();
    const firstItem = storyPhotos[0];
    const targetSrc = firstItem.originalUrl || firstItem.proxyUrl;
    if (!targetSrc.startsWith("data:") && !targetSrc.startsWith("blob:")) {
      heroImg.crossOrigin = "anonymous";
    }
    heroImg.src = targetSrc;
    heroImg.onload = () => {
      const c = document.createElement("canvas");
      c.width = heroImg.naturalWidth;
      c.height = heroImg.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(heroImg, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        setAdaptiveGradient(extractAdaptiveGradient(data));
      }
    };
  }, [storyPhotos]);

  const addFiles = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;
    const newItems: StudioItem[] = validFiles.map((file, idx) =>
      createStudioItem(file, storyPhotos.length + idx)
    );
    actions.addItems(newItems);
  };

  // Fotoğraf Yükleme
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(Array.from(files));
    e.target.value = "";
  };

  const handleClear = () => {
    if (window.confirm("Tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
  };

  // İki tıkla fotoğraf takası (Swap)
  const handleCellClick = (index: number) => {
    if (swapSelectedIdx === null) {
      setSwapSelectedIdx(index);
    } else if (swapSelectedIdx === index) {
      setSwapSelectedIdx(null); // Deselect
    } else {
      actions.swapItems(swapSelectedIdx, index);
      setSwapSelectedIdx(null);
    }
  };

  // Dinamik Grid şablonu (Slot sayısına göre)
  const getGridClasses = () => {
    switch (slotCount) {
      case 2:
        return "grid-rows-2 grid-cols-1";
      case 3:
        return "grid-rows-3 grid-cols-1";
      case 4:
        return "grid-rows-2 grid-cols-2";
      case 5:
        return "grid-rows-3 grid-cols-2";
      case 6:
        return "grid-rows-3 grid-cols-2";
      default:
        return "grid-rows-2 grid-cols-2";
    }
  };

  // Zemin stili
  const getBackgroundStyle = () => {
    switch (backgroundMode) {
      case "black":
        return { backgroundColor: "#000000" };
      case "white":
        return { backgroundColor: "#ffffff" };
      case "charcoal":
        return { backgroundColor: "#18181b" };
      case "adaptive-gradient":
      default:
        return {
          background: adaptiveGradient
            ? adaptiveGradient.cssLinear
            : "linear-gradient(180deg, #2e201b 0%, #141113 100%)",
        };
    }
  };

  const isDarkBg = backgroundMode !== "white";

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

  // Export render fonksiyonu — Tam 1080x1920 Çözünürlükte Zemin + Grid Fotoğrafları
  const getStoryExportBlob = async (format: "jpeg" | "png" = "jpeg"): Promise<Blob> => {
    const W = PLATFORM_SPECS.ig_story_9_16.width; // 1080
    const H = PLATFORM_SPECS.ig_story_9_16.height; // 1920

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");

    // 1. Zemin dolgusu
    if (backgroundMode === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
    } else if (backgroundMode === "charcoal") {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, W, H);
    } else if (backgroundMode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
    } else {
      // Adaptive Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (adaptiveGradient) {
        grad.addColorStop(0, adaptiveGradient.colorTop);
        grad.addColorStop(1, adaptiveGradient.colorBottom);
      } else {
        grad.addColorStop(0, "#2e201b");
        grad.addColorStop(1, "#141113");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Grid Hücre Geometrileri Hesabı (Safe area & Space slider ölçekli)
    const topSafe = 140; // Dynamic Island safe area
    const bottomSafe = 130; // Instagram story alt etkileşim alanı
    const usableH = H - topSafe - bottomSafe;
    const gap = Math.round(spacing * 2.5); // Ölçeklenmiş piksel boşluğu
    const sidePadding = Math.max(28, gap);
    const usableW = W - sidePadding * 2;

    interface CellRect {
      x: number;
      y: number;
      w: number;
      h: number;
    }
    const cells: CellRect[] = [];

    if (slotCount === 2) {
      const cellH = (usableH - gap) / 2;
      const cellW = usableW;
      cells.push({ x: sidePadding, y: topSafe, w: cellW, h: cellH });
      cells.push({ x: sidePadding, y: topSafe + cellH + gap, w: cellW, h: cellH });
    } else if (slotCount === 3) {
      const cellH = (usableH - gap * 2) / 3;
      const cellW = usableW;
      for (let r = 0; r < 3; r++) {
        cells.push({ x: sidePadding, y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
      }
    } else if (slotCount === 4) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap) / 2;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
    } else if (slotCount === 5) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap * 2) / 3;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
      // 5. hücre: 3. satırda tam genişlikte yatay kart
      cells.push({ x: sidePadding, y: topSafe + 2 * (cellH + gap), w: usableW, h: cellH });
    } else if (slotCount === 6) {
      const cellW = (usableW - gap) / 2;
      const cellH = (usableH - gap * 2) / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          cells.push({ x: sidePadding + c * (cellW + gap), y: topSafe + r * (cellH + gap), w: cellW, h: cellH });
        }
      }
    }

    // 3. Her hücreye görseli cover modunda ve yuvarlatılmış köşelerle çiz
    const cornerRadius = 32;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const photoItem = storyPhotos[i];
      if (!photoItem) continue;

      const photoSrc = photoItem.originalUrl || photoItem.proxyUrl;
      const img = new window.Image();
      if (!photoSrc.startsWith("data:") && !photoSrc.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.src = photoSrc;

      await new Promise((resolve) => {
        img.onload = () => resolve(null);
        img.onerror = () => resolve(null);
      });

      if (!img.naturalWidth || !img.naturalHeight) continue;

      ctx.save();
      drawRoundedRect(ctx, cell.x, cell.y, cell.w, cell.h, cornerRadius);
      ctx.clip();

      // Cover kırpması hesabı
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const cellRatio = cell.w / cell.h;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > cellRatio) {
        sw = img.naturalHeight * cellRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / cellRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, cell.x, cell.y, cell.w, cell.h);
      ctx.restore();
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    return new Promise((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        mimeType,
        mimeType === "image/jpeg" ? 0.92 : undefined
      );
    });
  };

  const stage = (
    <div
      data-stage
      className="relative aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))] rounded-[32px] p-1.5 bg-[#121215] border-[3px] border-[#27272a] flex flex-col overflow-hidden"
    >
      {/* İç Ekran */}
      <div
        className="relative w-full h-full rounded-[26px] overflow-hidden flex flex-col"
        style={getBackgroundStyle()}
      >
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[28%] h-[3.2%] rounded-full bg-black pointer-events-none" />

        {/* Instagram story güvenli alan katmanı (Story'de platform geçişi yok, spec §4.4 S-a) */}
        {storyPhotos.length > 0 && <InstagramOverlay type="story" isDarkBg={isDarkBg} />}

        {storyPhotos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[#71717a] gap-1">
            <Smartphone className="w-8 h-8 text-[#3f3f46]" />
            <span className="text-sm">Story için henüz fotoğraf yok</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="touch-target px-3 text-sm text-[#f5a623]"
            >
              Fotoğraf Yükle
            </button>
          </div>
        ) : (
          <div
            className={`w-full h-full grid ${getGridClasses()} pt-10 pb-6`}
            style={{
              gap: `${spacing}px`,
              paddingLeft: `${Math.max(8, spacing)}px`,
              paddingRight: `${Math.max(8, spacing)}px`,
            }}
          >
            {storyPhotos.slice(0, slotCount).map((photoItem, idx) => {
              const isSelected = swapSelectedIdx === idx;
              const photoSrc = photoItem.proxyUrl || photoItem.originalUrl;
              return (
                <button
                  type="button"
                  key={photoItem.id || idx}
                  onClick={() => handleCellClick(idx)}
                  aria-pressed={isSelected}
                  aria-label={`${idx + 1}. hücre`}
                  className={`press relative rounded-xl overflow-hidden ${
                    slotCount === 5 && idx === 4 ? "col-span-2" : ""
                  } ${isSelected ? "ring-2 ring-[#f5a623]" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoSrc}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  {isSelected && (
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-semibold bg-[#f5a623] text-black px-2 py-0.5 rounded-full">
                        Takas için seçildi
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const stageToolbar = (
    <>
      <StageNote>1080 × 1920 · 9:16</StageNote>
      <StageNote>{Math.min(storyPhotos.length, slotCount)}/{slotCount} hücre dolu</StageNote>
    </>
  );

  const panel = (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[#a1a1aa]">Zemin</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => actions.setStoryLayout({ backgroundMode: "adaptive-gradient" })}
            aria-pressed={backgroundMode === "adaptive-gradient"}
            className={`press h-11 px-3 rounded-xl text-sm flex items-center gap-1.5 ${
              backgroundMode === "adaptive-gradient" ? "bg-[#f5a623] text-black font-semibold" : "text-[#a1a1aa] bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gradyan</span>
          </button>
          {(["black", "white", "charcoal"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => actions.setStoryLayout({ backgroundMode: m })}
              aria-pressed={backgroundMode === m}
              aria-label={m === "black" ? "OLED siyah" : m === "white" ? "Beyaz" : "Kömür"}
              className="touch-target press rounded-full"
            >
              <span
                className={`w-6 h-6 rounded-full border ${
                  backgroundMode === m ? "ring-2 ring-[#f5a623] border-transparent" : "border-white/25"
                } ${m === "black" ? "bg-black" : m === "white" ? "bg-white" : "bg-[#18181b]"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <ResettableSlider
        label="Boşluk"
        value={spacing}
        min={0}
        max={32}
        defaultValue={10}
        unit="px"
        onChange={(val) => actions.setStoryLayout({ spacing: val })}
      />
    </div>
  );

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={storyPhotos.length > 0 ? handleClear : undefined}
        addDisabledReason={referenceSlots <= 0 ? "Story en fazla 6 fotoğraf alır." : undefined}
      />
      <div role="radiogroup" aria-label="Grid hücre sayısı" className="ml-auto flex p-0.5 rounded-xl bg-white/5 border border-white/10">
        {([2, 3, 4, 5, 6] as const).map((count) => (
          <button
            key={count}
            type="button"
            role="radio"
            aria-checked={slotCount === count}
            onClick={() => actions.setStoryLayout({ slotCount: count })}
            className={`press w-11 h-11 rounded-[10px] text-sm num-metric ${
              slotCount === count ? "bg-[#f5a623] text-black font-semibold" : "text-[#a1a1aa]"
            }`}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <StudioShell
      title="Story Dump"
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={storyPhotos.length === 0}
      stage={stage}
      stageToolbar={stageToolbar}
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
        onConfirm={addFiles}
        maxSelect={referenceSlots}
      />

      {/* Dışa Aktarma Çekmecesi */}
      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_story_9_16"
        itemsToExport={[{
          id: "story_1",
          name: "story_dump",
          order: 0,
          getBlob: (fmt) => getStoryExportBlob(fmt),
        }]}
      />
    </StudioShell>
  );
}
