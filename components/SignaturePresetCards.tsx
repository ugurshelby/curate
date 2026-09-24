"use client";

import React from "react";
import { FilmPreset } from "@/lib/types";
import { SIGNATURE_PRESETS } from "@/lib/image/film-presets";
import { Sparkles, CopyCheck, Check, Info } from "lucide-react";

interface SignaturePresetCardsProps {
  activePresetId: string | null;
  onSelectPreset: (preset: FilmPreset) => void;
  onBatchApplyPreset?: (preset: FilmPreset) => void;
  recommendedPresetId?: string | null;
  recommendationReason?: string | null;
  previewThumbs?: Record<string, string>;
  isCompact?: boolean;
}

const SIGNATURE_GRADIENTS: Record<string, string> = {
  "moody-teal": "linear-gradient(135deg, #0d212b 0%, #154553 45%, #3b8e96 100%)",
  "warm-silhouette": "linear-gradient(135deg, #1f0b04 0%, #6e250c 40%, #c2410c 75%, #f59e0b 100%)",
  "night-cinematic": "linear-gradient(135deg, #090a10 0%, #171635 45%, #0891b2 80%, #e11d48 100%)",
  "muted-coastal": "linear-gradient(135deg, #1e293b 0%, #475569 45%, #94a3b8 80%, #cbd5e1 100%)",
  "amber-grain": "linear-gradient(135deg, #241306 0%, #5e2808 40%, #9a3412 70%, #d97706 100%)",
};

export const SignaturePresetCards: React.FC<SignaturePresetCardsProps> = ({
  activePresetId,
  onSelectPreset,
  onBatchApplyPreset,
  recommendedPresetId,
  recommendationReason,
  previewThumbs = {},
  isCompact = false,
}) => {
  const [syncedId, setSyncedId] = React.useState<string | null>(null);

  const handleBatchClick = (e: React.MouseEvent, preset: FilmPreset) => {
    e.stopPropagation();
    if (onBatchApplyPreset) {
      onBatchApplyPreset(preset);
      setSyncedId(preset.id);
      setTimeout(() => setSyncedId(null), 1800);
    }
  };

  return (
    <div className="space-y-2 select-none">
      {/* Cards Grid */}
      <div
        className={
          isCompact
            ? "grid grid-cols-2 gap-2"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5"
        }
      >
        {SIGNATURE_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isRecommended = recommendedPresetId === preset.id;
          const isSynced = syncedId === preset.id;
          const thumbUrl = previewThumbs[preset.id];
          const fallbackGradient =
            SIGNATURE_GRADIENTS[preset.id] ||
            "linear-gradient(135deg, #262626 0%, #404040 100%)";

          return (
            <div
              key={preset.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectPreset(preset)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPreset(preset);
                }
              }}
              className={`group relative text-left rounded-xl p-2.5 border transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-[0.98] ${
                isActive
                  ? "bg-amber-500/[0.12] border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/50"
                  : isRecommended
                  ? "bg-white/[0.05] border-amber-400/50 hover:border-amber-400/80 hover:bg-white/[0.08] shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                  : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Visual Preview Swatch / Live Photo Thumbnail */}
                <div
                  className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-sm bg-neutral-900"
                  style={{ background: fallbackGradient }}
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-end p-1">
                      <span className="text-[9px] font-mono uppercase text-white/70 bg-black/60 px-1 py-0.5 rounded">
                        {preset.tag.split("&")[0]}
                      </span>
                    </div>
                  )}

                  {/* Analog texture overlay simulation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* Active Indicator Checkmark */}
                  {isActive && (
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Card Meta Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-semibold tracking-tight truncate ${
                            isActive ? "text-amber-300" : "text-white"
                          }`}
                        >
                          {preset.name}
                        </span>

                        {isRecommended && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0"
                            title={
                              recommendationReason ||
                              "Fotoğrafının ışık ve kontrast dağılımına göre önerildi"
                            }
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Önerilen</span>
                          </span>
                        )}
                      </div>

                      {/* Batch Sync Quick Button (Spec 3.4) */}
                      {onBatchApplyPreset && (
                        <button
                          type="button"
                          onClick={(e) => handleBatchClick(e, preset)}
                          className={`pressable p-1.5 rounded-md border text-[10px] flex items-center gap-1 transition-all ${
                            isSynced
                              ? "bg-emerald-500 text-black border-emerald-500 font-semibold"
                              : "text-neutral-400 hover:text-white bg-white/5 hover:bg-white/15 border-white/10"
                          }`}
                          title="Bu preset'i serideki tüm fotoğraflara uygula (Batch Sync)"
                        >
                          {isSynced ? (
                            <Check className="w-3 h-3 text-current" />
                          ) : (
                            <CopyCheck className="w-3 h-3 text-current" />
                          )}
                          <span className="hidden xl:inline text-[9px]">
                            {isSynced ? "Eşitlendi" : "Seriye"}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-neutral-300 truncate">
                      {preset.tag}
                    </div>

                    <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {preset.contextNote || preset.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
