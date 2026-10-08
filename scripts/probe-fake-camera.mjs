// Runs /probe end to end with the Chromium fake camera (docs/probe/README.md).
// Usage: AUDIT_PIN=<test 4 digits> node scripts/probe-fake-camera.mjs
//   (server on http://localhost:3101 started with TEST values; see scripts/lib/unlock.mjs; never the real PIN)
// Checks: the page finishes without crashing, the JSON on screen matches probe/v1, no network request after start,
// no horizontal scroll at 390×844, touch targets >= 44 px, text >= 12 px.
// The fake camera does not emulate real controls (exposure, ISO, WB, focus, torch): this only tests the flow.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { unlockGate } from './lib/unlock.mjs';

const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const shots = process.env.SHOTS; // e.g. screenshots/probe (untracked, .gitignore)

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
await unlockGate(browser, base);
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${base}/probe`, { waitUntil: 'networkidle0' });
if (new URL(page.url()).pathname !== '/probe') throw new Error(`gate did not open /probe: ${page.url()}`);

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

// Requests after the start tap (except the HMR websocket and same-origin _next assets)
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
