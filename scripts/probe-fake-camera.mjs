// /probe sayfasını Chromium sahte kamerasıyla baştan sona çalıştırır (docs/probe/README.md).
// Kullanım: node scripts/probe-fake-camera.mjs   (dev sunucusu http://localhost:3101)
// Doğrular: sayfa çökmeden biter, ekrandaki JSON probe/v1 şemasına uyar, test başladıktan sonra ağ isteği yok,
// 390×844'te yatay taşma yok, dokunma hedefleri ≥ 44 px, metin ≥ 12 px.
// Sahte kamera gerçek kontrolleri (pozlama, ISO, WB, odak, torch) taklit etmez: bu betik yalnız akışı sınar.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const shots = process.env.SHOTS; // ör. screenshots/probe (izlenmez, .gitignore)

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${base}/probe`, { waitUntil: 'networkidle0' });

const layout = () =>
  page.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const visible = (e) => {
      const r = R(e);
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const interactive = [...document.querySelectorAll('button, summary')].filter(visible);
    return {
      hScroll: document.documentElement.scrollWidth > innerWidth,
      smallTargets: interactive.filter((e) => R(e).width < 44 || R(e).height < 44).map((e) => e.textContent.trim()),
      tinyText: [...document.querySelectorAll('body *')]
        .filter((e) => !e.children.length && e.textContent.trim() && visible(e) && parseFloat(getComputedStyle(e).fontSize) < 12)
        .map((e) => e.textContent.trim().slice(0, 20)),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    };
  });

const before = await layout();
if (shots) {
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, '1-hazir.png') });
}

// Test başladıktan sonraki istekler (HMR websocket ve aynı kökenli _next kaynakları hariç)
const requests = [];
page.on('request', (r) => {
  const u = r.url();
  if (u.startsWith('data:') || u.startsWith('blob:')) return;
  if (u.startsWith(base) && /\/_next\/|__nextjs|webpack-hmr/.test(u)) return;
  requests.push(`${r.method()} ${u}`);
});

const t0 = Date.now();
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Testi başlat')).click());
let midShot = false;
for (;;) {
  const done = await page.$('[data-probe-done], [role="alert"]');
  if (done) break;
  if (Date.now() - t0 > 240000) throw new Error('240 sn içinde bitmedi');
  if (shots && !midShot && Date.now() - t0 > 8000) {
    await page.screenshot({ path: join(shots, '2-calisiyor.png') });
    midShot = true;
  }
  await new Promise((r) => setTimeout(r, 500));
}
const ms = Date.now() - t0;
const json = await page.$eval('[data-probe-json]', (e) => e.textContent).catch(() => null);
const schemaLine = await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.textContent).find((t) => t.startsWith('Şema doğrulaması')) ?? null);
const after = await layout();
if (shots) await page.screenshot({ path: join(shots, '3-bitti.png'), fullPage: true });

const report = json ? JSON.parse(json) : null;
if (report && process.env.OUT) writeFileSync(process.env.OUT, json);
const statusCount = (s) => report?.tests.filter((t) => t.durum === s).length ?? 0;
const summary = {
  bitişMs: ms,
  jsonBayt: json ? Buffer.byteLength(json) : 0,
  schema: report?.schema ?? null,
  kaynak: report?.meta.kaynak ?? null,
  testSayısı: report?.tests.length ?? 0,
  durumlar: Object.fromEntries(['var', 'yok', 'kabul-edildi-etkisiz', 'etkili', 'hata', 'atlandı'].map((s) => [s, statusCount(s)])),
  hatalar: report?.tests.filter((t) => t.durum === 'hata').map((t) => `${t.id}: ${t.ayrıntı}`) ?? [],
  kameralar: report?.cameras.map((c) => c.etiket) ?? [],
  notlar: report?.meta.notlar ?? [],
  şemaSatırı: schemaLine,
  testSonrasıİstek: requests,
  sayfaHatası: errors,
  düzenÖnce: before,
  düzenSonra: after,
};
console.log(JSON.stringify(summary, null, 2));
await browser.close();
const pass = report && schemaLine?.includes('geçti') && requests.length === 0 && errors.length === 0 && !after.hScroll && !after.smallTargets.length && !after.tinyText.length;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
