import fs from 'fs';
import path from 'path';

/**
 * Modern HTML Rapor Üreticisi (`curate/tests/report.html`)
 * Curate Design System (CDS v3) estetiğinde, interaktif Before/After slider'lı,
 * metrik matrisli ve kategori filtreli test değerlendirme raporu.
 */

export function generateHtmlReport(testResults, outputPath) {
  // Özet İstatistikler
  const totalTests = testResults.length;
  let totalFidelity = 0;
  let totalIntent = 0;
  let totalTime = 0;
  const strategyWins = {
    direct_instruction: 0,
    cot_regional: 0,
    curate_harmonizer: 0,
  };

  testResults.forEach((t) => {
    const best = t.evaluations.reduce((prev, curr) => (curr.overallScore > prev.overallScore ? curr : prev));
    strategyWins[best.strategyId] = (strategyWins[best.strategyId] || 0) + 1;
    totalFidelity += best.fidelity;
    totalIntent += best.intentScore;
    totalTime += best.totalTimeMs;
  });

  const avgFidelity = (totalFidelity / totalTests).toFixed(1);
  const avgIntent = (totalIntent / totalTests).toFixed(1);
  const avgTime = Math.round(totalTime / totalTests);

  const winningStrategy = Object.entries(strategyWins).sort((a, b) => b[1] - a[1])[0][0];
  const strategyTitles = {
    direct_instruction: 'Direct-Instruction',
    cot_regional: 'CoT-Regional Analist',
    curate_harmonizer: 'Curate-Harmonizer',
  };

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curate Studio — AI Pipeline & Calibration Report</title>
  <style>
    :root {
      --bg: #000000;
      --card-bg: #121214;
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --text: #F5F5F7;
      --text-muted: #86868B;
      --accent: #0A84FF;
      --accent-fill: #0071E3;
      --green: #30D158;
      --yellow: #FFD60A;
      --purple: #BF5AF2;
      --orange: #FF9F0A;
      --font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-family);
      line-height: 1.5;
      padding: 32px 20px 80px;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1320px;
      margin: 0 auto;
    }

    /* Header */
    header {
      margin-bottom: 36px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 24px;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: rgba(10, 132, 255, 0.15);
      color: var(--accent);
      border: 1px solid rgba(10, 132, 255, 0.3);
      margin-bottom: 12px;
    }

    h1 {
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 16px;
      max-width: 800px;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(20px);
    }

    .kpi-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .kpi-val {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text);
    }

    .kpi-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Filter Bar */
    .filter-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 32px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
    }

    .filter-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text);
    }

    .filter-btn.active {
      background: var(--accent);
      color: #FFF;
      border-color: var(--accent);
    }

    /* Test Case Cards */
    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .case-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 500px 1fr;
      transition: border-color 0.2s ease;
    }

    @media (max-width: 1024px) {
      .case-card {
        grid-template-columns: 1fr;
      }
    }

    .case-card:hover {
      border-color: var(--card-hover);
    }

    /* Before / After Viewer */
    .media-col {
      background: #08080A;
      position: relative;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--card-border);
      padding: 20px;
    }

    .slider-viewport {
      position: relative;
      width: 100%;
      height: 380px;
      overflow: hidden;
      border-radius: 12px;
      background: #000;
      user-select: none;
    }

    .slider-viewport img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .slider-viewport img.after-img {
      clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
    }

    .slider-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: #FFF;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(0,0,0,0.8);
    }

    .slider-handle::after {
      content: '◀ ▶';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.75);
      border: 2px solid #FFF;
      border-radius: 50%;
      color: #FFF;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }

    .slider-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: ew-resize;
      margin: 0;
      z-index: 10;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Strategy Switcher Tabs */
    .strategy-tabs {
      display: flex;
      gap: 6px;
      margin-top: 14px;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px;
      border-radius: 12px;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }

    .tab-btn.active {
      background: rgba(255, 255, 255, 0.12);
      color: #FFF;
    }

    /* Details Column */
    .details-col {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .meta-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .file-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tags {
      display: flex;
      gap: 6px;
    }

    .tag {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
    }

    .tag.defect {
      background: rgba(255, 159, 10, 0.15);
      color: var(--orange);
      border: 1px solid rgba(255, 159, 10, 0.3);
    }

    .tag.winner {
      background: rgba(48, 209, 88, 0.15);
      color: var(--green);
      border: 1px solid rgba(48, 209, 88, 0.3);
    }

    /* Complaint Box */
    .complaint-box {
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid var(--accent);
      border-radius: 0 10px 10px 0;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .complaint-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .complaint-text {
      font-size: 14px;
      font-style: italic;
      color: var(--text);
    }

    /* Scores Table */
    .eval-section {
      margin-bottom: 20px;
    }

    .scores-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr) 1.2fr;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 14px;
    }

    .score-item {
      display: flex;
      flex-direction: column;
    }

    .score-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .score-val {
      font-size: 18px;
      font-weight: 700;
      color: #FFF;
    }

    .score-val.highlight {
      color: var(--green);
    }

    /* Prompt & JSON Section */
    .accordions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    details {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      overflow: hidden;
      font-size: 13px;
    }

    summary {
      padding: 10px 14px;
      cursor: pointer;
      font-weight: 600;
      color: var(--text-muted);
      user-select: none;
    }

    summary:hover {
      color: var(--text);
    }

    .details-content {
      padding: 12px 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.3);
      font-family: monospace;
      font-size: 12px;
      color: #D1D1D6;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    .critique-text {
      font-size: 13px;
      color: #D1D1D6;
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 14px;
      border-radius: 8px;
      margin-top: 8px;
    }

    footer {
      margin-top: 60px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      border-top: 1px solid var(--card-border);
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-pill">Curate Studio Benchmark · AI v1.0</div>
      <h1>Düzenleme AI & Preset Kalibrasyon Raporu</h1>
      <p class="subtitle">
        <code>tests/test-images</code> klasöründeki fotoğrafların Sharp matematiksel analizi, hafif multimodal model ile kusur tespiti, gerçekçi doğal dil şikayet eşlemesi ve Curate yerel piksel motoru ile uçtan uca değerlendirmesi.
      </p>
    </header>

    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Test Edilen Görsel</div>
        <div class="kpi-val">${totalTests}</div>
        <div class="kpi-sub">17 dosya tarandı</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Orijinalliğe Sadakat</div>
        <div class="kpi-val" style="color: var(--green);">${avgFidelity} / 10</div>
        <div class="kpi-sub">Piksel doku koruma oranı</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Kullanıcı Niyeti Uyumu</div>
        <div class="kpi-val" style="color: var(--accent);">${avgIntent} / 10</div>
        <div class="kpi-sub">Şikayet çözüm başarısı</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Ortalama Süre</div>
        <div class="kpi-val">${avgTime} ms</div>
        <div class="kpi-sub">Analiz + render gecikmesi</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Kazanan Strateji</div>
        <div class="kpi-val" style="color: var(--purple); font-size: 22px;">${strategyTitles[winningStrategy]}</div>
        <div class="kpi-sub">${strategyWins[winningStrategy]} görselde lider</div>
      </div>
    </section>

    <div class="filter-section">
      <div class="filter-group" id="defect-filters">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Kusur Filtresi:</span>
        <button class="filter-btn active" data-filter="all">Tümü (${totalTests})</button>
        <button class="filter-btn" data-filter="blown_highlights">Patlak Işık</button>
        <button class="filter-btn" data-filter="desaturated_flat">Soluk Renkler</button>
        <button class="filter-btn" data-filter="underexposed_subject">Özne Karanlıkta</button>
        <button class="filter-btn" data-filter="noisy_blurry">Gren & Bulanıklık</button>
        <button class="filter-btn" data-filter="color_cast_vignette">Renk Kayması</button>
      </div>
    </div>

    <main class="cards-grid">
      ${testResults.map((t, idx) => renderCaseCard(t, idx)).join('\n')}
    </main>

    <footer>
      Curate Studio · Engine & AI Evaluation Pipeline · Tüm testler yerel piksel sadakatiyle üretilmiştir.
    </footer>
  </div>

  <script>
    // Before / After Slider Etkileşimi
    document.querySelectorAll('.slider-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        const viewport = e.target.closest('.slider-viewport');
        const afterImg = viewport.querySelector('.after-img');
        const handle = viewport.querySelector('.slider-handle');
        afterImg.style.clipPath = \`polygon(\${val}% 0, 100% 0, 100% 100%, \${val}% 100%)\`;
        handle.style.left = \`\${val}%\`;
      });
    });

    // Strateji Sekmeleri (Direct, CoT, Harmonizer arasında geçiş)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.case-card');
        const strategyId = e.target.getAttribute('data-strategy');
        
        // Tab aktifliği
        card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Görsel güncelle
        const afterImg = card.querySelector('.after-img');
        const newSrc = e.target.getAttribute('data-img');
        afterImg.src = newSrc;

        // Bilgileri güncelle
        card.querySelectorAll('.strategy-panel').forEach(p => p.style.display = 'none');
        const activePanel = card.querySelector(\`.strategy-panel[data-strategy="\${strategyId}"]\`);
        if (activePanel) activePanel.style.display = 'block';
      });
    });

    // Kategori Filtreleme
    document.querySelectorAll('#defect-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#defect-filters .filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const filter = e.target.getAttribute('data-filter');
        document.querySelectorAll('.case-card').forEach(card => {
          if (filter === 'all' || card.getAttribute('data-defect') === filter) {
            card.style.display = 'grid';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  return outputPath;
}

function renderCaseCard(testCase, idx) {
  const { filename, metrics, contentAnalysis, userComplaint, evaluations, relativeRefPath } = testCase;
  const bestEval = evaluations.reduce((prev, curr) => (curr.overallScore > prev.overallScore ? curr : prev));
  const activeEval = bestEval; // Varsayılan olarak kazanan gösterilir

  return `
    <article class="case-card" data-defect="${contentAnalysis.primaryDefect}" id="case-${idx}">
      <!-- Sol: Before/After Görsel Karşılaştırma -->
      <div class="media-col">
        <div class="slider-viewport">
          <img src="${relativeRefPath}" alt="Öncesi" class="before-img">
          <img src="${evaluations.find(e => e.strategyId === activeEval.strategyId).relativeOutputPath}" alt="Sonrası" class="after-img">
          <div class="slider-handle"></div>
          <input type="range" min="0" max="100" value="50" class="slider-input" aria-label="Karşılaştırma Kaydırıcısı">
        </div>
        <div class="slider-labels">
          <span>◀ Orijinal (Öncesi)</span>
          <span>Düzeltilmiş (Sonrası) ▶</span>
        </div>

        <!-- Strateji Değiştirme Sekmeleri -->
        <div class="strategy-tabs">
          ${evaluations.map(e => `
            <button class="tab-btn ${e.strategyId === activeEval.strategyId ? 'active' : ''}" 
                    data-strategy="${e.strategyId}" 
                    data-img="${e.relativeOutputPath}">
              ${e.strategyId === 'direct_instruction' ? 'Direct' : e.strategyId === 'cot_regional' ? 'CoT-Regional' : 'Harmonizer'}
              ${e.strategyId === bestEval.strategyId ? '★' : ''}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Sağ: Bilgiler, Şikayet ve Hakem Skorları -->
      <div class="details-col">
        <div>
          <div class="meta-header">
            <h2 class="file-title">
              ${filename}
              <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">${metrics.width}×${metrics.height} (${metrics.aspectRatio})</span>
            </h2>
            <div class="tags">
              <span class="tag">${contentAnalysis.sceneType}</span>
              <span class="tag defect">${contentAnalysis.categoryMeta.title}</span>
              <span class="tag winner">Lider: ${bestEval.strategyId}</span>
            </div>
          </div>

          <!-- Doğal Dil Şikayet Bloğu -->
          <div class="complaint-box">
            <div class="complaint-label">Simüle Edilen Kullanıcı Şikayeti</div>
            <div class="complaint-text">"${userComplaint}"</div>
          </div>

          <!-- Her strateji için dinamik panel -->
          ${evaluations.map(e => `
            <div class="strategy-panel" data-strategy="${e.strategyId}" style="display: ${e.strategyId === activeEval.strategyId ? 'block' : 'none'};">
              <div class="scores-grid">
                <div class="score-item">
                  <span class="score-label">Fidelity (Sadakat)</span>
                  <span class="score-val">${e.fidelity} / 10</span>
                </div>
                <div class="score-item">
                  <span class="score-label">Niyete Uyum</span>
                  <span class="score-val">${e.intentScore} / 10</span>
                </div>
                <div class="score-item">
                  <span class="score-label">Toplam Süre</span>
                  <span class="score-val">${e.totalTimeMs} ms</span>
                </div>
                <div class="score-item">
                  <span class="score-label">Hakem Skoru</span>
                  <span class="score-val highlight">${e.overallScore} / 10</span>
                </div>
              </div>

              <div class="critique-text">
                <strong>Hakem Notu:</strong> ${e.critique}
              </div>

              <div class="accordions" style="margin-top: 12px;">
                <details>
                  <summary>Analist Optimize Prompt Zinciri</summary>
                  <div class="details-content">${e.strategyResult.optimizedPrompt}</div>
                </details>
                <details>
                  <summary>Teknik Curate Parametre Planı (JSON)</summary>
                  <div class="details-content">${JSON.stringify(e.strategyResult.plan, null, 2)}</div>
                </details>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}
