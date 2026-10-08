"use client";

import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name (or use labelledBy) */
  label?: string;
  labelledBy?: string;
}

/** iOS-style on/off switch: 51×31 visual, 44×44 hit area, accent fill when on (CDS §9) */
export function Switch({ checked, onChange, disabled, label, labelledBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="touch-target shrink-0 rounded-full disabled:bg-transparent"
    >
      <span
        aria-hidden
        className={`relative block w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
          checked && !disabled ? "bg-accent-fill" : "bg-surface-2 border border-separator"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform duration-200 ${
            checked && !disabled ? "translate-x-[20px]" : ""
          }`}
        />
      </span>
    </button>
  );
}
