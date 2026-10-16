import sharp from 'sharp';
import path from 'path';

/**
 * Preprocessor: Sharp tabanlı matematiksel piksel analizi
 * Boyut, en-boy oranı, parlaklık histogramı, dinamik aralık, renk dağılımı,
 * patlak alan ve gölge oranlarını hesaplar.
 */
export async function analyzeImage(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();

  // Piksel istatistikleri
  const stats = await image.stats();
  const { channels } = stats;
  const [r, g, b] = channels;

  // Luma ortalaması (Rec. 709)
  const meanLuma = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;

  // Raw buffer üzerinden histogram ve clipping analizi
  const { data, info } = await sharp(filePath)
    .resize(320, 320, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let blownCount = 0; // > 242
  let crushedCount = 0; // < 14
  let saturationSum = 0;
  let edgeEnergySum = 0;

  // Histogram (Luma 0-255)
  const lumaHistogram = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 3) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];

    const luma = Math.round(0.2126 * pr + 0.7152 * pg + 0.0722 * pb);
    lumaHistogram[Math.min(255, Math.max(0, luma))]++;

    if (luma >= 242) blownCount++;
    if (luma <= 14) crushedCount++;

    // Saturation kestirimi (max - min) / max
    const maxCh = Math.max(pr, pg, pb);
    const minCh = Math.min(pr, pg, pb);
    if (maxCh > 0) {
      saturationSum += (maxCh - minCh) / maxCh;
    }
  }

  // Komşu piksel gradyanı ile gürültü / keskinlik kestirimi (basit enerji)
  const w = info.width;
  for (let y = 1; y < info.height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 3;
      const leftIdx = (y * w + (x - 1)) * 3;
      const topIdx = ((y - 1) * w + x) * 3;
      const diffX = Math.abs(data[idx] - data[leftIdx]);
      const diffY = Math.abs(data[idx] - data[topIdx]);
      edgeEnergySum += (diffX + diffY) / 2;
    }
  }

  const blownRatio = blownCount / totalPixels;
  const crushedRatio = crushedCount / totalPixels;
  const avgSaturation = saturationSum / totalPixels;
  const edgeEnergy = edgeEnergySum / ((info.width - 2) * (info.height - 2));

  // Renk kayması (Color Cast)
  const colorCast = {
    warmth: (r.mean - b.mean) / 255, // > 0 sıcak, < 0 soğuk
    tint: (g.mean - (r.mean + b.mean) / 2) / 255, // > 0 yeşilimsi, < 0 magentamsı
  };

  // Dinamik aralık ve kontrast
  const dynamicRange = {
    stdDev: (r.stdev + g.stdev + b.stdev) / 3,
    contrastRatio: (r.stdev + g.stdev + b.stdev) / (3 * 128),
  };

  return {
    filename: path.basename(filePath),
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: +(metadata.width / metadata.height).toFixed(2),
    meanLuma: +meanLuma.toFixed(1),
    blownRatio: +blownRatio.toFixed(3),
    crushedRatio: +crushedRatio.toFixed(3),
    avgSaturation: +avgSaturation.toFixed(3),
    edgeEnergy: +edgeEnergy.toFixed(1),
    colorCast: {
      warmth: +colorCast.warmth.toFixed(3),
      tint: +colorCast.tint.toFixed(3),
    },
    dynamicRange: {
      stdDev: +dynamicRange.stdDev.toFixed(1),
      contrastScore: +dynamicRange.contrastRatio.toFixed(3),
    },
    lumaHistogram,
  };
}
