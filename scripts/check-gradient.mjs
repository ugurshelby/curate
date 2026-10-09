// Smart edge gradient check in the browser (D33): Çerçeve 9:16, 4:5, 16:9 and Story with synthetic photos,
// before/after screenshots (untracked screenshots/gradient) and measured export size and border pixels.
// Usage: AUDIT_PIN=<test 4 digits> node scripts/check-gradient.mjs   (server http://localhost:3101 started with TEST values,
// see scripts/lib/unlock.mjs; never the real PIN). No AI call is made.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlockGate } from './lib/unlock.mjs';

const base = process.env.BASE || 'http://localhost:3101';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = process.env.SHOTS || 'screenshots/gradient';
mkdirSync(outDir, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Photo A: left 35 % blue, middle 30 % white, right 35 % red (the owner's example). Photo B: top orange, bottom navy, grey middle.
async function synth(name, w, h, pick) {
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) raw.set(pick(x / w, y / h), (y * w + x) * 3);
  const p = join(tmpdir(), name);
  writeFileSync(p, await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 95 }).toBuffer());
  return p;
}
const photoA = await synth('curate-grad-a.jpg', 1600, 1200, (u) => (u < 0.35 ? [20, 60, 220] : u < 0.65 ? [255, 255, 255] : [220, 30, 30]));
const photoB = await synth('curate-grad-b.jpg', 1200, 1600, (_u, v) => (v < 0.3 ? [255, 140, 0] : v > 0.7 ? [10, 30, 90] : [200, 200, 200]));

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });

// a clean browser context per scenario: the app remembers photos on the device (IndexedDB), so contexts must not be shared
async function fresh(files) {
  const ctx = await browser.createBrowserContext();
  await unlockGate(ctx, base);
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    window.__blobs = [];
    window.__calls = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => {
      window.__calls.push([b && b.constructor && b.constructor.name, b && b.type, b && b.size]);
      if (b instanceof Blob && b.size > 20000) window.__blobs.push(b);
      return orig(b);
    };
  });
  await page.goto(base, { waitUntil: 'networkidle0' });
  const input = await page.$('input[type=file]');
  await input.uploadFile(...files);
  await page.waitForSelector('[data-stage]', { timeout: 15000 }); // the upload opens Carousel
  await wait(800);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Ana sayfaya dön')?.click());
  await page.waitForSelector('[data-module]', { timeout: 10000 });
  return page;
}
const click = (page, text, sel = 'button,[role=button],[role=radio]') =>
  page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.getAttribute('aria-label') || b.textContent).trim().includes(t));
    el?.click();
    return !!el;
  }, text, sel);
const openModule = async (page, id) => {
  await page.evaluate((m) => document.querySelector(`[data-module="${m}"]`)?.click(), id);
  await page.waitForSelector('[data-stage]', { timeout: 15000 });
  await wait(1200);
};
async function exportPixels(page, probes) {
  const before = await page.evaluate(() => window.__blobs.length);
  await click(page, 'Dışa aktar');
  await wait(800);
  await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, button')].find((b) => b.textContent.trim() === 'İndir')?.click());
  for (let i = 0; i < 60; i++) {
    if ((await page.evaluate(() => window.__blobs.length)) > before) break;
    await wait(250);
  }
  if ((await page.evaluate(() => window.__blobs.length)) === before) {
    const labels = await page.evaluate(() => [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean));
    await page.screenshot({ path: join(outDir, 'export-fail.png') });
    throw new Error('no export blob; calls: ' + JSON.stringify(await page.evaluate(() => window.__calls)) + ' buttons: ' + JSON.stringify(labels));
  }
  const measured = await page.evaluate(async (pr) => {
    const blob = window.__blobs[window.__blobs.length - 1];
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const at = (fx, fy) => [...ctx.getImageData(Math.min(bmp.width - 1, Math.round(fx * bmp.width)), Math.min(bmp.height - 1, Math.round(fy * bmp.height)), 1, 1).data.slice(0, 3)];
    return { width: bmp.width, height: bmp.height, type: blob.type, bytes: blob.size, samples: Object.fromEntries(Object.entries(pr).map(([k, [x, y]]) => [k, at(x, y)])) };
  }, probes);
  await click(page, 'Tamam'); // close the export sheet
  await wait(500);
  return measured;
}
async function shot(page, name) {
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
  await wait(400);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
}

const results = {};

// ---- Çerçeve: before/after is the Polaroid/Mat background versus the new gradient
{
  const page = await fresh([photoA]);
  await openModule(page, 'frame');
  await click(page, 'Mat', '[role=radio]');
  await wait(500);
  await shot(page, 'frame-before-mat');
  await click(page, 'Gradyan', '[role=radio]');
  for (const ratio of ['9:16', '4:5', '16:9']) {
    await click(page, ratio, '[role=radio]');
    await wait(900);
    await shot(page, `frame-gradient-${ratio.replace(':', 'x')}`);
    results[`frame ${ratio}`] = await exportPixels(page, { left: [0.003, 0.5], right: [0.997, 0.5], topLeft: [0.01, 0.003], topMid: [0.5, 0.003], topRight: [0.99, 0.003], bottomMid: [0.5, 0.997] });
    await wait(600);
  }
  await page.close();
}

// ---- Story: two photos, gradient background from the first photo's top/centre/bottom
{
  const page = await fresh([photoB, photoB]);
  await openModule(page, 'story');
  await wait(1200);
  await shot(page, 'story-gradient');
  results.story = await exportPixels(page, { top: [0.5, 0.004], upperBand: [0.5, 0.06], middle: [0.5, 0.5], lowerBand: [0.5, 0.94], bottom: [0.5, 0.996] });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
