/**
 * Curate Core — Headless State Machine
 * Framework-agnostic, reactive store supporting all 4 studio modules:
 * 1. Carousel Dump (4:5)
 * 2. Story Dump (9:16)
 * 3. Minimal Frame (Polaroid / Adaptive Gradient)
 * 4. Lossless Upscale (Lanczos-3)
 */

import { StudioItem, StudioModule, StudioState, ActivePreset, CubeLUT, ColorMetrics, ImageDimensions } from './types';
import { revokeUrl, cleanupAllUrls, generateProxyImage, registerUrl } from '../engine/proxy';

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
      const hasValidSelection =
        prev.selectedItemId !== null &&
        items.some((i) => i.id === prev.selectedItemId);

      return {
        items,
        selectedItemId: hasValidSelection
          ? prev.selectedItemId
          : (items.length > 0 ? items[0].id : null),
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

  public updateItem(id: string, patch: Partial<StudioItem>) {
    this.setState((prev) => ({
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
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

/**
 * Pure function providing single source of truth for photo presence and selection
 */
export function getStudioSelection(
  items: StudioItem[],
  selectedItemId: string | null
): {
  hasPhoto: boolean;
  selectedItem: StudioItem | null;
  photoUrl: string | null;
} {
  if (!items || items.length === 0) {
    return { hasPhoto: false, selectedItem: null, photoUrl: null };
  }
  const selectedItem =
    (selectedItemId ? items.find((i) => i.id === selectedItemId) : null) ||
    items[0] ||
    null;
  const photoUrl = selectedItem
    ? selectedItem.originalUrl || selectedItem.proxyUrl || null
    : null;
  return {
    hasPhoto: selectedItem !== null && !!photoUrl,
    selectedItem,
    photoUrl,
  };
}

/**
 * Creates a StudioItem from File with immediate reactivity and async proxy generation
 */
export function createStudioItem(file: File, index: number = 0): StudioItem {
  const url = registerUrl(URL.createObjectURL(file));
  const id = `photo_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
  const item: StudioItem = {
    id,
    file,
    name: file.name,
    originalUrl: url,
    proxyUrl: url,
    dimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
    proxyDimensions: { width: 1080, height: 1350, aspectRatio: 4 / 5 },
    preset: null,
    harmonize: { enabled: false, referenceItemId: null, strength: 0.2 },
    order: index,
    createdAt: Date.now() + index,
  };

  // Inspect natural dimensions and generate high-efficiency proxy asynchronously
  if (typeof window !== 'undefined') {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const origDim: ImageDimensions = {
          width: img.naturalWidth || 1080,
          height: img.naturalHeight || 1350,
          aspectRatio: (img.naturalWidth || 1080) / (img.naturalHeight || 1350),
        };
        const proxyRes = await generateProxyImage(img, origDim);
        studioStore.updateItem(id, {
          dimensions: origDim,
          proxyUrl: proxyRes.proxyUrl,
          proxyDimensions: proxyRes.proxyDimensions,
        });
      } catch (e) {
        // Fallback: keep original URL as proxy
      }
    };
    img.src = url;
  }

  return item;
}

