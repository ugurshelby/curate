"use client";

import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X } from "lucide-react";

interface InstagramOverlayProps {
  type: "post" | "story";
}

export function InstagramOverlay({ type }: InstagramOverlayProps) {
  if (type === "post") {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3.5 text-white bg-gradient-to-b from-black/50 via-transparent to-black/60">
        {/* Üst Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-fuchsia-600 p-[1.5px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold">
                C
              </div>
            </div>
            <span className="text-xs font-semibold drop-shadow-md">curatestudio</span>
          </div>
          <MoreHorizontal className="w-4 h-4 drop-shadow-md" />
        </div>

        {/* Alt Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 drop-shadow-md" />
              <MessageCircle className="w-5 h-5 drop-shadow-md" />
              <Send className="w-5 h-5 drop-shadow-md" />
            </div>
            <Bookmark className="w-5 h-5 drop-shadow-md" />
          </div>
          <div className="text-[11px] drop-shadow-md">
            <span className="font-semibold mr-1.5">curatestudio</span>
            <span className="text-white/80">35mm contact sheet curation · dump_01</span>
          </div>
        </div>
      </div>
    );
  }

  // Story Overlay
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 text-white">
      {/* Üst Progress Çubukları & Başlık */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center gap-1 w-full">
          <div className="h-[2px] flex-1 bg-white rounded-full" />
          <div className="h-[2px] flex-1 bg-white/40 rounded-full" />
          <div className="h-[2px] flex-1 bg-white/40 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#f5a623] flex items-center justify-center text-black font-bold text-xs">
              C
            </div>
            <span className="text-xs font-semibold drop-shadow">curatestudio</span>
            <span className="text-[10px] text-white/70">2s</span>
          </div>
          <X className="w-4 h-4 drop-shadow" />
        </div>
      </div>

      {/* Alt Mesaj Kutusu & Beğeni */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex-1 h-9 rounded-full border border-white/40 bg-black/20 backdrop-blur-md px-3.5 flex items-center text-xs text-white/70">
          Mesaj gönder...
        </div>
        <Heart className="w-6 h-6 drop-shadow" />
        <Send className="w-6 h-6 drop-shadow" />
      </div>
    </div>
  );
}
