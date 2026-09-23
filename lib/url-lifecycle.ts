/**
 * Blob / Object URL lifecycle helpers.
 * Prevents leaks when dumping multi-4K images into the studio.
 */

const trackedUrls = new Set<string>();

export function trackObjectURL(url: string): string {
  if (url.startsWith("blob:")) {
    trackedUrls.add(url);
  }
  return url;
}

export function revokeObjectURL(url: string | null | undefined): void {
  if (!url || !url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // already revoked
  }
  trackedUrls.delete(url);
}

export function revokeAllTrackedURLs(): void {
  for (const url of Array.from(trackedUrls)) {
    revokeObjectURL(url);
  }
}

/** Create a tracked blob URL from a File/Blob. */
export function createTrackedObjectURL(blob: Blob): string {
  return trackObjectURL(URL.createObjectURL(blob));
}

/**
 * Read a File into a blob: URL (preferred) rather than a giant data URL.
 * Falls back to FileReader data URL only if createObjectURL is unavailable.
 */
export function fileToDisplayURL(file: File): Promise<string> {
  return Promise.resolve(createTrackedObjectURL(file));
}

/** Download helper that always revokes the temporary object URL. */
export function downloadBlobSafe(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the download pipeline can start
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }, 1500);
}
