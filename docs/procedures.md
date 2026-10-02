# Curate Studio — Standard Operating Procedures (SOP)

This document defines the repeatable operational procedures for Curate Studio. Each procedure specifies exact triggers, scope, execution steps, change permissions, doc updates, and expected outputs.

---

## Common Procedure Protocol (Mandatory Ending)

Every procedure run must conclude with these steps in exact order:
1. **Update Documentation:** Update affected sections in `docs/reference/curate-reference.md` and touch the `Last verified: YYYY-MM-DD` line. If behavior changed or a defect was resolved, update `curate-spec-v1.md` and `README.md` as required.
2. **Write Log Entry:** Record measured facts (commands, outputs, line counts, sizes) in `logs/YYYY-MM-DD.md`.
3. **Execute Quality Gates:**
   - `npx tsc --noEmit` (must exit 0)
   - `npm run lint` (must exit 0)
   - `npm test` (must exit 0)
   - `npm run build` (must exit 0)
4. **Git Commit & Push:** Commit and push directly to `main`. Do not use side/agent branches.
5. **Plan Cleanup:** If any plan/task file's final step is now done, delete it after the log entry and commit.
6. **Report:** Deliver concise report to the owner listing measured results, changes, browser status, and open questions.

---

## 1. Export Parity Check

- **Trigger Phrases:**
  - Turkish: `"export kontrolü"`, `"önizleme export eşleşiyor mu"`
  - English: `"check export parity"`, `"export matches preview"`
- **Scope:** Carousel Dump, Story Dump, Minimal Frame, Lossless Upscale preview vs. export pipelines.
- **Steps:**
  1. Confirm preview and export logic call the same draw function or math formulas.
  2. Run `npm test` covering pure-logic transforms and export fixtures.
  3. Verify output dimensions: 1080×1350 for Carousel/Frame, 1080×1920 for Story, Lanczos 2x/4x for Upscale.
  4. Verify fit mode letterbox/pillarbox background color `#0a0a0c`.
  5. Verify file extension and MIME type match selected format (`.jpg` for `image/jpeg`, `.png` for `image/png`).
- **May Change:** Bug fixes inside existing export and preview functions to achieve parity.
- **Must Only Report:** Fundamental architectural divergences or algorithm redesign needs.
- **Docs Updated:** `docs/reference/curate-reference.md` (§2, §3), `logs/YYYY-MM-DD.md`.
- **Output:** Parity report with measured dimensions, color checks, and test results.

---

## 2. Mobile and Viewport Audit

- **Trigger Phrases:**
  - Turkish: `"mobil denetim turu"`, `"arayüzü denetle"`
  - English: `"mobile audit"`, `"check viewport"`
- **Scope:** Responsive UI adherence to `design/CURATE_DESIGN_SYSTEM.md` and `AGENTS.md` at narrow widths (375px–430px).
- **Steps:**
  1. Check mobile stage lock: verify edit sheets scale/shift stage rather than obscuring photos.
  2. Check filmstrip behavior during sheet open/close.
  3. Audit touch target dimensions (minimum 44×44px on interactive controls).
  4. Check safe-area paddings (Dynamic Island, navigation bars, Instagram/TikTok overlays).
  5. Audit typography and copy for Turkish UI consistency and absence of typewriter monospace fonts in UI copy.
- **May Change:** CSS classes, layout padding, responsive flex/grid wrappers.
- **Must Only Report:** Visual rendering status (mark as "not verified" if browser unavailable).
- **Docs Updated:** `docs/reference/curate-reference.md` (§2, §7), `logs/YYYY-MM-DD.md`.
- **Output:** Viewport audit checklist with measured pixel dimensions and browser verification status.

---

## 3. Performance and Memory Audit

- **Trigger Phrases:**
  - Turkish: `"performans denetimi"`, `"bellek kontrolü"`
  - English: `"performance audit"`, `"memory audit"`
- **Scope:** Client-side compute, memory management, and bundle footprint.
- **Steps:**
  1. Audit heavy calls on main thread (Lanczos upscale, pixel loops, LUT parsing).
  2. Check object URL lifecycle: verify all `URL.createObjectURL` calls have corresponding `revokeUrl` invocations.
  3. Audit barrel imports: check `@/lib` imports vs. direct module imports to prevent dead bundle bloat.
  4. Measure build chunk sizes from `npm run build` output.
- **May Change:** Import paths, object URL revocation calls, micro-optimizations with tests.
- **Must Only Report:** Major architectural shifts (worker rewiring, proxy pipeline activation).
- **Docs Updated:** `docs/reference/curate-reference.md` (§2, §3), `logs/YYYY-MM-DD.md`.
- **Output:** Bundle metrics table, URL leak analysis, and main-thread timing report.

---

## 4. Privacy and Repo Hygiene

