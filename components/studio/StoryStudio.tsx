"use client";

import React, { useState, useEffect, useRef } from "react";
import { EXPORT_COLORS } from "@/lib/ui/colors";
import { Sparkles, Smartphone, ImagePlus, RotateCcw } from "lucide-react";
import { ResettableSlider } from "./ResettableSlider";
import { InstagramOverlay } from "./InstagramOverlay";
import { QuickExportSheet } from "./QuickExportSheet";
import { StudioShell, StageNote } from "./StudioShell";
import { AddMenu } from "./AddMenu";
import { usePanPinch, PanPinchDelta } from "./usePanPinch";
import { ReferencePicker } from "./ReferencePicker";
import {
  PLATFORM_SPECS,
  extractAdaptiveGradient,
  AdaptiveGradientResult,
  useStudio,
  StudioItem,
  StoryCellTransform,
  createStudioItem,
  createExportCanvas,
  computeStoryCells,
  computeCellDraw,
  coverSize,
  clampCellTransform,
  rubberband,
  acceptStoryFiles,
  DEFAULT_CELL_TRANSFORM,
  STORY_W,
  STORY_H,
  STORY_CORNER_RADIUS,
  STORY_MAX_PHOTOS,
  STORY_MIN_PHOTOS,
  STORY_MAX_ZOOM,
} from "@/lib";

interface StoryStudioProps {
  onBack: () => void;
}



function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

interface LiveGesture {
  index: number;
  zoom: number;
  ox: number; // px: görsel merkezinin hücre merkezine göre kayması
  oy: number;
}

/** Hareket başındaki hücre ölçüleri (ekran px) */
interface CellBase {
  index: number;
  itemId: string;
  t0: StoryCellTransform;
  cellPxW: number;
  cellPxH: number;
  coverPxW: number;
  coverPxH: number;
}

