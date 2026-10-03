# Curate Studio — Canonical Reference

**Project:** Curate Studio (`curate-studio`)
**Document role:** Canonical living reference of what the repository actually contains. Analysis and recorded facts only.
**HEAD inspected:** Development, testing, and release unified directly on `main` (`https://github.com/ugurshelby/curate.git`). Repo visibility is public. [VERIFIED] `gh repo view`.
**Evidence tags:** [VERIFIED] read or executed here. [INFERRED] reasoned from that evidence. [UNVERIFIED] not checked, with the reason.

This document does not choose between conflicting written statements. Conflicts are recorded. Unstated goals and unresolved conflicts are in section 13.

---

## 1. Purpose and intended users (only what the repo states)
Last verified: 2026-10-03

Three written descriptions exist. They do not say the same thing.

| Source | What it states | Tag |
|---|---|---|
| `README.md` | Uğur's personal, single-user, mobile-first tool for Instagram/TikTok **Carousel Dump** and **Story Dump**. Five modules since Faz D1: Carousel 4:5, Story 9:16, Minimal Frame, Lanczos-3 upscale, Düzenle. Planned items are marked with their phase. | [VERIFIED] 2026-10-03 |
| `AGENTS.md` | Personal single-user browser darkroom for Uğur, mobile primary (390×844). Scope lock: panorama permanently closed, AI inpainting/outpainting, accounts and server upload forbidden; halation (Night Cinematic) and 35mm grain (Amber Grain) allowed; light leak and vignette forbidden. | [VERIFIED] 2026-10-02 |
| `curate-spec-v1.md` | A **personal, single-user** browser tool for **Uğur**, who edits architectural / silhouette / reflection dumps from a Redmi Note 12 Pro 5G + Old Roll workflow. One tap, personal presets, no required sliders. Not a multi-user product. No accounts, no cloud sync, no server-side processing. The spec says that if a prompt conflicts with the spec, the spec wins. | [VERIFIED] |

Stated product behavior that appears in more than one of those files:

- Preview must match export. The spec calls a mismatch a P0 bug. [VERIFIED] `curate-spec-v1.md` §3.3 and §4.1.
- Processing stays in the browser. Original pixels are not destructively overwritten. [VERIFIED] `AGENTS.md` §3.2; `curate-spec-v1.md` §3.5.
- Export targets (Faz S, 2026-10-03): Instagram post **1080×1350**, story **1080×1920**, TikTok **1080×1920** (unverified assumption), sRGB JPEG **0.97**, stepping down only above **8 MB**; one image downloads directly, a multi-image Carousel series as one zip (`dump_N.zip` / `tiktok_N.zip`); EXIF/GPS stripped at export. [VERIFIED] `lib/export/platform-specs.ts`, `lib/export/export-plan.ts`, `tests/export-plan.test.ts`.
- Carousel harmonize transfers only about 15–25% (README says 20%) of exposure/color, and presets must not copy crop. [VERIFIED] `AGENTS.md` §3.3; `README.md`.

**Owner decision (2026-10-02):** Curate is a single-user personal tool for Uğur; primary runtime is mobile (390×844 reference viewport). README, AGENTS.md and the spec were aligned to this sentence. [VERIFIED] by editing those files in the same commit.

**Owner decisions (2026-10-02), recorded in `curate-spec-v1.md` §4.4 with phases:** TikTok as a separate Carousel export target, 1080×1920 assumed and not verified (Faz S); Story takes 2–6 photos with automatic grid (Faz S); reference images stay tracked and a user-triggered test loader is added (Faz M1); panorama permanently closed (Faz K, done); status colors amber/neutral (Faz M1); Frame stays 1080×1350; mobile panel redesign (Faz M1); preview render option A (Faz M2); export quality/download rules (Faz S). None of the Faz M1/M2/S items is implemented yet. [VERIFIED] doc edit; code unchanged.

