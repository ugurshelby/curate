// Yerel görsel doğrulama: 390 genişlikte ekran görüntüleri (puppeteer-core + yerel Chrome).
// Kullanım: AUDIT_PIN=<test PIN'i> node scripts/capture-screens.mjs <etiket>   (sunucu http://localhost:3101, test değerleriyle; scripts/lib/unlock.mjs)
// Çıktı: screenshots/<etiket>/*.png (screenshots/ git'te izlenmez). /api/ai taklit edilir: ücretli çağrı yok.
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unlockGate } from './lib/unlock.mjs';

const label = process.argv[2] || 'shot';
const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = join(process.cwd(), 'screenshots', label);
mkdirSync(out, { recursive: true });
const resultJpeg = readFileSync(join(process.cwd(), 'public/reference-images/ic-mekan-bar.jfif'));

const SAMPLE_PLAN = {
  version: 1,
  scene: { type: 'interior', light: 'indoor', issues: ['flat'] },
  global: { contrast: 0.1, temperature: 0.08 },
  regions: [{ label: 'subject', shape: { type: 'radial', cx: 0.5, cy: 0.6, rx: 0.3, ry: 0.3, feather: 0.4 }, adjust: { exposure: 0.2, shadows: 0.15 } }],
};

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await unlockGate(browser, base);

async function fresh() {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (!req.url().includes('/api/ai')) return req.continue();
    if (req.method() === 'GET') {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, remainingDay: 19, remainingMonth: 149, remainingTry: 287, counter: 'redis' }) });
    }
    await wait(800);
    // AI plan (task P): JSON light plan only
    if (req.headers()['x-curate-task'] === 'P') {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: SAMPLE_PLAN }), headers: { 'x-curate-remaining-day': '18', 'x-curate-remaining-month': '148' } });
    }
    return req.respond({ status: 200, contentType: 'image/jpeg', body: resultJpeg, headers: { 'x-curate-remaining-day': '18', 'x-curate-remaining-month': '148' } });
  });
  await page.goto(base, { waitUntil: 'networkidle0' });
  return page;
}

const clickText = (page, text, sel = 'button,[role=button]') =>
  page.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((b) => (b.getAttribute('aria-label') || b.textContent).trim().includes(t));
      if (!el) return false;
      el.click();
      return true;
    },
    text,
    sel,
  );

async function loadRefs(page, names) {
  await clickText(page, 'Referans');
  await wait(600);
  for (const n of names) {
    await page.evaluate((name) => {
      const el = [...document.querySelectorAll('[role=dialog] button')].find((b) => (b.getAttribute('aria-label') || '').includes(name));
      el && el.click();
    }, n);
    await wait(150);
  }
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role=dialog] button')].find((b) => /Ekle|Yükle|Tamam/.test(b.textContent) && !b.disabled);
    el && el.click();
  });
  await wait(2500);
}

async function openModule(page, id) {
  await page.evaluate((m) => document.querySelector(`[data-module="${m}"]`)?.click(), id);
  await wait(1200);
}

const shot = async (page, name) => {
  await wait(500);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log('shot', name);
};

const refs = ['İç mekan bar', 'Köprü', 'Şehir gökdelen'];

// 1) Ana sayfa
let page = await fresh();
await shot(page, '01_ana_sayfa');
await page.close();

// 2) Çerçeve
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'frame');
await shot(page, '02_cerceve');
await page.close();

// 3) Upscale
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'upscale');
await shot(page, '03_upscale');
await page.close();

// 4) Düzenle: start, quick directive result (mocked plan), export sheet
page = await fresh();
await loadRefs(page, ['İç mekan bar']);
await openModule(page, 'edit');
await shot(page, '04_duzenle');
await clickText(page, 'Patlak Işığı Topla');
await page.waitForFunction(() => [...document.querySelectorAll('[data-bottom-stack] button')].some((b) => b.textContent.trim() === 'İndir'), { timeout: 20000 });
await shot(page, '05_duzenle_sonuc');
await clickText(page, 'Dışa aktar');
await wait(600);
await shot(page, '06_export_sayfasi');
await page.close();

await browser.close();
