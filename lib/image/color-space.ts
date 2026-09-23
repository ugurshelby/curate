/**
 * CIELAB <-> sRGB Color Space Conversions
 * Standard D65 illuminant
 */

export function sRGBToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearTosRGB(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

// D65 reference white
const Xn = 0.95047;
const Yn = 1.0;
const Zn = 1.08883;

function fLab(t: number): number {
  const delta = 6 / 29;
  return t > delta * delta * delta ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

function fLabInv(t: number): number {
  const delta = 6 / 29;
  return t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rLin = sRGBToLinear(r);
  const gLin = sRGBToLinear(g);
  const bLin = sRGBToLinear(b);

  // sRGB to XYZ (D65)
  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / Xn;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175) / Yn;
  const z = (rLin * 0.0193339 + gLin * 0.119192 + bLin * 0.9503041) / Zn;

  const fx = fLab(x);
  const fy = fLab(y);
  const fz = fLab(z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [L, a, bVal];
}

export function labToRgb(L: number, a: number, bVal: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bVal / 200;

  const x = fLabInv(fx) * Xn;
  const y = fLabInv(fy) * Yn;
  const z = fLabInv(fz) * Zn;

  // XYZ to linear sRGB
  const rLin = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const gLin = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  const bLin = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  return [linearTosRGB(rLin), linearTosRGB(gLin), linearTosRGB(bLin)];
}
