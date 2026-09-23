import { PROXY_MAX_EDGE } from "./defaults";
import { getCropDimensions } from "./renderer";
import { AspectRatio } from "../types";

/**
 * Compute live-preview (proxy) dimensions capped at ~1080p on the long edge.
 * Full-res export uses the original crop window + Lanczos3 separately.
 */
export function getProxyDimensions(
  originalWidth: number,
  originalHeight: number,
  aspectRatio: AspectRatio,
  maxEdge: number = PROXY_MAX_EDGE
): { width: number; height: number; scale: number } {
  const base = getCropDimensions(originalWidth, originalHeight, aspectRatio);
  const longEdge = Math.max(base.width, base.height);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  return {
    width: Math.max(1, Math.round(base.width * scale)),
    height: Math.max(1, Math.round(base.height * scale)),
    scale,
  };
}

/** True when source crop exceeds the proxy budget (typical 24/48MP). */
export function needsProxy(originalWidth: number, originalHeight: number): boolean {
  return Math.max(originalWidth, originalHeight) > PROXY_MAX_EDGE;
}
