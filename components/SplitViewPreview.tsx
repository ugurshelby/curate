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
    <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 p-2 bg-black">
      <div className="relative min-h-0 flex flex-col rounded-xl overflow-hidden border border-white/10">
        <div className="absolute top-2 left-2 z-40 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-white/80 pointer-events-none">
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
      <div className="relative min-h-0 flex flex-col rounded-xl overflow-hidden border border-white/10">
        <div className="absolute top-2 left-2 z-40 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-white/80 pointer-events-none">
          B · sync
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