export function StoryStudio({ onBack }: StoryStudioProps) {
  const { state, actions } = useStudio();
  const library = state.items;
  const { spacing, backgroundMode, cellTransforms } = state.storyLayout;

  // Story 2–6 fotoğraf; grid sayısı fotoğraf sayısıdır, kullanıcı seçmez (spec §4.4 K2)
  const storyPhotos = library.slice(0, STORY_MAX_PHOTOS);
  const count = storyPhotos.length;
  const cells = computeStoryCells(count, spacing);
  const room = Math.max(0, STORY_MAX_PHOTOS - library.length);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [adaptiveGradient, setAdaptiveGradient] = useState<AdaptiveGradientResult | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [live, setLive] = useState<LiveGesture | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const baseRef = useRef<CellBase | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Görseller değiştikçe Akıllı Gradyan türet (ilk fotoğraftan)
  const heroSrc = storyPhotos[0] ? storyPhotos[0].proxyUrl || storyPhotos[0].originalUrl : null;
  useEffect(() => {
    if (!heroSrc) return;
    let cancelled = false;
    loadImage(heroSrc)
      .then((img) => {
        if (cancelled) return;
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setAdaptiveGradient(extractAdaptiveGradient(ctx.getImageData(0, 0, c.width, c.height)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [heroSrc]);

  // Kısa uyarılar 3 sn sonra kaybolur
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= count) setSelectedIdx(null);
  }, [count, selectedIdx]);

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) return;
    const { accepted, rejected } = acceptStoryFiles(library.length, valid);
    if (accepted.length > 0) {
      actions.addItems(accepted.map((file, idx) => createStudioItem(file, library.length + idx)));
    }
    if (rejected > 0) {
      setNotice(`Story en fazla ${STORY_MAX_PHOTOS} fotoğraf alır; ${rejected} fotoğraf alınmadı.`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) addFiles(Array.from(files));
    e.target.value = "";
  };

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || selectedIdx === null) return;
    actions.replaceItem(selectedIdx, createStudioItem(file, selectedIdx));
  };

  const handleClear = () => {
    if (window.confirm("Tüm fotoğraflar kaldırılsın mı?")) actions.clearItems();
  };

  // Dokunma: seç; seçiliyken başka hücreye dokunmak yer değiştirir (iki dokunuşla takas)
  const handleCellTap = (index: number) => {
    if (selectedIdx === null) setSelectedIdx(index);
    else if (selectedIdx === index) setSelectedIdx(null);
    else {
      actions.swapItems(selectedIdx, index);
      setSelectedIdx(null);
    }
  };

  const transformFor = (item: StudioItem): StoryCellTransform => cellTransforms[item.id] ?? DEFAULT_CELL_TRANSFORM;

  // --- Hücre içi konumlandırma: ortak usePanPinch (1 parmak kaydır, 2 parmak yakınlaştır), kenarda rubber-band ---
  const liveFrom = (b: CellBase, d: PanPinchDelta): LiveGesture => {
    let zoom = b.t0.zoom * d.scale;
    if (zoom > STORY_MAX_ZOOM) zoom = STORY_MAX_ZOOM + rubberband(zoom - STORY_MAX_ZOOM, 1);
    if (zoom < 1) zoom = 1 - rubberband(1 - zoom, 1);

    const maxX0 = Math.max(0, (b.coverPxW * b.t0.zoom - b.cellPxW) / 2);
    const maxY0 = Math.max(0, (b.coverPxH * b.t0.zoom - b.cellPxH) / 2);
    let ox = b.t0.panX * maxX0 + d.dx;
    let oy = b.t0.panY * maxY0 + d.dy;
    const limX = Math.max(0, (b.coverPxW * zoom - b.cellPxW) / 2);
    const limY = Math.max(0, (b.coverPxH * zoom - b.cellPxH) / 2);
    if (Math.abs(ox) > limX) ox = Math.sign(ox) * (limX + rubberband(Math.abs(ox) - limX, b.cellPxW));
    if (Math.abs(oy) > limY) oy = Math.sign(oy) * (limY + rubberband(Math.abs(oy) - limY, b.cellPxH));
    return { index: b.index, zoom, ox, oy };
  };

  const toTransform = (b: CellBase, l: LiveGesture): StoryCellTransform => {
    const zoom = Math.min(STORY_MAX_ZOOM, Math.max(1, l.zoom));
    const maxX = Math.max(0, (b.coverPxW * zoom - b.cellPxW) / 2);
    const maxY = Math.max(0, (b.coverPxH * zoom - b.cellPxH) / 2);
    return clampCellTransform({ zoom, panX: maxX ? l.ox / maxX : 0, panY: maxY ? l.oy / maxY : 0 });
  };

  const cellGesture = usePanPinch<number>({
    onStart: (index) => {
      const item = storyPhotos[index];
      const cell = cells[index];
      const el = cellRefs.current[index];
      if (!item || !cell || !el) return false;
      const rect = el.getBoundingClientRect();
      const cover = coverSize(cell, item.dimensions.width, item.dimensions.height);
      baseRef.current = {
        index,
        itemId: item.id,
        t0: clampCellTransform(transformFor(item)),
        cellPxW: rect.width,
        cellPxH: rect.height,
        coverPxW: (cover.w / cell.w) * rect.width,
        coverPxH: (cover.h / cell.h) * rect.height,
      };
    },
    onMove: (_index, d) => {
      if (baseRef.current) setLive(liveFrom(baseRef.current, d));
    },
    onEnd: (index, d) => {
      const b = baseRef.current;
      baseRef.current = null;
      if (d.tap) handleCellTap(index);
      else if (b) actions.setStoryCellTransform(b.itemId, toTransform(b, liveFrom(b, d)));
      // Taahhüt edilen konuma 240ms geçişle döner (kenarda rubber-band geri yaylanması)
      setLive(null);
    },
    onCancel: () => {
      baseRef.current = null;
      setLive(null);
    },
  });

  // Masaüstü: tekerlek ile hücre yakınlaştırma (non-passive dinleyici)
  const wheelStateRef = useRef({ storyPhotos, cellTransforms });
  wheelStateRef.current = { storyPhotos, cellTransforms };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cellEl = (e.target as HTMLElement).closest("[data-cell]") as HTMLElement | null;
      if (!cellEl) return;
      e.preventDefault();
      const item = wheelStateRef.current.storyPhotos[Number(cellEl.dataset.cell)];
      if (!item) return;
      const t = wheelStateRef.current.cellTransforms[item.id] ?? DEFAULT_CELL_TRANSFORM;
      actions.setStoryCellTransform(item.id, clampCellTransform({ ...t, zoom: t.zoom + (e.deltaY < 0 ? 0.1 : -0.1) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [actions]);

  // Zemin (önizleme) — export aynı renkleri tuvale çizer
  const gradientTop = adaptiveGradient ? adaptiveGradient.colorTop : EXPORT_COLORS.storyCharcoal;
  const gradientBottom = adaptiveGradient ? adaptiveGradient.colorBottom : EXPORT_COLORS.storyBlack;
  const backgroundStyle: React.CSSProperties =
    backgroundMode === "adaptive-gradient"
      ? { background: `linear-gradient(180deg, ${gradientTop} 0%, ${gradientBottom} 100%)` }
      : { backgroundColor: backgroundMode === "white" ? EXPORT_COLORS.storyWhite : backgroundMode === "charcoal" ? EXPORT_COLORS.storyCharcoal : EXPORT_COLORS.storyBlack };

  const isDarkBg = backgroundMode !== "white";

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
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

  // Export tuvali — 1080×1920, önizlemeyle aynı geometri (computeStoryCells + computeCellDraw), sRGB
  const renderExportCanvas = async (): Promise<HTMLCanvasElement> => {
    const W = PLATFORM_SPECS.ig_story_9_16.width;
    const H = PLATFORM_SPECS.ig_story_9_16.height;
    const { canvas, ctx } = createExportCanvas(W, H);

    if (backgroundMode === "adaptive-gradient") {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, gradientTop);
      grad.addColorStop(1, gradientBottom);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = backgroundMode === "white" ? EXPORT_COLORS.storyWhite : backgroundMode === "charcoal" ? EXPORT_COLORS.storyCharcoal : EXPORT_COLORS.storyBlack;
    }
    ctx.fillRect(0, 0, W, H);

    const exportCells = computeStoryCells(count, spacing, W, H);
    for (let i = 0; i < exportCells.length; i++) {
      const item = storyPhotos[i];
      if (!item) continue;
      const img = await loadImage(item.originalUrl || item.proxyUrl);
      const cell = exportCells[i];
      const d = computeCellDraw(cell, img.naturalWidth, img.naturalHeight, transformFor(item));
      ctx.save();
      drawRoundedRect(ctx, cell.x, cell.y, cell.w, cell.h, STORY_CORNER_RADIUS * (W / STORY_W));
      ctx.clip();
      ctx.drawImage(img, d.dx, d.dy, d.dw, d.dh);
      ctx.restore();
    }
    return canvas;
  };

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  const stage = (
    <div
      ref={stageRef}
      data-stage
      className="relative aspect-[9/16] w-[min(calc(100cqw-24px),calc((100cqh-24px)*9/16))] rounded-[22px] overflow-hidden"
      style={{
        ...backgroundStyle,
        containerType: "inline-size",
        boxShadow: "0 0 0 6px rgb(var(--base)), 0 0 0 9px rgb(var(--surface-2))",
      }}
    >
      {/* Dynamic Island: üst güvenli alanın içinde süs */}
      <div className="absolute top-[1.2%] left-1/2 -translate-x-1/2 z-30 w-[28%] h-[2.6%] rounded-full bg-base pointer-events-none" />

      {count > 0 && <InstagramOverlay type="story" isDarkBg={isDarkBg} />}

      {count === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-ink-3 gap-1">
          <Smartphone className="w-8 h-8 text-disabled-ink" />
          <span className="text-sm">Story için en az 2 fotoğraf ekle</span>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="touch-target px-3 text-sm text-accent">
            Fotoğraf Yükle
          </button>
        </div>
      ) : count < STORY_MIN_PHOTOS ? (
        <div className="absolute inset-x-0 top-[13%] bottom-[13%] flex flex-col items-center justify-center p-4 text-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storyPhotos[0].proxyUrl || storyPhotos[0].originalUrl}
            alt=""
            className="w-1/2 aspect-[4/5] object-cover rounded-xl opacity-60"
          />
          <span className={`text-sm ${isDarkBg ? "text-ink-1" : "text-black"}`}>Bir fotoğraf daha ekle</span>
        </div>
      ) : (
        cells.map((cell, idx) => {
          const item = storyPhotos[idx];
          const isSelected = selectedIdx === idx;
          const cover = coverSize(cell, item.dimensions.width, item.dimensions.height);
          const committed = clampCellTransform(transformFor(item));
          const isLive = live?.index === idx;
          const g = baseRef.current;
          // Taahhüt edilen konum export ile aynı oranlardan (computeCellDraw) türetilir
          const zoom = isLive ? live!.zoom : committed.zoom;
          const txPct = isLive && g
            ? (live!.ox / g.coverPxW) * 100
            : ((committed.panX * (cover.w * committed.zoom - cell.w)) / 2 / cover.w) * 100;
          const tyPct = isLive && g
            ? (live!.oy / g.coverPxH) * 100
            : ((committed.panY * (cover.h * committed.zoom - cell.h)) / 2 / cover.h) * 100;
          return (
            <div
              key={item.id}
              ref={(n) => {
                cellRefs.current[idx] = n;
              }}
              data-cell={idx}
              role="button"
              tabIndex={0}
              aria-label={`${idx + 1}. hücre${isSelected ? ", seçili" : ""}`}
              aria-pressed={isSelected}
              {...cellGesture.bind(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCellTap(idx);
                }
              }}
              className={`absolute overflow-hidden cursor-grab ${isSelected ? "ring-2 ring-white z-10" : ""}`}
              style={{
                left: pct(cell.x, STORY_W),
                top: pct(cell.y, STORY_H),
                width: pct(cell.w, STORY_W),
                height: pct(cell.h, STORY_H),
                borderRadius: `calc(${STORY_CORNER_RADIUS / STORY_W} * 100cqw)`,
                touchAction: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.proxyUrl || item.originalUrl}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: pct(cover.w, cell.w),
                  height: pct(cover.h, cell.h),
                  left: pct((cell.w - cover.w) / 2, cell.w),
                  top: pct((cell.h - cover.h) / 2, cell.h),
                  transform: `translate(${txPct}%, ${tyPct}%) scale(${zoom})`,
                  transition: isLive ? "none" : "transform 240ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );

  const statusText =
    notice ||
    (library.length > STORY_MAX_PHOTOS
      ? `Kütüphanede ${library.length} fotoğraf var; Story ilk ${STORY_MAX_PHOTOS}'sını kullanır.`
      : count < STORY_MIN_PHOTOS
        ? "En az 2 fotoğraf ekle"
        : "");

  const stageToolbar = (
    <>
      <StageNote>
        {STORY_W} × {STORY_H} · 9:16
      </StageNote>
      {statusText ? (
        <span role="status" className="text-xs text-ink-2 text-right truncate min-w-0">
          {statusText}
        </span>
      ) : (
        <span className="text-xs text-ink-3 text-right truncate min-w-0">Sürükle, iki parmakla yakınlaştır</span>
      )}
    </>
  );

  const selectedItem = selectedIdx !== null ? storyPhotos[selectedIdx] : null;

  const panel = (
    <div className="flex flex-col gap-2 p-3">
      {selectedItem && (
        <div className="flex items-center gap-2 animate-panel-in">
          <span className="text-sm text-ink-1 mr-auto num-metric">{(selectedIdx ?? 0) + 1}. hücre</span>
          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="press h-11 px-3 rounded-xl text-sm border border-separator bg-surface-2 text-ink-1 flex items-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Değiştir</span>
          </button>
          <button
            type="button"
            onClick={() => actions.setStoryCellTransform(selectedItem.id, null)}
            className="press h-11 px-3 rounded-xl text-sm border border-separator bg-surface-2 text-ink-1 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sıfırla</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-2">Zemin</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => actions.setStoryLayout({ backgroundMode: "adaptive-gradient" })}
            aria-pressed={backgroundMode === "adaptive-gradient"}
            className={`press h-11 px-3 rounded-xl text-sm flex items-center gap-1.5 ${
              backgroundMode === "adaptive-gradient" ? "bg-accent-fill text-on-accent font-semibold" : "text-ink-2 bg-surface-2"
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
                  backgroundMode === m ? "ring-2 ring-accent border-transparent" : "border-separator"
                } ${m === "black" ? "bg-base" : m === "white" ? "bg-white" : "bg-surface"}`}
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
        onChange={(val) => actions.setStoryLayout({ spacing: val })}
      />
    </div>
  );

  const bar = (
    <div className="flex items-center gap-2 p-2">
      <AddMenu
        onUpload={() => fileInputRef.current?.click()}
        onReference={() => setIsReferenceOpen(true)}
        onClear={library.length > 0 ? handleClear : undefined}
        addDisabledReason={room <= 0 ? `Story en fazla ${STORY_MAX_PHOTOS} fotoğraf alır.` : undefined}
      />
      <span className="ml-auto pr-2 text-sm text-ink-2 num-metric">
        {count}/{STORY_MAX_PHOTOS} fotoğraf · grid otomatik
      </span>
    </div>
  );

  return (
    <StudioShell
      title="Story Dump"
      onBack={onBack}
      onExport={() => setIsExportOpen(true)}
      exportDisabled={count < STORY_MIN_PHOTOS}
      stage={stage}
      stageToolbar={stageToolbar}
      panel={panel}
      bar={bar}
    >
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplace} />

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addFiles}
        maxSelect={room}
      />

      <QuickExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        platform="ig_story_9_16"
        itemsToExport={count >= STORY_MIN_PHOTOS ? [{ id: "story_1", order: 0, renderCanvas: renderExportCanvas }] : []}
      />
    </StudioShell>
  );
}
