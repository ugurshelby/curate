"use client";

import { tr } from "@/lib/i18n/tr";
import React from "react";

interface ResettableSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (value: number) => void;
  /** Sürükleme başladı/bitti (önizleme sürüklerken taslak çözünürlükte çizer) */
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function ResettableSlider({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  unit = "",
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: ResettableSliderProps) {
  const isDefault = value === defaultValue;

  return (
    <div className="flex flex-col w-full select-none">
      <div className="flex items-center justify-between gap-2 text-sm min-h-[28px]">
        <span className="text-ink-2 truncate">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-ink-1 num-metric">
            {value > 0 && defaultValue === 0 ? `+${value}` : value}
            {unit}
          </span>
          {!isDefault && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="-my-2 h-11 px-2 text-xs text-ink-2"
              title={tr.common.resetToDefault}
            >
              {tr.common.reset}
            </button>
          )}
        </div>
      </div>

      {/* 44px dokunma yüksekliği; görünen iz ince kalır */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={onInteractionStart}
        onPointerUp={onInteractionEnd}
        onPointerCancel={onInteractionEnd}
        onBlur={onInteractionEnd}
        onDoubleClick={() => onChange(defaultValue)}
        className="w-full h-11 bg-transparent cursor-pointer accent-accent"
      />
    </div>
  );
}
