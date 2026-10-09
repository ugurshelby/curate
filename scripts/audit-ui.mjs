// Prosedür 2 + metin kontrastı denetimi (puppeteer-core + yerel Chrome, emüle edilmiş telefon ekranı).
// Kullanım: AUDIT_PIN=<test PIN'i> node scripts/audit-ui.mjs   (sunucu http://localhost:3101, test değerleriyle; scripts/lib/unlock.mjs).
// /api/ai taklit edilir: ücretli çağrı yok. Önce kilit ekranı (çerezsiz bağlam), sonra kapı açılır.
// Çıktı: her genişlik ve ekran için yerleşim değişmezleri (docs/procedures.md §2) ve en düşük metin kontrastı.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unlockGate } from './lib/unlock.mjs';

const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const resultJpeg = readFileSync(join(process.cwd(), 'public/reference-images/ic-mekan-bar.jfif'));
const VIEWPORTS = [
  [360, 740],
  [390, 844],
  [430, 932],
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });

const SAMPLE_PLAN = {
  version: 1,
  scene: { type: 'interior', light: 'indoor', issues: ['flat'] },
  global: { contrast: 0.1, temperature: 0.08 },
  regions: [
    { label: 'highlight', shape: { type: 'linear', x0: 0.5, y0: 0, x1: 0.5, y1: 0.4, feather: 0.1 }, adjust: { highlights: -0.25 } },
    { label: 'subject', shape: { type: 'radial', cx: 0.5, cy: 0.6, rx: 0.3, ry: 0.3, feather: 0.4 }, adjust: { exposure: 0.2, shadows: 0.15 } },
  ],
};

async function fresh(w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  // Taklit: cihaz önce eşli değil (GET 401 pin_required), PUT (PIN) eşler, sonra GET 200
  let paired = false;
  const status = { enabled: true, remainingDay: 19, remainingMonth: 149, remainingTry: 287, counter: 'redis' };
  page.on('request', async (req) => {
    if (!req.url().includes('/api/ai')) return req.continue();
    if (req.method() === 'GET') {
      return paired
        ? req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(status) })
        : req.respond({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'pin_required', message: 'x' }) });
    }
    if (req.method() === 'PUT') {
      paired = true;
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(status) });
    }
    await wait(500);
    // AI Preset (görev P): yalnız JSON plan döner
    if (req.headers()['x-curate-task'] === 'P') {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: SAMPLE_PLAN }), headers: { 'x-curate-remaining-day': '18', 'x-curate-remaining-month': '148' } });
    }
    return req.respond({ status: 200, contentType: 'image/jpeg', body: resultJpeg, headers: { 'x-curate-remaining-day': '18', 'x-curate-remaining-month': '148' } });
  });
  await page.goto(base, { waitUntil: 'networkidle0' });
  return page;
}
const clickText = (page, text, sel = 'button,[role=button]') =>
  page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.getAttribute('aria-label') || b.textContent).trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, text, sel);
async function loadRefs(page, names) {
  await clickText(page, 'Referans');
  await wait(600);
  for (const n of names) {
    await page.evaluate((name) => { [...document.querySelectorAll('[role=dialog] button')].find((b) => (b.getAttribute('aria-label') || '').includes(name))?.click(); }, n);
    await wait(120);
  }
  await page.evaluate(() => { [...document.querySelectorAll('[role=dialog] button')].find((b) => /Ekle|Yükle|Tamam/.test(b.textContent) && !b.disabled)?.click(); });
  await wait(2500);
}
async function openModule(page, id) {
  await page.evaluate((m) => document.querySelector(`[data-module="${m}"]`)?.click(), id);
  await wait(1200);
}

