# Fotoğrafçılık Bilgi Tabanı (PHOTO-KNOWLEDGE)

Sahip fotoğrafçı değil; bu belge Curate'in neyi neden yaptığının dayanağıdır ve ajan tarafından güncel tutulur.
Her kural bir kaynağa (URL) veya Curate'teki bir ölçüme dayanır. Dayanağı olmayanlar **[bilgi, doğrulanmadı]** diye işaretlidir.
Kaynak kontrolü: 2026-10-08 (Wikipedia sayfaları ve Adobe yardım sayfası bu tarihte açılıp ilgili cümle okundu; Cambridge in Colour sayfaları vekil sunucuda 403 verdiği için kullanılmadı).
Son doğrulama: 2026-10-08

---

## 1. Temel kavramlar

| Kavram | Kısaca | Curate'te | Dayanak |
|---|---|---|---|
| Pozlama | Görüntünün genel parlaklığı; fotoğrafçılıkta EV adımlarıyla ölçülür | Preset'lerde `exposure` (yumuşak omuzla, kırpmadan) | https://en.wikipedia.org/wiki/Exposure_value |
| Kırpılma (clipping) | En koyu/en parlak değerin dışına düşen alan düz bir siyah/beyaz olur, ayrıntı kaybolur; renk kanallarında ayrı ayrı olunca renk bozulur | Ton eğrisinin uçları sabit; Parlak Alan Kurtar kırpılmış pikselde bilgi olmadığı için dokunmaz | https://en.wikipedia.org/wiki/Clipping_(photography) |
| Kontrast | Açık ve koyu arasındaki fark | S-eğrisi (uçlar sabit, ortada güçlü) | https://en.wikipedia.org/wiki/Contrast_(vision) |
| Beyaz dengesi | Nötr renklerin (beyaz, gri) ışık altında nötr görünmesi | Preset'lerde `temperature`/`tint` parlaklığı değiştirmeyen kazançlarla | https://en.wikipedia.org/wiki/Color_balance , https://en.wikipedia.org/wiki/Color_temperature |
| Ton eğrisi | Girdi parlaklığını çıktıya eşleyen eğri; ton haritalama yerel de olabilir | Kanal başına 256 girişli tablo (`toneCurve`) | https://helpx.adobe.com/lightroom-classic/help/image-tone-color.html , https://en.wikipedia.org/wiki/Tone_mapping |
| Doygunluk / canlılık | Doygunluk tüm renkleri eşit artırır. Canlılık (vibrance) az doygun renkleri daha çok artırır, kırpılmayı azaltır ve cilt tonunun aşırı doymasını önler | `saturation` ve cilt korumalı `vibrance` | https://helpx.adobe.com/lightroom-classic/help/image-tone-color.html (Vibrance tanımı), https://en.wikipedia.org/wiki/Colorfulness |

## 2. Sahne türleri ve tipik düzeltmeler

