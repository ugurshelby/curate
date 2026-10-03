"use client";

import React, { useEffect, useRef, useState } from "react";
import { StudioItem } from "@/lib";

interface FilmstripProps {
  items: StudioItem[];
  activeId: string | null;
  /** Dokunma (sürükleme yoksa) */
  onTap: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  /** Masaüstü sağ tık menüsü */
  onContextMenu?: (id: string, x: number, y: number) => void;
}

const LONG_PRESS_MS = 350;
const SCROLL_SLOP_PX = 8;
const MOUSE_DRAG_SLOP_PX = 6;

interface DragState {
  from: number;
  to: number;
  dx: number;
}

/**
 * Pointer Events ile sıralanabilir filmstrip (CDS §6.4, apple-design §2).
 * Dokunmatik: basılı tut (350ms) → sürükle, parmakla 1:1 takip. Fare: 6px hareketle sürükleme.
 * Yatay kaydırma, basılı tutma dolmadan hareket edilirse normal çalışır.
 */
export function Filmstrip({ items, activeId, onTap, onReorder, onContextMenu }: FilmstripProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pressRef = useRef<{
    index: number;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    el: HTMLDivElement;
    moved: boolean;
    timer: number | null;
    centers: number[];
    stride: number;
  } | null>(null);
  const draggingRef = useRef(false);
  const lastPointerTypeRef = useRef<string>("mouse");
  const [drag, setDrag] = useState<DragState | null>(null);

  // Sürükleme sırasında tarayıcının yatay kaydırmayı devralmasını engelle (non-passive)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const measure = () => {
    const rects = itemRefs.current.slice(0, items.length).map((n) => n?.getBoundingClientRect());
    const centers = rects.map((r) => (r ? r.left + r.width / 2 : 0));
    const stride = rects.length > 1 && rects[0] && rects[1] ? rects[1].left - rects[0].left : 66;
    return { centers, stride };
  };

  const startDrag = () => {
    const p = pressRef.current;
    if (!p) return;
    draggingRef.current = true;
    try {
      p.el.setPointerCapture(p.pointerId);
    } catch {
      /* pointer zaten bırakılmış olabilir */
    }
    if (p.pointerType !== "mouse" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
    setDrag({ from: p.index, to: p.index, dx: 0 });
  };

  const reset = () => {
    const p = pressRef.current;
    if (p?.timer) window.clearTimeout(p.timer);
    pressRef.current = null;
    draggingRef.current = false;
    setDrag(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const { centers, stride } = measure();
    pressRef.current = {
      index,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      el: e.currentTarget,
      moved: false,
      timer: null,
      centers,
      stride,
    };
    if (e.pointerType !== "mouse") {
      pressRef.current.timer = window.setTimeout(() => {
        if (pressRef.current && !pressRef.current.moved) startDrag();
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pressRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;

    if (!draggingRef.current) {
      const dist = Math.hypot(dx, dy);
      if (p.pointerType === "mouse") {
        if (dist > MOUSE_DRAG_SLOP_PX) {
          p.moved = true;
          startDrag();
        }
      } else if (dist > SCROLL_SLOP_PX) {
        // Basılı tutma dolmadan hareket: kullanıcı kaydırıyor
        p.moved = true;
        if (p.timer) window.clearTimeout(p.timer);
        pressRef.current = null;
      }
      return;
    }

    const draggedCenter = p.centers[p.index] + dx;
    let to = 0;
    let best = Infinity;
    p.centers.forEach((c, i) => {
      const d = Math.abs(c - draggedCenter);
      if (d < best) {
        best = d;
        to = i;
      }
    });
    setDrag({ from: p.index, to, dx });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, item: StudioItem) => {
    const p = pressRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    if (draggingRef.current) {
      const d = drag;
      reset();
      if (d && d.to !== d.from) onReorder(d.from, d.to);
      return;
    }
    const wasTap = !p.moved;
    reset();
    if (wasTap) onTap(item.id);
  };

  const offsetFor = (index: number): number => {
    if (!drag) return 0;
    const stride = pressRef.current?.stride ?? 66;
    if (index === drag.from) return drag.dx;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -stride;
    if (drag.from > drag.to && index < drag.from && index >= drag.to) return stride;
    return 0;
  };

  return (
    <div ref={scrollerRef} className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-1 px-0.5 min-w-0">
      {items.map((photo, index) => {
        const isActive = activeId === photo.id;
        const isDragged = drag?.from === index;
        const offset = offsetFor(index);
        return (
          <div
            key={photo.id}
            ref={(n) => {
              itemRefs.current[index] = n;
            }}
            role="button"
            tabIndex={0}
            aria-label={`${index + 1}. kare: ${photo.name}`}
            aria-current={isActive}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, photo)}
            onPointerCancel={reset}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTap(photo.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              // Android'de basılı tutma contextmenu tetikler; dokunmatikte menü sürüklemeye bırakılır
              if (lastPointerTypeRef.current !== "mouse") return;
              onContextMenu?.(photo.id, e.clientX, e.clientY);
            }}
            onDragStart={(e) => e.preventDefault()}
            style={{
              transform: `translate3d(${offset}px, 0, 0) scale(${isDragged ? 1.06 : 1})`,
              transition: isDragged ? "none" : "transform 160ms cubic-bezier(0.23, 1, 0.32, 1)",
              zIndex: isDragged ? 10 : undefined,
              touchAction: "pan-x",
            }}
            className={`relative w-14 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${
              isActive ? "border-[#f5a623]" : "border-white/15 opacity-80"
            } ${isDragged ? "shadow-2xl opacity-100" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.proxyUrl || photo.originalUrl}
              alt=""
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
            <span className="absolute top-0.5 left-0.5 min-w-[20px] px-1 rounded bg-black/75 text-xs leading-5 text-center text-white font-semibold num-metric pointer-events-none">
              {index + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
