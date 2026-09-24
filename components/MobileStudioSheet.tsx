"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CurateImage,
  FocusCategory,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
  ExportPreset,
  UpscaleMultiplier,
  BorderState,
  TimestampState,
  AestheticPreset,
  AspectRatio,
} from "@/lib/types";
import { EditStagePills } from "./EditStagePills";
import { ControlToolbar } from "./ControlToolbar";
import { DumpFilmstrip } from "./DumpFilmstrip";
import { Palette, Sparkles, Crop, Frame } from "lucide-react";

const COLLAPSED_H = 150;
const EXPANDED_VH = 0.50;
const IOS_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const TRANSITION_MS = 300;

const TABS: Array<{ id: NonNullable<FocusCategory>; label: string; icon: React.ReactNode }> = [
  { id: "preset-color", label: "Preset / Renk", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "analog", label: "Analog", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "size-crop", label: "Kırpma", icon: <Crop className="w-3.5 h-3.5" /> },
  { id: "frame", label: "Çerçeve & Tarih", icon: <Frame className="w-3.5 h-3.5" /> },
];

export type SheetSnap = "collapsed" | "expanded";

interface MobileStudioSheetProps {
  images: CurateImage[];
  activeImage: CurateImage | null;
  activeImageId: string | null;
  referenceImageId: string | null;
  focusCategory: FocusCategory;
  onFocusCategory: (cat: FocusCategory) => void;
  guide: CompositionGuide;
  overlay: SocialOverlayType;
  showOriginal: boolean;
  splitView: boolean;
  onToggleSplitView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBatchSync: () => void;
  syncSuccess?: boolean;
  onUpdateCropRatio: (ratio: AspectRatio) => void;
  onUpdateZoom: (zoom: number) => void;
  onRotate90?: () => void;
  onToggleFlipHorizontal?: () => void;
  onUpdateGuide: (guide: CompositionGuide) => void;
  onUpdateOverlay: (overlay: SocialOverlayType) => void;
  onUpdateFilters: (filters: Partial<CurateImage["filters"]>) => void;
  onUpdateBorder: (border: Partial<BorderState>) => void;
  onUpdateTimestamp: (timestamp: Partial<TimestampState>) => void;
  onResetFilters: () => void;
  onSetShowOriginal: (show: boolean) => void;
  onUpdateUpscale: (multiplier: UpscaleMultiplier) => void;
  onExportSingle: (preset: ExportPreset) => void;
  onExportDump: () => void;
  onExitEdit: () => void;
  aestheticPresets: AestheticPreset[];
  onSaveAesthetic: (name: string) => void;
  onApplyAesthetic: (preset: AestheticPreset) => void;
  onDeleteAesthetic: (id: string) => void;
  onSelectImage: (id: string) => void;
  onSetReference: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onReorder: (sourceIndex: number, destIndex: number) => void;
  onUploadClick: () => void;
  /** Reports reserved layout height (collapsed or expanded) so canvas never sits under sheet */
  onLayoutHeightChange?: (heightPx: number) => void;
}

function expandedHeightPx(): number {
  if (typeof window === "undefined") return 320;
  return Math.round(window.innerHeight * EXPANDED_VH);
}

