/**
 * Curate Core — Headless State Machine
 * Framework-agnostic, reactive store supporting all 4 studio modules:
 * 1. Carousel Dump (4:5)
 * 2. Story Dump (9:16)
 * 3. Minimal Frame (Polaroid / Adaptive Gradient)
 * 4. Lossless Upscale (Lanczos-3)
 */

import { StudioItem, StudioModule, StudioState, ActivePreset, CubeLUT, ColorMetrics } from './types';
import { revokeUrl, cleanupAllUrls } from '../engine/proxy';

const DEFAULT_REFERENCE_PHOTOS = [
  { id: "p1", name: "01-Kapak.jpg", path: "/reference-images/ic-mekan-bar.jfif" },
  { id: "p2", name: "02-Saha.jpg", path: "/reference-images/cim-saha.jfif" },
  { id: "p3", name: "03-Gokdelen.jpg", path: "/reference-images/sehir-gokdelen.jfif" },
  { id: "p4", name: "04-Gunbatimi.jpg", path: "/reference-images/gun-batimi-gunese-dokunan-eleman.jfif" },
  { id: "p5", name: "05-Tren.jpg", path: "/reference-images/tren.jfif" },
  { id: "p6", name: "06-GolEvi.jpg", path: "/reference-images/gol-evi.jfif" },
  { id: "p7", name: "07-Kovboy.jpg", path: "/reference-images/kovboy.jfif" },
];

const INITIAL_ITEMS: StudioItem[] = [];

const INITIAL_STATE: StudioState = {
  activeModule: 'carousel',
  items: INITIAL_ITEMS,
  selectedItemId: null,
  globalPreset: null,
  customLut: null,
  heroColorMetrics: null,
  globalHarmonize: {
    referenceItemId: null,
    strength: 0.20,
  },
  storyLayout: {
    slotCount: 4,
    spacing: 10,
    backgroundMode: 'adaptive-gradient',
  },
  frameConfig: {
    frameType: 'polaroid',
    borderWidth: 24,
    borderRadius: 12,
    showTimestamp: true,
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

  public setCustomLut(customLut: CubeLUT | null) {
    this.setState({ customLut });
  }

  public setHeroColorMetrics(heroColorMetrics: ColorMetrics | null) {
    this.setState({ heroColorMetrics });
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

  public makeCover(id: string) {
    this.setState((prev) => {
      const targetIdx = prev.items.findIndex((p) => p.id === id);
      if (targetIdx <= 0) return { selectedItemId: id };
      const copy = [...prev.items];
      const [item] = copy.splice(targetIdx, 1);
      copy.unshift(item);
      return {
        items: copy.map((p, idx) => ({ ...p, order: idx })),
        selectedItemId: id,
      };
    });
  }

  public swapItems(indexA: number, indexB: number) {
    this.setState((prev) => {
      if (indexA < 0 || indexB < 0 || indexA >= prev.items.length || indexB >= prev.items.length) {
        return {};
      }
      const copy = [...prev.items];
      const temp = copy[indexA];
      copy[indexA] = copy[indexB];
      copy[indexB] = temp;
      return {
        items: copy.map((p, idx) => ({ ...p, order: idx })),
      };
    });
  }

  public setStoryLayout(layout: Partial<StudioState['storyLayout']>) {
    this.setState((prev) => ({
      storyLayout: { ...prev.storyLayout, ...layout },
    }));
  }

  public setFrameConfig(config: Partial<StudioState['frameConfig']>) {
    this.setState((prev) => ({
      frameConfig: { ...prev.frameConfig, ...config },
    }));
  }

  public clearItems() {
    this.state.items.forEach((item) => {
      revokeUrl(item.originalUrl);
      revokeUrl(item.proxyUrl);
    });
    this.setState({ items: [], selectedItemId: null });
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
