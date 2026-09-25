"use client";

import React, { useState, useRef, useEffect } from "react";
import { HistorySnapshot } from "@/lib/history";
import { History, Check, Clock, ChevronRight, RotateCcw } from "lucide-react";

interface VersionsPopoverProps {
  timeline: {
    entries: HistorySnapshot[];
    currentIndex: number;
  };
  onJumpToVersion: (index: number) => void;
  className?: string;
}

export const VersionsPopover: React.FC<VersionsPopoverProps> = ({
  timeline,
  onJumpToVersion,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const { entries, currentIndex } = timeline;

  if (entries.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`pressable px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all backdrop-blur-md border ${
          isOpen
            ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-semibold"
            : "bg-white/5 hover:bg-white/10 text-white/90 border-white/15 hover:border-white/30"
        }`}
        title="Geçmiş Adımları / Snapshot Sürümleri (Versions)"
      >
        <History className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Versions</span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300">
          {currentIndex + 1}/{entries.length}
        </span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2.5 z-50 animate-fade-in flex flex-col gap-1 max-h-[360px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Geçmiş Adımları (Versions)</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {entries.length} snapshot
            </span>
          </div>

          {/* List of Steps */}
          <div className="overflow-y-auto flex-1 py-1 space-y-1 scrollbar-thin">
            {entries.map((step, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    onJumpToVersion(idx);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all group ${
                    isCurrent
                      ? "bg-amber-500/15 border border-amber-400/50 text-white shadow-sm"
                      : isPast
                      ? "text-neutral-300 hover:bg-white/5 hover:text-white"
                      : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status dot / check */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono ${
                        isCurrent
                          ? "bg-amber-400 text-black font-bold"
                          : isPast
                          ? "bg-white/10 text-neutral-400"
                          : "border border-white/20 text-neutral-600"
                      }`}
                    >
                      {idx === 0 ? "0" : idx}
                    </div>

                    <div className="truncate min-w-0">
                      <div
                        className={`truncate font-medium ${
                          isCurrent
                            ? "text-amber-300"
                            : isPast
                            ? "text-neutral-200"
                            : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {new Date(step.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 shrink-0">
                      Aktif
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white transition-colors shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Reset to Original */}
          {currentIndex > 0 && (
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onJumpToVersion(0);
                  setIsOpen(false);
                }}
                className="w-full text-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Orijinal Ham Hale Dön (Adım 0)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
