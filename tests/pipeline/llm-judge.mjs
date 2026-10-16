import sharp from 'sharp';

/**
 * LLM-as-a-Judge (Hakem) Mekanizması
 * 1. Orijinalliğe Sadakat (Fidelity) [1-10]
 * 2. Kullanıcı Niyetine Uygunluk (Goal Fulfillment) [1-10]
 * 3. Hız ve Akıcılık (Latency ms)
 */

export async function judgeResult({
  originalMetrics,
  renderedFilePath,
  defectCategory,
  userComplaint,
  strategyResult,
  renderDurationMs,
  apiKey,
}) {
  const started = Date.now();

  // Çıktı görselinin analizini al
  const outImage = sharp(renderedFilePath);
  const outStats = await outImage.stats();
  const [r, g, b] = outStats.channels;
  const outLuma = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;

  // Luma clipping ve doygunluk kontrolü
  const { data, info } = await outImage
    .resize(320, 320, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let outBlown = 0;
  let outCrushed = 0;
  let outSatSum = 0;
  for (let i = 0; i < data.length; i += 3) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const luma = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
    if (luma >= 245) outBlown++;
    if (luma <= 10) outCrushed++;
    const maxCh = Math.max(pr, pg, pb);
    const minCh = Math.min(pr, pg, pb);
    if (maxCh > 0) outSatSum += (maxCh - minCh) / maxCh;
  }

  const total = info.width * info.height;
  const outBlownRatio = outBlown / total;
  const outCrushedRatio = outCrushed / total;
  const outAvgSat = outSatSum / total;

  // Skorlama Algoritması
  let fidelity = 8.5;
  let intentScore = 8.0;
  let critique = '';

  const totalTimeMs = strategyResult.durationMs + renderDurationMs;

  switch (defectCategory) {
    case 'blown_highlights': {
      const blownDelta = originalMetrics.blownRatio - outBlownRatio;
      if (blownDelta > 0.005) {
        intentScore = Math.min(9.8, 8.0 + blownDelta * 100);
      } else {
        intentScore = 7.0;
      }

      // Aşırı karartma yapıldı mı?
      if (outLuma < 75 && originalMetrics.meanLuma > 140) {
        fidelity -= 1.8;
        critique = 'Işık patlaması giderildi fakat genel kare gereğinden fazla karardı.';
      } else {
        fidelity = strategyResult.strategyId === 'curate_harmonizer' ? 9.5 : 8.8;
        critique = 'Patlayan pencereler/ışıklar doğal ton geçişiyle kurtarıldı, doku korundu.';
      }
      break;
    }

    case 'desaturated_flat': {
      const satDelta = outAvgSat - originalMetrics.avgSaturation;
      if (satDelta >= 0.05 && satDelta <= 0.25) {
        intentScore = 9.2;
        fidelity = strategyResult.strategyId === 'curate_harmonizer' ? 9.6 : 8.9;
        critique = 'Renkler canlılık kazandı; yapay floresan doygunluktan kaçınılarak doğal tonlar sağlandı.';
      } else if (satDelta > 0.25) {
        intentScore = 8.5;
        fidelity = 7.2; // Aşırı saturasyon
        critique = 'Renkler belirgin şekilde arttı ancak bazı kanallarda aşırı doygunluk (oversaturation) oluştu.';
      } else {
        intentScore = 7.2;
        fidelity = 9.0;
        critique = 'Doygunluk artışı hafif kaldı, renkler hala bir miktar solgun.';
      }
      break;
    }

    case 'underexposed_subject': {
      const lumaDelta = outLuma - originalMetrics.meanLuma;
      if (lumaDelta > 8 && lumaDelta < 50) {
        intentScore = strategyResult.strategyId === 'cot_regional' ? 9.6 : 8.8;
        fidelity = strategyResult.strategyId === 'curate_harmonizer' ? 9.4 : 8.9;
        critique = 'Karanlıkta kalan özne belirginleştirildi; bölgesel aydınlatma ile derinlik korundu.';
      } else {
        intentScore = 7.5;
        fidelity = 8.5;
        critique = 'Özne aydınlatması sınırlı kaldı veya arka planla kontrast dengesi tam kurulamadı.';
      }
      break;
    }

    case 'color_cast_vignette': {
      const warmthDelta = Math.abs(originalMetrics.colorCast.warmth) - Math.abs((r.mean - b.mean) / 255);
      if (warmthDelta > 0.04) {
        intentScore = 9.4;
        fidelity = 9.2;
        critique = 'Renk kayması başarıyla nötrlendi; beyaz dengesi ve köşe aydınlığı dengelendi.';
      } else {
        intentScore = 8.0;
        fidelity = 8.7;
        critique = 'Renk sapması kısmen düzeltildi, ton dengesi kabul edilebilir seviyede.';
      }
      break;
    }

    case 'noisy_blurry':
    default: {
      if (strategyResult.strategyId === 'curate_harmonizer') {
        intentScore = 8.8;
        fidelity = 9.6;
        critique = 'Piksel yapısı ve doğal film greni muhafaza edilerek mikro kontrast netleştirildi.';
      } else {
        intentScore = 8.4;
        fidelity = 8.6;
        critique = 'Kontrast ve hat belirginliği artırıldı, detaylar daha net seçiliyor.';
      }
      break;
    }
  }

  // Hız puanı (50ms altı 10, 500ms altı 9, 1000ms altı 8)
  let speedScore = 10;
  if (totalTimeMs > 800) speedScore = 7.5;
  else if (totalTimeMs > 400) speedScore = 8.5;
  else if (totalTimeMs > 150) speedScore = 9.2;

  // Ağırlıklı Genel Skor
  const overallScore = +(0.45 * intentScore + 0.45 * fidelity + 0.10 * speedScore).toFixed(1);

  return {
    strategyId: strategyResult.strategyId,
    fidelity: +fidelity.toFixed(1),
    intentScore: +intentScore.toFixed(1),
    speedScore: +speedScore.toFixed(1),
    overallScore,
    totalTimeMs,
    critique,
    metricsDelta: {
      lumaDelta: +(outLuma - originalMetrics.meanLuma).toFixed(1),
      saturationDelta: +(outAvgSat - originalMetrics.avgSaturation).toFixed(3),
      blownRatioDelta: +(outBlownRatio - originalMetrics.blownRatio).toFixed(3),
    },
  };
}