/** Tarayıcıda çalışan ölçüm: yerleşim değişmezleri + metin kontrastı */
function measure({ withStage }) {
  const R = (e) => e.getBoundingClientRect();
  const visible = (e) => { const r = R(e); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const inScroller = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  const interactive = [...document.querySelectorAll('button, [role="button"], [role="radio"], [role="slider"], input[type="range"], input')].filter(visible);
  const out = {
    hScroll: document.documentElement.scrollWidth > innerWidth,
    offscreen: interactive.filter((e) => !inScroller(e)).filter((e) => R(e).right > innerWidth + 0.5 || R(e).left < -0.5).map((e) => e.getAttribute('aria-label') || e.innerText.trim()),
    smallTargets: interactive.filter((e) => { const r = R(e); return r.width < 44 || r.height < 44; }).map((e) => e.getAttribute('aria-label') || e.innerText.trim()),
    tinyText: [...document.querySelectorAll('body *')].filter((e) => !e.children.length && e.textContent.trim() && visible(e) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent.trim().slice(0, 20)),
    glass: [...document.querySelectorAll('.glass-panel')].filter(visible).length,
  };
  if (withStage) {
    const s = document.querySelector('[data-stage]');
    const hd = document.querySelector('header');
    const bs = document.querySelector('[data-bottom-stack]');
    if (s && hd && bs) {
      const sr = R(s), hr = R(hd), top = R(bs).top;
      out.overlap = sr.top < hr.bottom || sr.bottom > top;
      out.stage = [Math.round(sr.top), Math.round(sr.bottom)];
    }
  }
  // Kontrast: yaprak metin öğeleri, fotoğraf üstü ([data-stage], [data-review-stage]) hariç
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const effBg = (el) => {
    const chain = [];
    for (let p = el; p; p = p.parentElement) chain.push(p);
    let bg = { r: 0, g: 0, b: 0, a: 1 };
    for (const p of chain.reverse()) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c.a > 0) bg = over(c, bg); }
    return bg;
  };
  const rows = [];
  document.querySelectorAll('body *').forEach((e) => {
    if (!visible(e)) return;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    if (e.closest('[data-stage]') || e.closest('[data-review-stage]') || e.closest('canvas')) return;
    const cs = getComputedStyle(e);
    const fg = parse(cs.color);
    if (!fg) return;
    const bg = effBg(e);
    const f = over(fg, bg);
    const [l1, l2] = [lum(f), lum(bg)];
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const disabled = e.closest('button:disabled');
    rows.push({ t: e.textContent.trim().slice(0, 24), ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5, disabled: !!disabled });
  });
  out.contrastFail = rows.filter((r) => !r.disabled && r.ratio < r.need);
  out.contrastMin = rows.filter((r) => !r.disabled).reduce((m, r) => Math.min(m, r.ratio), 99);
  return out;
}

const results = [];
async function record(page, w, name, withStage = true) {
  await wait(450);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
  const m = await page.evaluate(measure, { withStage });
  results.push({ w, name, ...m });
}

// Kilit ekranı (D27): çerezsiz ayrı bağlamda; yanlış PIN yalnız bir kez (sayaç: IP başına günde 5)
{
  const ctx = await browser.createBrowserContext();
  for (const [w, h] of VIEWPORTS) {
    const page = await ctx.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(base, { waitUntil: 'networkidle0' });
    await record(page, w, 'PIN ekranı', false);
    if (w === 390) {
      if (new URL(page.url()).pathname !== '/kilit') throw new Error('Kapı yönlendirmedi: ' + page.url());
      await page.type('#lock-pin', process.env.AUDIT_PIN === '0000' ? '1111' : '0000');
      await page.waitForFunction(() => document.querySelector('[role=alert]')?.textContent?.trim(), { timeout: 10000 });
      await record(page, w, 'PIN hatalı', false);
    }
    await page.close();
  }
  await ctx.close();
}
await unlockGate(browser, base);