| Sahne | Tipik sorun | Tipik düzeltme | Curate önerisi (Otomatik) | Dayanak |
|---|---|---|---|---|
| Gün batımı / altın saat | Işık zaten sıcak ve yumuşak; aşırı doygunluk kolay | Sıcaklığı koru, parlakları topla, doygunluğu ölçülü artır | Altın Saat; çok doygun karede %50 | https://en.wikipedia.org/wiki/Golden_hour_(photography) |
| Mavi saat | Serin, düşük ışık | Serin tonu koru, gölgeyi hafif aç | Mavi Saat | https://en.wikipedia.org/wiki/Blue_hour |
| Gece | Gürültü artar, ışık kaynakları patlar | Siyahı koru, parlakları topla, gürültüyü azalt | Gece; Düzeltme → Noise Azalt | https://en.wikipedia.org/wiki/Night_photography , https://en.wikipedia.org/wiki/Image_noise |
| Ters ışık / silüet | Özne koyu, arka plan parlak | Siyahı derin bırak (kasıtlı), parlakları sıcak tut | Warm Silhouette %60; Otomatik Gölge Aç'ı silüette açmaz | [bilgi, doğrulanmadı] |
| Portre | Cilt tonunun kayması, aşırı doygunluk | Hafif sıcaklık, düşük kontrast, cilt korumalı canlılık | Portre | Adobe Vibrance tanımı (yukarıda) |
| Ön kamera (selfie) | Geniş açı yakın çekimde yüz orantısını bozar; telefon işlemesi sert görünebilir | Kontrastı azalt, parlakları topla, hafif sıcaklık | Ön Kamera | https://en.wikipedia.org/wiki/Selfie (yüz bozulması) ; sert işleme [bilgi, doğrulanmadı] |
| Manzara / pus | Pus kontrastı düşürür | Pus Gider (karanlık kanal) | Düzeltme → Pus Gider | https://en.wikipedia.org/wiki/Haze ; He, Sun, Tang, "Single Image Haze Removal Using Dark Channel Prior", CVPR 2009, https://doi.org/10.1109/CVPR.2009.5206515 |
| Öğle güneşi | Sert gölge, patlayan parlaklar | Gölgeyi aç, parlakları topla | Sert Güneş | [bilgi, doğrulanmadı] |
| Soluk/düz kare | Düşük kontrast ve doygunluk | Canlılık + ölçülü kontrast | Canlı | [bilgi, doğrulanmadı] |
| Yemek, sokak, iç mekân (karışık ışık) | Karışık renk sıcaklıkları | Beyaz dengesini nötre yaklaştır | Şimdilik özel kural yok (Doğal) | [bilgi, doğrulanmadı] |

## 3. Mobil kamera kusurları

| Kusur | Ne görülür | Curate ne yapar | Dayanak |
|---|---|---|---|
| Aşırı keskinleştirme | Kenarlarda açık/koyu hale (overshoot); yarıçap büyüdükçe artar | Kenar Netliği keskinleştirmeyi 3×3 komşuluk aralığına kırpar, hale üretmez (testli) | https://en.wikipedia.org/wiki/Unsharp_masking |
| Gürültü | Parlaklık ve renkte rastgele dalgalanma; karanlıkta belirgin | Noise Azalt renk ve parlaklık gürültüsünü ayrı ele alır; ayrıntının %25'ini korur (plastik görünüm sınırı) | https://en.wikipedia.org/wiki/Image_noise |
| Gece modu izleri | Çoklu pozun birleştirilmesinde hareketli nesnede "hayalet" | Düzeltilemez (piksel üretmeyiz); yalnız bilgi | https://en.wikipedia.org/wiki/Multi-exposure_HDR_capture |
| HDR halesi | Yerel ton haritalamada parlak/koyu sınırında hale | Curate yerel ton haritalamada geniş bulanık taban kullanır; hale ölçülmedi | [bilgi, doğrulanmadı] |
| Lens vinyeti | Kenara doğru parlaklık/doygunluk düşüşü; çoğu zaman istenmeyen, bazen bilinçli | Kenar Renk Düzelt yalnız dört köşe benzer ve düzgün kararıyorsa Otomatik'te açılır (kasıtlı vinyeti korumak için) | https://en.wikipedia.org/wiki/Vignetting |
| Kenar yumuşaması | Köşelerde netlik düşüşü | Kenar Netliği merkezden uzaklaştıkça artar | [bilgi, doğrulanmadı] (telefon lensleri için genelleme) |
| Mor kenarlanma | Parlak alana komşu koyu kenarlarda mor/macenta saçak | Henüz özel araç yok | https://en.wikipedia.org/wiki/Purple_fringing , https://en.wikipedia.org/wiki/Chromatic_aberration |
| Cilt yumuşatma | Telefonun güzelleştirme işlemesi dokuyu siler | Geri getirilemez; Curate ek yumuşatma yapmaz | [bilgi, doğrulanmadı] |

## 4. Seri uyumu
Carousel serisi tek bir görünümle (aynı preset ve miktar) işlenir; Otomatik serideki karelerin önerilerinden en çok çıkanı seçer (`suggestSeries`). "Seriyi bu kareye uydur" seçilen karenin renk ortalamasına %20 yaklaştırır. Aynı beyaz dengesi ve kontrastın seriyi bütün gösterdiği [bilgi, doğrulanmadı].

