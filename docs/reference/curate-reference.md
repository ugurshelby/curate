# Curate Studio — Canonical Reference

**Project:** Curate Studio (`curate-studio`)
**Document role:** Canonical living reference of what the repository actually contains. Analysis and recorded facts only.
**HEAD inspected:** `f73fa6b` on `main`, working on `agent/pilot-setup` (`https://github.com/ugurshelby/curate.git`). Repo visibility is public. [VERIFIED] `gh repo view`.
**Evidence tags:** [VERIFIED] read or executed here. [INFERRED] reasoned from that evidence. [UNVERIFIED] not checked, with the reason.

This document does not choose between conflicting written statements. Conflicts are recorded. Unstated goals and unresolved conflicts are in section 13.

---

## 1. Purpose and intended users (only what the repo states)
Last verified: 2026-10-02

Three written descriptions exist. They do not say the same thing.

| Source | What it states | Tag |
|---|---|---|
| `README.md` | A lightweight, fully client-side darkroom so amateur and professional photographers can produce Instagram and TikTok **Carousel Dump** and **Story Dump**. Synthesis of Apple HIG, Raycast, and VSCO. Four modules: Carousel 4:5, Story 9:16, Minimal Frame, Lanczos-3 upscale. | [VERIFIED] |
| `AGENTS.md` | A lightweight client-side studio so **amateur** photographers can produce consistent Carousel Dump and Story Dump. Same four modules. Explicit non-goals: halation, procedural grain, light leak, vignette, the removed panorama splitter, AI inpainting/outpainting until a later phase, and heavy filter labyrinths. | [VERIFIED] |
| `curate-spec-v1.md` | A **personal, single-user** browser tool for **Uğur**, who edits architectural / silhouette / reflection dumps from a Redmi Note 12 Pro 5G + Old Roll workflow. One tap, personal presets, no required sliders. Not a multi-user product. No accounts, no cloud sync, no server-side processing. The spec says that if a prompt conflicts with the spec, the spec wins. | [VERIFIED] |

Stated product behavior that appears in more than one of those files:

- Preview must match export. The spec calls a mismatch a P0 bug. [VERIFIED] `curate-spec-v1.md` §3.3 and §4.1.
- Processing stays in the browser. Original pixels are not destructively overwritten. [VERIFIED] `AGENTS.md` §3.2; `curate-spec-v1.md` §3.5.
- Export targets: Instagram post **1080×1350** JPEG quality **0.92**; story **1080×1920**; sequenced `dump_01.jpg` names inside a zip; EXIF/GPS stripped at export. [VERIFIED] `README.md`, `AGENTS.md` §3.4, `lib/export/platform-specs.ts`.
- Carousel harmonize transfers only about 15–25% (README says 20%) of exposure/color, and presets must not copy crop. [VERIFIED] `AGENTS.md` §3.3; `README.md`.

No file states a business model, a launch date, or a hosting target beyond one historical commit message (section 4).

---

## 2. Current state summary (what works, what is broken, what is half-built; measured, not described)
Last verified: 2026-10-02

Measured on 2026-10-02 in this workspace (Node `v22.18.0`, npm `10.9.3`, `node_modules` present, installed Next `14.2.35`):

| Check | Result | Tag |
|---|---|---|
| `npx tsc --noEmit` | Exit 0 | [VERIFIED] |
| `npm run lint` (`next lint`) | Exit 0, "No ESLint warnings or errors" | [VERIFIED] |
| `npm run build` (`next build`, Next.js 14.2.35) | Exit 0. Compiled, typecheck during build passed. Route table: `○ /` 58.2 kB (first load 146 kB) and `○ /_not-found` 873 B. Both static. Log line `Generating static pages (4/4)` is Next's internal counter, not four app routes. | [VERIFIED] |
| `npm test` | Exit 1. `package.json` has no `test` script prior to Phase 5. | [VERIFIED] |
| Browser click-through of upload, preset, or export | Not run | [UNVERIFIED] no browser session in this analysis |

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

