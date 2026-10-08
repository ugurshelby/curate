// PWA simgeleri: public/icon.svg'den PNG üretir (sharp, yerel). Kullanım: node scripts/make-icons.mjs
// Çıktı: public/icon-192.png, icon-512.png, icon-maskable-512.png (güvenli alan için %20 dolgu), apple-touch-icon.png (180).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pub = join(process.cwd(), 'public');
const svg = readFileSync(join(pub, 'icon.svg'));
// Köşeleri işletim sistemi yuvarlar: kare, tam kaplayan siyah zemin üstünde aynı çizim
const square = Buffer.from(
  svg.toString().replace(/<rect width="100" height="100" rx="22"/, '<rect width="100" height="100" rx="0"'),
);

await sharp(square, { density: 512 }).resize(192, 192).png().toFile(join(pub, 'icon-192.png'));
await sharp(square, { density: 512 }).resize(512, 512).png().toFile(join(pub, 'icon-512.png'));
await sharp(square, { density: 512 }).resize(180, 180).png().toFile(join(pub, 'apple-touch-icon.png'));
// Maskeli: çizim merkezdeki %80'lik güvenli dairede kalsın diye küçültülüp siyah zemine oturtulur
const inner = await sharp(square, { density: 512 }).resize(384, 384).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
  .composite([{ input: inner, left: 64, top: 64 }])
  .png()
  .toFile(join(pub, 'icon-maskable-512.png'));
console.log('icons: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png');
