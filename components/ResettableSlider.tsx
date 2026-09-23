"use client";

import React from "react";

interface ResettableSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onChange: (value: number) => void;
  suffix?: string;
  accentClassName?: string;
  className?: string;
}

/**
 * Range input that resets to `defaultValue` on double-click (mouse)
 * or double-tap (touch via rapid successive pointerdowns).
 */
export const ResettableSlider: React.FC<ResettableSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onChange,
  suffix = "",
  accentClassName = "",
  className = "",
}) => {
  const lastTapRef = React.useRef(0);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(defaultValue);
  };

  const handlePointerDown = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      onChange(defaultValue);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-[10px] text-neutral-400 shrink-0 min-w-[2.5rem]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        title={`Çift tıkla / çift dokun: varsayılan (${defaultValue}${suffix})`}
        className={`flex-1 cursor-pointer ${accentClassName}`}
      />
      <span className="font-mono text-[10px] text-neutral-300 w-8 text-right shrink-0">
        {suffix === "%" ? `%${value}` : `${value}${suffix}`}
      </span>
    </div>
  );
};
