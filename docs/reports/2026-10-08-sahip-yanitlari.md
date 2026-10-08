# Rapor — Sahip yanıtlarının uygulanması — 2026-10-08

Kapsam: sahibin 6 yanıtı (D27–D32). Ayrıntılı ölçümler: `logs/2026-10-08.md`.

## Yapılanlar
| # | Yanıt | Sonuç | Commit |
|---|---|---|---|
| 1 | Tüm uygulama PIN kapısı onaylı | `middleware.ts` + `/kilit`; çerez `curate_session` (365 gün, kayan); referans görseller kapı arkasında; manifest/simgeler açık | `0ee969c` |
| 2 | AI Preset onaylı, kota kısıtı yok | Düzenle → "AI Preset" kartı, 4 stil; JSON plan cihazda uygulanır; kota varsayılanı 500/gün, 5000/ay | `200a0ed` |
| 3 | Çerçevede tüm standart çözünürlükler | 10 oran + 4K; önizleme ve export tek çizim fonksiyonu | `04e0d49` |
| 4 | Kaynak belgeler eskimiş | Yok sayıldı; kalibrasyon referanslar ve `docs/PHOTO-KNOWLEDGE.md` ile | `1a8103a` |
| 5 | `.cube` LUT | Kaldırıldı | `1a8103a` |
| 6 | Skill atıfları | Silindi | `1a8103a` |

## Doğrulama
- `npm test` 292 test, lint 0, `tsc` 0, build başarılı, `check:secrets` 0 bulgu.
- Prosedür 2: 71 ekran 360/390/430 + masaüstü `pass: true` (PIN ekranı, yanlış PIN, Çerçeve 9:16/16:9/1.91:1, AI Preset sayfası ve uygulanmış hâl dahil).
- Chromium: Çerçeve 5 boyutta export (1080×1350, 1080×1920, 1080×566, 2160×2160, 3840×2160; EXIF yok); kapı akışı (çerezsiz → kilit, yanlış PIN, doğru test PIN'i → içeri); AI Preset sahte yanıtla (uygulandı, export, yeniden açılışta korunuyor).
- Canlı: kapı çalışıyor (`X-Curate-Gate: ready`, çerezsiz `/` → `/kilit`).

## Doğrulanmadı
- Telefonda hiçbir akış (kilit ekranı, kurulu uygulamada çerez, Çerçeve 4K belleği, AI Preset).
- Gerçek AI Preset çağrısı: model kimlikleri (`gemini-3-flash`, `gemini-2.5-flash`, son çare `gemini-3.1-flash-image`), plan kalitesi, süre (~8 sn) ve maliyet (~₺0,3). Kapsayıcıda anahtar yok; ücretli çağrı 0.

## Yapılmadı
- AI Preset "Bölgeleri göster" katmanı (özet §2.5): isteğe bağlı, sonraki iş.
