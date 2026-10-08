import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * UI rule checks (design/CURATE_DESIGN_SYSTEM.md v3, AGENTS.md §5).
 * Static source checks; the runtime layout/contrast/44px audit is scripts/audit-ui.mjs (Procedure 2).
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function walk(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, re, out);
    else if (re.test(name)) out.push(rel);
  }
  return out;
}

const UI_FILES = [...walk('app', /\.(tsx|ts|css)$/), ...walk('components', /\.(tsx|ts)$/)].filter(
  (f) => !f.startsWith('app/api/'),
);
const TSX = UI_FILES.filter((f) => f.endsWith('.tsx'));

/** Removes // and /* *\/ comments (keeps string contents; good enough for this codebase) */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:"'`])\/\/.*$/gm, '$1');
}

/** User-visible text candidates: string literals and JSX text between > and < */
function visibleTexts(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  for (const m of code.matchAll(/"([^"\n]{2,})"|'([^'\n]{2,})'|`([^`]{2,})`/g)) out.push(m[1] ?? m[2] ?? m[3]);
  for (const m of code.matchAll(/>([^<>{}]*[A-Za-zÇĞİÖŞÜçğıöşü][^<>{}]*)</g)) out.push(m[1]);
  return out;
}

/** Engine jargon that must not appear on card faces, titles, badges or buttons (CDS §7) */
const JARGON = [
  /lanczos/i,
  /konvolüsyon/i,
  /convolution/i,
  /\bexif\b/i,
  /\bgps\b/i,
  /client-side/i,
  /sanitized/i,
  /\bengine\b/i,
  /\bproxy\b/i,
  /\bsafe-zone\b/i,
  /%\s?20 nazik/i,
  /hero renk/i,
  /dynamic island/i,
];

/** Advanced/info texts may explain the engine; they live in lib/i18n/tr.ts under `gelismis` keys */
function trAdvancedRanges(src: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const m of src.matchAll(/gelismis\s*:\s*\{/g)) {
    let depth = 0;
    const start = m.index!;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          ranges.push([start, i]);
          break;
        }
      }
    }
  }
  return ranges;
}

