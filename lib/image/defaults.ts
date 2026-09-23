import {
  FilterState,
  CropState,
  BorderState,
  TimestampState,
  UpscaleMultiplier,
} from "../types";
import { getDefaultBorderState } from "./border";
import { getDefaultTimestampState } from "./timestamp";

/** Sensible defaults applied when toggles turn ON */
export const TOGGLE_DEFAULTS = {
  grainAmount: 18,
  grainSize: 1,
  halationAmount: 12,
  halationRadius: 10,
  halationTemp: 60,
  halationThreshold: 0.82,
  vignetteAmount: 15,
  lightLeakAmount: 50,
  lightLeakType: "warm-side" as const,
  presetAmount: 100,
  reinhardStrength: 65,
} as const;

/** Per-control double-click reset targets */
export const SLIDER_DEFAULTS = {
  grainAmount: 18,
  grainSize: 1,
  halationAmount: 12,
  halationRadius: 10,
  halationTemp: 60,
  vignetteAmount: 15,
  lightLeakAmount: 50,
  presetAmount: 100,
  reinhardStrength: 65,
  zoom: 1.0,
  borderWidthPercent: 8,
  borderRadius: 0,
} as const;

export const PROXY_MAX_EDGE = 1080;

export function createDefaultFilters(): FilterState {
  return {
    activePresetId: null,
    presetAmount: TOGGLE_DEFAULTS.presetAmount,
    vignetteEnabled: false,
    vignetteAmount: TOGGLE_DEFAULTS.vignetteAmount,
    lightLeakEnabled: false,
    lightLeakType: TOGGLE_DEFAULTS.lightLeakType,
    lightLeakAmount: TOGGLE_DEFAULTS.lightLeakAmount,
    reinhardEnabled: false,
    reinhardStrength: TOGGLE_DEFAULTS.reinhardStrength,
    referenceImageId: null,
    grainEnabled: false,
    grainAmount: TOGGLE_DEFAULTS.grainAmount,
    grainSize: TOGGLE_DEFAULTS.grainSize,
    halationEnabled: false,
    halationAmount: TOGGLE_DEFAULTS.halationAmount,
    halationRadius: TOGGLE_DEFAULTS.halationRadius,
    halationTemp: TOGGLE_DEFAULTS.halationTemp,
    halationThreshold: TOGGLE_DEFAULTS.halationThreshold,
  };
}

export function createDefaultCrop(): CropState {
  return {
    aspectRatio: "4:5",
    zoom: 1.0,
    panX: 0,
    panY: 0,
  };
}

export function createDefaultBorder(): BorderState {
  return getDefaultBorderState();
}

export function createDefaultTimestamp(): TimestampState {
  return getDefaultTimestampState();
}

export const DEFAULT_UPSCALE: UpscaleMultiplier = 1;

/**
 * When enabling a toggle, fill in sensible default amounts if the control
 * was previously at 0 / unset.
 */
export function applyToggleDefaults(
  filters: FilterState,
  key:
    | "grainEnabled"
    | "halationEnabled"
    | "vignetteEnabled"
    | "lightLeakEnabled"
    | "reinhardEnabled"
): Partial<FilterState> {
  const next: Partial<FilterState> = { [key]: true };

  if (key === "grainEnabled") {
    next.grainAmount =
      filters.grainAmount > 0 ? filters.grainAmount : TOGGLE_DEFAULTS.grainAmount;
    next.grainSize = filters.grainSize || TOGGLE_DEFAULTS.grainSize;
  }
  if (key === "halationEnabled") {
    next.halationAmount =
      filters.halationAmount > 0
        ? filters.halationAmount
        : TOGGLE_DEFAULTS.halationAmount;
    next.halationRadius =
      filters.halationRadius > 0
        ? filters.halationRadius
        : TOGGLE_DEFAULTS.halationRadius;
  }
  if (key === "vignetteEnabled") {
    next.vignetteAmount =
      filters.vignetteAmount > 0
        ? filters.vignetteAmount
        : TOGGLE_DEFAULTS.vignetteAmount;
  }
  if (key === "lightLeakEnabled") {
    next.lightLeakAmount =
      filters.lightLeakAmount > 0
        ? filters.lightLeakAmount
        : TOGGLE_DEFAULTS.lightLeakAmount;
  }
  if (key === "reinhardEnabled") {
    next.reinhardStrength =
      filters.reinhardStrength > 0
        ? filters.reinhardStrength
        : TOGGLE_DEFAULTS.reinhardStrength;
  }

  return next;
}
