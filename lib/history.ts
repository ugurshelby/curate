import { CurateImage } from "./types";

export interface HistorySnapshot {
  images: CurateImage[];
  activeImageId: string | null;
  referenceImageId: string | null;
}

const MAX_HISTORY = 40;

function cloneImages(images: CurateImage[]): CurateImage[] {
  return images.map((img) => ({
    ...img,
    crop: { ...img.crop },
    filters: { ...img.filters },
    border: img.border ? { ...img.border } : undefined,
    timestamp: img.timestamp ? { ...img.timestamp } : undefined,
  }));
}

export class EditHistory {
  private past: HistorySnapshot[] = [];
  private future: HistorySnapshot[] = [];

  push(snapshot: HistorySnapshot): void {
    this.past.push({
      images: cloneImages(snapshot.images),
      activeImageId: snapshot.activeImageId,
      referenceImageId: snapshot.referenceImageId,
    });
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(current: HistorySnapshot): HistorySnapshot | null {
    if (this.past.length === 0) return null;
    this.future.push({
      images: cloneImages(current.images),
      activeImageId: current.activeImageId,
      referenceImageId: current.referenceImageId,
    });
    return this.past.pop()!;
  }

  redo(current: HistorySnapshot): HistorySnapshot | null {
    if (this.future.length === 0) return null;
    this.past.push({
      images: cloneImages(current.images),
      activeImageId: current.activeImageId,
      referenceImageId: current.referenceImageId,
    });
    return this.future.pop()!;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
