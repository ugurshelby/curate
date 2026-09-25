import { CurateImage } from "./types";

export interface HistorySnapshot {
  id: string;
  label: string;
  timestamp: number;
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

/**
 * Lightroom-style linear snapshot history with explicit step labels.
 * Allows jumpTo(index) to arbitrary past/future states and timeline inspection.
 */
export class EditHistory {
  private entries: HistorySnapshot[] = [];
  private currentIndex: number = -1;

  /** Initialize or reset with base snapshot (e.g., initial upload) */
  init(
    snapshot: {
      images: CurateImage[];
      activeImageId: string | null;
      referenceImageId: string | null;
    },
    label = "Orijinal"
  ): void {
    const entry: HistorySnapshot = {
      id: `snap_${Date.now()}_0`,
      label,
      timestamp: Date.now(),
      images: cloneImages(snapshot.images),
      activeImageId: snapshot.activeImageId,
      referenceImageId: snapshot.referenceImageId,
    };
    this.entries = [entry];
    this.currentIndex = 0;
  }

  push(
    snapshot: {
      images: CurateImage[];
      activeImageId: string | null;
      referenceImageId: string | null;
    },
    label = "Ayar Değişikliği"
  ): void {
    // If not initialized, initialize now
    if (this.entries.length === 0) {
      this.init(snapshot, "Orijinal");
      return;
    }

    // Truncate any redo entries past currentIndex
    if (this.currentIndex < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.currentIndex + 1);
    }

    const entry: HistorySnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      timestamp: Date.now(),
      images: cloneImages(snapshot.images),
      activeImageId: snapshot.activeImageId,
      referenceImageId: snapshot.referenceImageId,
    };

    this.entries.push(entry);

    if (this.entries.length > MAX_HISTORY) {
      this.entries.shift();
    }

    this.currentIndex = this.entries.length - 1;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  undo(_current?: unknown): HistorySnapshot | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.entries[this.currentIndex];
  }

  redo(_current?: unknown): HistorySnapshot | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.entries[this.currentIndex];
  }

  jumpTo(index: number): HistorySnapshot | null {
    if (index < 0 || index >= this.entries.length) return null;
    this.currentIndex = index;
    return this.entries[this.currentIndex];
  }

  getTimeline(): { entries: HistorySnapshot[]; currentIndex: number } {
    return {
      entries: [...this.entries],
      currentIndex: this.currentIndex,
    };
  }

  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
  }
}
