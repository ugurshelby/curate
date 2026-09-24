"use client";

import React from "react";
import {
  CurateImage,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
} from "@/lib/types";
import { ViewportCanvas } from "./ViewportCanvas";

interface SplitViewPreviewProps {
  left: CurateImage;
  right: CurateImage;
  referenceImage: CurateImage | null;
  guide: CompositionGuide;
  overlay: SocialOverlayType;
  showOriginal: boolean;
  /** Locked sync: crop changes apply to BOTH frames */
  onUpdateCropBoth: (panX: number, panY: number, zoom: number) => void;
  onSetShowOriginal?: (show: boolean) => void;
  onCropGestureStart?: () => void;
  onCropGestureEnd?: () => void;
}

/**
 * Two frames side-by-side with locked sync zoom/pan.
 * Crop edits from either pane update both images' crop identically.
 */
export const SplitViewPreview: React.FC<SplitViewPreviewProps> = ({
  left,
  right,
  referenceImage,
  guide,
  overlay,
  showOriginal,
  onUpdateCropBoth,
  onSetShowOriginal,
  onCropGestureStart,
  onCropGestureEnd,
}) => {
  // Mirror crop so both panes share the same view window visually
  const leftSynced: CurateImage = {
    ...left,
    crop: { ...left.crop },
  };
  const rightSynced: CurateImage = {
    ...right,
    crop: {
      ...right.crop,
      // Lock zoom/pan to left (primary) while preserving each image's aspect ratio
      zoom: left.crop.zoom,
      panX: left.crop.panX,
      panY: left.crop.panY,
    },
  };

  return (
    <div className="w-full h-[65vh] sm:h-full sm:flex-1 grid grid-cols-2 gap-1.5 p-1 sm:p-2 bg-black items-stretch">
      <div className="relative h-full min-h-0 flex flex-col rounded-xl overflow-hidden border border-white/10 bg-neutral-950">
        <div className="absolute top-2 left-2 z-40 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white pointer-events-none shadow-sm">
          A
        </div>
        <ViewportCanvas
          image={leftSynced}
          referenceImage={referenceImage}
          guide={guide}
          overlay={overlay}
          showOriginal={showOriginal}
          onUpdateCrop={onUpdateCropBoth}
          onSetShowOriginal={onSetShowOriginal}
          onCropGestureStart={onCropGestureStart}
          onCropGestureEnd={onCropGestureEnd}
          compact
        />
      </div>
      <div className="relative h-full min-h-0 flex flex-col rounded-xl overflow-hidden border border-white/10 bg-neutral-950">
        <div className="absolute top-2 left-2 z-40 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white pointer-events-none flex items-center gap-1 shadow-sm">
          <span>B</span>
          <span className="text-amber-400 font-normal">· sync</span>
        </div>
        <ViewportCanvas
          image={rightSynced}
          referenceImage={referenceImage}
          guide={guide}
          overlay={overlay}
          showOriginal={showOriginal}
          onUpdateCrop={onUpdateCropBoth}
          onSetShowOriginal={onSetShowOriginal}
          onCropGestureStart={onCropGestureStart}
          onCropGestureEnd={onCropGestureEnd}
          compact
        />
      </div>
    </div>
  );
};