**Faz S (2026-10-03):** Story grid follows the photo count (2–6, `lib/engine/story-layout.ts`), cells sit inside a 250 px top/bottom safe area (assumption), per-cell pan/zoom shared by preview and export (`computeCellDraw`). Carousel IG/TikTok toggle sets preview and export size. Export sheet rewritten: no jargon, real target size, PNG under "Gelişmiş". [VERIFIED] tests + browser run in `docs/reports/2026-10-03-phases.md`.

**Faz D1 (2026-10-03):** fifth module Düzenle (`components/studio/EditStudio.tsx`): Preset and Kırp tabs, crop geometry in `lib/engine/edit-geometry.ts` added to the shared base step (`CarouselRenderOptions.crop`), shared gesture hook `components/studio/usePanPinch.ts` (Story refactored onto it), shared `PresetStrip.tsx`, Upscale safe limit 8192 px (assumption). [VERIFIED] tests + browser run in `docs/reports/2026-10-03-phases.md`.

No file states a business model, a launch date, or a hosting target beyond one historical commit message (section 4).

---

## 2. Current state summary (what works, what is broken, what is half-built; measured, not described)
Last verified: 2026-10-03

Measured on 2026-10-02 in this workspace (Node `v22.18.0`, npm `10.9.3`, `node_modules` present, installed Next `14.2.35`):

| Check | Result | Tag |
|---|---|---|
| `npx tsc --noEmit` | Exit 0 | [VERIFIED] |
| `npm run lint` (`next lint`) | Exit 0, "No ESLint warnings or errors" | [VERIFIED] |
| `npm run build` (`next build`, Next.js 14.2.35) | Exit 0. Compiled, typecheck during build passed. Route table (2026-10-03, after Faz S): `○ /` 66.7 kB (first load 154 kB) and `○ /_not-found` 873 B. Both static. Log line `Generating static pages (4/4)` is Next's internal counter, not four app routes. | [VERIFIED] |
| `npm test` | Exit 0 (`vitest run`, 24 tests; see §6) | [VERIFIED] |
| Browser, 390×844, Carousel: upload 4 photos, open edit panel, select preset, measure layout and main-thread long tasks | Run 2026-10-02 against `npm run dev` (Next 14.2.35, in-app browser, desktop CPU) | [VERIFIED] see `docs/reports/2026-10-02-audit.md` |
| Browser: export download, Story/Frame/Upscale flows, real phone | Not run | [UNVERIFIED] |

### What the current code implements

- One Next.js page (`app/page.tsx`) is a hub with four full-screen module switches held in **component state**, not in the store's `activeModule`. [VERIFIED]
- All four studios read `studioStore` through `useStudio` (`useSyncExternalStore`). [VERIFIED] `components/studio/*.tsx`, `lib/core/use-studio.ts`.
- Carousel export (`getExportBlob`) draws 1080×1350, supports fit (letterbox/pillarbox on `#0a0a0c`) and fill (cover crop), then applies harmonize, optional `.cube` LUT, or a named preset, then `toBlob` as JPEG 0.92 or PNG. [VERIFIED] `components/studio/CarouselStudio.tsx`.
- Story export draws a 1080×1920 canvas, places 2–6 cells, and for slot 5 makes cell 5 full width. Preview uses `col-span-2` on that cell. [VERIFIED] `components/studio/StoryStudio.tsx`.
- Frame export draws polaroid / matte / gradient ground, the photo, and an optional date stamp, at a hardcoded 1080×1350. [VERIFIED] `components/studio/FrameStudio.tsx`.
- Upscale **export** runs `upscaleLanczos3` at 2x or 4x and encodes JPEG 0.94 or PNG. [VERIFIED] `components/studio/UpscaleStudio.tsx`, `lib/engine/upscale-lanczos.ts`.
- Zip names follow `dump_01.jpg` or `dump_01.png` from `blob.type`. [VERIFIED] `lib/export/zip-packager.ts`.
- Carousel edit sheet applies `-translate-y-2 scale-[0.88]` to the stage. [VERIFIED] `CarouselStudio.tsx`. Tailwind `translate-y-2` is 0.5rem (8px at a 16px root). [INFERRED] from Tailwind defaults plus that class.

