"use client";

import { useEffect, useSyncExternalStore } from "react";
import { studioStore, createStudioItem, CURATE_PRESETS } from "@/lib";
import { DeviceSync as DeviceSyncEngine, DeviceSyncStatus } from "@/lib/core/device-sync";
import { openPhotoStore, freeQuotaBytes } from "@/lib/core/library-cache";
import { LOCK_PATH } from "@/lib/access/session";

/** One sync per page (StrictMode runs effects twice; the promise guards it) */
let engine: DeviceSyncEngine | null = null;
let starting: Promise<void> | null = null;
/** Hub listeners: notified when the engine starts and whenever its status changes */
const statusListeners = new Set<() => void>();
const notify = () => statusListeners.forEach((l) => l());

function start(): Promise<void> {
  if (starting) return starting;
  starting = (async () => {
    const photos = await openPhotoStore();
    let prefsStorage: Storage | null = null;
    try {
      prefsStorage = window.localStorage;
    } catch {
      prefsStorage = null;
    }
    engine = new DeviceSyncEngine({
      store: studioStore,
      photos,
      prefsStorage,
      freeQuota: freeQuotaBytes,
      createItem: createStudioItem,
      knownPresetIds: CURATE_PRESETS.map((p) => p.id),
    });
    engine.subscribeStatus(notify);
    await engine.start();
    notify();
  })();
  return starting;
}

/** Mounted once in app/layout.tsx: preferences and (optionally) photos stay on this device */
export function DeviceSync() {
  useEffect(() => {
    // the lock page has no library: nothing to restore or save there
    if (window.location.pathname === LOCK_PATH) return;
    void start();
    const flush = () => {
      if (document.visibilityState === "hidden") void engine?.flushNow();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
  return null;
}

function subscribeStatus(fn: () => void) {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}

/** Status for the hub's "remember photos" row; null until the sync has started */
export function useDeviceStorage(): { status: DeviceSyncStatus | null; setRemember: (on: boolean) => void } {
  const status = useSyncExternalStore(subscribeStatus, () => engine?.status ?? null, () => null);
  return { status, setRemember: (on: boolean) => void engine?.setRemember(on) };
}
