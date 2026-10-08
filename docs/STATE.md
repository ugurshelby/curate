# Durum (STATE)

Tek durum dosyası. Her anlamlı adımdan sonra aynı commit'te güncellenir. Yeni oturum: `AGENTS.md` → `docs/INDEX.md` → bu dosya → `git status` → `git log`.

**Son güncelleme:** 2026-10-08 (oturum sonu)
**Görev tanımı:** sahibin 2026-10-08 tarihli "Bağımsız Ajan Görevi" belgesi (anayasa → tasarım dili → arayüz → erişim/gizlilik → özellikler). Fazlar ve sıra: `docs/ROADMAP.md`.

## Fazlar

| Faz | İçerik | Durum | Not |
|---|---|---|---|
| 0 | Tanışma (yalnız okuma) | bitti | Bulgular: `docs/reports/2026-10-08-faz0-1.md` |
| 1 | Anayasa ve belge sistemi | bitti | `docs/reports/2026-10-08-faz0-1.md` |
| 2 | Tasarım dili v3 + kural-kontrol testi | bitti | CDS v3, `tests/ui-rules.test.ts` |
| 3 | Arayüz denetimi ve yeniden tasarım | bitti | `docs/reports/2026-10-08-faz2-3.md` (ihlal 23 → 1; açık: preset adları, Faz 5) |
| 4 | Erişim, kalıcılık, PWA | bitti | A tüm uygulama PIN kapısı (D27) uygulandı; B kalıcılık; C PWA. Telefonda doğrulanmadı |
| 5 | Performans, D2 Düzeltme, preset kütüphanesi, Otomatik, AI Preset | bitti (doğrulanmamış kısım var) | 8.1–8.5 bitti (AI Preset D28 ile kodlandı, sahte yanıtla tarayıcıda doğrulandı); 8.6 ve AI Preset için gerçek model çağrısı yapılamadı (kapsayıcıda anahtar yok) |
| 6 | İdame | sürekli | Prosedür 8 |
| Y | Yoklama (geçici, ayrı görev 2026-10-08) | kod bitti, telefonda bekliyor | `/probe` + `probe-apk/`; `docs/probe/README.md`. Sahip iki JSON'u getirecek |

## Sıradaki adım
Sahip yanıtları (2026-10-08, D27–D32) uygulanıyor: LUT kaldırıldı ✓, skill atıfları silindi ✓, Çerçeve standart boyutları ✓, tüm uygulama PIN kapısı ✓, AI Preset ✓ (kota varsayılanı 500/gün, 5000/ay). Sırada: sahibin telefonda ilk deneme ve gerçek AI Preset çağrısı (model adı log'dan okunur); rutin bakım (Prosedür 8). İsteğe bağlı sonraki iş: "Bölgeleri göster" katmanı (özet §2.5, yapılmadı).

## Son commit
`200a0ed` (AI Preset) + kapanış raporu `docs/reports/2026-10-08-sahip-yanitlari.md`.

## Sahibe sorular (açık)
- Yoklama sonuçları geldiğinde yol haritası: sonuçlar Curate'e mi, ayrı bir kamera uygulamasına mı gidecek (spec §7 madde 5 kamera/çekim asistanını kapsam dışı sayar; spec §10 s.13).
- `tests/corrections.test.ts` "fast enough … desktop CPU" bütçesi (1500 ms) bu Windows makinesinde paralel koşuda düşüyor (1,7–2,8 s; tek başına 0,9–1,0 s; CI yeşil). Bütçe değişmedi; isterseniz test daha az paralel koşturulabilir.

2026-10-08'deki 6 sorunun yanıtı `docs/DECISIONS.md` D27–D32'de.

## Bloke olanlar
- Service worker: güncelleme stratejisi planı ve sahip onayı olmadan eklenmez.

## Doğrulanmadı (açık kalan)
- Yoklama: telefonda hiçbir adım; `probe-apk` Kotlin derlemesi (Android SDK yok, ilk EAS build ilk gerçek denetim).
- Telefonda hiçbir akış (AI PIN, TikTok 1080×1920, Story güvenli alan bandı, kaydırma/jestler, Çerçeve 4K export süresi ve belleği, kurulu uygulamada PIN kapısı ve kayan çerez).
- Vercel Edge'de middleware'in ortam değişkenlerini okuması (yerel production'da ölçüldü; ilk push sonrası canlıda curl ile bakılacak).
- Vercel'de gerçek AI süresi, gerçek maliyet, dağıtık sayaç.
- AI Preset: model kimliklerinin (`AI_PLAN_MODELS`) Vertex'te varlığı, gerçek planların kalitesi, ₺ tahmini (0,3) ve ~8 sn süre.