The spec's four P0 claims (export ignores filters; story export draws no photos; frame export draws no photo or stamp; store is connected to nothing) were fixed in `f73fa6b` and verified in code. [VERIFIED] by reading `curate-spec-v1.md` §4.1 against the files named above. Pixel-level preview/export equality was **not** re-rendered here. [UNVERIFIED]

Letterbox math in the daily log matches the formula in `getExportBlob`: a 1920×1080 image fitted into 1080×1350 yields height 608 and y offset 371; a 1080×1920 image yields width 759 and x offset 161. [VERIFIED] by applying the source formula.

### What is broken or misleading relative to the written product

1. **Library starts empty on fresh load.** `INITIAL_ITEMS` initialized to `[]` and `selectedItemId` to `null`. Hub upload selects the first uploaded item, and clear action is exposed in UI calling `clearItems()` with URL revocation. Reference images remain tracked under `public/reference-images/` per owner policy. [VERIFIED]
2. **Thirteen reference photos tracked under `public/reference-images/`.** [VERIFIED] `git ls-files`.
3. **Upload metadata and proxy pipeline are active.** Uploading through hub or studio modules invokes `createStudioItem`, which sets initial state and begins asynchronous `generateProxyImage` to update natural image dimensions and high-performance proxy URLs. [VERIFIED]
4. **Upscale preview does not claim Lanczos.** Label updated to "Önizleme Kontrast ({scaleFactor}x)" to match the CSS filter simulation; export remains mathematical 2-pass Lanczos-3 convolution. [VERIFIED]
5. **Web Worker is connected and active.** `UpscaleStudio` offloads 2-pass Lanczos-3 convolution during export to `workerBridge.upscaleLanczos` with in-thread fallback. [VERIFIED]
6. **Unified render parity is enforced.** `drawCarouselFrame` serves as single source of truth for both live canvas preview and 1080×1350 JPEG/PNG export. [VERIFIED]
7. **Store module field is synchronized.** `setModule` is called on hub navigation and stays in sync with `activeModule`. [VERIFIED]
8. **README long-press (~450ms) is not what the code does.** Carousel uses desktop `contextmenu` and a 320ms double-tap. [VERIFIED] `CarouselStudio.tsx`.
9. **Filmstrip does not hide in edit mode.** The edit sheet is conditional; the filmstrip bar under it always renders. [VERIFIED] `CarouselStudio.tsx` footer.
10. **Story and Frame do not run the color pipeline.** Their exports draw the source image only. [VERIFIED]
11. **Filmstrip thumbnail dimensions standardized.** Updated from non-standard `w-13 h-15` to standard `w-14 h-16 rounded-xl` with smooth border transitions. [VERIFIED]
12. **`runPipelineVerification` converted to automated tests.** Replaced by Vitest suite `tests/pipeline.test.ts` covering crop math, Lanczos dimensions, zip extensions, harmonize bounds, letterbox math, and 6 editorial presets; unwired runner deleted. [VERIFIED]
13. **[Fixed in Faz M1, 2026-10-03]** Mobile edit panel no longer covers the photo: 0 overlap at 360×740, 390×844, 430×932 in all four modules (`docs/reports/2026-10-03-phases.md`). Original finding: **Mobile edit panel covers the photo (measured).** At 390×844 with the panel open and a preset selected: stage y=107–501, panel y=186–730 (545px tall), so about 80% of the stage is under the panel; with no preset the panel is 436px and covers about 53%. `.canvas-viewport-sheet-open` pads a fixed 280px regardless of panel height, and `scale-[0.88]` does not compensate. Header is 95px (title wraps to four lines) and its Export button right edge is at x=444 on a 390px screen. [VERIFIED] 2026-10-02, `components/studio/CarouselStudio.tsx`, `app/globals.css`.
14. **[Fixed in Faz M2, 2026-10-03]** Preview now renders at 1080×1350 (540×675 while dragging) with a cached base; preset switch 54–68 ms on the same 4000×3000 input (desktop). Original finding: **Live preview runs the full color pipeline on the full-resolution original on the main thread.** Preview draws `originalUrl` into a canvas of natural size (4000×3000 in the test), then `getImageData`/preset/`putImageData`. Measured long tasks per preset switch on a 12 MP image: 500 ms (Warm Silhouette), 728 ms (Night Cinematic), 579 ms (Amber Grain), desktop CPU. Phone timings not measured. [VERIFIED] 2026-10-02.
15. **[Fixed in Faz M2]** Preview and export share one option builder and the same two steps (`renderCarouselBase`, `applyCarouselLook`); `tests/carousel-parity.test.ts` finds 0 differing bytes at 1080×1350. Original finding: **Preview and export call `drawCarouselFrame` with different arguments.** Preview: `fitMode:"fill"` hardcoded, canvas at natural size, crop done by CSS `object-cover`. Export: real `fitMode`, 1080×1350 canvas, crop in canvas. Grain and halation depend on pixel resolution, and harmonize metrics are taken over different pixel sets. "Same function" is true, "same result" is not guaranteed. [VERIFIED] code read; pixel equality not rendered. [UNVERIFIED]
16. **[Fixed in Faz M2]** Hero metrics now come from `extractHeroMetrics` (raw crop, no harmonize, no preset), regression-tested. Original finding: **Hero Harmonize reads metrics from the preview canvas after the preset was applied** (`handleHeroHarmonize` calls `getImageData` on the already filtered canvas). [VERIFIED] code read.

