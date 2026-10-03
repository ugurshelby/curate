/**
 * Minimal deterministic 2D context for Node tests (no canvas package): RGBA buffer, affine transform
 * (translate/scale/rotate/setTransform, save/restore), nearest-neighbour drawImage (5- and 9-argument
 * forms), fillRect with a hex colour (identity transform), getImageData/putImageData (transform-free,
 * like the real API). Preview and export both run on it, so any difference comes from the pipeline.
 */

export function makeImageData(width: number, height: number, data?: Uint8ClampedArray): ImageData {
  return { width, height, data: data ?? new Uint8ClampedArray(width * height * 4), colorSpace: 'srgb' } as ImageData;
}

export interface FakeImage {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  data: Uint8ClampedArray;
}

type Matrix = [number, number, number, number, number, number]; // a b c d e f

export class FakeContext {
  fillStyle = '#000000';
  imageSmoothingEnabled = true;
  imageSmoothingQuality = 'high';
  readonly buf: Uint8ClampedArray;
  private m: Matrix = [1, 0, 0, 1, 0, 0];
  private stack: Matrix[] = [];

  constructor(public width: number, public height: number) {
    this.buf = new Uint8ClampedArray(width * height * 4);
  }

  save() {
    this.stack.push([...this.m] as Matrix);
  }
  restore() {
    const m = this.stack.pop();
    if (m) this.m = m;
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.m = [a, b, c, d, e, f];
  }
  private mul(n: Matrix) {
    const [a, b, c, d, e, f] = this.m;
    const [a2, b2, c2, d2, e2, f2] = n;
    this.m = [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f];
  }
  translate(x: number, y: number) {
    this.mul([1, 0, 0, 1, x, y]);
  }
  scale(x: number, y: number) {
    this.mul([x, 0, 0, y, 0, 0]);
  }
  rotate(t: number) {
    const c = Math.cos(t);
    const s = Math.sin(t);
    this.mul([c, s, -s, c, 0, 0]);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const hex = String(this.fillStyle).replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * this.width + xx) * 4;
        this.buf[i] = r;
        this.buf[i + 1] = g;
        this.buf[i + 2] = b;
        this.buf[i + 3] = 255;
      }
    }
  }

  drawImage(img: FakeImage, ...args: number[]) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx: number, dy: number, dw: number, dh: number;
    if (args.length === 8) [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    else [dx, dy, dw, dh] = args;
    const [a, b, c, d, e, f] = this.m;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) return;
    // Device-space bounding box of the destination rectangle
    const corners = [
      [dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh],
    ].map(([u, v]) => [a * u + c * v + e, b * u + d * v + f]);
    const minX = Math.max(0, Math.floor(Math.min(...corners.map((p) => p[0]))));
    const maxX = Math.min(this.width, Math.ceil(Math.max(...corners.map((p) => p[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((p) => p[1]))));
    const maxY = Math.min(this.height, Math.ceil(Math.max(...corners.map((p) => p[1]))));
    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        const X = px + 0.5 - e;
        const Y = py + 0.5 - f;
        const u = (d * X - c * Y) / det;
        const v = (-b * X + a * Y) / det;
        if (u < dx || u >= dx + dw || v < dy || v >= dy + dh) continue;
        const srcX = Math.min(img.width - 1, Math.max(0, Math.floor(sx + ((u - dx) * sw) / dw)));
        const srcY = Math.min(img.height - 1, Math.max(0, Math.floor(sy + ((v - dy) * sh) / dh)));
        const si = (srcY * img.width + srcX) * 4;
        const di = (py * this.width + px) * 4;
        this.buf[di] = img.data[si];
        this.buf[di + 1] = img.data[si + 1];
        this.buf[di + 2] = img.data[si + 2];
        this.buf[di + 3] = 255;
      }
    }
  }

  getImageData(x: number, y: number, w: number, h: number): ImageData {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) {
      const start = ((y + yy) * this.width + x) * 4;
      out.set(this.buf.subarray(start, start + w * 4), yy * w * 4);
    }
    return makeImageData(w, h, out);
  }

  putImageData(dta: ImageData, x: number, y: number) {
    for (let yy = 0; yy < dta.height; yy++) {
      const start = ((y + yy) * this.width + x) * 4;
      this.buf.set(dta.data.subarray(yy * dta.width * 4, (yy + 1) * dta.width * 4), start);
    }
  }
}

/** Synthetic photo: gradients plus bright patches (halation) and a dark band (shadows). */
export function makePhoto(width: number, height: number): FakeImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const bright = (x % 37 < 6 && y % 29 < 5) ? 250 : 0;
      data[i] = Math.max(bright, Math.round((x / width) * 220));
      data[i + 1] = Math.max(bright, Math.round((y / height) * 200));
      data[i + 2] = Math.max(bright, y > height * 0.8 ? 20 : 140);
      data[i + 3] = 255;
    }
  }
  return { width, height, naturalWidth: width, naturalHeight: height, data };
}

export const asCtx = (c: FakeContext) => c as unknown as CanvasRenderingContext2D;
export const asImg = (i: FakeImage) => i as unknown as HTMLImageElement;

export function countDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}
