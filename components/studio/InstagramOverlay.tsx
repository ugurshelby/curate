"use client";

import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X } from "lucide-react";

interface InstagramOverlayProps {
  type: "post" | "story";
  isDarkBg?: boolean;
}

export function InstagramOverlay({ type, isDarkBg = true }: InstagramOverlayProps) {
  const textColor = isDarkBg ? "text-white" : "text-zinc-900";
  const mutedText = isDarkBg ? "text-white/70" : "text-zinc-600";
  const progressBg = isDarkBg ? "bg-white/40" : "bg-black/25";
  const progressActive = isDarkBg ? "bg-white" : "bg-black";

  if (type === "post") {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 text-white select-none">
        {/* Yalnız üst ve alt bantlarda hafif karartma: fotoğrafın rengi ortada değişmez */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Üst Bar */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-fuchsia-600 p-[1.5px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                C
              </div>
            </div>
            <span className="text-xs font-semibold drop-shadow-md">curatestudio</span>
          </div>
          <MoreHorizontal className="w-4 h-4 drop-shadow-md" />
        </div>

        {/* Alt Bar */}
        <div className="relative flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 drop-shadow-md" />
              <MessageCircle className="w-5 h-5 drop-shadow-md" />
              <Send className="w-5 h-5 drop-shadow-md" />
            </div>
            <Bookmark className="w-5 h-5 drop-shadow-md" />
          </div>
          <div className="text-xs drop-shadow-md truncate">
            <span className="font-semibold mr-1.5">curatestudio</span>
            <span className="text-white/80">35mm contact sheet curation · dump_01</span>
          </div>
        </div>
      </div>
    );
  }

  // Story Overlay
  return (
    <div aria-hidden className={`absolute inset-0 pointer-events-none z-20 flex flex-col p-3 select-none ${textColor}`}>
      {/* Üst Progress Çubukları & Başlık */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center gap-1 w-full">
          <div className={`h-[2px] flex-1 rounded-full ${progressActive}`} />
          <div className={`h-[2px] flex-1 rounded-full ${progressBg}`} />
          <div className={`h-[2px] flex-1 rounded-full ${progressBg}`} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#f5a623] flex items-center justify-center text-black font-bold text-xs shadow-sm">
              C
            </div>
            <span className="text-xs font-semibold drop-shadow-sm">curatestudio</span>
            <span className={`text-xs ${mutedText}`}>2s</span>
          </div>
          <X className="w-4 h-4 drop-shadow-sm cursor-pointer" />
        </div>
      </div>

      {/* "Mesaj gönder" çubuğu mockup süsüydü ve hücreleri kapatıyordu; sahneden çıkarıldı (M1) */}
    </div>
  );
}
