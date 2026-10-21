# Durum (STATE)

Tek durum dosyası. Her anlamlı adımdan sonra aynı commit'te güncellenir. Yeni oturum: `AGENTS.md` → `docs/INDEX.md` → bu dosya → `git status` → `git log`.

**Son güncelleme:** 2026-10-20 (Prosedür 5: Faz R doküman taraması)
**Görev tanımı:** sahibin 2026-10-08 tarihli "Bağımsız Ajan Görevi" belgesi ve 2026-10-16 tarihli AI Kalibrasyon & Senaryo Test Pipeline brifi. Fazlar: aşağıdaki tablo (eski `docs/ROADMAP.md` 2026-10-20'de silindi).

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
| K | AI Kalibrasyon & Değerlendirme Pipeline | bitti | `tests/run-pipeline.mjs`, `tests/pipeline/`, 17 test görseli uçtan uca koşturuldu; `tests/report.html` üretildi (Fidelity: 9.3/10, Niyet: 8.4/10, Lider: Curate-Harmonizer) |
| R | Radikal Sadeleştirme & Odak Daraltma (3 Modül) | bitti | Carousel ve Story modülleri, Presetler ve Crop yerine 3 Temel Modül (Düzenle [AI Onar + Direktif], Büyüt [Standart + Detay], Çerçeve [Polaroid varyasyonları, renkli mat, gradyan, toplu işlem]) kuruldu. 325/325 test yeşil, build ve secrets temiz. |
| M | İki Aşamalı AI Pipeline & Kategori Seçim Kalibrasyonu | bitti | Matematiksel Teknik Şema + Multimodal Yorumlayıcı Model (Vision Interpreter) + Output Plan Optimizer mimarisi kuruldu. 5 Temel Hazır Şablon tanımlandı. Üretim koduna (`EditStudio`, `lib/engine/intelligent-repair.ts`, `lib/ai/`) ve benchmark testlerine tam entegre edildi. |

## Sıradaki adım
Sahibin telefonda 3 temel modülü (Düzenle, Büyüt, Çerçeve) test etmesi; AI Onar çağrılarının Vertex üzerinde denenmesi.
2026-10-20: ajan sistemi kuruldu (D36, rapor `docs/reports/2026-10-20-agent-setup.md`), güncel `main`'e taşındı; PR #1 kapatıldı. Aktif plan yok (`docs/PLAN.md` boş).
2026-10-20: Prosedür 5 (doküman taraması) Faz R kalıntılarını README, PRODUCT, ARCHITECTURE §2–4, reference §1–2, CDS, procedures, INDEX ve kod yorumlarından temizledi.

## Açık hatalar ve takip (2026-10-20 taramasında ölçüldü)
- Prosedür 2 betikleri bayat: `scripts/audit-ui.mjs` (satır 170, 184), `scripts/capture-screens.mjs` (86–97), `scripts/check-gradient.mjs` hâlâ `carousel`/`story` modüllerini açıyor; güncellenene kadar UI denetimi çalışmaz.
- Büyüt export'u `platform="edit"` ile 8 MB kalite basamağına giriyor; D14 "Upscale'e uygulanmaz" diyor.
- Büyüt'te "AI ile Büyüt" (alt yazı "Yapay Zeka & Doku Üretimi", rozet "AI Doku") yalnız önizlemede yerel ±%5 kontrast; ağa gitmez, export'u değiştirmez. Etiket yanıltıcı.
- Ölü kod (arayüzden çağıran yok, yalnız testli): `AiPresetSheet`, `AiRepairSheet`, `AiReviewScreen`, `usePanPinch`, `lib/engine/presets.ts`, `corrections.ts`, `scene.ts`; `prefs`/`library-cache`'te Carousel/Story alanları hâlâ yazılıyor; `tr.ts`'te `carousel`, `story` bölümleri. `tests/ui-rules.test.ts` 187–191 silinmiş `InstagramOverlay`/`TikTokOverlay` yollarını istisna listesinde tutuyor.
- `curate-spec-v1.md` Carousel/Story bölümleri D37 ile geçersiz; spec metni sahibe ait, değiştirilmedi.

## Son durum
- 24 test dosyası, 325 birim ve parite testi yeşil.
- `tsc --noEmit`, `npm run lint`, `npm run check:secrets` (0 bulgu), `npm test` sıfır hatayla geçti.

## Sahibe sorular (açık)
- Yoklama sonuçları geldiğinde yol haritası: sonuçlar Curate'e mi, ayrı bir kamera uygulamasına mı gidecek (spec §7 madde 5 kamera/çekim asistanını kapsam dışı sayar; spec §10 s.13).
- AI Preset için `preferredRegion` (örn. `fra1`) ölçülemedi: işlev bölgesini değiştirmek yalnız dağıtımdan sonra, günlükteki `ms` ile karşılaştırılarak anlamlı; Upstash'in bölgesi bilinmiyor. İstenirse sahip onayıyla denenir.
- `tests/corrections.test.ts` "fast enough … desktop CPU" bütçesi (1500 ms) bu Windows makinesinde paralel koşuda düşüyor (1,7–2,8 s; tek başına 0,9–1,0 s; CI yeşil). Bütçe değişmedi; isterseniz test daha az paralel koşturulabilir.

2026-10-08'deki 6 sorunun yanıtı `docs/DECISIONS.md` D27–D32'de. Faz R'nin (Carousel/Story kaldırma) sahip onayı D37'de (2026-10-20).

## Bloke olanlar
- Service worker: güncelleme stratejisi planı ve sahip onayı olmadan eklenmez.

## Doğrulanmadı (açık kalan)
- Yoklama: telefonda hiçbir adım; `probe-apk` Kotlin derlemesi (Android SDK yok, ilk EAS build ilk gerçek denetim).
- Telefonda hiçbir akış (AI onarım, kaydırma/jestler, Çerçeve 4K export süresi ve belleği, kurulu uygulamada PIN kapısı ve kayan çerez).
- Vercel Edge'de middleware'in ortam değişkenlerini okuması (yerel production'da ölçüldü; ilk push sonrası canlıda curl ile bakılacak).
- Vercel'de gerçek AI süresi, gerçek maliyet, dağıtık sayaç.
- AI Preset: model kimlikleri 2026-10-08'de gerçek çağrıyla sınandı (3.5-flash 26 sn geçerli, 3.5-flash-lite 4 sn ama doğrulayıcı reddetti, 2.5-flash 27 sn geçerli; 4 çağrının biri ücretsiz 400). Doğrulanmayan: Vercel'de çalışması, planların görsel kalitesi, gerçek ₺ (token: ~2,4 bin istem, ~0,5 bin yanıt, ~1,1–1,8 bin düşünme), süre (~26 sn, tahmin 8 sn idi).
- Akıllı gradyan (Çerçeve): telefonda gerçek fotoğraflarla.
- AI para tavanı: Redis'te gerçek sayaç (yalnız bellek ve sahte Redis ile sınandı), gerçek maliyetin ×1,25 tahminle karşılaştırması.