### What is completed from roadmap
- Proxy pipeline and worker bridge offload are active. [VERIFIED]
- Target 6 editorial preset families (`moody_teal`, `warm_silhouette`, `night_cinematic`, `muted_coastal`, `amber_grain`, `monochrome_noir`) are implemented in `lib/engine/presets.ts` with optical halation for Night Cinematic and 35mm grain for Amber Grain, bound to Apple-design bento grid cards and progressive disclosure intensity sliders. [VERIFIED]
- Design tokens file `design/tokens.curate.json` is not imported by app code; colors are active in `tailwind.config.ts` and `app/globals.css`. [VERIFIED]
- `puppeteer-core` is a devDependency. No script references it. [VERIFIED]

---

## 3. Architecture (stack, structure, data flow, directory map)
Last verified: 2026-10-03

### Stack

[VERIFIED] `package.json`, `package-lock.json` resolved versions where noted, `tsconfig.json`, `next.config.mjs`.

- Next.js 14 App Router. Declared `^14.2.24`. Lockfile, installed package, and build banner: **14.2.35**.
- React 18.3, TypeScript 5.7 (`strict: true`), Tailwind 3.4, `jszip`, `lucide-react`, `clsx`, `tailwind-merge`.
- `next.config.mjs` sets only `reactStrictMode: true`. No `output: 'export'`, no image domain config, no headers.
- Path alias `@/*` → repo root.
- No database client, no auth SDK, no test runner prior to Phase 5, no CI workflow file prior to Phase 5.

### Directory map

Tracked layout (`git ls-files`), application code only:

```
app/                  layout.tsx, page.tsx, globals.css     — sole route
components/studio/    Carousel, Story, Frame, Upscale,
                      InstagramOverlay, TikTokOverlay,
                      QuickExportSheet, ResettableSlider
lib/core/             types, state-machine, use-studio, worker-bridge
lib/engine/           presets, harmonize, proxy, carousel-render,
                      adaptive-gradient, upscale-lanczos, upscale-slider
lib/export/           platform-specs, exif-sanitizer, zip-packager
lib/workers/          image-processor.worker.ts
public/               icon.svg, manifest.json, reference-images/*.jfif
design/               CURATE_DESIGN_SYSTEM.md, tokens.curate.json,
                      skills/ (apple-design, animate, improve-animations,
                      redesign-existing-projects)
tests/                pipeline, upscale-slider, viewer-selection, reference-images
```

