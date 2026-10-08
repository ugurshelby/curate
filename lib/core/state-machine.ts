/**
 * Curate Core — Headless State Machine
 * Framework-agnostic, reactive store supporting all 4 studio modules:
 * 1. Carousel Dump (4:5)
 * 2. Story Dump (9:16)
 * 3. Minimal Frame (Polaroid / Adaptive Gradient)
 * 4. Lossless Upscale (Lanczos-3)
 */

import { StudioItem, StudioModule, StudioState, ActivePreset, ColorMetrics, ImageDimensions, StoryCellTransform, EditParams, EditCrop, DerivedKind, CarouselView } from './types';
import { DEFAULT_EDIT_PARAMS } from '../engine/edit-geometry';
import { DEFAULT_PRESET_ID } from '../engine/presets';
import { revokeUrl, cleanupAllUrls, generateProxyImage, registerUrl } from '../engine/proxy';

const INITIAL_ITEMS: StudioItem[] = [];

/**
 * Düzenle defaults for a photo: new photos start with the "Doğal" preset (owner brief §8.4);
 * derived results (Büyüt, AI) start plain so a look is not applied twice (spec E11).
 */
export function defaultEditParamsFor(item: Pick<StudioItem, 'derivedBy'> | null | undefined): EditParams {
  return item?.derivedBy ? DEFAULT_EDIT_PARAMS : { ...DEFAULT_EDIT_PARAMS, presetId: DEFAULT_PRESET_ID };
}

/** Bellek sınırı: kaynak başına en çok 2 türetilmiş fotoğraf; üçüncüde en eskisi silinir */
export const MAX_DERIVED_PER_SOURCE = 2;

const DERIVED_LABEL: Record<DerivedKind, string> = { upscale: 'Büyütülmüş', ai: 'AI sonucu' };

export function derivedLabel(kind: DerivedKind | undefined): string | null {
  return kind ? DERIVED_LABEL[kind] : null;
}

function evictionNotice(evicted: StudioItem): string {
  return evicted.derivedBy === 'ai'
    ? `En eski AI sonucu silindi (en çok ${MAX_DERIVED_PER_SOURCE}).`
    : `Bellek için en eski büyütülmüş kopya silindi (en çok ${MAX_DERIVED_PER_SOURCE}).`;
}

/** AI sonucunun silinmesi için sorulacak onay metni (ücretli işlem) */
export const AI_EVICT_CONFIRM = 'En eski AI sonucu silinecek (ücretli bir işlemdi). Devam?';

/**
 * AI sonucu "Kullan": ortak addResultItem yolu. Silinecek en eski kopya AI sonucuysa önce onay;
 * reddedilirse hiçbir şey eklenmez. Büyüt sonucuysa mevcut davranış (mesajlı silme).
 */
export function acceptAiResult(
  store: Pick<StudioStateMachine, 'evictionCandidate' | 'addResultItem'>,
  makeResult: () => StudioItem,
  sourceId: string,
  confirm: (message: string) => boolean,
): 'added' | 'declined' {
  const victim = store.evictionCandidate(sourceId);
  if (victim?.derivedBy === 'ai' && !confirm(AI_EVICT_CONFIRM)) return 'declined';
  // Kayıt (ve blob URL'si) yalnız onaydan sonra oluşur
  store.addResultItem(makeResult(), sourceId, 'ai');
  return 'added';
}

