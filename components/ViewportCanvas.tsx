"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  CurateImage,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
} from "@/lib/types";
import { renderProcessedImage, getCropDimensions } from "@/lib/image/renderer";
import { SocialOverlay } from "./SocialOverlay";
import { Move, RefreshCw, Eye } from "lucide-react";

interface ViewportCanvasProps {
  image: CurateImage | null;
  referenceImage: CurateImage | null;
  guide: CompositionGuide;
  overlay: SocialOverlayType;
  showOriginal?: boolean;
  onUpdateCrop: (panX: number, panY: number, zoom: number) => void;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  image,
  referenceImage,
  guide,
  overlay,
  showOriginal = false,
  onUpdateCrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [refImageObj, setRefImageObj] = useState<HTMLImageElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Drag pan state
  const isDraggingRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });

  // Touch pinch-to-zoom state
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1.0);

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

  // Render canvas frame
  const renderFrame = useCallback(async () => {
    if (!image || !imageObj || !canvasRef.current) return;

    try {
      setIsRendering(true);
      const canvas = canvasRef.current;

      const baseCrop = getCropDimensions(
        imageObj.naturalWidth,
        imageObj.naturalHeight,
        image.crop.aspectRatio
      );

      const previewScale = Math.min(1, 1000 / Math.max(baseCrop.width, baseCrop.height));
      const targetW = Math.round(baseCrop.width * previewScale);
      const targetH = Math.round(baseCrop.height * previewScale);

      // If showOriginal is active, bypass filters for live before/after comparison
      const renderItem: CurateImage = showOriginal
        ? {
            ...image,
            filters: {
              ...image.filters,
              reinhardEnabled: false,
              grainEnabled: false,
              halationEnabled: false,
            },
          }
        : image;

      const processedData = await renderProcessedImage(
        imageObj,
        renderItem,
        refImageObj,
        targetW,
        targetH
      );

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(processedData, 0, 0);
      }
    } catch (err) {
      console.error("Render error:", err);
    } finally {
      setIsRendering(false);
    }
  }, [image, imageObj, refImageObj, showOriginal]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Pointer Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!image || !containerRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = { x: image.crop.panX, y: image.crop.panY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !image) return;
    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    const sensitivity = 1.4 / image.crop.zoom;
    const newPanX = startPanRef.current.x - dx * sensitivity;
    const newPanY = startPanRef.current.y - dy * sensitivity;

    onUpdateCrop(newPanX, newPanY, image.crop.zoom);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!image) return;
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const nextZoom = Math.max(1.0, Math.min(3.0, Number((image.crop.zoom + zoomDelta).toFixed(2))));
    onUpdateCrop(image.crop.panX, image.crop.panY, nextZoom);
  };

  // Double Click / Double Tap zoom toggle
  const handleDoubleClick = () => {
    if (!image) return;
    const nextZoom = image.crop.zoom > 1.2 ? 1.0 : 1.8;
    onUpdateCrop(nextZoom === 1.0 ? 0 : image.crop.panX, nextZoom === 1.0 ? 0 : image.crop.panY, nextZoom);
  };

  // Touch Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && image) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = image.crop.zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current && image) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const nextZoom = Math.max(1.0, Math.min(3.0, Number((initialPinchZoomRef.current * ratio).toFixed(2))));
      onUpdateCrop(image.crop.panX, image.crop.panY, nextZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

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
      className="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-black"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect Ratio Cropped Viewport Box */}
      <div
        className="relative max-h-[calc(100vh-210px)] max-w-[calc(100vw-32px)] rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-950 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none"
        style={{ aspectRatio: calculatedAspectRatio }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Render Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain pointer-events-none"
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
            {/* Vertical Phi lines at 38.2% and 61.8% */}
            <div className="absolute top-0 bottom-0 left-[38.2%] w-[1px] bg-white/30" />
            <div className="absolute top-0 bottom-0 left-[61.8%] w-[1px] bg-white/30" />
            {/* Horizontal Phi lines at 38.2% and 61.8% */}
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

        {/* Live Social Media Simulator Overlay */}
        <SocialOverlay type={overlay} />

        {/* Status Pills */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80">
            {image.crop.aspectRatio}
          </span>
          {image.crop.zoom > 1 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80">
              {image.crop.zoom.toFixed(1)}x
            </span>
          )}
          {showOriginal && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>Orijinal</span>
            </span>
          )}
        </div>

        {/* Reset Pan/Zoom Button */}
        {(image.crop.zoom > 1 || image.crop.panX !== 0 || image.crop.panY !== 0) && (
          <button
            onClick={() => onUpdateCrop(0, 0, 1.0)}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 hover:text-white transition-colors"
            title="Sıfırla"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
