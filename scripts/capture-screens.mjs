// Yerel görsel doğrulama: 390 genişlikte ekran görüntüleri (puppeteer-core + yerel Chrome).
// Kullanım: node scripts/capture-screens.mjs <etiket>   (dev sunucusu http://localhost:3101 üzerinde çalışmalı)
// Çıktı: screenshots/<etiket>/*.png (screenshots/ git'te izlenmez). /api/ai taklit edilir: ücretli çağrı yok.
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] || 'shot';
const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = join(process.cwd(), 'screenshots', label);
mkdirSync(out, { recursive: true });
const resultJpeg = readFileSync(join(process.cwd(), 'public/reference-images/ic-mekan-bar.jfif'));

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fresh() {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (!req.url().includes('/api/ai')) return req.continue();
    if (req.method() === 'GET') {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, remainingDay: 19, remainingMonth: 149, counter: 'redis' }) });
    }
    await wait(800);
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

// 2) Carousel
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'carousel');
await shot(page, '02_carousel');
await clickText(page, 'Düzenle', 'button');
await wait(500);
await shot(page, '02b_carousel_panel');
await page.close();

// 3) Story
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'story');
await shot(page, '03_story');
await page.close();

// 4) Çerçeve
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'frame');
await shot(page, '04_cerceve');
await page.close();

// 5) Upscale
page = await fresh();
await loadRefs(page, refs);
await openModule(page, 'upscale');
await shot(page, '05_upscale');
await page.close();

// 6) Düzenle: Preset, Kırp, export, AI sayfası, kontrol sayfası
page = await fresh();
await loadRefs(page, ['İç mekan bar']);
await openModule(page, 'edit');
await clickText(page, 'Moody Teal');
await wait(800);
await shot(page, '06_duzenle_preset');
await clickText(page, 'Kırp', '[role=tab]');
await wait(800);
await shot(page, '07_duzenle_kirp');
await clickText(page, 'Preset', '[role=tab]');
await wait(500);
await clickText(page, 'Dışa aktar');
await wait(600);
await shot(page, '08_export_sayfasi');
await clickText(page, 'Kapat');
await wait(400);
await clickText(page, 'AI ile onar');
await wait(900);
await shot(page, '09_ai_alt_sayfa');
await clickText(page, 'Gürültü temizle', '[data-ai-sheet] button');
await page.waitForSelector('[aria-label="AI sonucunu kontrol et"]', { timeout: 20000 });
await shot(page, '10_ai_kontrol');
await clickText(page, 'Kullan', '[aria-label="AI sonucunu kontrol et"] button');
await wait(900);
await shot(page, '11_duzenle_ai_sonucu');
await page.close();

await browser.close();