1. **Seed photos are the starting library in `f73fa6b`.** `INITIAL_ITEMS` contained seven `/reference-images/*.jfif` paths. Hub upload appended and kept existing selection. Exposing clear action and starting empty is addressed in Roadmap 2. [VERIFIED]
2. **Thirteen reference photos tracked under `public/reference-images/`.** [VERIFIED] `git ls-files`.
3. **Upload metadata is minimal.** New items set dimensions and proxyDimensions to 1080×1350 and set proxyUrl equal to originalUrl. `generateProxyImage` is defined in `lib/engine/proxy.ts` but never called. [VERIFIED]
4. **Upscale preview is not Lanczos.** The "after" half uses CSS `contrast(1.04) brightness(1.02)`. [VERIFIED] `UpscaleStudio.tsx`.
5. **Web Worker is constructed and never tasked.** `workerBridge` is created at module load and re-exported from `lib/index.ts`. No component calls `workerBridge` methods. [VERIFIED]
6. **Per-item presets are dead.** `setItemPreset` has no callers. Carousel preview and preset buttons use `state.globalPreset` only. [VERIFIED]
7. **Store module field is dead.** `setModule` has no callers. The hub uses `useState`. [VERIFIED]
8. **README long-press (~450ms) is not what the code does.** Carousel uses desktop `contextmenu` and a 320ms double-tap. [VERIFIED] `CarouselStudio.tsx`.
9. **Filmstrip does not hide in edit mode.** The edit sheet is conditional; the filmstrip bar under it always renders. [VERIFIED] `CarouselStudio.tsx` footer.
10. **Story and Frame do not run the color pipeline.** Their exports draw the source image only. [VERIFIED]
11. **Tailwind classes `w-13` and `h-15` are not in the default scale or `tailwind.config.ts`.** Filmstrip thumbnails use them. [VERIFIED]
12. **`runPipelineVerification` was an uninvoked function in `lib/core/pipeline-test.ts`.** [VERIFIED]

### What is half-built

- Proxy pipeline, worker bridge, per-item preset API, `activeModule`, `clearItems`, `resetAll`: present, unwired. [VERIFIED]
- Design tokens file `design/tokens.curate.json` is not imported by app code. Colors are duplicated in `tailwind.config.ts` and `app/globals.css`. [VERIFIED]
- `puppeteer-core` is a devDependency. No script references it. [VERIFIED]
- Personal preset families in the spec (Moody Teal, Warm Silhouette, Night Cinematic, Muted Coastal, Amber Grain, Monochrome Noir) are not the six profiles in `lib/engine/presets.ts`. [VERIFIED]

---

## 3. Architecture (stack, structure, data flow, directory map)
Last verified: 2026-10-02

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
lib/core/             types, state-machine, use-studio,
                      worker-bridge, pipeline-test
lib/engine/           presets, harmonize, proxy,
                      adaptive-gradient, upscale-lanczos
