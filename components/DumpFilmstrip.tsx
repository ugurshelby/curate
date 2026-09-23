"use client";

import React, { useRef, useState } from "react";
import { CurateImage } from "@/lib/types";
import { Plus, Trash2, Star, GripVertical, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

interface DumpFilmstripProps {
  images: CurateImage[];
  activeImageId: string | null;
  referenceImageId: string | null;
  onSelectImage: (id: string) => void;
  onSetReference: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onReorder: (sourceIndex: number, destIndex: number) => void;
  onUploadClick: () => void;
  compact?: boolean;
}

export const DumpFilmstrip: React.FC<DumpFilmstripProps> = ({
  images,
  activeImageId,
  referenceImageId,
  onSelectImage,
  onSetReference,
  onDeleteImage,
  onReorder,
  onUploadClick,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const offset = direction === "left" ? -240 : 240;
      containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className={`relative select-none z-20 ${compact ? "border-t-0 bg-transparent px-2 py-2 pb-safe" : "border-t border-white/10 bg-neutral-950/85 backdrop-blur-xl px-4 py-3 pb-safe"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Scroll Left Button */}
        {images.length > 4 && (
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            title="Sola Kaydır"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Filmstrip cards container */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto py-1 scrollbar-none"
          style={{ touchAction: "pan-x" }}
        >
          {images.map((item, index) => {
            const isActive = item.id === activeImageId;
            const isReference = item.id === referenceImageId;
            const isDragging = draggedIndex === index;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => onSelectImage(item.id)}
                className={`relative flex-shrink-0 group cursor-pointer rounded-xl overflow-hidden transition-all duration-150 ${
                  isActive
                    ? "ring-2 ring-white scale-[1.02] shadow-glass"
                    : "ring-1 ring-white/15 hover:ring-white/30 opacity-80 hover:opacity-100"
                } ${isDragging ? "opacity-30 scale-95" : ""}`}
                style={{ width: "96px", height: "116px" }}
              >
                {/* Thumbnail Image */}
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Index badge */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono font-medium text-white/90">
                  {String(index + 1).padStart(2, "0")}
                </div>

                {/* Reference Star Button (Always visible on touch, subtle on desktop hover) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetReference(item.id);
                  }}
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    isReference
                      ? "bg-amber-500 text-black shadow-md opacity-100"
                      : "bg-black/60 text-white/70 hover:text-amber-400 hover:bg-black/85 opacity-70 group-hover:opacity-100"
                  }`}
                  title={isReference ? "Aktif Referans Kare" : "Referans Kare Olarak Belirle"}
                >
                  <Star className={`w-3.5 h-3.5 ${isReference ? "fill-black" : ""}`} />
                </button>

                {/* Card Controls Strip at Bottom (Always accessible) */}
                <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-between px-1.5">
                  {/* Left / Right Quick Reorder Arrows */}
                  <div className="flex items-center gap-0.5">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(index, index - 1);
                        }}
                        className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
                        title="Sola Taşı"
                      >
                        <ArrowLeft className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {index < images.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(index, index + 1);
                        }}
                        className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
                        title="Sağa Taşı"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(item.id);
                    }}
                    className="p-1 rounded text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title="Görseli Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Image Card */}
          <button
            onClick={onUploadClick}
            className="flex-shrink-0 w-[96px] h-[116px] rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1.5 text-neutral-400 hover:text-white transition-all group pressable"
          >
            <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">Kare Ekle</span>
          </button>
        </div>

        {/* Scroll Right Button */}
        {images.length > 4 && (
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            title="Sağa Kaydır"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
