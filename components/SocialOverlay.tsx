"use client";

import React from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Share2,
  X,
  MoreHorizontal,
  Music,
  Plus,
} from "lucide-react";
import { SocialOverlay as SocialOverlayType } from "@/lib/types";

interface SocialOverlayProps {
  type: SocialOverlayType;
}

export const SocialOverlay: React.FC<SocialOverlayProps> = ({ type }) => {
  if (type === "none") return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* 1. INSTAGRAM STORY OVERLAY */}
      {type === "instagram-story" && (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-b from-black/60 via-transparent to-black/70 font-sans text-white">
          {/* Top Story Bars & Header */}
          <div className="space-y-2.5 pt-1">
            {/* Story progress segments */}
            <div className="flex items-center gap-1 w-full">
              <div className="h-[2px] flex-1 bg-white rounded-full shadow-sm" />
              <div className="h-[2px] flex-1 bg-white/40 rounded-full" />
              <div className="h-[2px] flex-1 bg-white/40 rounded-full" />
            </div>

            {/* Profile info & Close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full ring-2 ring-amber-400 p-[1px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold">
                    C
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-tight text-white drop-shadow-md">
                    curatestudio
                  </span>
                  <span className="text-[10px] text-white/70 font-medium">3s</span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center">
                <X className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          </div>

          {/* Bottom Message Input Bar */}
          <div className="flex items-center gap-3 pb-2">
            <div className="flex-1 h-11 px-4 rounded-full border border-white/30 bg-black/30 backdrop-blur-md flex items-center text-xs text-white/80">
              <span>Mesaj gönder...</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-white drop-shadow" />
            </div>
          </div>
        </div>
      )}

      {/* 2. TIKTOK STORY / VIDEO OVERLAY */}
      {type === "tiktok-story" && (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/80 font-sans text-white">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-white/90 drop-shadow">
            <span className="text-white/60">Takip Edilenler</span>
            <span className="text-white border-b-2 border-white pb-0.5">Sizin İçin</span>
            <span className="w-4" />
          </div>

          {/* Middle Right Actions & Bottom Caption */}
          <div className="flex items-end justify-between w-full pb-2">
            {/* Left Bottom Caption */}
            <div className="space-y-2 max-w-[70%]">
              <div className="text-sm font-semibold tracking-tight text-white drop-shadow">
                @curatestudio
              </div>
              <p className="text-xs text-white/90 line-clamp-2 drop-shadow leading-relaxed">
                analog tones & 35mm film aesthetics with lossless export 🎞️✨ #curate #photo #fyp
              </p>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Music className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[11px] truncate">Orijinal Ses - curatestudio audio</span>
              </div>
            </div>

            {/* Right Action Icons Column */}
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Profile with red plus badge */}
              <div className="relative mb-2">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-neutral-800 flex items-center justify-center text-xs font-bold shadow-lg">
                  C
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              {/* Like */}
              <div className="flex flex-col items-center gap-0.5">
                <Heart className="w-7 h-7 text-white fill-white/10 drop-shadow" />
                <span className="text-[10px] font-medium drop-shadow">28.4K</span>
              </div>

              {/* Comment */}
              <div className="flex flex-col items-center gap-0.5">
                <MessageCircle className="w-7 h-7 text-white fill-white/10 drop-shadow" />
                <span className="text-[10px] font-medium drop-shadow">942</span>
              </div>

              {/* Bookmark */}
              <div className="flex flex-col items-center gap-0.5">
                <Bookmark className="w-7 h-7 text-white fill-white/10 drop-shadow" />
                <span className="text-[10px] font-medium drop-shadow">4.1K</span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center gap-0.5">
                <Share2 className="w-7 h-7 text-white drop-shadow" />
                <span className="text-[10px] font-medium drop-shadow">1.2K</span>
              </div>

              {/* Spinning vinyl disc */}
              <div className="w-8 h-8 rounded-full border-2 border-neutral-700 bg-neutral-900 flex items-center justify-center animate-spin-slow shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. INSTAGRAM POST / CAROUSEL OVERLAY */}
      {type === "instagram-post" && (
        <div className="w-full h-full flex flex-col justify-between font-sans text-white">
          {/* Post Header */}
          <div className="p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 p-[1px] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-[10px] font-bold">
                  C
                </div>
              </div>
              <span className="text-xs font-semibold tracking-tight text-white drop-shadow">
                curatestudio
              </span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-white/80" />
          </div>

          {/* Post Footer Action Bar */}
          <div className="p-3.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <Heart className="w-5 h-5 text-white drop-shadow" />
                <MessageCircle className="w-5 h-5 text-white drop-shadow" />
                <Send className="w-5 h-5 text-white drop-shadow" />
              </div>

              {/* Carousel Pagination Dots */}
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-1 h-1 rounded-full bg-white/30" />
              </div>

              <Bookmark className="w-5 h-5 text-white drop-shadow" />
            </div>

            <div className="text-[11px] font-semibold text-white/95 drop-shadow">
              3,842 beğenme
            </div>
            <div className="text-[11px] text-white/90 drop-shadow line-clamp-1">
              <span className="font-semibold mr-1.5">curatestudio</span>
              analog film series 01 / dump curated with client-side canvas
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