for (const [w, h] of VIEWPORTS) {
  let page = await fresh(w, h);
  await record(page, w, 'Ana sayfa', false);
  await loadRefs(page, ['İç mekan bar', 'Köprü', 'Şehir gökdelen']);
  await openModule(page, 'carousel');
  await record(page, w, 'Carousel');
  await clickText(page, 'Düzenle');
  await record(page, w, 'Carousel panel');
  await clickText(page, 'Araçlar');
  await record(page, w, 'Carousel Araçlar');
  await clickText(page, 'TikTok');
  await record(page, w, 'Carousel TikTok');
  await clickText(page, 'Dışa aktar');
  await record(page, w, 'Export sayfası', false);
  await page.close();

  page = await fresh(w, h);
  await loadRefs(page, ['İç mekan bar', 'Köprü', 'Şehir gökdelen']);
  await openModule(page, 'story');
  await record(page, w, 'Story');
  await page.close();

  for (const [mod, label] of [['frame', 'Çerçeve'], ['upscale', 'Upscale']]) {
    page = await fresh(w, h);
    await loadRefs(page, ['İç mekan bar', 'Köprü']);
    await openModule(page, mod);
    await record(page, w, label);
    if (mod === 'frame') {
      for (const r of ['9:16', '16:9', '1.91:1']) {
        await clickText(page, r, '[role=radio]');
        await record(page, w, `Çerçeve ${r}`);
      }
    }
    await page.close();
  }

  page = await fresh(w, h);
  await loadRefs(page, ['İç mekan bar']);
  await openModule(page, 'edit');
  await record(page, w, 'Düzenle Preset');
  await clickText(page, 'Kırp', '[role=tab]');
  await record(page, w, 'Düzenle Kırp');
  await clickText(page, 'Düzeltme', '[role=tab]');
  await record(page, w, 'Düzenle Düzeltme');
  await clickText(page, 'Otomatik');
  await wait(1500);
  await record(page, w, 'Düzeltme Otomatik');
  await clickText(page, 'Preset', '[role=tab]');
  await clickText(page, 'AI Preset', '[data-preset=ai_plan]');
  await wait(500);
  await record(page, w, 'AI Preset sayfası', false);
  await clickText(page, 'Altın Saat', '[data-ai-preset-sheet] button');
  await page.waitForFunction(() => !document.querySelector('[data-ai-preset-sheet]'), { timeout: 20000 });
  await wait(800);
  await record(page, w, 'AI Preset uygulandı');
  await clickText(page, 'AI ile onar');
  await wait(800);
  await record(page, w, 'AI PIN adımı', false);
  await page.type('#ai-pin', '0000');
  await wait(800);
  await record(page, w, 'AI alt sayfası', false);
  await clickText(page, 'Gürültü temizle', '[data-ai-sheet] button');
  await page.waitForSelector('[aria-label="AI sonucunu kontrol et"]', { timeout: 20000 });
  await record(page, w, 'AI kontrol sayfası', false);
  await clickText(page, 'Kullan', '[aria-label="AI sonucunu kontrol et"] button');
  await wait(800);
  await record(page, w, 'Düzenle (AI sonucu)');
  await page.close();

  // Temporary probe page (docs/probe/README.md): start screen only; the full flow is scripts/probe-fake-camera.mjs
  page = await fresh(w, h);
  await page.goto(`${base}/probe`, { waitUntil: 'networkidle0' });
  await record(page, w, 'Yoklama', false);
  await page.close();
}
// Masaüstü: ana sayfa içeriği ortalı ve sınırlı genişlikte (CDS §6)
{
  const page = await fresh(1280, 800);
  await record(page, 1280, 'Ana sayfa (masaüstü)', false);
  const c = await page.evaluate(() => {
    const el = document.querySelector('[data-drop-zone]')?.parentElement?.parentElement;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(innerWidth - r.right), width: Math.round(r.width) };
  });
  results[results.length - 1].centered = c && Math.abs(c.left - c.right) <= 2 && c.width <= 1040;
  console.log('masaüstü kap:', JSON.stringify(c));
  await page.close();
}
await browser.close();

let bad = 0;
for (const r of results) {
  const fail = r.centered === false || r.overlap || r.hScroll || r.offscreen.length || r.smallTargets.length || r.tinyText.length || r.glass > 3 || r.contrastFail.length;
  if (fail) bad++;
  console.log(
    `${r.w} ${r.name.padEnd(20)} ${fail ? 'FAIL' : 'ok  '} sahne=${r.stage ? r.stage.join('–') : '—'} overlap=${r.overlap ?? '—'} hScroll=${r.hScroll} küçük=${r.smallTargets.length} 12px altı=${r.tinyText.length} cam=${r.glass} minKontrast=${r.contrastMin}` +
      (r.contrastFail.length ? ' KONTRAST: ' + JSON.stringify(r.contrastFail.slice(0, 6)) : '') +
      (r.smallTargets.length ? ' KÜÇÜK: ' + JSON.stringify(r.smallTargets) : '') +
      (r.offscreen.length ? ' DIŞARIDA: ' + JSON.stringify(r.offscreen) : ''),
  );
}
console.log(bad ? `FAIL: ${bad} ekran` : 'pass: true');
process.exit(bad ? 1 : 0);
