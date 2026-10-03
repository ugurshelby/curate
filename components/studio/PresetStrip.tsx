"use client";

import React, { useEffect, useState } from "react";
import { CURATE_PRESETS, calculateAspectCrop, applyPresetToImageData } from "@/lib";

const PRESET_TAGS: Record<string, string> = {
  moody_teal: "Mimari & Teal",
  warm_silhouette: "Siluet & Ters Işık",
  night_cinematic: "Neon & Halation",
  muted_coastal: "Pastel & Ferah",
  amber_grain: "35mm Analog Gren",
  monochrome_noir: "Grafik B&W",
};

export const PRESET_THUMB_W = 100;
export const PRESET_THUMB_H = 76;

/**
 * Preset kartı önizlemeleri: fotoğrafın küçük kopyası (proxy), preset fonksiyonunun kendisiyle.
 * Anahtar: preset kimliği, "raw" = preset'siz.
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
  /** Seçili kart: preset kimliği, null = Doğal */
  activeId: string | null;
  onSelect: (presetId: string | null) => void;
}

/** Yatay kaydırmalı tek satır preset kartları (CDS §6.3); Carousel ve Düzenle ortak */
export function PresetStrip({ thumbs, activeId, onSelect }: PresetStripProps) {
  const cards = [
    { id: null as string | null, name: "Doğal", tag: "Orijinal renk" },
    ...CURATE_PRESETS.map((p) => ({ id: p.id as string | null, name: p.name, tag: PRESET_TAGS[p.id] ?? p.category })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-3 px-3">
      {cards.map((p) => {
        const isActive = activeId === p.id;
        const thumb = thumbs[p.id ?? "raw"];
        return (
          <button
            key={p.id ?? "raw"}
            type="button"
            title={p.tag}
            aria-pressed={isActive}
            onClick={() => onSelect(p.id)}
            className={`press relative shrink-0 snap-start rounded-xl overflow-hidden border-2 bg-surface-2 ${isActive ? "border-accent" : "border-separator"}`}
            style={{ width: PRESET_THUMB_W, height: PRESET_THUMB_H }}
          >
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4 bg-gradient-to-t from-black/85 to-transparent text-left text-xs font-semibold leading-tight text-ink-1">
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