Shared UI since Faz M1: `components/studio/StudioShell.tsx` (header / stage / bottom stack, `[data-stage]`, `[data-bottom-stack]`), `AddMenu.tsx`, `ReferencePicker.tsx`, `Filmstrip.tsx` (pointer reorder), `PerfHud.tsx` (`?perf=1`). Reference images: `lib/core/reference-images.ts`.

No `app/api`, no `middleware`, no `prisma`, no `supabase`. [VERIFIED] `git ls-files`.

Largest application files: `CarouselStudio.tsx` 674 lines, `StoryStudio.tsx` 549 lines, `FrameStudio.tsx` 367 lines, `presets.ts` 312 lines, `page.tsx` 302 lines, `state-machine.ts` 246 lines, `UpscaleStudio.tsx` 246 lines. [VERIFIED]

### Data flow

[VERIFIED] unless marked.

1. Hub or a studio creates `StudioItem`s with `URL.createObjectURL`, dimensions, and `preset: null`.
2. `studioStore.addItems` updates store items and notifies subscribers.
3. Carousel preview decodes `originalUrl` once and renders through `CarouselPreviewRenderer` at 1080×1350 (540×675 while a slider is pressed), real fit mode, base step cached, one draw per animation frame.
4. Carousel export builds a 1080×1350 canvas and calls `drawCarouselFrame` with the same options builder. Story, Frame and Upscale have their own draw code.
5. `QuickExportSheet` sanitizes each blob, then `packageDumpZip` sanitizes again, writes `dump_NN.jpg|png`, and triggers download.
6. Switching modules shares `state.items`.

Carousel preview and export share the same steps and arguments since Faz M2 (see §2 item 15). Story, Frame and Upscale preview do not share a render function with export. Fit-mode background color is `#0a0a0c`. [VERIFIED] code read.

### Worker, proxy, OffscreenCanvas — single status table
Last verified: 2026-10-03

| Piece | What exists | Who uses it | Tag |
|---|---|---|---|
| Web Worker (`lib/workers/image-processor.worker.ts`, `lib/core/worker-bridge.ts`) | Tasks: upscale, preset, harmonize, metrics, gradient; in-thread fallback | **Only** `UpscaleStudio` export calls `workerBridge.upscaleLanczos`. `applyPreset`, `harmonizeSync`, `extractMetrics`, `extractGradient` have no caller. | [VERIFIED] grep |
| Proxy (`lib/engine/proxy.ts`, `createStudioItem` in `state-machine.ts`) | ≤1080 px JPEG 0.88 proxy generated asynchronously on upload, `proxyUrl` stored | Filmstrip thumbnails only. Carousel preview and export load `originalUrl`. | [VERIFIED] code read |
| OffscreenCanvas | Used inside `generateProxyImage` (when available) and the Lanczos output path | Not used for any preview or export render | [VERIFIED] grep |
| Preview/export color pipeline | CPU loops in `lib/engine/presets.ts`, `harmonize.ts`; two steps in `lib/engine/carousel-render.ts` | Main thread, Carousel only; preview at 1080×1350 / 540×675 since Faz M2 | [VERIFIED] |

Earlier statements in this file that "worker and proxy are unwired" (§10 item 4) or "connected and active" (§2) were each half true; this table is the reference.

---

## 4. Data and infrastructure (DB, schema, migrations, external APIs, cron jobs, deployment, branch and deploy triggers)
Last verified: 2026-10-02

