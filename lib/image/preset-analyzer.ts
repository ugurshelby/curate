/**
 * Kaba Işık/Histogram Analizcisi (Curate Otomatik Preset Önerisi)
 * Kaynak: curate-preset-spec.md Bölüm 3.2
 *
 * Mantık:
 * 1. Koyu genel zemin + tek parlak nokta/neon ışık kaynağı -> "night-cinematic"
 * 2. Yüksek kontrast + düz siyah/gölge yığılması (silüet / ters ışık) -> "warm-silhouette"
 * 3. Üst 1/3 bölgesinde gökyüzü baskınlığı (mavi/serin gri tonlar) -> "moody-teal"
 * 4. Düşük genel kontrast, orta parlaklık ve yumuşak histogram -> "muted-coastal"
 * 5. Diğer her durum -> "amber-grain" (imza genel sokak & sıcak doku)
 */

export type RecommendedPresetId =
  | "moody-teal"
  | "warm-silhouette"
  | "night-cinematic"
  | "muted-coastal"
  | "amber-grain"
  | "monochrome-noir";

export interface ImageAnalysisResult {
  presetId: RecommendedPresetId;
  reason: string;
  metrics: {
    meanLuminance: number;
    contrastStdDev: number;
    shadowRatio: number;
    highlightRatio: number;
    skyDominance: number;
  };
}

const analysisCache = new Map<string, ImageAnalysisResult>();

export function analyzeImageForPreset(
  imageObj: HTMLImageElement,
  cacheKey?: string
): ImageAnalysisResult {
  if (cacheKey && analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }

  // Fast downsampling canvas (80x80 is plenty for lighting & mood histogram)
  const sampleW = 80;
  const sampleH = 80;
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return {
      presetId: "amber-grain",
      reason: "Varsayılan analog estetik önerildi",
      metrics: {
        meanLuminance: 120,
        contrastStdDev: 40,
        shadowRatio: 0.1,
        highlightRatio: 0.1,
        skyDominance: 0,
      },
    };
  }

  ctx.drawImage(imageObj, 0, 0, sampleW, sampleH);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
  const totalPixels = sampleW * sampleH;

  let sumLum = 0;
  let sumChroma = 0;
  let shadowsCount = 0; // Lum < 45
  let deepBlackCount = 0; // Lum < 20
  let highlightsCount = 0; // Lum > 215

  // Sky analysis (Top 1/3 pixels: y from 0 to sampleH/3)
  const topPixelsLimit = Math.floor(sampleH / 3) * sampleW;
  let skyScore = 0;

  const luminances: number[] = new Array(totalPixels);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const pixelIndex = i / 4;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminances[pixelIndex] = lum;
    sumLum += lum;

    // Fast chroma approximation
    const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    sumChroma += chroma;

    if (lum < 45) shadowsCount++;
    if (lum < 20) deepBlackCount++;
    if (lum > 215) highlightsCount++;

    // Check top 1/3 region for sky characteristics (blue/cyan/cool brightness)
    if (pixelIndex < topPixelsLimit) {
      const isBlueDominant = b > r + 10 && b > g - 5;
      const isCoolBright = lum > 130 && Math.abs(r - b) < 25; // Overcast/bright sky
      if (isBlueDominant || isCoolBright) {
        skyScore++;
      }
    }
  }

  const meanLum = sumLum / totalPixels;
  const meanChroma = sumChroma / totalPixels;

  // Standard deviation (contrast)
  let varianceSum = 0;
  for (let j = 0; j < totalPixels; j++) {
    const diff = luminances[j] - meanLum;
    varianceSum += diff * diff;
  }
  const contrastStdDev = Math.sqrt(varianceSum / totalPixels);

  const shadowRatio = shadowsCount / totalPixels;
  const deepBlackRatio = deepBlackCount / totalPixels;
  const highlightRatio = highlightsCount / totalPixels;
  const skyDominance = skyScore / topPixelsLimit;

  let presetId: RecommendedPresetId = "amber-grain";
  let reason = "Genel sokak & sıcak analog doku";

  // Decision Tree based on Spec 3.2:

  // Rule 0: Monochrome Noir
  // Düşük renk doygunluğu (monokrom) + yüksek kontrast veya derin gölgeler
  if (meanChroma < 14 && (contrastStdDev > 32 || deepBlackRatio > 0.12)) {
    presetId = "monochrome-noir";
    reason = "Yüksek kontrastlı monokrom / siyah-beyaz sahne tespit edildi";
  }
  // Rule 1: Night Cinematic
  // Görüntü genel olarak koyu + tek parlak/neon ışık kaynağı
  else if (meanLum < 75 && (highlightRatio > 0.015 || shadowsRatioCondition(shadowRatio, meanLum))) {
    presetId = "night-cinematic";
    reason = "Koyu gece karesi ve ışık kaynakları tespit edildi";
  }
  // Rule 2: Warm Silhouette
  // Yüksek kontrast + düz siyah bölgeler (shadow crush / ters ışık)
  else if (
    (contrastStdDev > 52 && (deepBlackRatio > 0.15 || shadowRatio > 0.32)) ||
    (deepBlackRatio > 0.22 && highlightRatio > 0.08)
  ) {
    presetId = "warm-silhouette";
    reason = "Yüksek kontrast ve derin silüet/ters ışık tonları tespit edildi";
  }
  // Rule 3: Moody Teal
  // Gökyüzü baskın (üst 1/3'te mavi/soğuk gri) veya mimari kurgu
  else if (skyDominance > 0.38 || (skyDominance > 0.25 && contrastStdDev > 40)) {
    presetId = "moody-teal";
    reason = "Üst bölgede baskın gökyüzü / mimari açıklık tespit edildi";
  }
  // Rule 4: Muted Coastal
  // Düşük genel kontrast, orta parlaklık, yumuşak dağılım (crush yok)
  else if (contrastStdDev < 38 && meanLum >= 85 && meanLum <= 175 && deepBlackRatio < 0.08) {
    presetId = "muted-coastal";
    reason = "Düşük kontrastlı, dingin ve pastel ışık dengesi tespit edildi";
  }
  // Rule 5: Amber Grain
  else {
    presetId = "amber-grain";
    reason = "Dengeli ışık; sıcak amber doku ve zengin film greni önerilir";
  }

  const result: ImageAnalysisResult = {
    presetId,
    reason,
    metrics: {
      meanLuminance: Math.round(meanLum),
      contrastStdDev: Math.round(contrastStdDev),
      shadowRatio: Math.round(shadowRatio * 100) / 100,
      highlightRatio: Math.round(highlightRatio * 100) / 100,
      skyDominance: Math.round(skyDominance * 100) / 100,
    },
  };

  if (cacheKey) {
    analysisCache.set(cacheKey, result);
  }

  return result;
}

function shadowsRatioCondition(shadowRatio: number, meanLum: number): boolean {
  return shadowRatio > 0.45 && meanLum < 65;
}
