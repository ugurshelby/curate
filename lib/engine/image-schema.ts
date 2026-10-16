/**
 * Curate Studio — İstemci Tarafı Matematiksel Teknik Şema Çıkarıcı
 * Görsel yüklendiğinde pikseller üzerinden histogram, parlaklık,
 * patlak/gölge oranı, renk sapması ve kontrast analizini anında hesaplar.
 */

export interface ImageTechnicalSchema {
  width: number;
  height: number;
  aspectRatio: number;
  meanLuma: number;
  blownRatio: number;
  crushedRatio: number;
  avgSaturation: number;
  colorCast: {
    warmth: number; // >0 sıcak/sarı, <0 soğuk/mavi
    tint: number;   // >0 yeşilimsi, <0 macenta
  };
  contrastScore: number;
  suggestedTemplateKey: 'blownLight' | 'illuminateSubject' | 'dehaze' | 'neutralizeColor' | 'nightClarity';
}

/**
 * HTMLImageElement veya Canvas üzerinden hızlı matematiksel teknik şema üretir
 */
export function extractImageTechnicalSchema(img: HTMLImageElement): ImageTechnicalSchema {
  const canvas = document.createElement('canvas');
  // Hızlı analiz için 320px proxy boyutlandırma
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
      meanLuma: 128,
      blownRatio: 0,
      crushedRatio: 0,
      avgSaturation: 0.3,
      colorCast: { warmth: 0, tint: 0 },
      contrastScore: 0.5,
      suggestedTemplateKey: 'dehaze',
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixelCount = w * h;

  let totalLuma = 0;
  let blownCount = 0;
  let crushedCount = 0;
  let totalSat = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalLuma += luma;

    if (luma > 248) blownCount++;
    if (luma < 15) crushedCount++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    totalSat += sat;

    totalR += r;
    totalG += g;
    totalB += b;
  }

  const meanLuma = totalLuma / pixelCount;
  const blownRatio = blownCount / pixelCount;
  const crushedRatio = crushedCount / pixelCount;
  const avgSaturation = totalSat / pixelCount;

  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;

  const warmth = (avgR - avgB) / (avgR + avgB + 1);
  const tint = (avgG - (avgR + avgB) / 2) / (avgG + (avgR + avgB) / 2 + 1);

  // Otomatik en uygun hazır şablon tespiti
  let suggestedKey: ImageTechnicalSchema['suggestedTemplateKey'] = 'dehaze';

  if (blownRatio >= 0.015 || (blownRatio >= 0.008 && meanLuma > 170)) {
    suggestedKey = 'blownLight';
  } else if (crushedRatio >= 0.06 || (meanLuma < 85 && blownRatio < 0.005)) {
    suggestedKey = 'illuminateSubject';
  } else if (Math.abs(warmth) > 0.16 || Math.abs(tint) > 0.12) {
    suggestedKey = 'neutralizeColor';
  } else if (avgSaturation < 0.22) {
    suggestedKey = 'dehaze';
  } else if (meanLuma < 60) {
    suggestedKey = 'nightClarity';
  }

  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
    meanLuma: Math.round(meanLuma * 10) / 10,
    blownRatio: Math.round(blownRatio * 1000) / 1000,
    crushedRatio: Math.round(crushedRatio * 1000) / 1000,
    avgSaturation: Math.round(avgSaturation * 100) / 100,
    colorCast: {
      warmth: Math.round(warmth * 100) / 100,
      tint: Math.round(tint * 100) / 100,
    },
    contrastScore: Math.round(((meanLuma > 128 ? 255 - meanLuma : meanLuma) / 128) * 100) / 100,
    suggestedTemplateKey: suggestedKey,
  };
}
