/**
 * Curate Engine — Proxy & Memory Lifecycle Pipeline
 * Creates ultra-fast 1080p proxy canvases/blobs from high-res (24MP/48MP) originals
 * Enforces zero-leak lifecycle management with automatic object URL revoking.
 */

import { ImageDimensions } from '../core/types';

const MAX_PROXY_DIMENSION = 1080;

// Memory registry to track and safely revoke created object URLs
const activeObjectUrls = new Set<string>();

export function registerUrl(url: string): string {
  if (url.startsWith('blob:')) {
    activeObjectUrls.add(url);
  }
  return url;
}

export function revokeUrl(url: string | null | undefined): void {
  if (!url) return;
  if (activeObjectUrls.has(url)) {
    URL.revokeObjectURL(url);
    activeObjectUrls.delete(url);
  }
}

export function cleanupAllUrls(): void {
  activeObjectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  activeObjectUrls.clear();
}

/**
 * Calculates scaled dimensions keeping aspect ratio within maxConstraint
 */
export function calculateFitDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number = MAX_PROXY_DIMENSION
): { width: number; height: number; aspectRatio: number } {
  const aspectRatio = origWidth / origHeight;

  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight, aspectRatio };
  }

  let width = origWidth;
  let height = origHeight;

  if (origWidth > origHeight) {
    width = maxDimension;
    height = Math.round(maxDimension / aspectRatio);
  } else {
    height = maxDimension;
    width = Math.round(maxDimension * aspectRatio);
  }

  return { width, height, aspectRatio };
}

/**
 * Loads an image file into an HTMLImageElement or ImageBitmap safely
 */
export async function loadImageFromFile(file: File): Promise<{
  element: HTMLImageElement;
  dimensions: ImageDimensions;
  sourceUrl: string;
}> {
  const sourceUrl = registerUrl(URL.createObjectURL(file));

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        element: img,
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        },
        sourceUrl,
      });
    };
    img.onerror = (err) => {
      revokeUrl(sourceUrl);
      reject(new Error(`Failed to load image file: ${file.name}`));
    };
    img.src = sourceUrl;
  });
}

/**
 * Generates an optimized 1080p proxy image blob and data url from an image
 */
export async function generateProxyImage(
  source: HTMLImageElement | ImageBitmap,
  origDimensions: ImageDimensions
): Promise<{
  proxyUrl: string;
  proxyBlob: Blob;
  proxyDimensions: ImageDimensions;
}> {
  const { width: proxyW, height: proxyH, aspectRatio } = calculateFitDimensions(
    origDimensions.width,
    origDimensions.height,
    MAX_PROXY_DIMENSION
  );

  // Use OffscreenCanvas if available, otherwise regular canvas
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(proxyW, proxyH);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = proxyW;
    canvas.height = proxyH;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error('Failed to acquire 2D rendering context for proxy generation');
  }

  // High quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, proxyW, proxyH);

  let blob: Blob;

  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.88
      );
    });
  }

  const proxyUrl = registerUrl(URL.createObjectURL(blob));

  return {
    proxyUrl,
    proxyBlob: blob,
    proxyDimensions: {
      width: proxyW,
      height: proxyH,
      aspectRatio,
    },
  };
}
