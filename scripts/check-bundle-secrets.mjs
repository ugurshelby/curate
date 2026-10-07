// Build sonrası sır taraması (spec §4.5 E12, AGENTS §5). `npm run build` sonrası çalışır.
// İstemci paketi (.next/static): anahtar ADI, Google anahtar kalıbı ve .env'deki GERÇEK değerler aranır.
// Tüm build çıktısı (.next, cache hariç): gerçek değerler ve anahtar kalıbı aranır (sunucu paketinde ad geçebilir, değer geçemez).
// Değerler hiçbir çıktıya yazılmaz; yalnız sayılar ve dosya yolları.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const next = join(root, '.next');
if (!existsSync(next)) {
  console.error('check-bundle-secrets: .next yok, önce npm run build');
  process.exit(1);
}

// .env / .env.local içindeki gizli değerler (yalnız bellekte)
const SECRET_NAMES = [
  'VERTEX_API_KEY',
  'CURATE_AI_PASSWORD',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_TOKEN',
  'KV_REST_API_READ_ONLY_TOKEN',
  'KV_URL',
  'REDIS_URL',
];
const values = [];
// 8 karakterden kısa değerler (ör. 4 haneli AI PIN'i) değerle taranamaz: rastgele rakam dizileri pakette zaten geçer.
// PIN'in güvencesi tasarımdır: karşılaştırma yalnız sunucuda (lib/ai/server.ts), istemci paketinde PIN veya adı yok.
let shortSkipped = 0;
for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !SECRET_NAMES.includes(m[1])) continue;
    const v = m[2].replace(/^['"]|['"]$/g, '');
    if (v.length >= 8) values.push(v);
    else if (v.length > 0) shortSkipped++;
  }
}

const GOOGLE_KEY = /AIza[0-9A-Za-z_-]{35}/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'cache') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let hits = 0;
let scanned = 0;
const clientFiles = new Set(walk(join(next, 'static'), []));
for (const file of walk(next, [])) {
  const text = readFileSync(file).toString('latin1');
  scanned++;
  const reasons = [];
  if (values.some((v) => text.includes(v))) reasons.push('gerçek değer');
  if (GOOGLE_KEY.test(text)) reasons.push('Google anahtar kalıbı');
  if (clientFiles.has(file) && SECRET_NAMES.some((n) => text.includes(n))) reasons.push('anahtar adı istemci paketinde');
  if (reasons.length) {
    hits++;
    console.error(`SIR BULGUSU: ${file.slice(root.length + 1)} (${reasons.join(', ')})`);
  }
}

console.log(
  `check-bundle-secrets: ${scanned} dosya (${clientFiles.size} istemci), ${values.length} gerçek değer arandı` +
    `, ${shortSkipped} kısa değer değerle taranmadı (yalnız ad taraması), bulgu ${hits}`,
);
process.exit(hits ? 1 : 0);
