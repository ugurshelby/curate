# Durum (STATE)

Tek durum dosyası. Her anlamlı adımdan sonra aynı commit'te güncellenir. Yeni oturum: `AGENTS.md` → `docs/INDEX.md` → bu dosya → `git status` → `git log`.

**Son güncelleme:** 2026-10-09 (düzeltme turu 1 sonu)
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
| D1 | Düzeltme turu 1 (2026-10-08/09) | kod bitti, telefonda bekliyor | AI Preset model zinciri ve şema (D34), akıllı gradyan Çerçeve + Story (D33), AI para tavanı ve kalan bütçe satırı (D35). Rapor: `docs/reports/2026-10-09-duzeltme-1.md` |
| Y | Yoklama (geçici, ayrı görev 2026-10-08) | kod bitti, telefonda bekliyor | `/probe` + `probe-apk/`; `docs/probe/README.md`. Sahip iki JSON'u getirecek |

## Sıradaki adım
Sahip telefonda: (1) AI Preset'i dener, (2) Çerçeve ve Story'de gradyanı kenarları belirgin renkli fotoğraflarla dener, (3) Vercel → curate → Logs'ta `curate_ai` satırlarına bakar (AI Preset: `task:"P"`, model, `httpStatus`, `kind`), (4) Billing → Reports'tan çağrı başı gerçek maliyeti `lib/ai/config.ts` sabitleriyle karşılaştırır. Sonra: yoklama sonuçları (Faz Y), rutin bakım (Prosedür 8).

## Son commit
Düzeltme turu 1: bkz. `git log` (`fix(ai)`, `feat(frame)`, `feat(ai)` önekleri).

## Sahibe sorular (açık)
- Yoklama sonuçları geldiğinde yol haritası: sonuçlar Curate'e mi, ayrı bir kamera uygulamasına mı gidecek (spec §7 madde 5 kamera/çekim asistanını kapsam dışı sayar; spec §10 s.13).
- AI Preset için `preferredRegion` (örn. `fra1`) ölçülemedi: işlev bölgesini değiştirmek yalnız dağıtımdan sonra, günlükteki `ms` ile karşılaştırılarak anlamlı; Upstash'in bölgesi bilinmiyor. İstenirse sahip onayıyla denenir.
- `tests/corrections.test.ts` "fast enough … desktop CPU" bütçesi (1500 ms) bu Windows makinesinde paralel koşuda düşüyor (1,7–2,8 s; tek başına 0,9–1,0 s; CI yeşil). Bütçe değişmedi; isterseniz test daha az paralel koşturulabilir.

2026-10-08'deki 6 sorunun yanıtı `docs/DECISIONS.md` D27–D32'de.

## Bloke olanlar
- Service worker: güncelleme stratejisi planı ve sahip onayı olmadan eklenmez.

## Doğrulanmadı (açık kalan)
- Yoklama: telefonda hiçbir adım; `probe-apk` Kotlin derlemesi (Android SDK yok, ilk EAS build ilk gerçek denetim).
- Telefonda hiçbir akış (AI PIN, TikTok 1080×1920, Story güvenli alan bandı, kaydırma/jestler, Çerçeve 4K export süresi ve belleği, kurulu uygulamada PIN kapısı ve kayan çerez).
- Vercel Edge'de middleware'in ortam değişkenlerini okuması (yerel production'da ölçüldü; ilk push sonrası canlıda curl ile bakılacak).
- Vercel'de gerçek AI süresi, gerçek maliyet, dağıtık sayaç.
- AI Preset: model kimlikleri 2026-10-08'de gerçek çağrıyla sınandı (3.5-flash 26 sn geçerli, 3.5-flash-lite 4 sn ama doğrulayıcı reddetti, 2.5-flash 27 sn geçerli; 4 çağrının biri ücretsiz 400). Doğrulanmayan: Vercel'de çalışması, planların görsel kalitesi, gerçek ₺ (token: ~2,4 bin istem, ~0,5 bin yanıt, ~1,1–1,8 bin düşünme), süre (~26 sn, tahmin 8 sn idi).
- Akıllı gradyan: telefonda gerçek fotoğraflarla; Story'de çoklu fotoğrafta yalnız ilk fotoğrafın kenarları kullanılır (karar).
- AI para tavanı: Redis'te gerçek sayaç (yalnız bellek ve sahte Redis ile sınandı), gerçek maliyetin ×1,25 tahminle karşılaştırması.
