import fs from 'fs';
import path from 'path';
import { analyzeImage } from './pipeline/preprocessor.mjs';
import { analyzeContentAndDefects } from './pipeline/content-analyzer.mjs';
import { assignUserComplaint } from './pipeline/user-complaints.mjs';
import { runAllAnalystStrategies } from './pipeline/analyst-models.mjs';
import { renderAiPlan, createReferencePreview } from './pipeline/curate-renderer.mjs';
import { judgeResult } from './pipeline/llm-judge.mjs';
import { generateHtmlReport } from './pipeline/report-generator.mjs';

/**
 * Curate Studio AI Calibration & Evaluation Pipeline
 * Uçtan Uca Otomasyon Runner'ı
 */

async function getApiKey() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.startsWith('VERTEX_API_KEY=')) {
        return line.split('=')[1].trim();
      }
    }
  }
  return process.env.VERTEX_API_KEY || null;
}

async function main() {
  console.log('\n======================================================');
  console.log('   CURATE STUDIO — AI PIPELINE & BENCHMARK RUNNER    ');
  console.log('======================================================\n');

  const inputDir = path.resolve('tests/test-images');
  const outputDir = path.resolve('tests/output-images');
  const reportPath = path.resolve('tests/report.html');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const apiKey = await getApiKey();
  console.log(`[Config] API Key: ${apiKey ? 'Mevcut (Google Vertex Aktif)' : 'Bulunamadı (Yerel Heuristic Modu)'}`);

  const allFiles = fs.readdirSync(inputDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.heif', '.webp'].includes(ext);
  });

  console.log(`[Input] ${allFiles.length} test görseli işleme alınıyor...\n`);

  const results = [];
  let index = 0;

  for (const filename of allFiles) {
    index++;
    const filePath = path.join(inputDir, filename);
    const baseName = path.parse(filename).name;

    console.log(`------------------------------------------------------`);
    console.log(`[${index}/${allFiles.length}] İşleniyor: ${filename}`);

    try {
      // 1. Sharp Matematiksel Piksel Analizi
      const metrics = await analyzeImage(filePath);
      console.log(`  ↳ Sharp Analizi: ${metrics.width}x${metrics.height} | Luma: ${metrics.meanLuma} | Patlak: ${(metrics.blownRatio * 100).toFixed(1)}% | Saturasyon: ${metrics.avgSaturation}`);

      // 2. Multimodal Model İçerik ve Kusur Tespiti
      const contentAnalysis = await analyzeContentAndDefects(filePath, metrics, apiKey);
      console.log(`  ↳ Kusur Tespiti: [${contentAnalysis.categoryMeta.title}] (${contentAnalysis.explanation})`);

      // 3. Kullanıcı Şikayeti Eşleme
      const userComplaint = assignUserComplaint(contentAnalysis.primaryDefect, filename);
      console.log(`  ↳ Simüle Şikayet: "${userComplaint}"`);

      // Önizleme Referansı Kaydet
      const refFileName = `${baseName}_ref.jpg`;
      const refFilePath = path.join(outputDir, refFileName);
      await createReferencePreview(filePath, refFilePath);

      // 4. Farklı Analist Stratejilerini Koştur
      const strategies = runAllAnalystStrategies(contentAnalysis.primaryDefect, userComplaint, metrics);
      const evaluations = [];

      for (const strat of strategies) {
        const outFileName = `${baseName}_${strat.strategyId}.jpg`;
        const outFilePath = path.join(outputDir, outFileName);

        // Curate Yerel Piksel Motoru ile Render
        const renderResult = await renderAiPlan(filePath, outFilePath, strat.plan);

        // LLM Hakem Değerlendirmesi
        const evaluation = await judgeResult({
          originalMetrics: metrics,
          renderedFilePath: outFilePath,
          defectCategory: contentAnalysis.primaryDefect,
          userComplaint,
          strategyResult: strat,
          renderDurationMs: renderResult.renderDurationMs,
          apiKey,
        });

        evaluations.push({
          ...evaluation,
          strategyResult: strat,
          outputFilePath: outFilePath,
          relativeOutputPath: `output-images/${outFileName}`,
        });

        console.log(`     • [${strat.strategyId}] Skor: ${evaluation.overallScore}/10 (Fidelity: ${evaluation.fidelity}, Niyet: ${evaluation.intentScore}, Süre: ${evaluation.totalTimeMs}ms)`);
      }

      // En iyi stratejiyi bul
      const winner = evaluations.reduce((prev, curr) => (curr.overallScore > prev.overallScore ? curr : prev));
      console.log(`  ★ Kazanan: ${winner.strategyId} (${winner.overallScore}/10)`);

      results.push({
        filename,
        metrics,
        contentAnalysis,
        userComplaint,
        evaluations,
        refFilePath,
        relativeRefPath: `output-images/${refFileName}`,
      });
    } catch (err) {
      console.error(`  [HATA] ${filename} işlenirken hata oluştu:`, err.message);
    }
  }

  // 5. İnteraktif HTML Raporunu Üret
  console.log(`\n======================================================`);
  console.log(`[Rapor] HTML Raporu derleniyor: ${reportPath}`);
  generateHtmlReport(results, reportPath);
  console.log(`[Tamamlandı] Rapor başarıyla oluşturuldu: ${reportPath}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
