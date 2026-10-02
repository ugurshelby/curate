# CURATE STUDIO — AGENT DEVELOPMENT CONSTITUTION

Curate Studio is a personal browser darkroom for Uğur to edit architectural, silhouette, and reflection dumps from a mobile workflow without required sliders. Note: the binding audience definition (personal tool vs. amateur vs. pro) is an open owner question.

## 1. Authority Order
1. Code (what actually executes)
2. `curate-spec-v1.md` (owner's statement of intent)
3. `AGENTS.md` (this constitutional rule file)
4. `docs/reference/curate-reference.md` (canonical living reference)
5. Everything else
Design authority is `design/CURATE_DESIGN_SYSTEM.md`.

## 2. Permission Model
- All development, commits, and pushes happen directly on `main`. No side or agent branches.
- Whenever changes are committed or pushed, always commit and push directly to `main`.
- This project has no database, no server, and no secrets. Do not add one. Never print or commit secret values; names only.
- Do not decide owner questions (see `docs/reference/curate-reference.md` section 13). List them in reports.
- If a browser is unavailable to you, mark every visual or interaction check as "not verified" instead of inferring it from code.

## 3. Scope Lock
- Strictly forbidden: panorama splitting, AI inpainting/outpainting, accounts, server-side image upload.
- Allowed for editorial aesthetic (per owner decision): optical highlight halation for Night Cinematic, and tactile 35mm analog grain for Amber Grain. Light leak, vignette, and panorama splitting remain forbidden.
- If the spec asks for any forbidden feature, stop and ask. Do not reintroduce removed features from git history.
- No new dependency that sends pixels off-device.
- No default or seed photos, mock EXIF strings, or debug labels (`Acik`, `Kapali`, proxy dimensions) in the UI.
- Do not label a CSS filter as Lanczos.
- Preview and export must call the same draw function.

## 4. Verification Rule
- "Done" means measured facts: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm test` (once it exists) must all pass with zero errors.
- For export or state changes, state explicitly which flows were exercised in a browser and which were not.
- A clean build is not evidence that an image looks right.

## 5. Git Hygiene & Security
- When a new file type or folder appears, check `.gitignore`.
- Never commit `.env*`, screenshots, personal photos, or dumps.
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
| 7. Merge readiness | "main'e hazır mı", "merge öncesi kontrol" | "ready for main", "pre-merge check" |
| 8. Routine session | "rutin kontrol", "bakım oturumu" | "routine check", "maintenance session" |