## 5. Platform sıkıştırması
- Kayıplı sıkıştırma bozulma (blok, "mosquito noise") üretir: https://en.wikipedia.org/wiki/Compression_artifact
- **Ölçüm (Curate, 2026-10-08, sharp, JPEG %90, 1080×1350 aynı sahne):** temiz 48 KB · hafif gürültü (±6) 232 KB · güçlü gürültü (±20) 535 KB · hafif gürültü + sert keskinleştirme 567 KB. Yani gürültü ve aşırı keskinlik dosyayı ~5–12 kat büyütür; platform sınırı içinde kalmak için kalite daha çok düşer. Bu yüzden Curate export'ta önce Noise Azalt'ı, keskinleştirmede ölçüyü önerir.
- Instagram/TikTok'un yeniden sıkıştırma ayarları [bilgi, doğrulanmadı] (yardım sayfası JavaScript ile yüklendiği için okunamadı).

## 6. Cilt tonu koruma
- Canlılık cilt tonlarının aşırı doymasını önler (Adobe, yukarıda). Curate'te canlılık, sıcak sıralı (R > G > B) ve orta doygunluktaki piksellerde etkisini %70 azaltır.
- **Ölçüm (`tests/presets.test.ts`):** 3 cilt yaması (açık, orta, koyu) için renkli 14 preset'in hepsinde ton kayması < 15°. "Canlı" preset'inde cilt yamasının doygunluk artışı, aynı doygunluktaki deniz mavisinden düşük.

## 7. Preset kütüphanesi (v2, 2026-10-08)
İlke: doğal, temiz, abartısız; tek "Miktar" kaydırıcısı; ton eğrisinin uçları sabit (siyah ezilmez, beyaz kırpılmaz), parlatma yumuşak omuzla. Varsayılan **Doğal** (yeni fotoğraflar; türetilmiş sonuçlar sade başlar, spec E11). Hale yalnız Night Cinematic'te, gren yalnız Amber Grain'de (AGENTS.md §4).

| Aile | Preset | Ne zaman |
|---|---|---|
| Temel | Doğal, Canlı, Yumuşak, Siyah Beyaz | Her kare; soluk kare; portre/yumuşak ışık; tek renkli kareler |
| Portre | Portre, Ön Kamera | Cilt öncelikli; selfie |
| Işık | Altın Saat, Mavi Saat, Sert Güneş, Gece | Gün batımı; alacakaranlık; öğle; gece |
| İmza (spec §5.1, sahibin aileleri) | Moody Teal, Warm Silhouette, Night Cinematic, Muted Coastal, Amber Grain, Monochrome Noir | Mimari/gökyüzü; ters ışık; neon; sakin kıyı; sokak; grafik siyah-beyaz |

**Kalibrasyon ölçümü** (13 referans görsel, Miktar %100, `applyPresetToImageData`; luma 0–255): Δp1 / Δp99 = siyah ve beyaz noktasının ortalama kayması; ezilme = luma ≤ 2 olan piksel payındaki değişim (ortalama / en kötü görsel); kırpılma = herhangi bir kanalı ≥ 254 olan pay (ortalama / en kötü); ΔE = ortalama CIELAB farkı.

| Preset | Δp1 | Δp99 | ezilme % | kırpılma % | ΔE |
|---|---|---|---|---|---|
| dogal | 0,0 | −0,6 | 0,00 / 0,00 | 0,16 / 0,71 | 0,5 |
| canli | −0,8 | −1,2 | 0,06 / 0,28 | 0,71 / 2,06 | 1,9 |
| yumusak | 11,8 | −6,8 | −5,77 / 0,00 | −0,56 / 0,00 | 8,1 |
| siyah_beyaz | −1,0 | 1,7 | 0,37 / 2,70 | −1,52 / 0,00 | 16,1 |
| portre | 0,8 | −3,3 | −0,16 / 0,00 | −1,28 / 0,00 | 1,8 |
| on_kamera | 2,2 | −1,8 | −0,73 / 0,00 | −1,00 / 0,53 | 3,3 |
| altin_saat | −1,2 | −3,5 | 0,69 / 2,70 | −0,22 / 0,98 | 2,4 |
| mavi_saat | 0,3 | 1,5 | −0,40 / 0,00 | −0,74 / 1,31 | 4,2 |
| sert_gunes | 4,0 | −9,8 | −0,99 / 0,00 | −0,30 / 0,04 | 5,9 |
| gece | −1,1 | −3,8 | 0,68 / 2,70 | −0,23 / 0,36 | 1,7 |
| moody_teal | 0,3 | −0,4 | −5,77 / 0,00 | −0,52 / 1,20 | 4,9 |
| warm_silhouette | −4,6 | 3,1 | 3,99 / 9,94 | 0,10 / 1,22 | 7,1 |
| night_cinematic | 0,8 | −3,2 | −5,77 / 0,00 | −0,66 / 0,00 | 4,0 |
| muted_coastal | 19,1 | −5,6 | −5,77 / 0,00 | −1,46 / 0,00 | 11,6 |
| amber_grain | 5,5 | −0,6 | −5,77 / 0,00 | −0,55 / 0,25 | 2,3 |
| monochrome_noir | −3,6 | 4,7 | 1,80 / 6,90 | −1,43 / 0,53 | 17,2 |