export const MobileStudioSheet: React.FC<MobileStudioSheetProps> = (props) => {
  const {
    focusCategory,
    onFocusCategory,
    images,
    activeImage,
    activeImageId,
    referenceImageId,
    onLayoutHeightChange,
  } = props;

  const sheetRef = useRef<HTMLDivElement>(null);
  const [expandedH, setExpandedH] = useState(expandedHeightPx);
  const [snap, setSnap] = useState<SheetSnap>("collapsed");
  const [dragging, setDragging] = useState(false);

  // translateY: 0 = fully expanded, (expandedH - COLLAPSED_H) = collapsed peek
  const maxTranslate = Math.max(0, expandedH - COLLAPSED_H);
  const translateRef = useRef(maxTranslate);
  const [translateY, setTranslateY] = useState(maxTranslate);

  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startTranslate: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const syncTranslate = useCallback((y: number, withTransition: boolean) => {
    const clamped = Math.max(0, Math.min(maxTranslate, y));
    translateRef.current = clamped;
    setTranslateY(clamped);
    const el = sheetRef.current;
    if (el) {
      el.style.transition = withTransition
        ? `transform ${TRANSITION_MS}ms ${IOS_EASE}`
        : "none";
      el.style.transform = `translate3d(0, ${clamped}px, 0)`;
    }
  }, [maxTranslate]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      const next = expandedHeightPx();
      setExpandedH(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keep translate in range when expandedH changes
  useLayoutEffect(() => {
    const nextMax = Math.max(0, expandedH - COLLAPSED_H);
    const target = snap === "collapsed" ? nextMax : 0;
    translateRef.current = target;
    setTranslateY(target);
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${target}px, 0)`;
    }
  }, [expandedH, snap]);

  // Expand only when the user picks a (new) category — do not fight manual collapse
  const prevFocusRef = useRef<FocusCategory>(focusCategory);
  useEffect(() => {
    if (focusCategory && focusCategory !== prevFocusRef.current) {
      setSnap("expanded");
      syncTranslate(0, true);
    } else if (!focusCategory && prevFocusRef.current) {
      setSnap("collapsed");
      syncTranslate(maxTranslate, true);
    }
    prevFocusRef.current = focusCategory;
  }, [focusCategory, syncTranslate, maxTranslate]);

  // Report layout spacer height (snap only — no mid-drag reflow)
  useEffect(() => {
    const h = snap === "expanded" ? expandedH : COLLAPSED_H;
    onLayoutHeightChange?.(h);
  }, [snap, expandedH, onLayoutHeightChange]);

  const snapTo = useCallback(
    (next: SheetSnap) => {
      setSnap(next);
      syncTranslate(next === "collapsed" ? maxTranslate : 0, true);
      if (next === "collapsed") {
        // keep category selection so tabs stay highlighted, or clear? Spec: tabs persistent; content can stay.
        // Don't clear focusCategory — user can still switch tabs when re-expanding.
      }
    },
    [maxTranslate, syncTranslate]
  );

  const endDrag = useCallback(
    (clientY: number) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (!drag) return;

      const dy = clientY - drag.startY;
      const nextTranslate = Math.max(0, Math.min(maxTranslate, drag.startTranslate + dy));
      const traveled = nextTranslate - drag.startTranslate;
      const v = drag.velocity; // px/ms, positive = dragging down (collapse)

      let next: SheetSnap = snap;
      // Velocity-aware snap
      if (v > 0.45) next = "collapsed";
      else if (v < -0.45) next = "expanded";
      else if (nextTranslate > maxTranslate * 0.45) next = "collapsed";
      else next = "expanded";

      // If almost no movement, toggle on tap of handle is handled separately
      void traveled;
      snapTo(next);
    },
    [maxTranslate, snap, snapTo]
  );

  const onHandlePointerDown = (e: React.PointerEvent) => {
    // Only chrome / handle — caller ensures this
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startTranslate: translateRef.current,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    setDragging(true);
    const el = sheetRef.current;
    if (el) el.style.transition = "none";
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    const vy = (e.clientY - drag.lastY) / dt;
    drag.velocity = drag.velocity * 0.7 + vy * 0.3;
    drag.lastY = e.clientY;
    drag.lastT = now;

    const next = drag.startTranslate + (e.clientY - drag.startY);
    const clamped = Math.max(0, Math.min(maxTranslate, next));
    translateRef.current = clamped;
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${clamped}px, 0)`;
    }
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    endDrag(e.clientY);
  };

  const handleTabSelect = (id: NonNullable<FocusCategory>) => {
    if (focusCategory === id) {
      onFocusCategory(null);
      snapTo("collapsed");
    } else {
      onFocusCategory(id);
      if (snap !== "expanded") {
        snapTo("expanded");
      }
    }
  };

  const layoutSpacerH = snap === "expanded" ? expandedH : COLLAPSED_H;

  return (
    <>
      {/* Layout spacer — height jumps only on snap (no CSS height transition) */}
      <div
        className="sm:hidden shrink-0 w-full pointer-events-none"
        style={{ height: layoutSpacerH }}
        aria-hidden
      />

      {/* Absolute sheet: fixed structural height, motion via translate3d only */}
      <div
        ref={sheetRef}
        className="sm:hidden fixed left-0 right-0 bottom-0 z-40 flex flex-col bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl pb-safe"
        style={{
          height: expandedH,
          transform: `translate3d(0, ${translateY}px, 0)`,
          willChange: "transform",
          transition: dragging ? "none" : `transform ${TRANSITION_MS}ms ${IOS_EASE}`,
        }}
      >
        {/* Drag handle / sheet chrome — only this starts vertical sheet drag */}
        <div
          className="shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          style={{ touchAction: "none" }}
        >
          <div className="w-9 h-1 bg-white/20 rounded-full mx-auto my-2" />
          <div className="w-full px-2 pb-1 flex items-center justify-center gap-1">
            <div
              className="flex items-center gap-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <EditStagePills
                layout="sheet"
                mode="tools-only"
                activeCategory={focusCategory}
                onSelect={onFocusCategory}
                splitView={props.splitView}
                onToggleSplitView={props.onToggleSplitView}
                canUndo={props.canUndo}
                canRedo={props.canRedo}
                onUndo={props.onUndo}
                onRedo={props.onRedo}
                onBatchSync={props.onBatchSync}
                syncSuccess={props.syncSuccess}
              />
            </div>
          </div>
        </div>

        {/* Persistent category tabs — never unmount when content opens */}
        <div
          className="shrink-0 px-2 pb-2 flex items-stretch gap-1.5 overflow-x-auto scrollbar-none"
          style={{ touchAction: "pan-x" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {TABS.map((tab) => {
            const active = focusCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`pressable min-h-[44px] flex-1 min-w-[4.5rem] px-2 rounded-xl text-[11px] font-medium flex flex-col sm:flex-row items-center justify-center gap-1 border transition-colors ${
                  active
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/80 border-white/10"
                }`}
              >
                {tab.icon}
                <span className="leading-tight text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable controls — independent of sheet drag */}
        <div
          className="flex-1 min-h-0 max-h-[48vh] overflow-y-auto overscroll-contain px-1"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {focusCategory && activeImage ? (
            <ControlToolbar
              layout="sheet"
              image={activeImage}
              images={images}
              referenceImageId={referenceImageId}
              activeGuide={props.guide}
              activeOverlay={props.overlay}
              showOriginal={props.showOriginal}
              onUpdateCropRatio={props.onUpdateCropRatio}
              onUpdateZoom={props.onUpdateZoom}
              onRotate90={props.onRotate90}
              onToggleFlipHorizontal={props.onToggleFlipHorizontal}
              onUpdateGuide={props.onUpdateGuide}
              onUpdateOverlay={props.onUpdateOverlay}
              onUpdateFilters={props.onUpdateFilters}
              onUpdateBorder={props.onUpdateBorder}
              onUpdateTimestamp={props.onUpdateTimestamp}
              onBatchSync={props.onBatchSync}
              onResetFilters={props.onResetFilters}
              onSetShowOriginal={props.onSetShowOriginal}
              onUpdateUpscale={props.onUpdateUpscale}
              onExportSingle={props.onExportSingle}
              onExportDump={props.onExportDump}
              onExitEdit={props.onExitEdit}
              focusCategory={focusCategory}
              onCloseFocus={() => {
                /* keep sheet open; just collapse content by clearing category */
                onFocusCategory(null);
                snapTo("collapsed");
              }}
              aestheticPresets={props.aestheticPresets}
              onSaveAesthetic={props.onSaveAesthetic}
              onApplyAesthetic={props.onApplyAesthetic}
              onDeleteAesthetic={props.onDeleteAesthetic}
            />
          ) : (
            <p className="text-[11px] text-neutral-500 text-center py-3 px-4">
              Bir kategori seçin — kaydırarak paneli açın.
            </p>
          )}
        </div>

        {/* Filmstrip — contextual hiding during editing */}
        <div
          className={`shrink-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            focusCategory
              ? "max-h-0 opacity-0 pointer-events-none translate-y-full overflow-hidden border-t-0"
              : "max-h-28 opacity-100 translate-y-0 border-t border-white/5"
          }`}
          style={{ touchAction: "pan-x" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DumpFilmstrip
            compact
            images={images}
            activeImageId={activeImageId}
            referenceImageId={referenceImageId}
            onSelectImage={props.onSelectImage}
            onSetReference={props.onSetReference}
            onDeleteImage={props.onDeleteImage}
            onReorder={props.onReorder}
            onUploadClick={props.onUploadClick}
          />
        </div>
      </div>
    </>
  );
};
