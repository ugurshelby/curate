"use client";

import React from "react";
import { Heart, MessageSquare, Bookmark, Share2, Music2, Plus } from "lucide-react";

interface TikTokOverlayProps {
  type?: "post" | "story";
}

export function TikTokOverlay({ type = "story" }: TikTokOverlayProps) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 text-white select-none">
      {/* ÜST TAB: Takip Edilenler | Sizin İçin */}
      <div className="flex items-center justify-center gap-4 pt-2 text-sm font-semibold tracking-wide drop-shadow-md">
        <span className="text-white/60">Takip Edilenler</span>
        <span className="w-1 h-1 rounded-full bg-white/40" />
        <span className="text-white border-b-2 border-white pb-0.5">Sizin İçin</span>
      </div>

      {/* ALT VE SAĞ ALAN */}
      <div className="flex items-end justify-between gap-4 pb-3">
        {/* Sol Alt: Kullanıcı Bilgisi ve Açıklama */}
        <div className="flex-1 flex flex-col gap-1.5 drop-shadow-lg max-w-[75%]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">@curatestudio</span>
            <span className="px-1.5 py-0.5 text-xs font-medium bg-white/20 rounded">Yaratıcı</span>
          </div>
          <p className="text-xs text-white/90 line-clamp-2 leading-snug">
            35mm analog doku ve minimal stüdyo renk eşitlemesi. Doğal tonlar & temiz kadraj. #curate #photography #editorial
          </p>
          <div className="flex items-center gap-2 text-xs text-white/80 mt-0.5">
            <Music2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Orijinal Ses - curate editorial darkroom</span>
          </div>
        </div>

        {/* Sağ Taraf: Dikey TikTok İkonları */}
        <div className="flex flex-col items-center gap-3.5 shrink-0 drop-shadow-lg pb-1">
          {/* Avatar + Kırmızı Plus */}
          <div className="relative mb-1">
            <div className="w-10 h-10 rounded-full border border-white bg-[#18181b] flex items-center justify-center font-bold text-xs text-[#f5a623] shadow-md">
              C
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#fe2c55] flex items-center justify-center text-white text-xs font-bold shadow-sm">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          {/* Kalp */}
          <div className="flex flex-col items-center">
            <div className="p-1 rounded-full bg-black/20 backdrop-blur-sm">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xs font-medium mt-0.5">84.2K</span>
          </div>

          {/* Yorum */}
          <div className="flex flex-col items-center">
            <div className="p-1 rounded-full bg-black/20 backdrop-blur-sm">
              <MessageSquare className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xs font-medium mt-0.5">1.2K</span>
          </div>

          {/* Kaydet */}
          <div className="flex flex-col items-center">
            <div className="p-1 rounded-full bg-black/20 backdrop-blur-sm">
              <Bookmark className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xs font-medium mt-0.5">14.8K</span>
          </div>

          {/* Paylaş */}
          <div className="flex flex-col items-center">
            <div className="p-1 rounded-full bg-black/20 backdrop-blur-sm">
              <Share2 className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xs font-medium mt-0.5">3.9K</span>
          </div>

          {/* Dönen Vinil Plak İkonu */}
          <div className="w-8 h-8 rounded-full border-2 border-[#18181b] bg-[#09090b] flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
            <div className="w-3 h-3 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
