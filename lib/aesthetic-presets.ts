import { AestheticPreset, BorderState, FilterState, TimestampState } from "./types";

const STORAGE_KEY = "curate-studio:aesthetic-presets:v1";

export function loadAestheticPresets(): AestheticPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAestheticPresets(presets: AestheticPreset[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
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
