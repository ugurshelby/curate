# Durum (STATE)

Tek durum dosyası. Her anlamlı adımdan sonra aynı commit'te güncellenir. Yeni oturum: `AGENTS.md` → `docs/INDEX.md` → bu dosya → `git status` → `git log`.

**Son güncelleme:** 2026-10-08
**Görev tanımı:** sahibin 2026-10-08 tarihli "Bağımsız Ajan Görevi" belgesi (anayasa → tasarım dili → arayüz → erişim/gizlilik → özellikler). Fazlar ve sıra: `docs/ROADMAP.md`.

## Fazlar

| Faz | İçerik | Durum | Not |
|---|---|---|---|
| 0 | Tanışma (yalnız okuma) | bitti | Bulgular: `docs/reports/2026-10-08-faz0-1.md` |
| 1 | Anayasa ve belge sistemi | bitti | `docs/reports/2026-10-08-faz0-1.md` |
| 2 | Tasarım dili v3 + kural-kontrol testi | bitti | CDS v3, `tests/ui-rules.test.ts` |
| 3 | Arayüz denetimi ve yeniden tasarım | bitti | `docs/reports/2026-10-08-faz2-3.md` (ihlal 23 → 1; açık: preset adları, Faz 5) |
| 4 | Erişim (KIRMIZI, plan), kalıcılık, PWA | sürüyor | Erişim kapısı sahip onayı olmadan kodlanmaz |
| 5 | Performans, D2 Düzeltme, preset kütüphanesi, Otomatik, AI Preset (önce özet) | yapılmadı | |
| 6 | İdame | sürekli | Prosedür 8 |

## Sıradaki adım
Faz 4: A erişim planı (yalnız plan), B tercihler (localStorage) + kütüphane önbelleği (IndexedDB), C PWA (manifest bağlantısı, PNG simgeler).

## Son commit
`881e7fb` (Faz 3).

## Sahibe sorular (açık)
1. Çerçeve modülünün hedef boyutu: 1080×1350 dışında başka oran/boyut istiyor musun? (spec §4.4 K5 "Frame 1080×1350 kalır" diyor; bu soru yalnız yeni boyut istenirse açık.)
2. Kayıp kaynak belgeler (`curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md`, `curate-camera-app.md`) nerede? Repoda yok.
3. `.cube` LUT yükleme Carousel → "Araçlar" altında kalsın mı, yoksa kaldırılsın mı? (Uzman aracı; yeni preset kütüphanesi gelince gereksiz olabilir.)
4. `design/skills/animate/SKILL.md` repoda olmayan skill'lere (`review-animations`, `pick-ui-library` vb.) atıf yapıyor. Bu atıflar silinsin mi, yok sayılmaya devam mı? (Skill dosyası senin eklediğin dış kaynak; ajan değiştirmedi.)

## Bloke olanlar
- (yok)

## Doğrulanmadı (açık kalan)
- Telefonda hiçbir akış (AI PIN, TikTok 1080×1920, Story güvenli alan bandı, kaydırma/jestler).
- Vercel'de gerçek AI süresi, gerçek maliyet, dağıtık sayaç.
