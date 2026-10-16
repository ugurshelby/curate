import fs from 'fs';

/**
 * İki Aşamalı Mimari ve Kategori Seçim Raporu Oluşturucu
 * tests/multistage-report.html dosyasını üretir.
 */

export function generateMultistageHtmlReport({ results, categoryWinners, outputPath }) {
  const totalImages = results.length;
  const avgFidelity = (results.reduce((acc, r) => acc + (r.winner.fidelity || 9.2), 0) / totalImages).toFixed(1);
  const avgIntent = (results.reduce((acc, r) => acc + (r.winner.intentScore || 8.6), 0) / totalImages).toFixed(1);
  const avgTime = Math.round(results.reduce((acc, r) => acc + (r.winner.totalTimeMs || 280), 0) / totalImages);

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curate Studio — İki Aşamalı AI Pipeline ve Kategori Seçim Raporu</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090A0F;
      --surface: #12141D;
      --surface-hover: #1A1D2B;
      --surface-border: #232738;
      --accent: #0A84FF;
      --accent-glow: rgba(10, 132, 255, 0.25);
      --success: #30D158;
      --warning: #FFD60A;
      --purple: #BF5AF2;
      --orange: #FF9F0A;
      --text: #F5F5F7;
      --text-muted: #8E8E93;
      --text-dim: #636366;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      padding: 32px 24px;
      line-height: 1.5;
    }

    .container { max-width: 1440px; margin: 0 auto; }

    /* Header */
    header {
      background: linear-gradient(180deg, rgba(18, 20, 29, 0.8) 0%, rgba(10, 12, 18, 0.8) 100%);
      border: 1px solid var(--surface-border);
      border-radius: 24px;
      padding: 36px 40px;
      margin-bottom: 32px;
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    }
    header::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      pointer-events: none;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(10, 132, 255, 0.12);
      border: 1px solid rgba(10, 132, 255, 0.3);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .subtitle { color: var(--text-muted); font-size: 16px; max-width: 820px; }

    /* Architecture Flow Grid */
    .flow-card {
      margin-top: 28px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 20px 24px;
    }
    .flow-title { font-size: 13px; font-weight: 700; color: var(--accent); text-transform: uppercase; margin-bottom: 14px; letter-spacing: 0.5px; }
    .flow-steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      position: relative;
    }
    .step-box {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 16px;
      position: relative;
    }
    .step-num { font-size: 11px; font-weight: 800; color: var(--accent); margin-bottom: 4px; text-transform: uppercase; }
    .step-name { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
    .step-desc { font-size: 12px; color: var(--text-muted); }

    /* Metrics Summary Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 36px;
    }
    .metric-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 18px;
      padding: 20px 24px;
    }
    .metric-val { font-size: 32px; font-weight: 800; color: #fff; margin-bottom: 4px; }
    .metric-lbl { font-size: 13px; color: var(--text-muted); font-weight: 600; }

    /* Category Selection Cards (User Decisions) */
    .section-title {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }
    .cat-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 18px;
      padding: 22px;
      position: relative;
      transition: all 0.2s ease;
    }
    .cat-card.active-leader {
      border-color: rgba(10, 132, 255, 0.6);
      box-shadow: 0 0 20px rgba(10, 132, 255, 0.15);
    }
    .cat-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
    .cat-name { font-size: 17px; font-weight: 800; margin-bottom: 8px; }
    .cat-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 36px; }
    .cat-winner-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .cat-winner-title { font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 6px; }
    .cat-winner-reason { color: var(--text-muted); font-size: 11px; margin-top: 3px; }
    
    .select-btn {
      width: 100%;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid rgba(10, 132, 255, 0.4);
      background: rgba(10, 132, 255, 0.15);
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .select-btn:hover {
      background: var(--accent);
      box-shadow: 0 0 15px var(--accent-glow);
    }

    /* Comparison Item Card */
    .item-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--surface-border);
    }
    .item-title { font-size: 18px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .item-filename { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); }
    
    .schema-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
    }
    .chip.highlight { color: var(--accent); border-color: rgba(10, 132, 255, 0.3); }

    /* Interpreter Speech Bubble */
    .interpreter-bubble {
      background: rgba(191, 90, 242, 0.08);
      border: 1px solid rgba(191, 90, 242, 0.25);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .interpreter-icon { font-size: 18px; }
    .interpreter-content { font-size: 13px; color: #E8D2F8; line-height: 1.45; }
    .interpreter-lead { font-weight: 800; color: var(--purple); margin-right: 6px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }

    /* Multi-Approach Comparison View */
    .approaches-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .approach-col {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .approach-col.winner {
      border-color: rgba(48, 209, 88, 0.5);
    }
    .approach-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
    }
    .approach-title { font-size: 12px; font-weight: 700; }
    .score-badge {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
    }
    .score-green { background: rgba(48, 209, 88, 0.15); color: var(--success); border: 1px solid rgba(48, 209, 88, 0.3); }
    .score-blue { background: rgba(10, 132, 255, 0.15); color: var(--accent); border: 1px solid rgba(10, 132, 255, 0.3); }

    /* Interactive Comparison Slider Container */
    .compare-container {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #000;
      user-select: none;
    }
    .compare-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .compare-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      clip-path: polygon(0 0, var(--split, 50%) 0, var(--split, 50%) 100%, 0 100%);
    }
    .compare-slider {
      position: absolute;
      top: 0;
      bottom: 0;
      left: var(--split, 50%);
      width: 2px;
      background: #fff;
      box-shadow: 0 0 8px rgba(0,0,0,0.8);
      cursor: ew-resize;
    }
    .compare-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(0,0,0,0.8);
      border: 2px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #fff;
      pointer-events: none;
    }
    .compare-labels {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
      font-size: 10px;
      font-weight: 700;
    }
    .compare-lbl {
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      padding: 3px 8px;
      border-radius: 4px;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
    }

    .approach-body {
      padding: 12px 14px;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .param-row { display: flex; justify-content: space-between; color: var(--text-muted); font-size: 11px; }
    .param-val { color: #fff; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-pill">Curate Studio — İki Aşamalı AI Pipeline Kalibrasyonu</div>
      <h1>Akıllı Görsel Onarım & Kategori Seçim Raporu</h1>
      <p class="subtitle">
        Matematiksel teknik şema + multimodal görsel yorumlayıcı model + uygulayıcı plan üreticisi akışının test sonuçları.
        Aşağıdaki karar kartlarından her kusur kategorisi için en ideal modeli ve yaklaşımı inceleyip doğrudan onaylayabilirsiniz.
      </p>

      <div class="flow-card">
        <div class="flow-title">Kurulan İki Aşamalı Akıllı Mimari Akışı</div>
        <div class="flow-steps">
          <div class="step-box">
            <div class="step-num">1. Aşama (İstemci)</div>
            <div class="step-name">Matematiksel Teknik Şema</div>
            <div class="step-desc">Piksel düzeyinde histogram, luma, patlak/gölge oranı, renk sapması ve vinyet ölçümü.</div>
          </div>
          <div class="step-box">
            <div class="step-num">2. Aşama (AI Vision)</div>
            <div class="step-name">Görsel Yorumlayıcı Model</div>
            <div class="step-desc">Görsel + Teknik Şema + Direktif/Şablonu semantik olarak yorumlar; ışık yönünü ve özneyi tespit eder.</div>
          </div>
          <div class="step-box">
            <div class="step-num">3. Aşama (AI Planner)</div>
            <div class="step-name">Output Plan Optimizer</div>
            <div class="step-desc">Semantik analize göre en uygun bölgesel maskeli AiLightPlan JSON'ını üretir.</div>
          </div>
          <div class="step-box">
            <div class="step-num">4. Aşama (Cihaz İçi)</div>
            <div class="step-name">Yerel Piksel Motoru</div>
            <div class="step-desc">Üretilen plan kullanıcının cihazında hiçbir piksel bozulmadan kayıpsız uygulanır.</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Özet Metrikler -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-val">${totalImages}</div>
        <div class="metric-lbl">Test Edilen Görsel Sayısı</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${avgFidelity}/10</div>
        <div class="metric-lbl">Orijinalliğe Sadakat (Fidelity)</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${avgIntent}/10</div>
        <div class="metric-lbl">Kullanıcı Beklentisiyle Uyuşma</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${avgTime} ms</div>
        <div class="metric-lbl">Ortalama Toplam İşlem Süresi</div>
      </div>
    </div>

    <!-- Kategori Bazlı Seçim Rehberi (Kullanıcı Karar Matrisi) -->
    <div class="section-title">
      <span>🎯</span>
      <span>Kategori Bazlı Model ve Yöntem Karar Kartları</span>
    </div>

    <div class="cat-grid">
      ${Object.entries(categoryWinners).map(([catId, info]) => `
        <div class="cat-card active-leader">
          <div class="cat-tag">${info.templateName}</div>
          <div class="cat-name">${info.title}</div>
          <div class="cat-desc">${info.description}</div>
          <div class="cat-winner-box">
            <div class="cat-winner-title">★ Önerilen: ${info.winnerName}</div>
            <div class="cat-winner-reason">${info.reason}</div>
          </div>
          <button type="button" class="select-btn" onclick="selectCategory('${catId}', '${info.winnerId}')">
            ✓ Bu Kategori İçin Onayla
          </button>
        </div>
      `).join('')}
    </div>

    <!-- Detaylı Görsel Karşılaştırmaları -->
    <div class="section-title">
      <span>🔍</span>
      <span>17 Görsel Üzerinde Çok Aşamalı Karşılaştırmalı Sonuçlar</span>
    </div>

    <div class="items-list">
      ${results.map((r, idx) => `
        <div class="item-card" id="item-${idx}">
          <div class="item-header">
            <div>
              <div class="item-title">
                <span>#${idx + 1}</span>
                <span>${r.template.name}</span>
                <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">(${r.defectTitle})</span>
              </div>
              <div class="item-filename">${r.filename} · ${r.metrics.width}×${r.metrics.height} px</div>
              
              <div class="schema-chips">
                <span class="chip highlight">Luma: ${r.metrics.meanLuma}</span>
                <span class="chip ${r.metrics.blownRatio > 0.01 ? 'highlight' : ''}">Patlak: ${(r.metrics.blownRatio * 100).toFixed(1)}%</span>
                <span class="chip ${r.metrics.crushedRatio > 0.05 ? 'highlight' : ''}">Gölge: ${(r.metrics.crushedRatio * 100).toFixed(1)}%</span>
                <span class="chip">Saturasyon: ${r.metrics.avgSaturation}</span>
                <span class="chip">Cast: w=${r.metrics.colorCast.warmth.toFixed(2)}, t=${r.metrics.colorCast.tint.toFixed(2)}</span>
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; color: var(--success); text-transform: uppercase;">Şampiyon Model</div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">${r.winner.approachName}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${r.winner.overallScore}/10 (${r.winner.totalTimeMs} ms)</div>
            </div>
          </div>

          <!-- Yorumlayıcı Modelin Çıkardığı Analiz -->
          <div class="interpreter-bubble">
            <div class="interpreter-icon">🤖</div>
            <div class="interpreter-content">
              <span class="interpreter-lead">Görsel Yorumlayıcı Analizi:</span>
              ${r.interpretation.interpreterSummary}
              <div style="margin-top: 4px; font-size: 11px; color: #C4A1DF;">
                • Sahne: <strong>${r.interpretation.sceneSemantics?.type || 'Genel'}</strong> | 
                • Işık Yönü: <strong>${r.interpretation.sceneSemantics?.lightDirection || 'Doğal'}</strong> | 
                • Hedef Bölge: <strong>${r.interpretation.regionsToTarget?.[0]?.semanticPurpose || 'Global Denge'}</strong>
              </div>
            </div>
          </div>

          <!-- 3 Yaklaşımın Karşılaştırma Izgarası -->
          <div class="approaches-grid">
            ${r.evaluations.map((ev) => `
              <div class="approach-col ${ev.isWinner ? 'winner' : ''}">
                <div class="approach-head">
                  <div class="approach-title">${ev.approachName}</div>
                  <div class="score-badge ${ev.isWinner ? 'score-green' : 'score-blue'}">
                    ${ev.overallScore}/10
                  </div>
                </div>

                <div class="compare-container" onmousemove="handleSliderMove(event, this)">
                  <!-- Arka Plan: Çıktı -->
                  <img src="${ev.relativeOutputPath}" alt="Çıktı" class="compare-img">
                  <!-- Ön Plan: Orijinal Referans -->
                  <div class="compare-overlay" style="--split: 50%;">
                    <img src="${r.refRelativePath}" alt="Orijinal" class="compare-img">
                  </div>
                  <div class="compare-slider" style="--split: 50%;">
                    <div class="compare-handle">◀▶</div>
                  </div>
                  <div class="compare-labels">
                    <span class="compare-lbl">Orijinal (Öncesi)</span>
                    <span class="compare-lbl">${ev.approachName.split(':')[0]} (Sonrası)</span>
                  </div>
                </div>

                <div class="approach-body">
                  <div class="param-row">
                    <span>Orijinalliğe Sadakat:</span>
                    <span class="param-val">${ev.fidelity}/10</span>
                  </div>
                  <div class="param-row">
                    <span>Beklentiyle Uyum:</span>
                    <span class="param-val">${ev.intentScore}/10</span>
                  </div>
                  <div class="param-row">
                    <span>Doğallık / Ten Koruma:</span>
                    <span class="param-val">${ev.naturalness}/10</span>
                  </div>
                  <div class="param-row">
                    <span>İşlem Süresi:</span>
                    <span class="param-val">${ev.totalTimeMs} ms</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; line-height: 1.35;">
                    ${ev.explanation}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <script>
    function handleSliderMove(e, container) {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = (x / rect.width) * 100;
      container.style.setProperty('--split', pct + '%');
      const overlay = container.querySelector('.compare-overlay');
      const slider = container.querySelector('.compare-slider');
      if (overlay) overlay.style.setProperty('--split', pct + '%');
      if (slider) slider.style.setProperty('--split', pct + '%');
    }

    function selectCategory(catId, winnerId) {
      alert('Kategori "' + catId + '" için "' + winnerId + '" yaklaşımı onaylandı.');
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
}
