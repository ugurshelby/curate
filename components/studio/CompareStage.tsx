"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { clampDetailView, detailOffset, visibleResultRect, type DetailView, type PixelRect } from "@/lib";

/** Press shorter than this is a tap, not a hold (same as the AI review screen before) */
const HOLD_MS = 150;
/** Finger travel that turns a press into a pan */
const MOVE_PX = 6;
const DOUBLE_TAP_MS = 300;
const KEY_PAN_PX = 80;

export interface CompareTile {
  /** Pixels for `rect` (result space), drawn over the after image in the detail view */
  data: ImageData;
  rect: PixelRect;
}

interface CompareStageProps {
  beforeUrl: string;
  afterUrl: string;
  /** Size of the after image (result space) */
  resultW: number;
  resultH: number;
  /** Chip text while the after image is shown */
  afterLabel: string;
  detail: boolean;
  onDetailChange: (on: boolean) => void;
  /** Exact pixels for the visible part (Standart: Lanczos on a crop); null = after image only */
  tile?: CompareTile | null;
  /** Visible result rectangle once a pan settles in the detail view */
  onVisibleChange?: (visible: PixelRect) => void;
  /** Fit view only, hidden while the original is shown (AI review "look here" box) */
  overlay?: React.ReactNode;
  className?: string;
}

/**
 * Before/after without a divider: the after image fills the stage, press and hold shows the original.
 * Double tap (or the parent's button) opens a 100% view: one result pixel per CSS pixel, drag to pan,
 * so a real resolution change is visible on a phone screen.
 */
export function CompareStage({
  beforeUrl,
  afterUrl,
  resultW,
  resultH,
  afterLabel,
  detail,
  onDetailChange,
  tile,
  onVisibleChange,
  overlay,
  className = "",
}: CompareStageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tileRef = useRef<HTMLCanvasElement | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<DetailView>({ cx: 0.5, cy: 0.5 });
  const [settled, setSettled] = useState<DetailView>({ cx: 0.5, cy: 0.5 });
  const [holding, setHolding] = useState(false);
  const press = useRef<{ id: number; x: number; y: number; view: DetailView; moved: boolean } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback(
    (v: DetailView) => clampDetailView(v, stage.w, stage.h, resultW, resultH),
    [stage.w, stage.h, resultW, resultH],
  );

  // report the visible rectangle whenever the detail view settles
  useEffect(() => {
    if (!detail || !onVisibleChange || stage.w === 0 || resultW === 0) return;
    onVisibleChange(visibleResultRect(clamp(settled), stage.w, stage.h, resultW, resultH));
  }, [detail, settled, stage.w, stage.h, resultW, resultH, clamp, onVisibleChange]);

  useEffect(() => {
    const c = tileRef.current;
    if (!c || !tile) return;
    c.width = tile.data.width;
    c.height = tile.data.height;
    c.getContext("2d")?.putImageData(tile.data, 0, 0);
  }, [tile]);

  const clearHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  /** Normalized result point under a stage point in the fit view (object-contain box) */
  const fitPoint = (px: number, py: number): DetailView => {
    const s = Math.min(stage.w / resultW, stage.h / resultH);
    const bw = resultW * s;
    const bh = resultH * s;
    return { cx: (px - (stage.w - bw) / 2) / bw, cy: (py - (stage.h - bh) / 2) / bh };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const now = performance.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(x - prev.x, y - prev.y) < 24) {
      lastTap.current = null;
      clearHold();
      if (detail) {
        onDetailChange(false);
      } else {
        const p = clamp(fitPoint(x, y));
        setView(p);
        setSettled(p);
        onDetailChange(true);
      }
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is a convenience (keeps the pan when the finger leaves the stage); hold and pan work without it
    }
    press.current = { id: e.pointerId, x, y, view, moved: false };
    clearHold();
    holdTimer.current = window.setTimeout(() => setHolding(true), HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - p.x;
    const dy = e.clientY - r.top - p.y;
    if (!p.moved && Math.hypot(dx, dy) < MOVE_PX) return;
    if (!detail) return;
    if (!p.moved) {
      p.moved = true;
      if (!holding) clearHold();
    }
    setView(clamp({ cx: p.view.cx - dx / resultW, cy: p.view.cy - dy / resultH }));
  };

  const endPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    clearHold();
    setHolding(false);
    if (p.moved) {
      setSettled(view);
      lastTap.current = null;
    } else {
      lastTap.current = { t: performance.now(), x: p.x, y: p.y };
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!detail) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_PAN_PX, 0],
      ArrowRight: [KEY_PAN_PX, 0],
      ArrowUp: [0, -KEY_PAN_PX],
      ArrowDown: [0, KEY_PAN_PX],
    };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    const next = clamp({ cx: view.cx + d[0] / resultW, cy: view.cy + d[1] / resultH });
    setView(next);
    setSettled(next);
  };

  const v = clamp(view);
  const off = detailOffset(v, stage.w, stage.h, resultW, resultH);
  const detailBox: React.CSSProperties = {
    position: "absolute",
    left: off.left,
    top: off.top,
    width: resultW,
    height: resultH,
    maxWidth: "none",
    maxHeight: "none",
  };

  return (
    <div
      ref={rootRef}
      data-compare-stage
      data-detail={detail ? "1" : "0"}
      tabIndex={0}
      role="img"
      aria-label={`${afterLabel}. ${tr.compare.hint}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full overflow-hidden select-none touch-none outline-none ${detail ? "cursor-grab" : ""} ${className}`}
    >
      {detail ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterUrl} alt="" draggable={false} className="pointer-events-none" style={detailBox} />
          {tile && (
            <canvas
              ref={tileRef}
              className="absolute pointer-events-none"
              style={{ left: off.left + tile.rect.x, top: off.top + tile.rect.y, width: tile.rect.w, height: tile.rect.h }}
            />
          )}
          {holding && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={beforeUrl} alt="" draggable={false} className="pointer-events-none" style={detailBox} />
          )}
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={holding ? beforeUrl : afterUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          {!holding && overlay}
        </>
      )}

      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white pointer-events-none">
        {holding ? tr.common.original : afterLabel}
        {detail ? ` · ${tr.compare.detailBadge}` : ""}
      </span>
    </div>
  );
}