| Concern | State | Tag |
|---|---|---|
| Database, schema, migrations | None | [VERIFIED] no SQL/Prisma files; no DB dependency |
| External APIs | None in source. No `process.env` reads in `*.ts`/`*.tsx` | [VERIFIED] grep |
| Cron | None | [VERIFIED] no workflow or route |
| Auth | None | [VERIFIED] |
| Persistence | None. No `localStorage` usage. Refresh drops uploads | [VERIFIED] |
| Env files | None in the tree | [VERIFIED] |
| Branch | Single-branch model: direct commit and push to `main`; side branches eliminated | [VERIFIED] |
| GitHub Actions | Added in Phase 5 via `.github/workflows/ci.yml` | [VERIFIED] |
| GitHub Pages | None | [VERIFIED] |
| Vercel | `.gitignore` ignores `.vercel`. No `vercel.json`. Commit `79d4cc4` mentions zero-config Vercel | [VERIFIED] |
| Deploy trigger | Automatic on push to `main` if connected to Vercel | [UNVERIFIED] |

Images never leave the browser if the user uses this app as written. Reference photos sit in a public GitHub repo. [VERIFIED] `gh repo view` `isPrivate: false`.

PWA manifest exists (`public/manifest.json`, `display: standalone`). `app/layout.tsx` does not link it. [VERIFIED]

---

## 5. Security, secrets and cost exposure (env handling, .gitignore coverage, auth, abuse and quota risks)
Last verified: 2026-10-02

### Secrets

No `.env` files. No `process.env` in application TypeScript. No API keys were found in tracked files. [VERIFIED]

`.gitignore` ignores `.env`, `.env*.local`, `.env.production`, `*.pem`, `.vercel`, `/screenshots/`, `capture-screenshots.mjs`.

### Auth, abuse, quota

There is no server endpoint to abuse and no account system. [VERIFIED] Processing cost is client CPU/RAM.

### EXIF

`sanitizeJpegBuffer` zeros JPEG APP1 and APP2 payloads. Canvas `toBlob` re-encodes, dropping source EXIF. [VERIFIED] `lib/export/exif-sanitizer.ts`.

Limits: HEIC copy on the hub has no decoder dependency. Upscale sets `crossOrigin = "anonymous"`.

### Public personal images

Thirteen `.jfif` files are tracked under `public/reference-images/` in a public repository. [VERIFIED]

### Cost

No paid API usage in code. Hosting cost is zero inside this repo. [VERIFIED]

---

## 6. Quality gates (tests, lint, build, typecheck: what exists, what actually passes)
Last verified: 2026-10-03

| Gate | Exists? | Status (2026-10-02) |
|---|---|---|
| `npx tsc --noEmit` | Required by rules | Pass, exit 0 [VERIFIED] |
| `npm run lint` | `"lint": "next lint"` | Pass, no warnings [VERIFIED] |
| `npm run build` | `"build": "next build"` | Pass, exit 0 [VERIFIED] |
| `npm test` | Added in Phase 5 via Vitest | Pass, exit 0, 24 tests pass (core pipeline, upscale, selection, 6 editorial presets, proxy items) [VERIFIED] |
| CI | `.github/workflows/ci.yml` | Triggers: push to `main`, pull request to `main`, manual. Node 22: tsc, lint, test, build [VERIFIED] file read; run results not checked [UNVERIFIED] |
| Visual / mobile viewport check | Required after UI changes (AGENTS.md §4, CDS §6.5) | 2026-10-03 (Faz D1): Procedure 2 passes in all five modules at 360×740, 390×844, 430×932 (emulated, desktop CPU) [VERIFIED]; phone and landscape [UNVERIFIED] |

---

## 7. Conventions and working systems (patterns, rules and processes)
Last verified: 2026-10-03

