/**
 * Device preferences (localStorage). Owner decision D18: persistence stays on the device.
 * Small, versioned, validated on read; storage errors (private mode, full quota) are swallowed.
 * Photos are NOT stored here (see library-cache.ts, IndexedDB).
 */

import type { ActivePreset, CarouselView, FrameConfig, StudioState } from './types';

export const PREFS_KEY = 'curate.prefs.v1';

export interface Prefs {
  v: 1;
  carouselView: CarouselView;
  /** Last preset and amount used in Carousel (series look) */
  globalPreset: ActivePreset | null;
  story: { spacing: number; backgroundMode: StudioState['storyLayout']['backgroundMode'] };
  frame: FrameConfig;
  upscale: { scaleFactor: 2 | 4 };
  /** Keep photos on this device between visits (IndexedDB). Default on. */
  rememberLibrary: boolean;
  /** Favourite preset ids (shown first) */
  favorites: string[];
}

export const DEFAULT_PREFS: Prefs = {
  v: 1,
  carouselView: { target: 'instagram', fitMode: 'fill', showOverlay: true },
  globalPreset: { id: 'dogal', intensity: 1 },
  story: { spacing: 10, backgroundMode: 'adaptive-gradient' },
  frame: { frameType: 'polaroid', borderWidth: 24, borderRadius: 12, showTimestamp: true },
  upscale: { scaleFactor: 2 },
  rememberLibrary: true,
  favorites: [],
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const oneOf = <T extends string | number>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Validates untrusted JSON (old versions, manual edits, corrupt storage) into a complete Prefs object */
export function sanitizePrefs(raw: unknown, knownPresetIds: readonly string[] = []): Prefs {
  const d = DEFAULT_PREFS;
  if (!isObj(raw) || raw.v !== 1) return { ...d };
  const cv = isObj(raw.carouselView) ? raw.carouselView : {};
  const st = isObj(raw.story) ? raw.story : {};
  const fr = isObj(raw.frame) ? raw.frame : {};
  const up = isObj(raw.upscale) ? raw.upscale : {};
  const known = (id: unknown) => typeof id === 'string' && (knownPresetIds.length === 0 || knownPresetIds.includes(id));

  let globalPreset: ActivePreset | null = null;
  if (isObj(raw.globalPreset) && known(raw.globalPreset.id) && raw.globalPreset.id !== 'custom_lut') {
    globalPreset = { id: raw.globalPreset.id as string, intensity: num(raw.globalPreset.intensity, 0, 1, 1) };
  }

  return {
    v: 1,
    carouselView: {
      target: oneOf(cv.target, ['instagram', 'tiktok'] as const, d.carouselView.target),
      fitMode: oneOf(cv.fitMode, ['fill', 'fit'] as const, d.carouselView.fitMode),
      showOverlay: bool(cv.showOverlay, d.carouselView.showOverlay),
    },
    globalPreset,
    story: {
      spacing: Math.round(num(st.spacing, 0, 32, d.story.spacing)),
      backgroundMode: oneOf(st.backgroundMode, ['adaptive-gradient', 'black', 'white', 'charcoal'] as const, d.story.backgroundMode),
    },
    frame: {
      frameType: oneOf(fr.frameType, ['polaroid', 'matte', 'gradient'] as const, d.frame.frameType),
      borderWidth: Math.round(num(fr.borderWidth, 0, 120, d.frame.borderWidth)),
      borderRadius: Math.round(num(fr.borderRadius, 0, 64, d.frame.borderRadius)),
      showTimestamp: bool(fr.showTimestamp, d.frame.showTimestamp),
    },
    upscale: { scaleFactor: oneOf(up.scaleFactor, [2, 4] as const, d.upscale.scaleFactor) },
    rememberLibrary: bool(raw.rememberLibrary, d.rememberLibrary),
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(known).slice(0, 32) as string[] : [],
  };
}

/** Prefs view of the store state (what gets written) */
export function prefsFromState(state: StudioState, base: Prefs): Prefs {
  const gp = state.globalPreset && state.globalPreset.id !== 'custom_lut' ? state.globalPreset : null;
  return {
    ...base,
    carouselView: state.carouselView,
    globalPreset: gp,
    story: { spacing: state.storyLayout.spacing, backgroundMode: state.storyLayout.backgroundMode },
    frame: state.frameConfig,
    upscale: { scaleFactor: state.upscaleConfig.scaleFactor },
  };
}

/** Store patch that applies saved prefs (does not touch photos) */
export function statePatchFromPrefs(p: Prefs, state: StudioState): Partial<StudioState> {
  return {
    carouselView: p.carouselView,
    globalPreset: p.globalPreset,
    storyLayout: { ...state.storyLayout, spacing: p.story.spacing, backgroundMode: p.story.backgroundMode },
    frameConfig: p.frame,
    upscaleConfig: { ...state.upscaleConfig, scaleFactor: p.upscale.scaleFactor },
  };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // access can throw (blocked site data)
  }
}

export function loadPrefs(knownPresetIds: readonly string[] = [], store: StorageLike | null = storage()): Prefs {
  if (!store) return { ...DEFAULT_PREFS };
  try {
    const text = store.getItem(PREFS_KEY);
    return sanitizePrefs(text ? JSON.parse(text) : null, knownPresetIds);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Returns false when the browser refused (private mode, full quota) */
export function savePrefs(p: Prefs, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(PREFS_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