const INITIAL_STATE: StudioState = {
  activeModule: 'carousel',
  items: INITIAL_ITEMS,
  selectedItemId: null,
  // Seri görünümü: varsayılan "Doğal" (sahip görev belgesi §8.4); kullanıcı Orijinal seçerse null
  globalPreset: { id: DEFAULT_PRESET_ID, intensity: 1 },
  heroColorMetrics: null,
  globalHarmonize: {
    referenceItemId: null,
    strength: 0.20,
  },
  storyLayout: {
    spacing: 10,
    backgroundMode: 'adaptive-gradient',
    cellTransforms: {},
  },
  frameConfig: {
    frameType: 'polaroid',
    borderWidth: 24,
    borderRadius: 12,
    showTimestamp: true,
    size: '4_5',
    resolution: 'standard',
  },
  carouselView: {
    target: 'instagram',
    fitMode: 'fill',
    showOverlay: true,
  },
  edits: {},
  upscaleConfig: {
    scaleFactor: 2,
  },
  isProcessing: false,
  processingProgress: 0,
  processingStatus: 'Hazır',
  notice: null,
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

  /**
   * Siler. Türetilmiş silinirse yalnız o gider. Kaynak silinirse türetilmişleri kalır ve sourceId temizlenir.
   * Her silmede URL'ler serbest bırakılır, kaydın Düzenle/Story ayarları temizlenir.
   */
  public removeItem(id: string) {
    this.setState((prev) => removeFromState(prev, [id]));
  }

  /**
   * Ortak "sonuç ekle" yolu (Büyüt, ileride AI): türetilmiş kaydı kaynağın arkasına ekler ve seçer.
   * Yeni kaydın ayarları sıfır başlar (kaynağın ayarları kaynakta kalır).
   * Kaynağın zaten MAX_DERIVED_PER_SOURCE türetilmişi varsa en eskisi silinir ve bildirim yazılır.
   * Dönüş: silinen eski kayıt (yoksa null).
   */
  public addResultItem(result: StudioItem, sourceId: string, derivedBy: DerivedKind): StudioItem | null {
    let evicted: StudioItem | null = null;
    this.setState((prev) => {
      const source = prev.items.find((i) => i.id === sourceId);
      const siblings = prev.items
        .filter((i) => i.sourceId === sourceId)
        .sort((a, b) => a.createdAt - b.createdAt);
      let base: StudioState = prev;
      if (siblings.length >= MAX_DERIVED_PER_SOURCE) {
        evicted = siblings[0];
        base = { ...prev, ...removeFromState(prev, [evicted.id]) };
      }

      const entry: StudioItem = { ...result, sourceId: source ? sourceId : null, derivedBy };
      const items = [...base.items];
      // Kaynağın ve mevcut türetilmişlerinin hemen arkasına
      let insertAt = items.length;
      const srcIdx = items.findIndex((i) => i.id === sourceId);
      if (srcIdx >= 0) {
        insertAt = srcIdx + 1;
        while (insertAt < items.length && items[insertAt].sourceId === sourceId) insertAt++;
      }
      items.splice(insertAt, 0, entry);

      const edits = { ...base.edits };
      delete edits[entry.id];
      return {
        items: items.map((item, idx) => ({ ...item, order: idx })),
        selectedItemId: entry.id,
        edits,
        notice: evicted ? evictionNotice(evicted as StudioItem) : base.notice,
      };
    });
    return evicted;
  }

  /** Yeni sonuç eklenirse silinecek en eski türetilmiş (yoksa null). AI sonucuysa arayüz önce onay ister. */
  public evictionCandidate(sourceId: string): StudioItem | null {
    const siblings = this.state.items
      .filter((i) => i.sourceId === sourceId)
      .sort((a, b) => a.createdAt - b.createdAt);
    return siblings.length >= MAX_DERIVED_PER_SOURCE ? siblings[0] : null;
  }

  public setNotice(notice: string | null) {
    this.setState({ notice });
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

  public setStoryCellTransform(itemId: string, transform: StoryCellTransform | null) {
    this.setState((prev) => {
      const cellTransforms = { ...prev.storyLayout.cellTransforms };
      if (transform) cellTransforms[itemId] = transform;
      else delete cellTransforms[itemId];
      return { storyLayout: { ...prev.storyLayout, cellTransforms } };
    });
  }

  /** Belirli sıradaki fotoğrafı yenisiyle değiştirir (Story "görseli değiştir") */
  public replaceItem(index: number, newItem: StudioItem) {
    this.setState((prev) => {
      if (index < 0 || index >= prev.items.length) return {};
      const old = prev.items[index];
      revokeUrl(old.originalUrl);
      revokeUrl(old.proxyUrl);
      const items = [...prev.items];
      items[index] = { ...newItem, order: index };
      const cellTransforms = { ...prev.storyLayout.cellTransforms };
      delete cellTransforms[old.id];
      // Eski kaydın Düzenle ayarı da gider (removeFromState ile aynı)
      const edits = { ...prev.edits };
      delete edits[old.id];
      return {
        items,
        edits,
        selectedItemId: prev.selectedItemId === old.id ? newItem.id : prev.selectedItemId,
        storyLayout: { ...prev.storyLayout, cellTransforms },
      };
    });
  }

  /** Düzenle ayarlarını birleştirir (kırp alanları ayrı birleşir) */
  public setEditParams(itemId: string, patch: Partial<Omit<EditParams, 'crop'>> & { crop?: Partial<EditCrop> }) {
    this.setState((prev) => {
      const current = prev.edits[itemId] ?? defaultEditParamsFor(prev.items.find((i) => i.id === itemId));
      const next: EditParams = {
        ...current,
        ...patch,
        crop: { ...current.crop, ...(patch.crop ?? {}) },
      };
      return { edits: { ...prev.edits, [itemId]: next } };
    });
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
    this.setState((prev) => ({
      items: [],
      selectedItemId: null,
      edits: {},
      storyLayout: { ...prev.storyLayout, cellTransforms: {} },
    }));
  }

  public setCarouselView(view: Partial<CarouselView>) {
    this.setState((prev) => ({ carouselView: { ...prev.carouselView, ...view } }));
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

/** Saf silme: URL'leri bırakır, ayarları temizler, kaynağı silinen türetilmişlerin sourceId'sini null yapar */
function removeFromState(prev: StudioState, ids: string[]): Partial<StudioState> {
  const gone = new Set(ids);
  prev.items.forEach((i) => {
    if (gone.has(i.id)) {
      revokeUrl(i.originalUrl);
      revokeUrl(i.proxyUrl);
    }
  });
  const items = prev.items
    .filter((i) => !gone.has(i.id))
    .map((item, idx) => ({
      ...item,
      order: idx,
      sourceId: item.sourceId && gone.has(item.sourceId) ? null : item.sourceId,
    }));
  const edits = { ...prev.edits };
  const cellTransforms = { ...prev.storyLayout.cellTransforms };
  ids.forEach((id) => {
    delete edits[id];
    delete cellTransforms[id];
  });
  const selectedItemId =
    prev.selectedItemId && gone.has(prev.selectedItemId) ? (items.length > 0 ? items[0].id : null) : prev.selectedItemId;
  return { items, selectedItemId, edits, storyLayout: { ...prev.storyLayout, cellTransforms } };
}

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
export function createStudioItem(
  file: File,
  index: number = 0,
  /** Cihaz önbelleğinden geri yüklerken kimlik ve tarih korunur (lib/core/library-cache.ts) */
  restore?: { id: string; createdAt: number },
): StudioItem {
  const url = registerUrl(URL.createObjectURL(file));
  const id = restore?.id ?? `photo_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
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
    createdAt: restore?.createdAt ?? Date.now() + index,
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
        if (!studioStore.getState().items.some((i) => i.id === id)) {
          // Kayıt bu arada silindi: proxy URL'si sızmasın
          revokeUrl(proxyRes.proxyUrl);
          return;
        }
        studioStore.updateItem(id, {
          dimensions: origDim,
          proxyUrl: proxyRes.proxyUrl,
          proxyDimensions: proxyRes.proxyDimensions,
        });
      } catch (e) {
        // Fallback: keep original URL as proxy
      }
    };
    img.onerror = () => handleUndecodable(id, file.name, url);
    img.src = url;
  }

  return item;
}

/**
 * Tarayıcının açamadığı dosya (ör. Android Chrome'da HEIC): sahte 1080×1350 boyutla mesajsız kalmaz,
 * kütüphaneden çıkarılır ve kullanıcıya söylenir.
 */
export function handleUndecodable(id: string, fileName: string, url: string): void {
  const present = studioStore.getState().items.some((i) => i.id === id);
  if (present) studioStore.removeItem(id);
  else revokeUrl(url);
  studioStore.setNotice(`"${fileName}" açılamadı; bu dosya biçimi desteklenmiyor.`);
}
