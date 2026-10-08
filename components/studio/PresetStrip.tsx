"use client";

import React, { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { CURATE_PRESETS, calculateAspectCrop, applyPresetToImageData, measureScene, suggestScene, SceneSuggestion } from "@/lib";
import { tr } from "@/lib/i18n/tr";

export const PRESET_THUMB_W = 100;
export const PRESET_THUMB_H = 76;

/** UI name of a preset id (Turkish copy in lib/i18n/tr.ts) */
export function presetName(id: string | null): string {
  if (!id) return tr.presets.original;
  return tr.presets.items[id]?.name ?? id;
}

/** Akıllı Otomatik for one photo: statistics of a ≤ 256 px copy (no AI, nothing leaves the device) */
export function suggestFromImage(src: string): Promise<SceneSuggestion | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const s = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * s));
      const h = Math.max(1, Math.round(img.naturalHeight * s));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(suggestScene(measureScene(ctx.getImageData(0, 0, w, h))));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Preset card previews: a small copy of the photo (proxy) through the preset function itself.
 * Key: preset id, "raw" = no preset.
 */
export function usePresetThumbs(src: string | null): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!src) {
      setThumbs({});
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = PRESET_THUMB_W;
      c.height = PRESET_THUMB_H;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const crop = calculateAspectCrop(img.naturalWidth, img.naturalHeight, PRESET_THUMB_W, PRESET_THUMB_H);
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, PRESET_THUMB_W, PRESET_THUMB_H);
      const base = ctx.getImageData(0, 0, PRESET_THUMB_W, PRESET_THUMB_H);
      const out: Record<string, string> = { raw: c.toDataURL("image/jpeg", 0.8) };
      for (const p of CURATE_PRESETS) {
        const copy = new ImageData(new Uint8ClampedArray(base.data), PRESET_THUMB_W, PRESET_THUMB_H);
        ctx.putImageData(applyPresetToImageData(copy, p, 1), 0, 0);
        out[p.id] = c.toDataURL("image/jpeg", 0.8);
      }
      setThumbs(out);
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return thumbs;
}

interface PresetStripProps {
  thumbs: Record<string, string>;
  /** Selected card: preset id, null = original */
  activeId: string | null;
  onSelect: (presetId: string | null) => void;
  /** Akıllı Otomatik: picks preset + amount from the scene (first card) */
  onAuto?: () => void;
}

/** One horizontally scrolling row (CDS §6.3); Carousel and Düzenle share it */
export function PresetStrip({ thumbs, activeId, onSelect, onAuto }: PresetStripProps) {
  const cards = [
    { id: null as string | null, name: tr.presets.original, hint: "" },
    ...CURATE_PRESETS.map((p) => ({ id: p.id as string | null, name: presetName(p.id), hint: tr.presets.items[p.id]?.hint ?? "" })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-3 px-3">
      {onAuto && (
        <button
          type="button"
          onClick={onAuto}
          title={tr.presets.autoHint}
          className="press shrink-0 snap-start rounded-xl border-2 border-separator bg-surface-2 flex flex-col items-center justify-center gap-1.5 text-ink-1"
          style={{ width: PRESET_THUMB_W - 24, height: PRESET_THUMB_H }}
        >
          <Wand2 className="w-5 h-5" />
          <span className="text-xs font-semibold">{tr.presets.auto}</span>
        </button>
      )}
      {cards.map((p) => {
        const isActive = activeId === p.id;
        const thumb = thumbs[p.id ?? "raw"];
        return (
          <button
            key={p.id ?? "raw"}
            type="button"
            title={p.hint || undefined}
            aria-pressed={isActive}
            data-preset={p.id ?? "raw"}
            onClick={() => onSelect(p.id)}
            className={`press relative shrink-0 snap-start rounded-xl overflow-hidden border-2 bg-surface-2 ${isActive ? "border-accent" : "border-separator"}`}
            style={{ width: PRESET_THUMB_W, height: PRESET_THUMB_H }}
          >
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4 bg-gradient-to-t from-black/85 to-transparent text-left text-xs font-semibold leading-tight text-white">
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