Okuma: negatif ezilme = siyahlar açıldı. **Warm Silhouette** (en kötü %9,9) ve **Monochrome Noir** (%6,9) bilinçli derin gölgedir (spec §5.1: "Derin shadow crush", "derin/crush shadow"); diğerlerinde en kötü görselde ≤ %2,7. Siyah-beyaz ve Noir'da yüksek ΔE rengin kalkmasından gelir.

**Sentetik hedefler** (`tests/presets.test.ts`): gri rampa (yalnız 0 → 0 ve 255 → 255; İmza'nın derin gölgeli iki preset'inde en çok 4 seviye), renk çubukları (eklenen kırpılma < %5), cilt yamaları (ton < 15°), eğri monoton ve uçlar sabit (%50 ve %100'de), Miktar 0 = orijinal.

## 8. Akıllı Otomatik (preset)
Histogram ve renk istatistikleri (`lib/engine/scene.ts`), AI değil. Sıra: siyah-beyaz → gece (ortalama < 0,2 ve %99 > 0,85) → silüet (%5 < 0,04, %25 < 0,1, %95 > 0,82) → portre (cilt payı > %12) → altın saat (sıcaklık > 0,2) → mavi saat → sert güneş → soluk → Doğal.

**13 referansta sonuç (2026-10-08):** çim saha, delivery, göl evi, iç mekân bar, mavi sisli şehir → Doğal; iki gün batımı → Altın Saat %50 (çok doygun); kovboy ve tabela → Siyah Beyaz (doygunluk ~0); şehir ışıkları otoyol → Gece; şehir gökdelen → Warm Silhouette %60; tren ve köprü → Portre (köprüdeki kahverengi tonlar cilt sanıldı: bilinen yanlış pozitif, Portre hafif olduğu için zararı düşük).

## 9. Düzeltme araçlarının dayanağı
| Araç | Yöntem | Dayanak |
|---|---|---|
| Pus Gider | Karanlık kanal önceliği; güç ve geçirgenlik tabanı sınırlı (doğal kalsın) | He, Sun, Tang 2009, https://doi.org/10.1109/CVPR.2009.5206515 |
| Noise Azalt | Renk farkı bulanıklığı + yerel varyansa göre (Lee tipi) parlaklık süzgeci; gürültü düzeyi Immerkær kestirimiyle | Görüntü gürültüsü tanımı: https://en.wikipedia.org/wiki/Image_noise ; Lee/Immerkær yöntem ayrıntısı [bilgi, doğrulanmadı] |
| Kenar Netliği | Keskinleştirme maskesi, kenara doğru artan, komşuluk aralığına kırpılmış | https://en.wikipedia.org/wiki/Unsharp_masking |
| Kenar Renk Düzelt | Halka ortalamalarının merkeze oranı, yalnız aydınlatma, monoton | https://en.wikipedia.org/wiki/Vignetting |
| Gölge Aç / Parlak Alan Kurtar | Bulanık tabana göre yerel kazanç; kırpılmış piksele dokunmaz | https://en.wikipedia.org/wiki/Clipping_(photography) , https://en.wikipedia.org/wiki/Tone_mapping |