1. **Scope lock written as forbidden features:** Optical highlight halation (Night Cinematic) and tactile 35mm analog grain (Amber Grain) allowed per owner decision; light leak, vignette, panorama splitting, server image uploads, and AI inpainting/outpainting remain forbidden. [VERIFIED]
2. **Platform sizes as data:** `PLATFORM_SPECS` holds post 1080×1350, story 1080×1920, TikTok 1080×1920 (`verified: false`), all @ 0.97 with an 8 MB limit; `original` (Upscale) @ 0.97 without a limit. [VERIFIED]
3. **Headless store plus `useSyncExternalStore`:** Module-level state machine subscribed via React. [VERIFIED]
4. **Non-destructive export:** Operations execute on new canvas / ImageData copies. [VERIFIED]
5. **Commit prefixes:** `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`. [VERIFIED]
6. **Design tokens agreement:** Palette values agree across tokens file, Tailwind config, and CSS variables. [VERIFIED]
7. **Canvas re-encode as privacy boundary:** Coupled with JPEG APP marker zeroing. [VERIFIED]
8. **Single-page module switch:** Hub and studios coexist on a single route sharing store state. [VERIFIED]

---

## 8. History and recurring problems (from logs and git history)
Last verified: 2026-10-02

20 commits on `main` up to `f73fa6b`. [VERIFIED]

### Recurring themes

- **Panorama deletion:** Added in `3777d20`, removed in v2 rewrite (`8b5eddf`). Permanently closed by owner 2026-10-02; spec no longer mentions it; `grep -i panora` over app/components/lib/tests/public: 0 matches.
- **Light leak and vignette deletion:** Added in `44916a7`, removed in `8b5eddf`. Forbidden by AGENTS.md.
- **Mobile stage and sheets:** Managed by `.canvas-viewport`, stage scale `scale-[0.88]`, absolute toolbars.
- **Preset calibration:** Shipping code uses 6 generic profiles; spec targets 6 personal families.
- **Export parity:** Three core bugs (fit mode, story slot 5, PNG/JPEG selection) resolved in `f73fa6b`.
- **Seed data:** 7 reference photos were initially bundled in state; resolved in Phase 5.
- **Large rewrite risk:** `8b5eddf` replaced previous studio in one commit. Smaller incremental commits required.

---

## 9. Documentation inventory
Last verified: 2026-10-02

| Path | Purpose | Freshness | Conflict |
|---|---|---|---|
| `README.md` | Product overview and commands | Updated in Phase 4 | Audience conflict noted |
| `AGENTS.md` | Single canonical agent rules | Updated in Phase 2 | Scope lock canonical |
| `curate-spec-v1.md` | Product spec and owner intent | Updated in Phase 4 (defects closed) | Conflicts noted |
| `docs/reference/curate-reference.md` | Living canonical reference | Active (this document) | None |
| `docs/procedures.md` | Reusable procedure runbooks | Added in Phase 3 | None |
| `design/CURATE_DESIGN_SYSTEM.md` | CDS v2.0.0 design authority (rewritten 2026-10-02) | Current | Code deviates from §6 (see audit report) |
| `design/skills/*` | apple-design, animate, improve-animations, redesign-existing-projects | Added by owner 2026-10-02 | `apple-design` §18 and `DESIGN.md`/tokens are not Curate's (CDS §0) |
| `docs/reports/2026-10-02-audit.md` | Audit and design cleanup report | Current | None |
| `design/tokens.curate.json` | DTCG tokens duplicate | Maintained as token reference | Not imported by code |
| `.agents/rules/ui-ux-design-hierarchy.md` | UI rule order, rewritten 2026-10-02 to reference only existing files | Current | None |

---

## 10. Gaps (difference between stated intent and reality, ordered by severity)
Last verified: 2026-10-03

