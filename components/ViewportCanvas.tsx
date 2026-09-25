"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  CurateImage,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
} from "@/lib/types";
import { renderProcessedImage } from "@/lib/image/renderer";
import { getProxyDimensions } from "@/lib/image/proxy";
import { SocialOverlay } from "./SocialOverlay";
import {
  Move,
  RefreshCw,
  Eye,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
} from "lucide-react";

interface ViewportCanvasProps {
  image: CurateImage | null;
  referenceImage: CurateImage | null;
  guide: CompositionGuide;
  overlay: SocialOverlayType;
  showOriginal?: boolean;
  onUpdateCrop: (panX: number, panY: number, zoom: number) => void;
  onSetShowOriginal?: (show: boolean) => void;
  /** Snapshot history BEFORE gesture; commit on pointer-up if crop changed */
  onCropGestureStart?: () => void;
  onCropGestureEnd?: () => void;
  /** When true, omit outer padding (used inside Split View cells) */
  compact?: boolean;
}

const LONG_PRESS_MS = 280;
const FAST_PROXY_MAX_EDGE = 640; // 540p/640p proxy during active slider dragging
const FULL_PROXY_MAX_EDGE = 1080; // Full crisp proxy when slider settles

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  image,
  referenceImage,
  guide,
  overlay,
  showOriginal = false,
  onUpdateCrop,
  onSetShowOriginal,
  onCropGestureStart,
  onCropGestureEnd,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [refImageObj, setRefImageObj] = useState<HTMLImageElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Figma / Canva Style Isolated Stage Transform
  const [stageZoom, setStageZoom] = useState<number>(1.0); // 0.5x to 4.0x
  const [stagePan, setStagePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningStage, setIsPanningStage] = useState(false);
  const isSpacePressedRef = useRef(false);

  // Drag pan state
  const isDraggingRef = useRef(false);
  const isMiddleClickRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const startStagePanRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const cropDirtyRef = useRef(false);

  // Long-press before/after (mouse + touch via Pointer Events)
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActiveRef = useRef(false);

  // Touch pinch-to-zoom state
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1.0);
  const isStagePinchRef = useRef<boolean>(false);
  const initialStageZoomRef = useRef<number>(1.0);

  // rAF Throttled Rendering
  const renderIdRef = useRef(0);
  const isRenderingRef = useRef(false);
  const pendingRenderRef = useRef(false);
  const lastStateChangeTimeRef = useRef(0);
  const settleTimeoutRef = useRef<number | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      onSetShowOriginal?.(false);
    }
  }, [onSetShowOriginal]);

  // Load active image element
  useEffect(() => {
    if (!image) {
      setImageObj(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImageObj(img);
    img.src = image.dataUrl;
  }, [image?.id, image?.dataUrl]);

  // Load reference image element if selected
  useEffect(() => {
    if (!referenceImage) {
      setRefImageObj(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setRefImageObj(img);
    img.src = referenceImage.dataUrl;
  }, [referenceImage?.id, referenceImage?.dataUrl]);

  // Track Space bar for Figma-style stage hand panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        isSpacePressedRef.current = true;
        setIsPanningStage(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setIsPanningStage(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Core Render Function
  const executeRender = useCallback(
    async (maxEdge = FULL_PROXY_MAX_EDGE) => {
      if (!image || !imageObj || !canvasRef.current) return;

      const thisRenderId = ++renderIdRef.current;
      isRenderingRef.current = true;
      setIsRendering(true);

      try {
        const canvas = canvasRef.current;
        const proxy = getProxyDimensions(
          imageObj.naturalWidth,
          imageObj.naturalHeight,
          image.crop.aspectRatio,
          maxEdge
        );
        const targetW = proxy.width;
        const targetH = proxy.height;

        const renderItem: CurateImage = showOriginal
          ? {
              ...image,
              filters: {
                ...image.filters,
                activePresetId: null,
                vignetteEnabled: false,
                lightLeakEnabled: false,
                reinhardEnabled: false,
                grainEnabled: false,
                halationEnabled: false,
              },
              border: image.border
                ? { ...image.border, enabled: false }
                : image.border,
              timestamp: image.timestamp
                ? { ...image.timestamp, enabled: false }
                : image.timestamp,
            }
          : image;

        const processedData = await renderProcessedImage(
          imageObj,
          renderItem,
          refImageObj,
          targetW,
          targetH
        );

        if (thisRenderId !== renderIdRef.current) return;

        canvas.width = processedData.width;
        canvas.height = processedData.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(processedData, 0, 0);
        }
      } catch (err) {
        if (thisRenderId === renderIdRef.current) {
          console.error("Render error:", err);
        }
      } finally {
        if (thisRenderId === renderIdRef.current) {
          isRenderingRef.current = false;
          setIsRendering(false);

          // If another change occurred while rendering, process the latest in next animation frame
          if (pendingRenderRef.current) {
            pendingRenderRef.current = false;
            requestAnimationFrame(() => executeRender(FAST_PROXY_MAX_EDGE));
          }
        }
      }
    },
    [image, imageObj, refImageObj, showOriginal]
  );

  // rAF Throttled scheduler with Fast/Full proxy strategy
  const scheduleRender = useCallback(() => {
    const now = Date.now();
    const timeSinceLast = now - lastStateChangeTimeRef.current;
    lastStateChangeTimeRef.current = now;

    // Clear previous settle timer
    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
    }

    // If already rendering, flag pending and wait for rAF
    if (isRenderingRef.current) {
      pendingRenderRef.current = true;
    } else {
      // If changes occur in rapid bursts (< 180ms), use 540p/640p fast proxy
      const isRapid = timeSinceLast < 180;
      requestAnimationFrame(() => {
        executeRender(isRapid ? FAST_PROXY_MAX_EDGE : FULL_PROXY_MAX_EDGE);
      });
    }

    // Schedule crisp full-res settle render when user stops moving sliders for 180ms
    settleTimeoutRef.current = window.setTimeout(() => {
      requestAnimationFrame(() => {
        executeRender(FULL_PROXY_MAX_EDGE);
      });
    }, 180);
  }, [executeRender]);

  useEffect(() => {
    scheduleRender();
    return () => {
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, [scheduleRender]);

  // Pointer interactions (Pan crop vs Pan Figma Stage)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!image || !containerRef.current) return;

    // Check for middle click or Space key -> Stage Pan
    const isMiddleClick = e.button === 1;
    const isStagePanMode = isMiddleClick || isSpacePressedRef.current;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    isMiddleClickRef.current = isMiddleClick;
    didDragRef.current = false;
    cropDirtyRef.current = false;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = { x: image.crop.panX, y: image.crop.panY };
    startStagePanRef.current = { ...stagePan };

    if (!isStagePanMode) {
      onCropGestureStart?.();
      // Long-press -> show original while held
      if (onSetShowOriginal) {
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          if (!didDragRef.current) {
            longPressActiveRef.current = true;
            onSetShowOriginal(true);
          }
        }, LONG_PRESS_MS);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !image) return;
    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    if (Math.abs(dx) + Math.abs(dy) > 4) {
      didDragRef.current = true;
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (longPressActiveRef.current) return;

    // Stage Pan Mode (Space bar or middle mouse)
    if (isMiddleClickRef.current || isSpacePressedRef.current) {
      setStagePan({
        x: startStagePanRef.current.x + dx,
        y: startStagePanRef.current.y + dy,
      });
      return;
    }

    // Normal Crop Window Pan (scaled by stageZoom so 1:1 mouse movement feels natural)
    const sensitivity = (1.4 / image.crop.zoom) / stageZoom;
    const newPanX = startPanRef.current.x - dx * sensitivity;
    const newPanY = startPanRef.current.y - dy * sensitivity;

    cropDirtyRef.current = true;
    onUpdateCrop(newPanX, newPanY, image.crop.zoom);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const shouldCommit = cropDirtyRef.current || didDragRef.current;
    isDraggingRef.current = false;
    isMiddleClickRef.current = false;
    clearLongPress();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (shouldCommit && !isSpacePressedRef.current) {
      onCropGestureEnd?.();
    }
    cropDirtyRef.current = false;
  };

  // Wheel Zoom — Figma / Canva style Stage Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // PREVENT BROWSER FULL PAGE ZOOM
      e.preventDefault();
      e.stopPropagation();

      // Zoom stage
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setStageZoom((prev) => {
        const next = Math.max(0.4, Math.min(4.0, Number((prev * zoomFactor).toFixed(2))));
        return next;
      });
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    el.addEventListener("touchmove", handleNativeTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
      el.removeEventListener("touchmove", handleNativeTouchMove);
    };
  }, []);

  // Double Click: Reset Stage Zoom or toggle crop fit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stageZoom !== 1.0 || stagePan.x !== 0 || stagePan.y !== 0) {
      // Reset Stage Zoom & Pan
      setStageZoom(1.0);
      setStagePan({ x: 0, y: 0 });
    } else if (image) {
      onCropGestureStart?.();
      const nextZoom = image.crop.zoom > 1.2 ? 1.0 : 1.8;
      onUpdateCrop(
        nextZoom === 1.0 ? 0 : image.crop.panX,
        nextZoom === 1.0 ? 0 : image.crop.panY,
        nextZoom
      );
      onCropGestureEnd?.();
    }
  };

  // Touch Pinch-to-Zoom (Stage Zoom with two fingers)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      clearLongPress();
      isStagePinchRef.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialStageZoomRef.current = stageZoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const nextZoom = Math.max(
        0.4,
        Math.min(4.0, Number((initialStageZoomRef.current * ratio).toFixed(2)))
      );
      setStageZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
    isStagePinchRef.current = false;
    clearLongPress();
  };

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  if (!image) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-6 select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-neutral-400 shadow-glass">
          <Move className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium text-neutral-300">Görsel Seçilmedi</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs text-center">
          Düzenlemek için aşağıdaki şeritten bir kare seçin veya yeni fotoğraflar yükleyin.
        </p>
      </div>
    );
  }

  // Exact Aspect Ratio style
  let calculatedAspectRatio = "4 / 5";
  if (image.crop.aspectRatio === "9:16") {
    calculatedAspectRatio = "9 / 16";
  } else if (image.crop.aspectRatio === "1:1") {
    calculatedAspectRatio = "1 / 1";
  } else if (image.crop.aspectRatio === "original") {
    calculatedAspectRatio = `${image.originalWidth} / ${image.originalHeight}`;
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-hidden flex items-center justify-center bg-black min-h-0 w-full select-none ${
        compact ? "p-0 h-full w-full" : "px-1.5 py-1 sm:p-4 sm:pt-2"
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* CANVA / FIGMA STYLE ISOLATED STAGE WRAPPER */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden relative cursor-default"
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate3d(${stagePan.x}px, ${stagePan.y}px, 0) scale(${stageZoom})`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
          className={`relative transition-transform duration-75 ease-out flex items-center justify-center ${
            compact ? "w-full h-full" : ""
          }`}
        >
          {/* Aspect Ratio Cropped Viewport Box */}
          <div
            className={`relative rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-950 flex items-center justify-center touch-none select-none ${
              isPanningStage
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-crosshair active:cursor-move"
            } ${
              compact
                ? "w-full h-full"
                : "max-h-full max-w-full sm:max-h-[calc(100dvh-210px)] sm:max-w-[calc(100vw-32px)]"
            }`}
            style={compact ? undefined : { aspectRatio: calculatedAspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Render Canvas */}
            <canvas
              ref={canvasRef}
              className={`w-full h-full pointer-events-none ${
                compact ? "object-cover" : "object-contain"
              }`}
            />

            {/* Composition Guides */}
            {guide === "thirds" && (
              <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div />
              </div>
            )}

            {guide === "golden" && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-0 bottom-0 left-[38.2%] w-[1px] bg-white/30" />
                <div className="absolute top-0 bottom-0 left-[61.8%] w-[1px] bg-white/30" />
                <div className="absolute left-0 right-0 top-[38.2%] h-[1px] bg-white/30" />
                <div className="absolute left-0 right-0 top-[61.8%] h-[1px] bg-white/30" />
              </div>
            )}

            {guide === "frame" && (
              <div className="absolute inset-[10%] pointer-events-none z-10 border border-white/35 rounded-lg">
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white" />
              </div>
            )}

            <SocialOverlay type={overlay} />

            {/* Status Pills — Clean Apple Minimalist Overlay */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 flex-wrap">
              {showOriginal && (
                <span className="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/35 flex items-center gap-1 backdrop-blur-md shadow-sm">
                  <Eye className="w-3 h-3" />
                  <span>Orijinal</span>
                </span>
              )}
              {image.upscaleFactor > 1 && (
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 backdrop-blur-md shadow-sm">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{image.upscaleFactor}x Lanczos-3</span>
                </span>
              )}
              {isRendering && (
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-white/10 text-white/60 backdrop-blur-md animate-pulse">
                  60 FPS…
                </span>
              )}
            </div>

            {/* Crop Reset button (when crop pan/zoom is dirty) */}
            {(image.crop.zoom > 1 || image.crop.panX !== 0 || image.crop.panY !== 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateCrop(0, 0, 1.0);
                }}
                className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 hover:text-white transition-colors"
                title="Kadrajı Sıfırla"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FIGMA / CANVA FLOATING STAGE CONTROLS (Isolated Zoom & Pan Pill) */}
      {!compact && (
        <div className="absolute bottom-3 left-3 z-30 pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-neutral-950/80 backdrop-blur-2xl border border-white/15 shadow-xl text-neutral-300">
          <button
            type="button"
            onClick={() => setStageZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
            className="pressable p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            title="Uzaklaş"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setStageZoom(1.0);
              setStagePan({ x: 0, y: 0 });
            }}
            className="px-2 py-0.5 rounded-full hover:bg-white/10 font-mono text-[11px] text-white hover:text-amber-300 transition-colors"
            title="Ekrana Sığdır / Sıfırla (100%)"
          >
            {Math.round(stageZoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setStageZoom((z) => Math.min(4.0, Number((z + 0.2).toFixed(2))))}
            className="pressable p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            title="Yakınlaş"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {(stageZoom !== 1.0 || stagePan.x !== 0 || stagePan.y !== 0) && (
            <button
              type="button"
              onClick={() => {
                setStageZoom(1.0);
                setStagePan({ x: 0, y: 0 });
              }}
              className="pressable px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-amber-300 font-medium ml-0.5"
              title="Tuvali Sıfırla"
            >
              Fit
            </button>
          )}
        </div>
      )}
    </div>
  );
};
