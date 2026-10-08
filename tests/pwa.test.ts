import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** PWA health (Faz 4-C): manifest, icons, language. Installability on the phone itself is not verified here. */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function pngSize(p: string): { w: number; h: number } {
  const b = readFileSync(join(root, p));
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('PWA manifest and icons', () => {
  const m = JSON.parse(read('public/manifest.json'));

  it('standalone, Turkish, black theme, own scope', () => {
    expect(m).toMatchObject({ display: 'standalone', lang: 'tr', start_url: '/', scope: '/', id: '/' });
    expect(m.theme_color.toUpperCase()).toBe('#000000');
    expect(m.background_color.toUpperCase()).toBe('#000000');
    expect(m.name).toBe('Curate');
  });

  it('PNG icons 192, 512 and a maskable 512 exist with the declared sizes', () => {
    const pngs = m.icons.filter((i: { type: string }) => i.type === 'image/png');
    for (const need of ['192x192', '512x512']) expect(pngs.some((i: { sizes: string }) => i.sizes === need)).toBe(true);
    expect(pngs.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const i of pngs) {
      const file = `public${i.src}`;
      expect(existsSync(join(root, file))).toBe(true);
      const [w, h] = i.sizes.split('x').map(Number);
      expect(pngSize(file)).toEqual({ w, h });
    }
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ w: 180, h: 180 });
  });

  it('the layout links the manifest, apple icon and Turkish language', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/manifest:\s*"\/manifest\.json"/);
    expect(layout).toMatch(/apple-touch-icon\.png/);
    expect(layout).toMatch(/<html lang="tr"/);
    expect(layout).toMatch(/viewportFit:\s*"cover"/);
  });

  it('no service worker is registered (update strategy needs an owner-approved plan first)', () => {
    for (const f of ['app/layout.tsx', 'app/page.tsx', 'components/studio/DeviceSync.tsx']) {
      expect(read(f)).not.toMatch(/serviceWorker\.register/);
    }
  });
});
