# Ajan sistemi kurulumu (SETUP-REPORT) — 2026-10-20

Kaynak: sahibin "Agent Setup Wizard" belgesi (v1). Karar kaydı: D36 (bulut dalında D33 idi; `main`'de D33–D35 dolu olduğu için yeniden numaralandı).

## Bulunan yığın ve komutlar
- Next.js 14, React 18, TypeScript, Tailwind 3, Vitest 2, npm; CI GitHub Actions (push/PR → `main`: tsc, lint, test, build); yayın Vercel (`main`). Veritabanı yok.
- Ölçülen süreler: `npx tsc --noEmit` 13 sn, `npm run lint` 6 sn, `npm test` 10 sn (292 test), `npm run build` 26 sn, `npm run check:secrets` 0 bulgu. Hepsi hızlı; uzun komut yok.

## Oluşturulan / yeniden yazılan
- `AGENTS.md` (kanonik, ≤120 satır; bölüm numaraları korundu: koddaki "AGENTS.md §2.5/§4/§5" atıfları geçerli).
- `CLAUDE.md` (`@AGENTS.md` + L3/L2/L1 rolleri, dal kuralı, bağlam disiplini).
- Yönlendiriciler: `GEMINI.md`, `.agents/rules/ui-ux-design-hierarchy.md` (yerinde yeniden yazıldı), `.cursor/rules/00-agents.mdc`, `.github/copilot-instructions.md`.
- `.claude/settings.json`, `.claude/agents/scout.md`, `.claude/agents/architect.md`.
- `docs/PLAN.md`, `docs/OPEN.md`, `docs/tasks/00-template.md`. `.gitignore`: `.claude/settings.local.json`.
- ARCHITECTURE ve DECISIONS `docs/` altında kaldı (koddan ve belgelerden atıf var; kopya açılmadı).

## Birleştirilen / düşürülen kurallar
- UI kaynak sırası dosyası AGENTS.md §1 ve §5'e birleşti (eksik skill yolları, sıklık kapısı, kurulu olmayan kütüphaneler).
- Performans bütçeleri ROADMAP'ten AGENTS.md §6'ya taşındı.
- "Yalnız main, başka dal yok" → Claude `main`'e, diğer ajanlar `wip/` + PR (D36).
- "Yeni runtime bağımlılığı → sahibe sor" → L3 kararı (piksel dışarı taşıyan bağımlılık yasak kalır).
- "Oluşturmadığın dosyayı silme" → L3 temizlik yetkisi (gerekçeyle, emin değilsen tut).

## Düzeltilen bayat olgular
- reference: test sayısı (22 dosya / 292), middleware ve `/kilit` var, dosya satır sayıları, PIN'i okuyan iki sunucu dosyası.
- ARCHITECTURE §1: "tek sayfa, rota yok" düzeltildi. README: AI istisnası AI Preset'i de kapsar; PIN paragrafı D27'ye göre yeniden yazıldı.
- procedures: ortak protokol dal kuralı, parite listesine `tests/frame.test.ts`, ekran görüntüsünde `AUDIT_PIN`.

## Silinemeyenler (ortam engelledi; sahip izni bekliyor)
- `docs/ROADMAP.md`: tüm fazlar bitti, durum `docs/STATE.md`'de, bütçeler AGENTS.md §6'da. Silinirse `curate-spec-v1.md:197` ve INDEX satırı `docs/STATE.md`'ye yönlendirilir.
- `logs/2026-10-01.md`, `logs/2026-10-02.md`, `logs/2026-10-03.md`: 15 günlük saklama kuralının dışında.

## Doğrulanmadı
- Antigravity'nin `.agents/rules/` klasörünü ve `trigger: always_on` alanını okuması (resmî belge bulunamadı; üçüncü taraf kaynaklar çelişkili).
- `.claude/settings.json` izinlerinin canlı bir Claude Code oturumunda uygulanması.