1. **Starting library state:** Starting with seed photos rather than empty library. [Addressed in Phase 5 Roadmap 2]
2. **Docs consistency:** Spec §4.1 previously listed fixed defects. [Addressed in Phase 4]
3. **Preview vs Export draw paths:** Upscale preview filter vs Lanczos export. [Addressed in Phase 5 Roadmap 4]
4. **Preview performance on phone unmeasured:** Faz M2 brought the Carousel preview to export resolution (54–68 ms per preset switch, 18–21 ms per draft frame on desktop). Phone numbers are needed to decide on WebGL2 (option C). Worker still only serves Upscale export.
5. **Audience:** Resolved 2026-10-02 (single user, mobile primary). **Preset targets:** code now holds the 6 target presets; owner confirmation pending.
6. **Mobile stage lock:** fixed in Faz M1 (2026-10-03); flex column, `100dvh`, bottom stack ≤ 40dvh. Not verified on a real phone or in landscape.
7. **README inaccuracies:** Interaction details and versioning. [Addressed in Phase 4]
8. **Automated tests:** Missing test runner. [Addressed in Phase 5 Roadmap 6]
9. **Reference photos in public repo:** 13 files tracked; owner decision 2026-10-02: they stay.
10. **Design rule file skills:** Resolved 2026-10-02: rule file and CDS rewritten against existing `design/skills/`.
11. **Dead store methods:** Preserved for future wiring or cleanup. [Owner decision]
12. **Language tag:** Fixed: `<html lang="tr">` in `app/layout.tsx`.

---

## 11. Proposed roadmap (status as of 2026-10-02)
Last verified: 2026-10-02

1. **Make the spec match the tree:** Implemented in Phase 4.
2. **Start from an empty library:** Implemented in Phase 5.
3. **One render path per module for preview and export:** Future phase.
4. **Upscale preview label corrected:** Implemented in Phase 5.
5. **Render pipeline for preview:** options and recommendation in `docs/reports/2026-10-02-audit.md` §2; owner picks.
6. **Turn pipeline-test into test suite:** Implemented in Phase 5 with Vitest.
7. **Preset decision:** Deferred to owner decision.
8. **Viewport pass:** Procedure 2 in `docs/procedures.md`.
9. **Public-asset decision:** Decided 2026-10-02: reference images stay; test loader in Faz M1.

---

## 12. Proposed agent rules
Last verified: 2026-10-02

Incorporated into `AGENTS.md` (see Phase 2).

---

## 13. Open questions for owner
Last verified: 2026-10-03

1. ~~Which audience sentence is binding?~~ **Resolved 2026-10-02:** single-user personal tool.
2. Do the six shipping profiles replace Moody Teal / Warm Silhouette / Night Cinematic / Muted Coastal / Amber Grain / Monochrome Noir, sit beside them, or get replaced by them?
3. ~~Night Cinematic halation vs AGENTS.md~~ **Resolved:** owner allowed halation and grain (AGENTS.md §3).
4. ~~Panorama~~ **Resolved 2026-10-02:** permanently closed.
5. ~~`.cube` LUT placement~~ **Resolved 2026-10-02:** under a collapsed "Araçlar" section (Faz M1).
6. ~~Reference photos~~ **Resolved 2026-10-02:** they stay.
7. ~~Is mobile primary?~~ **Resolved 2026-10-02:** yes. Still open: which preview render option (audit report §2) to adopt.
8. Was zero-config Vercel connected, and should it deploy `main`?
9. ~~Rewrite or delete the UI rule file?~~ **Resolved 2026-10-02:** rewritten against existing files.
10. ~~`layout.tsx` language~~ **Resolved:** now `lang="tr"`.
11. ~~Frame aspect~~ **Resolved 2026-10-02:** Frame stays 1080×1350.
12. Where are `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md`, and `curate-camera-app.md` located?
13. ~~Düzenle module~~ **Defined 2026-10-03:** spec §4.5, phases D1 and D2 (not implemented yet).
14. ~~Carousel overlay off state~~ **Resolved 2026-10-03:** one target always selected; overlay can be hidden with the eye toggle.
15. TikTok 1080×1920 to be confirmed on phone. (spec §10 q6)
16. ~~Story with more than 6 library photos~~ **Resolved 2026-10-03:** first 6 with a warning.
17. ~~8 MB limit for Upscale~~ **Resolved 2026-10-03:** not applied.
18. ~~Story safe band~~ **Resolved 2026-10-03:** 250 px approved; phone comparison still not done.
19. ~~Overlay hide control~~ **Resolved 2026-10-03:** eye toggle under the Carousel stage, default visible.
