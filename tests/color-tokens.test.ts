import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import config from '../tailwind.config';
import { EXPORT_COLORS, THEME_COLOR } from '../lib/ui/colors';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

// --- Belirteçler: app/globals.css :root (tek kaynak) ---
function parseTokens(): Record<string, string> {
  const css = read('app/globals.css');
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('/* Base resets'));
  const out: Record<string, string> = {};
  for (const m of rootBlock.matchAll(/--([a-z0-9-]+):\s*(\d{1,3}) (\d{1,3}) (\d{1,3});/g)) {
    out[m[1]] = '#' + [m[2], m[3], m[4]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return out;
}
const T = parseTokens();

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('Color tokens (Faz C): iOS blue, neutral surfaces', () => {
  it('palette matches the owner table', () => {
    expect(T).toMatchObject({
      base: '#000000',
      'surface-1': '#1C1C1E',
      'surface-2': '#2C2C2E',
      separator: '#38383A',
      'ink-1': '#FFFFFF',
      'ink-2': '#AEAEB2',
      'ink-3': '#8E8E93',
      accent: '#0A84FF',
      'on-accent': '#FFFFFF',
      danger: '#FF453A',
      success: '#30D158',
      'disabled-surface': '#2C2C2E',
      'disabled-ink': '#636366',
    });
    expect(Object.keys(T)).toContain('accent-fill');
  });

  it('text contrast: normal text ≥ 4.5 where the token is used', () => {
    for (const bg of ['base', 'surface-1', 'surface-2']) {
      expect(contrast(T['ink-1'], T[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(T['ink-2'], T[bg])).toBeGreaterThanOrEqual(4.5);
    }
    // Yazı 3 ve vurgu yazısı yüzey 2 üstünde 4,5'in altında (belgelendi); orada yalnız ≥ 3 (bileşen/ikon) kabul edilir
    for (const bg of ['base', 'surface-1']) {
      expect(contrast(T['ink-3'], T[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(T.accent, T[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(T.danger, T[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(T.success, T[bg])).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(T['ink-3'], T['surface-2'])).toBeGreaterThanOrEqual(3);
    expect(contrast(T.accent, T['surface-2'])).toBeGreaterThanOrEqual(3);
  });

  it('white text on the accent fill is ≥ 4.5; on the pure accent it is not (why --accent-fill exists)', () => {
    expect(contrast(T['on-accent'], T['accent-fill'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(T['on-accent'], T.accent)).toBeLessThan(4.5);
    expect(contrast(T['on-accent'], T.accent)).toBeGreaterThanOrEqual(3);
  });

  it('Tailwind colors only reference the CSS variables (no values in the config)', () => {
    const colors = (config.theme?.extend as { colors: Record<string, unknown> }).colors;
    const flat: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') flat.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(colors);
    expect(flat.length).toBeGreaterThan(10);
    for (const v of flat) expect(v).toMatch(/^rgb\(var\(--[a-z0-9-]+\) \/ <alpha-value>\)$/);
    const names = new Set(flat.map((v) => v.match(/--([a-z0-9-]+)/)![1]));
    for (const n of names) expect(T).toHaveProperty(n);
  });

  it('export-content colors that overlap the palette stay equal to it', () => {
    expect(EXPORT_COLORS.storyBlack.toUpperCase()).toBe(T.base);
    expect(EXPORT_COLORS.editMatte.toUpperCase()).toBe(T.base);
    expect(EXPORT_COLORS.storyCharcoal.toUpperCase()).toBe(T['surface-1']);
    expect(THEME_COLOR.toUpperCase()).toBe(T.base);
    const manifest = JSON.parse(read('public/manifest.json'));
    expect(manifest.theme_color.toUpperCase()).toBe(T.base);
    expect(manifest.background_color.toUpperCase()).toBe(T.base);
    expect(read('public/icon.svg')).toMatch(new RegExp(`fill="${T.base}"`, 'i'));
    const json = JSON.parse(read('design/tokens.curate.json'));
    expect(json.surface.surface1.value.toUpperCase()).toBe(T['surface-1']);
    expect(json.surface.surface2.value.toUpperCase()).toBe(T['surface-2']);
    expect(json.accent.accent.value.toUpperCase()).toBe(T.accent);
    expect(json.accent.accentFill.value.toUpperCase()).toBe(T['accent-fill']);
  });
});

describe('No hard-coded colors outside the token definition files', () => {
  const ALLOWED = new Set(['app/globals.css', 'lib/ui/colors.ts']);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name).replace(/\\/g, '/');
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|tsx|css)$/.test(name)) files.push(rel);
    }
  };
  ['app', 'components', 'lib'].forEach(walk);
  files.push('tailwind.config.ts');
  const scanned = files.filter((f) => !ALLOWED.has(f));

  it('scans the whole UI source', () => {
    expect(scanned.length).toBeGreaterThan(40);
  });

  it('no hex, rgb()/rgba()/hsl() literals (token use rgb(var(--x)) is fine)', () => {
    const bad: string[] = [];
    for (const f of scanned) {
      const text = read(f);
      if (/#[0-9a-fA-F]{3,8}\b/.test(text)) bad.push(`${f}: hex`);
      if (/\b(rgba?|hsla?)\(\s*(?!var\()/.test(text)) bad.push(`${f}: rgb/hsl literal`);
    }
    expect(bad).toEqual([]);
  });

  it('no chromatic Tailwind palette classes (only tokens, white and black overlays on photos)', () => {
    const re = /\b(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|divide|outline|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/;
    const bad = scanned.filter((f) => re.test(read(f)));
    expect(bad).toEqual([]);
  });

  it('the old amber is gone everywhere in code and token files', () => {
    const extra = ['public/manifest.json', 'public/icon.svg', 'design/tokens.curate.json', 'app/globals.css', 'lib/ui/colors.ts'];
    const bad = [...scanned, ...extra].filter((f) => /f5a623|245,\s*166,\s*35|ffbc3c|fe2c55/i.test(read(f)));
    expect(bad.map((f) => relative(root, join(root, f)))).toEqual([]);
  });
});