- **Trigger Phrases:**
  - Turkish: `"gizlilik taraması"`, `"repo hijyen kontrolü"`
  - English: `"privacy scan"`, `"repo hygiene check"`
- **Scope:** Repository visibility, sensitive files, EXIF sanitation, and `.gitignore` integrity.
- **Steps:**
  1. Check GitHub repository visibility using `gh repo view`.
  2. Scan tracked files for secret-shaped tokens (API keys, passwords, private keys).
  3. Verify `.gitignore` covers `.env*`, `.vercel`, build outputs, dumps, and screenshots.
  4. Audit EXIF and GPS sanitation logic in export pipelines.
  5. List tracked files that look personal (reference photos under `public/reference-images/`).
- **May Change:** `.gitignore` rules, `.env.example` templates, EXIF sanitizer edge cases.
- **Must Only Report:** Tracked personal photos or sensitive assets (never delete tracked photos without owner directive).
- **Docs Updated:** `docs/reference/curate-reference.md` (§4, §5), `logs/YYYY-MM-DD.md`.
- **Output:** Privacy scan summary, secret scan log (paths only), and tracked asset inventory.

---

## 5. Docs Freshness Sweep

- **Trigger Phrases:**
  - Turkish: `"doküman taraması"`, `"bayat dokümanları temizle"`
  - English: `"docs sweep"`, `"clean stale docs"`
- **Scope:** Consistency between codebase, `curate-spec-v1.md`, `README.md`, `AGENTS.md`, and `docs/reference/curate-reference.md`.
- **Steps:**
  1. Cross-reference documented defects against actual code; close fixed items with commit references.
  2. Cross-reference README feature descriptions with current source behavior.
  3. Check for obsolete documentation or orphan plan files and remove them.
  4. Never change product decisions or owner questions in the spec.
- **May Change:** Factual corrections in docs, removal of stale/applied markdown files.
- **Must Only Report:** Unresolved architectural conflicts needing owner decisions.
- **Docs Updated:** All touched doc files, `logs/YYYY-MM-DD.md`.
- **Output:** Diff summary of corrected documentation facts and closed defects.

---

## 6. Bug Triage from Live Testing

- **Trigger Phrases:**
  - Turkish: `"şu hatayı düzelt: ..."`, `"canlıda şunu gördüm: ..."`
  - English: `"fix bug: ..."`, `"observed live: ..."`
- **Scope:** User-reported bugs and runtime regressions.
- **Steps:**
  1. Reproduce the bug locally with an isolated reproduction test or script.
  2. Identify root cause in code.
  3. Implement minimal, targeted fix without scope creep.
  4. Add a pure-logic regression test to `npm test`.
  5. Run all quality gates.
- **May Change:** Minimal code required to fix bug and new regression test.
- **Must Only Report:** Side effects requiring product decisions.
- **Docs Updated:** `curate-spec-v1.md` (if bug was documented), `docs/reference/curate-reference.md`, `logs/YYYY-MM-DD.md`.
- **Output:** Root cause analysis, regression test result, and fix diff.

---

## 7. Pre-Push & Release Readiness
 
- **Trigger Phrases:**
  - Turkish: `"main'e hazır mı"`, `"push öncesi kontrol"`, `"yayın öncesi kontrol"`
  - English: `"ready for main"`, `"pre-push check"`, `"release check"`
- **Scope:** Validation of `main` branch prior to pushing or release.
- **Steps:**
  1. Verify working branch is `main` and working tree is clean.
  2. Run `npx tsc --noEmit` (must exit 0).
  3. Run `npm run lint` (must exit 0).
  4. Run `npm test` (must exit 0).
  5. Run `npm run build` (must exit 0).
  6. Generate git status and diff summary.
  7. Compile list of residual risks and unverified browser interactions.
- **May Change:** Nothing (read-only audit).
- **Must Only Report:** Go/No-Go push recommendation, diff summary, and risk assessment.
- **Docs Updated:** `logs/YYYY-MM-DD.md`.
- **Output:** Readiness report with all gate outputs and explicit push recommendation.

---

## 8. Routine Session

- **Trigger Phrases:**
  - Turkish: `"rutin kontrol"`, `"bakım oturumu"`
  - English: `"routine check"`, `"maintenance session"`
- **Scope:** Standard health check sequence.
- **Steps:**
  1. Execute Procedure 4 (Privacy and Repo Hygiene).
  2. Execute Procedure 1 (Export Parity Check).
  3. Execute Procedure 5 (Docs Freshness Sweep).
  4. Apply safe, non-breaking fixes identified during sweeps.
  5. Run quality gates.
- **May Change:** Safe hygiene fixes, doc alignments, and test updates.
- **Must Only Report:** Any items requiring owner decisions.
- **Docs Updated:** All touched docs, `logs/YYYY-MM-DD.md`.
- **Output:** Consolidated health summary from procedures 4, 1, and 5.