lib/export/           platform-specs, exif-sanitizer, zip-packager
lib/workers/          image-processor.worker.ts
public/               icon.svg, manifest.json, reference-images/*.jfif
design/               CURATE_DESIGN_SYSTEM.md, tokens.curate.json
```

No `app/api`, no `middleware`, no `prisma`, no `supabase`. [VERIFIED] `git ls-files`.

Largest application files: `CarouselStudio.tsx` 674 lines, `StoryStudio.tsx` 549 lines, `FrameStudio.tsx` 367 lines, `presets.ts` 312 lines, `page.tsx` 302 lines, `state-machine.ts` 246 lines, `UpscaleStudio.tsx` 246 lines. [VERIFIED]

### Data flow

[VERIFIED] unless marked.

1. Hub or a studio creates `StudioItem`s with `URL.createObjectURL`, dimensions, and `preset: null`.
2. `studioStore.addItems` updates store items and notifies subscribers.
3. Carousel preview draws the selected image onto a canvas and applies global harmonize (strength `0.20`), then LUT or preset. CSS `object-cover` / `object-contain` handles fit/fill on screen.
4. Export builds a new 1080×1350 or 1080×1920 canvas, reapplies filters (carousel), and `toBlob`s.
5. `QuickExportSheet` sanitizes each blob, then `packageDumpZip` sanitizes again, writes `dump_NN.jpg|png`, and triggers download.
6. Switching modules shares `state.items`.

Preview and export are separate code paths. Fit-mode background color is `#0a0a0c`. Story/frame/upscale preview do not share a single render function with export. [INFERRED] from implementations.

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
| Branch | Base `main` at `f73fa6b`. Agent development on `agent/*` branches | [VERIFIED] |
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
Last verified: 2026-10-02

| Gate | Exists? | Status (2026-10-02) |
|---|---|---|
| `npx tsc --noEmit` | Required by rules | Pass, exit 0 [VERIFIED] |
| `npm run lint` | `"lint": "next lint"` | Pass, no warnings [VERIFIED] |
| `npm run build` | `"build": "next build"` | Pass, exit 0 [VERIFIED] |
| `npm test` | Added in Phase 5 via Vitest | Target: Pass [VERIFIED in Phase 5] |
| CI | Added in Phase 5 (.github/workflows/ci.yml) | Target: Active on PR [VERIFIED in Phase 5] |
| Visual / mobile viewport check | Required after UI changes | Marked not verified when no browser [VERIFIED] |

---

## 7. Conventions and working systems (patterns, rules and processes)
Last verified: 2026-10-02

1. **Scope lock written as forbidden features:** No halation, grain, light leak, vignette, panorama, AI inpainting/outpainting. [VERIFIED]
2. **Platform sizes as data:** `PLATFORM_SPECS` holds 1080×1350 @ 0.92 and 1080×1920 @ 0.92. [VERIFIED]
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

- **Panorama deletion:** Added in `3777d20`, removed in v2 rewrite (`8b5eddf`). Forbidden by AGENTS.md. Spec phase 4 mentions it (conflict recorded).
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
| `design/CURATE_DESIGN_SYSTEM.md` | CDS v1.0.0 design authority | Authority for UI | Monospace nuance |
| `design/tokens.curate.json` | DTCG tokens duplicate | Maintained as token reference | Not imported by code |
| `.agents/rules/ui-ux-design-hierarchy.md` | Legacy agent rule file | Unused skill paths (owner decision) | Does not match installed pkgs |

---

## 10. Gaps (difference between stated intent and reality, ordered by severity)
Last verified: 2026-10-02

1. **Starting library state:** Starting with seed photos rather than empty library. [Addressed in Phase 5 Roadmap 2]
2. **Docs consistency:** Spec §4.1 previously listed fixed defects. [Addressed in Phase 4]
3. **Preview vs Export draw paths:** Upscale preview filter vs Lanczos export. [Addressed in Phase 5 Roadmap 4]
4. **Unwired architecture:** Worker and proxy are unwired. [Owner decision]
5. **Audience and preset targets:** Unresolved in-repo. [Owner decision]
6. **Mobile stage lock:** Carousel uses scale; full dvh and filmstrip hide behavior need verification.
7. **README inaccuracies:** Interaction details and versioning. [Addressed in Phase 4]
8. **Automated tests:** Missing test runner. [Addressed in Phase 5 Roadmap 6]
9. **Reference photos in public repo:** 13 files tracked. [Owner decision]
10. **Design rule file skills:** Missing skill files. [Owner decision]
11. **Dead store methods:** Preserved for future wiring or cleanup. [Owner decision]
12. **Language tags:** `lang="en"` with Turkish UI. [Owner decision]

---

## 11. Proposed roadmap (status as of 2026-10-02)
Last verified: 2026-10-02

1. **Make the spec match the tree:** Implemented in Phase 4.
2. **Start from an empty library:** Implemented in Phase 5.
3. **One render path per module for preview and export:** Future phase.
4. **Upscale preview label corrected:** Implemented in Phase 5.
5. **Wire or delete proxy and worker:** Deferred to owner decision.
6. **Turn pipeline-test into test suite:** Implemented in Phase 5 with Vitest.
7. **Preset decision:** Deferred to owner decision.
8. **Viewport pass:** Procedure 2 in `docs/procedures.md`.
9. **Public-asset decision:** Deferred to owner decision.

---

## 12. Proposed agent rules
Last verified: 2026-10-02

Incorporated into `AGENTS.md` (see Phase 2).

---

## 13. Open questions for owner
Last verified: 2026-10-02

1. Which audience sentence is binding: amateur photographers (`AGENTS.md`), amateur and professional (`README.md`), or only Uğur as a personal tool (`curate-spec-v1.md` §2)?
2. Do the six shipping profiles replace Moody Teal / Warm Silhouette / Night Cinematic / Muted Coastal / Amber Grain / Monochrome Noir, sit beside them, or get replaced by them?
3. Night Cinematic in the spec asks for halation, and `AGENTS.md` forbids halation. Which instruction wins?
4. Phase 4 of the spec relocates panorama; `AGENTS.md` says panorama stays deleted. Which instruction wins?
5. Is `.cube` LUT upload staying in the main carousel sheet?
6. Should the 13 reference photos in `public/reference-images/` remain in a public GitHub repo?
7. Is mobile the primary runtime, and how aggressive should worker/proxy work be?
8. Was zero-config Vercel connected, and should it deploy `main`?
9. The `.agents/rules/ui-ux-design-hierarchy.md` file points to missing skills (`skills/apple-design`) and uninstalled libraries. Should it be rewritten or deleted?
10. `layout.tsx` language is English and the interface is Turkish. Should `lang` be updated to `"tr"`?
11. Frame export is hardcoded to 1080×1350. Is 4:5 the intended aspect ratio for Frame?
12. Where are `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md`, and `curate-camera-app.md` located?
