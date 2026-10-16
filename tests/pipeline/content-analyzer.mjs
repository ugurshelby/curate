import sharp from 'sharp';

/**
 * Multimodal İçerik ve Kusur Analizcisi
 * Görseli Gemini Flash multimodal modeline göndererek veya matematiksel metriklerle
 * sahne türünü ve birincil kusur kategorisini tespit eder.
 */

export const DEFECT_CATEGORIES = {
  blown_highlights: {
    id: 'blown_highlights',
    title: 'Aşırı Patlamış Işık',
    labelEn: 'Highlight Blown Out',
    description: 'Gökyüzü, pencere veya parlak ışık kaynaklarında ton kaybı ve beyaz patlaması.',
  },
  desaturated_flat: {
    id: 'desaturated_flat',
    title: 'Soluk ve Cansız Renkler',
    labelEn: 'Desaturated & Flat Contrast',
    description: 'Düşük dinamik aralık, solgun tonlar, yetersiz kontrast ve donukluk.',
  },
  noisy_blurry: {
    id: 'noisy_blurry',
    title: 'Grenli ve Bulanık Detaylar',
    labelEn: 'Noisy & Blurry Details',
    description: 'Yüksek ISO gürültüsü, kumlanma veya odak yumuşaması/bulanıklık.',
  },
  underexposed_subject: {
    id: 'underexposed_subject',
    title: 'Özne Geri Planda / Karanlık',
    labelEn: 'Underexposed Subject',
    description: 'Arka plan ile özne arasındaki dengesizlik, öznenin gölgede kalması.',
  },
  color_cast_vignette: {
    id: 'color_cast_vignette',
    title: 'Renk Kayması ve Kenar Kararması',
    labelEn: 'Color Cast & Lens Vignetting',
    description: 'Beyaz ayarı hatası (yeşilimsi/mavimsi/sarı ton) veya lens köşelerinde kararma.',
  },
};

/**
 * Heuristic tabanlı yedek sınıflandırıcı (matematiksel metrikler)
 */
export function classifyByMath(metrics) {
  const { meanLuma, blownRatio, crushedRatio, avgSaturation, dynamicRange, colorCast, edgeEnergy } = metrics;

  // 1. Patlak alan yüksekse (> %1.8) veya luma çok yüksekse
  if (blownRatio >= 0.02 || (blownRatio >= 0.01 && meanLuma > 175)) {
    return 'blown_highlights';
  }

  // 2. Özne karanlıkta (gölge oranı yüksek ve ortalama ışık düşük/orta)
  if (crushedRatio >= 0.08 || (meanLuma < 85 && dynamicRange.stdDev < 55)) {
    return 'underexposed_subject';
  }

  // 3. Renk kayması yüksekse
  if (Math.abs(colorCast.warmth) > 0.18 || Math.abs(colorCast.tint) > 0.12) {
    return 'color_cast_vignette';
  }

  // 4. Saturasyon çok düşük veya kontrast düşükse
  if (avgSaturation < 0.22 || dynamicRange.contrastScore < 0.35) {
    return 'desaturated_flat';
  }

  // 5. Gürültü / kenar enerjisi yüksekse veya varsayılan
  if (edgeEnergy > 18) {
    return 'noisy_blurry';
  }

  // Genel değerlendirme
  if (blownRatio > 0.008) return 'blown_highlights';
  if (avgSaturation < 0.3) return 'desaturated_flat';
  return 'underexposed_subject';
}

/**
 * Görseli Gemini Flash ile veya hibrit analiz eder
 */
export async function analyzeContentAndDefects(filePath, metrics, apiKey) {
  let modelResult = null;

  if (apiKey) {
    try {
      // 512px optimize JPEG hazırla
      const thumbBuffer = await sharp(filePath)
        .resize(512, 512, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Data = thumbBuffer.toString('base64');
      const prompt = `You are a professional photo quality inspector.
Analyze this photo and identify its primary technical defect.
Return JSON ONLY with this exact schema:
{
  "sceneType": "portrait" | "landscape" | "street" | "interior" | "night" | "object" | "other",
  "primaryDefect": "blown_highlights" | "desaturated_flat" | "noisy_blurry" | "underexposed_subject" | "color_cast_vignette",
  "severity": "mild" | "moderate" | "severe",
  "explanationTr": "Kısa Türkçe teknik açıklama (1 cümle)"
}`;

      const endpoint = 'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          modelResult = JSON.parse(text);
        }
      }
    } catch {
      // Model hatası olursa heuristic devreye girer
      modelResult = null;
    }
  }

  // Nihai kusur kategorisini belirle
  const heuristicCategory = classifyByMath(metrics);
  const primaryDefect = modelResult?.primaryDefect && DEFECT_CATEGORIES[modelResult.primaryDefect]
    ? modelResult.primaryDefect
    : heuristicCategory;

  const sceneType = modelResult?.sceneType || (metrics.aspectRatio < 0.8 ? 'portrait' : 'landscape');
  const explanation = modelResult?.explanationTr || `Piksel analizi ile tespit edildi: ${DEFECT_CATEGORIES[primaryDefect].title}`;

  return {
    sceneType,
    primaryDefect,
    categoryMeta: DEFECT_CATEGORIES[primaryDefect],
    severity: modelResult?.severity || 'moderate',
    explanation,
    analyzedBy: modelResult ? 'Gemini 2.5 Flash + Sharp' : 'Sharp Math Engine',
  };
}
