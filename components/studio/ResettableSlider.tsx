"use client";

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
}: ResettableSliderProps) {
  const isDefault = value === defaultValue;

  return (
    <div className="flex flex-col gap-1.5 w-full select-none">
      <div className="flex items-center justify-between text-xs">
        <span 
          className="text-[#a1a1aa] cursor-pointer hover:text-white transition-colors"
          onDoubleClick={() => onChange(defaultValue)}
          title="Sıfırlamak için çift tıklayın"
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#f5f5f7]">
            {value > 0 && defaultValue === 0 ? `+${value}` : value}
            {unit}
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(defaultValue)}
              className="text-[10px] text-[#f5a623] hover:underline"
              title="Varsayılana sıfırla"
            >
              sıfırla
            </button>
          )}
        </div>
      </div>

      <div className="relative flex items-center h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={() => onChange(defaultValue)}
          className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
        />
      </div>
    </div>
  );
}