describe('UI rules: typography', () => {
  it('scans the UI source', () => {
    expect(TSX.length).toBeGreaterThan(15);
  });

  it('no text below 12px (arbitrary Tailwind sizes, inline fontSize, CSS font-size)', () => {
    const bad: string[] = [];
    for (const f of UI_FILES) {
      const src = stripComments(read(f));
      for (const m of src.matchAll(/text-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
        const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
        if (px < 12) bad.push(`${f}: ${m[0]}`);
      }
      for (const m of src.matchAll(/fontSize:\s*["']?(\d+(?:\.\d+)?)(px)?["']?/g)) {
        if (Number(m[1]) < 12) bad.push(`${f}: ${m[0]}`);
      }
      for (const m of src.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
        if (Number(m[1]) < 12) bad.push(`${f}: ${m[0]}`);
      }
      if (/\btext-\[?(?:10|11)px/.test(src) || /\btext-2xs\b/.test(src)) bad.push(`${f}: tiny class`);
    }
    expect(bad).toEqual([]);
  });

  it('no monospace in the UI (photo-content stamp font lives in lib/ui/colors.ts)', () => {
    const bad = UI_FILES.filter((f) => /\bfont-mono\b|monospace|SFMono|Menlo|Consolas/.test(stripComments(read(f))));
    expect(bad).toEqual([]);
    const config = read('tailwind.config.ts');
    expect(config).not.toMatch(/\bmono\s*:/);
  });

  it('type scale exists with the 12px floor', () => {
    const config = read('tailwind.config.ts');
    expect(config).toMatch(/caption:\s*\["12px"/);
    for (const k of ['display', 'title', 'headline', 'body', 'subhead', 'footnote']) expect(config).toMatch(new RegExp(`${k}:\\s*\\["\\d+px"`));
  });

  it('self-hosted fallback font through next/font (no runtime font request)', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/from "next\/font\/google"/);
    expect(layout).toMatch(/variable:\s*"--font-inter"/);
    const css = read('app/globals.css');
    expect(css).toMatch(/--font-sans:[^;]*-apple-system[^;]*var\(--font-inter\)/);
    for (const f of UI_FILES) expect(read(f)).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });
});

describe('UI rules: touch targets', () => {
  it('buttons with an explicit small height also carry a 44px hit area', () => {
    const bad: string[] = [];
    for (const f of TSX) {
      const src = stripComments(read(f));
      for (const m of src.matchAll(/<button[\s\S]*?className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const cls = m[1] ?? m[2] ?? '';
        const h = cls.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/);
        if (!h) continue;
        const px = Number(h[1]) * 4;
        if (px < 44 && !/touch-target|min-h-\[44px\]|min-h-11/.test(cls)) bad.push(`${f}: h-${h[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the shared touch-target utility is 44×44', () => {
    const css = read('app/globals.css');
    const block = css.slice(css.indexOf('.touch-target {'), css.indexOf('}', css.indexOf('.touch-target {')));
    expect(block).toMatch(/min-width:\s*44px/);
    expect(block).toMatch(/min-height:\s*44px/);
  });
});

describe('UI rules: copy', () => {
  it('UI copy file exists and is Turkish', () => {
    const tr = read('lib/i18n/tr.ts');
    expect(tr).toMatch(/export const tr\b/);
    expect(tr).toMatch(/[çğıöşü]/);
  });

  it('no engine jargon in visible component text', () => {
    const bad: string[] = [];
    for (const f of TSX) {
      for (const t of visibleTexts(read(f))) {
        // className strings and import paths are not visible text
        if (/^[a-z0-9:\-_[\]/.%()! ]+$/.test(t) && !/\s[A-ZÇĞİÖŞÜ]/.test(t)) continue;
        for (const re of JARGON) if (re.test(t)) bad.push(`${f}: "${t.trim().slice(0, 60)}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no engine jargon in lib/i18n/tr.ts outside `gelismis` (advanced/info) blocks', () => {
    const src = read('lib/i18n/tr.ts');
    const ranges = trAdvancedRanges(src);
    const code = stripComments(src);
    const bad: string[] = [];
    for (const m of src.matchAll(/'([^'\n]+)'|"([^"\n]+)"|`([^`]+)`/g)) {
      const at = m.index!;
      if (ranges.some(([a, b]) => at > a && at < b)) continue;
      if (!code.includes(m[0])) continue; // inside a comment
      const text = m[1] ?? m[2] ?? m[3];
      for (const re of JARGON) if (re.test(text)) bad.push(text.slice(0, 60));
    }
    expect(bad).toEqual([]);
  });

  it('the hub has a single trust badge instead of a log-like footer', () => {
    const hub = read('app/page.tsx');
    expect(hub).not.toMatch(/<footer/);
    expect(read('lib/i18n/tr.ts')).toMatch(/Yerel ve gizli işleme/);
  });
});

describe('UI rules: materials and motion', () => {
  it('material classes and spring easing exist (CDS §4–5)', () => {
    const css = read('app/globals.css');
    expect(css).toMatch(/\.material-card\s*\{/);
    expect(css).toMatch(/\.material-chip\s*\{/);
    expect(css).toMatch(/--ease-spring:/);
    expect(css).toMatch(/\.press:active\s*\{\s*transform:\s*scale\(0\.98\)/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('no `transition: all` and no 100vh without a dvh fallback', () => {
    const bad: string[] = [];
    for (const f of UI_FILES) {
      const src = stripComments(read(f));
      if (/transition:\s*all|\btransition-all\b/.test(src)) bad.push(`${f}: transition all`);
      if (/\bh-screen\b|min-h-screen/.test(src)) bad.push(`${f}: 100vh class`);
    }
    expect(bad).toEqual([]);
  });
});
