import { AestheticPreset, BorderState, FilterState, TimestampState } from "./types";
import { SIGNATURE_PRESETS, applySignaturePresetToFilterState } from "./image/film-presets";
import { createDefaultFilters } from "./image/defaults";

const STORAGE_KEY = "curate-studio:aesthetic-presets:v1";

export function getDefaultSignatureAestheticPresets(): AestheticPreset[] {
  return SIGNATURE_PRESETS.map((sig, index) => {
    const base = createDefaultFilters();
    const applied = applySignaturePresetToFilterState(sig);
    return {
      id: `signature_${sig.id}`,
      name: sig.name,
      createdAt: Date.now() - (SIGNATURE_PRESETS.length - index) * 1000,
      filters: {
        ...base,
        ...applied,
      } as FilterState,
    };
  });
}

export function loadAestheticPresets(): AestheticPreset[] {
  if (typeof window === "undefined") return getDefaultSignatureAestheticPresets();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultSignatureAestheticPresets();
      saveAestheticPresets(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = getDefaultSignatureAestheticPresets();
      saveAestheticPresets(defaults);
      return defaults;
    }
    return parsed;
  } catch {
    return getDefaultSignatureAestheticPresets();
  }
}

export function saveAestheticPresets(presets: AestheticPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error("Failed to save aesthetic presets to localStorage", err);
  }
}

export function createAestheticPreset(
  name: string,
  filters: FilterState,
  border?: BorderState,
  timestamp?: TimestampState
): AestheticPreset {
  return {
    id: `aes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: Date.now(),
    filters: { ...filters },
    border: border ? { ...border } : undefined,
    timestamp: timestamp ? { ...timestamp } : undefined,
  };
}

export function upsertAestheticPreset(preset: AestheticPreset): AestheticPreset[] {
  const list = loadAestheticPresets();
  const idx = list.findIndex((p) => p.id === preset.id);
  if (idx >= 0) list[idx] = preset;
  else list.unshift(preset);
  saveAestheticPresets(list);
  return list;
}

export function saveOrUpdateAestheticPreset(
  name: string,
  filters: FilterState,
  border?: BorderState,
  timestamp?: TimestampState
): AestheticPreset[] {
  const list = loadAestheticPresets();
  const trimmed = name.trim();
  const existingIdx = list.findIndex(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (existingIdx >= 0) {
    list[existingIdx] = {
      ...list[existingIdx],
      name: trimmed,
      filters: { ...filters },
      border: border ? { ...border } : undefined,
      timestamp: timestamp ? { ...timestamp } : undefined,
      createdAt: Date.now(),
    };
  } else {
    list.unshift(createAestheticPreset(trimmed, filters, border, timestamp));
  }
  saveAestheticPresets(list);
  return list;
}

export function deleteAestheticPreset(id: string): AestheticPreset[] {
  const list = loadAestheticPresets().filter((p) => p.id !== id);
  saveAestheticPresets(list);
  return list;
}

/** Apply aesthetic (effects only — never crop/ratio) to a whole series. */
export function applyAestheticToSeries<
  T extends {
    filters: FilterState;
    border?: BorderState;
    timestamp?: TimestampState;
  }
>(images: T[], preset: AestheticPreset): T[] {
  return images.map((img) => ({
    ...img,
    filters: {
      ...preset.filters,
      // Keep each image's own reference binding if preset has none
      referenceImageId:
        preset.filters.referenceImageId ?? img.filters.referenceImageId,
    },
    border: preset.border ? { ...preset.border } : img.border,
    timestamp: preset.timestamp ? { ...preset.timestamp } : img.timestamp,
  }));
}
