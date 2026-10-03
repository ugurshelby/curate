"use client";

import { useRef } from "react";

/**
 * Ortak dokunma hareketi (apple-design §2): 1 parmak kaydır, 2 parmak yakınlaştır, 1:1 takip.
 * Story hücreleri ve Düzenle → Kırp aynı hook'u kullanır; sınır ve rubber-band hesabı çağıranda
 * (lib/engine/story-layout.ts → rubberband).
 */

export interface PanPinchDelta {
  /** Toplam ekran kayması (px) */
  dx: number;
  dy: number;
  /** Toplam ölçek (iki parmak) */
  scale: number;
}

interface PanPinchHandlers<K> {
  /** Hareket başlıyor; false dönerse yok sayılır */
  onStart?: (key: K) => boolean | void;
  onMove: (key: K, delta: PanPinchDelta) => void;
  onEnd: (key: K, delta: PanPinchDelta & { tap: boolean }) => void;
  onCancel?: (key: K) => void;
  /** Bu kadar hareket olmadan bırakılırsa dokunma sayılır */
  tapSlop?: number;
}

interface Session<K> {
  key: K;
  pointers: Map<number, { x: number; y: number }>;
  starts: Map<number, { x: number; y: number }>;
  acc: PanPinchDelta;
  moved: boolean;
  multi: boolean;
}

function currentDelta<K>(s: Session<K>): PanPinchDelta {
  const ids = Array.from(s.pointers.keys()).filter((id) => s.starts.has(id));
  let dx = 0;
  let dy = 0;
  let scale = 1;
  if (ids.length >= 2) {
    const a = s.pointers.get(ids[0])!;
    const b = s.pointers.get(ids[1])!;
    const a0 = s.starts.get(ids[0])!;
    const b0 = s.starts.get(ids[1])!;
    const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
    scale = Math.hypot(a.x - b.x, a.y - b.y) / d0;
    dx = (a.x + b.x) / 2 - (a0.x + b0.x) / 2;
    dy = (a.y + b.y) / 2 - (a0.y + b0.y) / 2;
  } else if (ids.length === 1) {
    const p = s.pointers.get(ids[0])!;
    const p0 = s.starts.get(ids[0])!;
    dx = p.x - p0.x;
    dy = p.y - p0.y;
  }
  return { dx: s.acc.dx + dx, dy: s.acc.dy + dy, scale: s.acc.scale * scale };
}

export function usePanPinch<K>(handlers: PanPinchHandlers<K>) {
  const sessionRef = useRef<Session<K> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const bind = (key: K) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer artık aktif değil */
      }
      let s = sessionRef.current;
      if (!s || s.key !== key) {
        if (handlersRef.current.onStart?.(key) === false) return;
        s = { key, pointers: new Map(), starts: new Map(), acc: { dx: 0, dy: 0, scale: 1 }, moved: false, multi: false };
        sessionRef.current = s;
      } else {
        // Yeni parmak: o ana kadarki hareketi biriktir, tüm parmaklar için yeni başlangıç
        s.acc = currentDelta(s);
        s.pointers.forEach((p, id) => s!.starts.set(id, { ...p }));
        s.multi = true;
      }
      const p = { x: e.clientX, y: e.clientY };
      s.pointers.set(e.pointerId, p);
      s.starts.set(e.pointerId, { ...p });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || !s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const start = s.starts.get(e.pointerId);
      const slop = handlersRef.current.tapSlop ?? 6;
      if (start && !s.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > slop) s.moved = true;
      if (s.moved || s.multi) handlersRef.current.onMove(s.key, currentDelta(s));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || !s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const delta = currentDelta(s);
      sessionRef.current = null;
      handlersRef.current.onEnd(s.key, { ...delta, tap: !s.moved && !s.multi });
    },
    onPointerCancel: () => {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (s) handlersRef.current.onCancel?.(s.key);
    },
  });

  return { bind, isActive: () => sessionRef.current !== null };
}
