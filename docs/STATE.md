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
| 4 | Erişim (KIRMIZI, plan), kalıcılık, PWA | kısmen bitti | B kalıcılık ve C PWA bitti; A erişim kapısı planı sahip onayında (`docs/reports/2026-10-08-erisim-plani.md`) |
| 5 | Performans, D2 Düzeltme, preset kütüphanesi, Otomatik, AI Preset (önce özet) | yapılmadı | |
| 6 | İdame | sürekli | Prosedür 8 |

## Sıradaki adım
Faz 5: 8.1 performans tabanı → 8.2 D2 Düzeltme → 8.4 bilgi tabanı + preset kütüphanesi + Otomatik → 8.3 AI Preset tasarım özeti (kod yok).

## Son commit
`881e7fb` (Faz 3).

## Sahibe sorular (açık)
0b. **AI Preset tasarım özeti:** `docs/reports/2026-10-08-ai-preset-ozeti.md` §8 (devam mı, stiller, kota ağırlığı, ≤ 6 deneme çağrısı). İtiraz gelmezse bir oturum sonra kodlanır.
0. **Tüm uygulama PIN kapısı (KIRMIZI):** `docs/reports/2026-10-08-erisim-plani.md` §10'daki 4 soru (planı onaylıyor musun; çerez 365 gün ve kayan; genel ay sınırı kalsın mı; referans görseller kapı arkasında mı).
1. Çerçeve modülünün hedef boyutu: 1080×1350 dışında başka oran/boyut istiyor musun? (spec §4.4 K5 "Frame 1080×1350 kalır" diyor; bu soru yalnız yeni boyut istenirse açık.)
2. Kayıp kaynak belgeler (`curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md`, `curate-camera-app.md`) nerede? Repoda yok.
3. `.cube` LUT yükleme Carousel → "Araçlar" altında kalsın mı, yoksa kaldırılsın mı? (Uzman aracı; yeni preset kütüphanesi gelince gereksiz olabilir.)
4. `design/skills/animate/SKILL.md` repoda olmayan skill'lere (`review-animations`, `pick-ui-library` vb.) atıf yapıyor. Bu atıflar silinsin mi, yok sayılmaya devam mı? (Skill dosyası senin eklediğin dış kaynak; ajan değiştirmedi.)

## Bloke olanlar
- Faz 5.3 AI Preset kodu: sahip onayı (veya bir oturum itirazsız bekleme).
- Faz 4-A tüm uygulama kapısı: sahip onayı bekliyor.
- Service worker: güncelleme stratejisi planı ve sahip onayı olmadan eklenmez.

## Doğrulanmadı (açık kalan)
- Telefonda hiçbir akış (AI PIN, TikTok 1080×1920, Story güvenli alan bandı, kaydırma/jestler).
- Vercel'de gerçek AI süresi, gerçek maliyet, dağıtık sayaç.
