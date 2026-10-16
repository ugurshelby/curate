import fs from 'fs';
import path from 'path';
import { analyzeImage } from './pipeline/preprocessor.mjs';
import { DEFECT_CATEGORIES, classifyByMath } from './pipeline/content-analyzer.mjs';
import { matchTemplateForDefect } from './pipeline/template-definitions.mjs';
import { interpretImageSemantics } from './pipeline/two-stage-interpreter.mjs';
import { MULTISTAGE_APPROACHES, runAllMultistageApproaches } from './pipeline/multistage-models.mjs';
import { renderAiPlan, createReferencePreview } from './pipeline/curate-renderer.mjs';
import { judgeResult } from './pipeline/llm-judge.mjs';
import { generateMultistageHtmlReport } from './pipeline/multistage-report-generator.mjs';

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
  console.log('\n================================================================');
  console.log('   CURATE STUDIO — İKİ AŞAMALI AI PIPELINE & MODEL BENCHMARK   ');
  console.log('================================================================\n');

  const inputDir = path.resolve('tests/test-images');
  const outputDir = path.resolve('tests/output-images');
  const reportPath = path.resolve('tests/multistage-report.html');

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
  const categoryStats = {};

  let index = 0;

  for (const filename of allFiles) {
    index++;
    const filePath = path.join(inputDir, filename);
    const baseName = path.parse(filename).name;

    console.log(`----------------------------------------------------------------`);
    console.log(`[${index}/${allFiles.length}] İşleniyor: ${filename}`);

    try {
      // 1. Matematiksel Teknik Şema
      const metrics = await analyzeImage(filePath);
      const defectCategory = classifyByMath(metrics);
      const defectMeta = DEFECT_CATEGORIES[defectCategory] || DEFECT_CATEGORIES.blown_highlights;
      const template = matchTemplateForDefect(defectCategory);

      console.log(`  ↳ Teknik Şema: ${metrics.width}×${metrics.height} | Luma: ${metrics.meanLuma} | Patlak: ${(metrics.blownRatio * 100).toFixed(1)}% | Cast: w=${metrics.colorCast.warmth.toFixed(2)}`);
      console.log(`  ↳ Şablon: "${template.name}" (${defectMeta.title})`);

      // Referans Görsel Önizlemesi
      const refFileName = `${baseName}_ref.jpg`;
      const refFilePath = path.join(outputDir, refFileName);
      await createReferencePreview(filePath, refFilePath);

      // 2. Görsel Yorumlayıcı Model (Vision Interpreter)
      const interpretation = await interpretImageSemantics({
        filePath,
        metrics,
        template,
        userDirective: template.defaultDirective,
        apiKey,
      });

      console.log(`  ↳ Yorumlayıcı: "${interpretation.interpreterSummary.slice(0, 75)}..." (${interpretation.interpreterDurationMs} ms)`);

      // 3. Çok Aşamalı Yaklaşımları Koştur (A: Tek Aşamalı, B: İki Aşamalı, C: Harmonizer)
      const approaches = runAllMultistageApproaches(metrics, template, interpretation, template.defaultDirective);
      const evaluations = [];

      for (const app of approaches) {
        const outFileName = `${baseName}_${app.approachId}.jpg`;
        const outFilePath = path.join(outputDir, outFileName);

        // Curate Yerel Piksel Motoru ile Render
        const renderResult = await renderAiPlan(filePath, outFilePath, app.plan);

        // Değerlendirme
        const evaluation = await judgeResult({
          originalMetrics: metrics,
          renderedFilePath: outFilePath,
          defectCategory,
          userComplaint: template.userExpectation,
          strategyResult: {
            strategyId: app.approachId,
            plan: app.plan,
            durationMs: app.durationMs,
          },
          renderDurationMs: renderResult.renderDurationMs,
          apiKey,
        });

        const approachMeta = MULTISTAGE_APPROACHES[app.approachId];

        evaluations.push({
          ...evaluation,
          approachId: app.approachId,
          approachName: approachMeta.name,
          outputFilePath: outFilePath,
          relativeOutputPath: `output-images/${outFileName}`,
          totalTimeMs: app.durationMs + renderResult.renderDurationMs + (app.approachId.startsWith('two_stage') ? interpretation.interpreterDurationMs : 0),
          isWinner: false,
        });
      }

      // En yüksek puanlı yaklaşımı belirle
      const winner = evaluations.reduce((prev, curr) => (curr.overallScore > prev.overallScore ? curr : prev));
      winner.isWinner = true;

      console.log(`  ★ Şampiyon: ${winner.approachName} (${winner.overallScore}/10 - ${winner.totalTimeMs} ms)`);

      // Kategori istatistiklerine ekle
      if (!categoryStats[defectCategory]) {
        categoryStats[defectCategory] = {
          count: 0,
          templateName: template.name,
          title: defectMeta.title,
          description: template.userExpectation,
          approaches: {
            direct_single_stage: { scoreSum: 0, count: 0 },
            two_stage_interpreter: { scoreSum: 0, count: 0 },
            two_stage_harmonized: { scoreSum: 0, count: 0 },
          },
        };
      }
      categoryStats[defectCategory].count++;
      evaluations.forEach((ev) => {
        categoryStats[defectCategory].approaches[ev.approachId].scoreSum += ev.overallScore;
        categoryStats[defectCategory].approaches[ev.approachId].count++;
      });

      results.push({
        filename,
        metrics,
        defectTitle: defectMeta.title,
        template,
        interpretation,
        evaluations,
        winner,
        refRelativePath: `output-images/${refFileName}`,
      });
    } catch (err) {
      console.error(`  [HATA] ${filename} işlenirken hata oluştu:`, err.message);
    }
  }

  // Kategori Şampiyonlarını Hesapla
  const categoryWinners = {};
  for (const [catId, stats] of Object.entries(categoryStats)) {
    let topApproachId = 'two_stage_harmonized';
    let topAvg = -1;
    for (const [appId, aStat] of Object.entries(stats.approaches)) {
      const avg = aStat.count > 0 ? aStat.scoreSum / aStat.count : 0;
      if (avg > topAvg) {
        topAvg = avg;
        topApproachId = appId;
      }
    }

    const appMeta = MULTISTAGE_APPROACHES[topApproachId];
    categoryWinners[catId] = {
      templateName: stats.templateName,
      title: stats.title,
      description: stats.description,
      winnerId: topApproachId,
      winnerName: appMeta.name,
      avgScore: topAvg.toFixed(1),
      reason: `${appMeta.name}, ortalama ${topAvg.toFixed(1)}/10 puanla bu kategoride en yüksek görsel doğallık ve kullanıcı beklentisi uyumunu sağladı.`,
    };
  }

  // HTML Raporunu Oluştur
  console.log('\n[Rapor] Çok Aşamalı Karşılaştırmalı HTML Raporu oluşturuluyor...');
  generateMultistageHtmlReport({
    results,
    categoryWinners,
    outputPath: reportPath,
  });

  console.log(`[Tamamlandı] Rapor kaydedildi: ${reportPath}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
