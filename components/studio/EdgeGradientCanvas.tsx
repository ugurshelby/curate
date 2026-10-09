"use client";

import React, { useEffect, useRef } from "react";
import { paintEdgeGradient, type EdgeGradientSpec } from "@/lib";

/** Preview render size: half of the Story export (1080×1920); same paint function as the export (D33) */
const PREVIEW_W = 540;
const PREVIEW_H = 960;

/** Fills its parent with the smart edge gradient; drawn only when the spec changes */
export function EdgeGradientCanvas({ spec }: { spec: EdgeGradientSpec }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) paintEdgeGradient(ctx, PREVIEW_W, PREVIEW_H, spec);
  }, [spec]);
  return <canvas ref={ref} width={PREVIEW_W} height={PREVIEW_H} aria-hidden className="absolute inset-0 h-full w-full" data-edge-gradient />;
}
