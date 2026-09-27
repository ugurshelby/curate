/**
 * Curate Core — Headless State Machine
 * Framework-agnostic, reactive store supporting all 4 studio modules:
 * 1. Carousel Dump (4:5)
 * 2. Story Dump (9:16)
 * 3. Minimal Frame (Polaroid / Adaptive Gradient)
 * 4. Lossless Upscale (Lanczos-3)
 */

import { StudioItem, StudioModule, StudioState, ActivePreset } from './types';
import { revokeUrl, cleanupAllUrls } from '../engine/proxy';

const INITIAL_STATE: StudioState = {
  activeModule: 'carousel',
  items: [],
  selectedItemId: null,
  globalPreset: null,
  globalHarmonize: {
    referenceItemId: null,
    strength: 0.20,
  },
  storyLayout: {
    slotCount: 3,
    spacing: 12,
    backgroundMode: 'adaptive-gradient',
  },
  upscaleConfig: {
    scaleFactor: 2,
  },
  isProcessing: false,
  processingProgress: 0,
  processingStatus: 'Hazır',
};

type Listener = (state: StudioState) => void;

class StudioStateMachine {
  private state: StudioState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();

  public getState(): StudioState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }

  public setState(partial: Partial<StudioState> | ((prev: StudioState) => Partial<StudioState>)) {
    const updates = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // --- Actions ---

  public setModule(activeModule: StudioModule) {
    this.setState({ activeModule });
  }

  public addItems(newItems: StudioItem[]) {
    this.setState((prev) => {
      const items = [...prev.items, ...newItems].map((item, idx) => ({
        ...item,
        order: idx,
      }));
      return {
        items,
        selectedItemId: prev.selectedItemId || (items.length > 0 ? items[0].id : null),
      };
    });
  }

  public removeItem(id: string) {
    this.setState((prev) => {
      const target = prev.items.find((i) => i.id === id);
      if (target) {
        revokeUrl(target.originalUrl);
        revokeUrl(target.proxyUrl);
      }

      const items = prev.items.filter((i) => i.id !== id).map((item, idx) => ({
        ...item,
        order: idx,
      }));

      const selectedItemId =
        prev.selectedItemId === id ? (items.length > 0 ? items[0].id : null) : prev.selectedItemId;

      return { items, selectedItemId };
    });
  }

  public selectItem(id: string | null) {
    this.setState({ selectedItemId: id });
  }

  public reorderItems(startIndex: number, endIndex: number) {
    this.setState((prev) => {
      const items = [...prev.items];
      const [removed] = items.splice(startIndex, 1);
      items.splice(endIndex, 0, removed);
      return {
        items: items.map((item, idx) => ({ ...item, order: idx })),
      };
    });
  }

  public setGlobalPreset(preset: ActivePreset | null) {
    this.setState({ globalPreset: preset });
  }

  public setItemPreset(itemId: string, preset: ActivePreset | null) {
    this.setState((prev) => ({
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, preset } : item
      ),
    }));
  }

  public setHarmonizeReference(referenceItemId: string | null, strength: number = 0.20) {
    this.setState({
      globalHarmonize: {
        referenceItemId,
        strength,
      },
    });
  }

  public setStoryLayout(layout: Partial<StudioState['storyLayout']>) {
    this.setState((prev) => ({
      storyLayout: { ...prev.storyLayout, ...layout },
    }));
  }

  public setUpscaleScale(scaleFactor: 2 | 4) {
    this.setState((prev) => ({
      upscaleConfig: { ...prev.upscaleConfig, scaleFactor },
    }));
  }

  public setProcessing(isProcessing: boolean, progress: number = 0, status: string = '') {
    this.setState({
      isProcessing,
      processingProgress: progress,
      processingStatus: status,
    });
  }

  public resetAll() {
    cleanupAllUrls();
    this.setState({ ...INITIAL_STATE });
  }
}

export const studioStore = new StudioStateMachine();
