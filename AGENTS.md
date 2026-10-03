# CURATE STUDIO — AGENT DEVELOPMENT CONSTITUTION

Curate Studio is a personal browser darkroom for Uğur to edit architectural, silhouette, and reflection dumps without required sliders. Audience (owner decision, 2026-10-02): single user, personal tool. Primary runtime: mobile (390×844 reference viewport); desktop is secondary.

## 1. Authority Order
1. Code (what actually executes)
2. `curate-spec-v1.md` (owner's statement of intent)
3. `AGENTS.md` (this constitutional rule file)
4. `docs/reference/curate-reference.md` (canonical living reference)
5. Everything else
Design authority is `design/CURATE_DESIGN_SYSTEM.md`; UI rule order is in `.agents/rules/ui-ux-design-hierarchy.md`. Design skills live in `design/skills/` (`apple-design` §18 and its light-theme `DESIGN.md`/tokens are not Curate's).

## 2. Permission Model
- All development, commits, and pushes happen directly on `main`. No side or agent branches.
- Whenever changes are committed or pushed, always commit and push directly to `main`.
- No database. The only server code is the "AI ile onar" proxy (`app/api/ai/route.ts`, owner decision 2026-10-03); do not add other server features. No secrets in the repo or the client bundle (the repo is public); secrets live only as Vercel server environment variables, never `NEXT_PUBLIC_*`. Never print or commit secret values; names only. After `npm run build`, `npm run check:secrets` must report 0 findings.
- Do not decide owner questions (see `docs/reference/curate-reference.md` section 13). List them in reports.
- If a browser is unavailable to you, mark every visual or interaction check as "not verified" instead of inferring it from code.

## 3. Scope Lock
- Strictly forbidden: panorama (permanently closed by owner, 2026-10-02), AI inpainting/outpainting, accounts, server-side image upload. Only exception to the upload ban: Düzenle → "AI ile onar" (`curate-spec-v1.md` §4.5 E12).
- No manual color UI (curves, channels, split toning, HSL). Only exception: Düzenle's Düzeltme tab, one on/off and one strength slider per row (`curate-spec-v1.md` §4.5).
- Allowed for editorial aesthetic (per owner decision): optical highlight halation for Night Cinematic, and tactile 35mm analog grain for Amber Grain. Light leak, vignette, and panorama splitting remain forbidden. The vignette ban covers ADDING an aesthetic vignette; CORRECTING lens-caused edge darkening (Düzenle → Düzeltme, "Kenar Renk Düzelt") is allowed.
- If the spec asks for any forbidden feature, stop and ask. Do not reintroduce removed features from git history.
- No new dependency that sends pixels off-device. Single owner-approved exception: Düzenle's "AI ile onar", only on a user tap, one photo, only through our own proxy to Google Vertex with plain `fetch` (no third-party client SDK). No other module sends images. Photos are not stored or logged on the server; the log line holds task, model, duration, sizes and estimated cost only. Model ids, prompts and costs live only in `lib/ai/config.ts`.
- No default or seed photos, mock EXIF strings, or debug labels (`Acik`, `Kapali`, proxy dimensions) in the UI. The library starts empty; the 13 owner-approved files in `public/reference-images/` enter it only through an explicit user action (same-origin fetch, never sent anywhere).
- Export targets live as data in `lib/export/platform-specs.ts`. Owner decisions and their phases (K, M1, M2, S) are in `curate-spec-v1.md` §4.4.
- Do not label a CSS filter as Lanczos.
- UI colors come only from the tokens in `app/globals.css` (palette and single iOS-blue accent: `design/CURATE_DESIGN_SYSTEM.md` §2). No hex/rgb literals or chromatic Tailwind palette classes in code; export-content colors live only in `lib/ui/colors.ts`. Anything laid over a photo is colorless (white/black with alpha). `tests/color-tokens.test.ts` enforces this.
- Preview and export must call the same draw function.

## 4. Verification Rule
- "Done" means measured facts: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm test` must all pass with zero errors.
- For export or state changes, state explicitly which flows were exercised in a browser and which were not.
- A clean build is not evidence that an image looks right.
- UI changes: measure at 390×844 with the edit panel open (see `design/CURATE_DESIGN_SYSTEM.md` §6). The photo must never sit under the header, edit panel, or filmstrip.

## 5. Git Hygiene & Security
- When a new file type or folder appears, check `.gitignore`.
- Never commit `.env*`, screenshots, personal photos, or dumps. Exception: the 13 tracked reference images in `public/reference-images/` (owner decision, 2026-10-02); do not add more.
- If an environment variable ever appears, add its name to `.env.example` with an empty value.

## 6. Documentation Self-Maintenance
- A change that makes any doc false (including `curate-spec-v1.md` or `README.md`) must update that document in the same commit.
- Update "Last verified: YYYY-MM-DD" in touched sections of `docs/reference/curate-reference.md`.
- Never leave fixed bugs listed as open defects in the spec.

## 7. Logging Rule
- Every session/procedure writes measured facts to `logs/YYYY-MM-DD.md` (commands, results, counts, sizes).
- No intentions or unverified claims.
- Delete log files older than 15 days.

## 8. Procedure Trigger Table
Procedures are detailed in `docs/procedures.md`.

| Procedure | Turkish Trigger | English Trigger |
|---|---|---|
| 1. Export parity check | "export kontrolü", "önizleme export eşleşiyor mu" | "check export parity", "export matches preview" |
| 2. Mobile and viewport audit | "mobil denetim turu", "arayüzü denetle" | "mobile audit", "check viewport" |
| 3. Performance and memory audit | "performans denetimi", "bellek kontrolü" | "performance audit", "memory audit" |
| 4. Privacy and repo hygiene | "gizlilik taraması", "repo hijyen kontrolü" | "privacy scan", "repo hygiene check" |
| 5. Docs freshness sweep | "doküman taraması", "bayat dokümanları temizle" | "docs sweep", "clean stale docs" |
| 6. Bug triage from live testing | "şu hatayı düzelt: ...", "canlıda şunu gördüm: ..." | "fix bug: ...", "observed live: ..." |
| 7. Pre-push & release readiness | "main'e hazır mı", "push öncesi kontrol", "yayın öncesi kontrol" | "ready for main", "pre-push check", "release check" |
| 8. Routine session | "rutin kontrol", "bakım oturumu" | "routine check", "maintenance session" |