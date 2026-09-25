# Curate Preset Kalibrasyonu — Referans Görsel Toplama Yönergesi

Bu döküman iki parçadan oluşuyor: **(1)** hangi görseli, kaç adet, hangi formatta toplayıp projeye ekleyeceğin, **(2)** görselleri ekledikten sonra agent'a vereceğin hazır prompt.

---

## 1. Görsel Seçim Kriterleri (Genel — Hepsi İçin Geçerli)

### Format
- **Tercih sırası:** PNG > yüksek kaliteli JPEG (kalite ≥90) > diğer.
- **Kaçınılması gereken:** WhatsApp/Instagram üzerinden aşırı sıkıştırılmış, ekran görüntüsü üzerinden alınmış (senin gönderdiğin Pinterest ekran görüntüleri gibi — o dört görsel keşif/ilham amaçlıydı, **kalibrasyon için kullanılmamalı**, çünkü ekran görüntüsü zaten bir kez sıkıştırılmış/yeniden renklendirilmiş oluyor).
- Görsel **orijinal kaynağından** indirilmeli (Pinterest'te görsele tıklayıp "orijinal boyut" veya kaynak siteye gidip indirme).

### Çözünürlük
- **Minimum:** uzun kenar 1080px (Curate'in proxy render boyutuyla eşleşir, altı analiz için yetersiz kalabilir).
- **İdeal:** uzun kenar 1500–3000px arası. Daha büyüğü gerekmez — Reinhard analizi zaten örneklenmiş küçük bir canvas üzerinden çalışıyor, aşırı büyük dosya sadece işlem süresini uzatır.
- Aşırı kırpılmış/küçük thumbnail'lar (ör. 400x400 altı) kullanılmamalı — renk istatistiği güvenilmez çıkar.

### İçerik Temizliği
- Üzerinde **metin, logo, watermark, UI elemanı olmayan** görseller seç (Pinterest ekran görüntülerindeki "Aesthetic Photo Ideas" yazıları, yıldız ikonları vb. olmamalı).
- Tek görsel = tek fotoğraf. Kolaj/grid görüntüler kullanılmamalı.
- Aşırı düzenlenmiş (heavy preset uygulanmış, watermark'lı stok görsel gibi görünen) içeriklerden kaçın — amaç "bu ton bana ait olabilir" dediğin **doğal/gerçekçi** görseller.

### Dosya Adlandırma (Agent'ın Kolayca Ayırt Etmesi İçin)
Görselleri şu formatla adlandır, agent prompt'unda buna referans verilecek:
```
[preset-adı]_[sıra-no].[uzantı]
```
Örnek:
```
moody-teal_01.png
moody-teal_02.jpg
warm-silhouette_01.jpg
```

---

## 2. Preset Başına Görsel Sayısı ve Tipi

| Preset | Toplam görsel | Dağılım | Özellikle aranacak şey |
|---|---|---|---|
| **Moody Teal** | 4–6 | 1 "altın referans" (en güçlü/en tipik örnek) + 3–5 destek | Gökyüzü baskın, teal/mavi doygun, bina/taş sıcak tonuyla kontrast. Farklı bina türleri (kubbe, cephe, heykel) olsun ki preset sadece "bir bina fotoğrafına" değil genel mimari tona uysun. |
| **Warm Silhouette** | 4–6 | 1 altın referans + 3–5 destek | Güçlü ters ışık, düz siyah siluet + sıcak turuncu/kırmızı arka plan. En az 2 farklı özne tipi (insan + hayvan/nesne gibi) — tek tip özneye aşırı özelleşmesin. |
| **Night Cinematic** | 3–5 | 1 altın referans + 2–4 destek | Düşük anahtar (çoğu kare koyu), tek net renkli ışık kaynağı (neon, pencere, sokak lambası). Bu ailede daha az görsel yeterli çünkü karakter daha spesifik/dar. |
| **Muted Coastal** | 4–6 | 1 altın referans + 3–5 destek | Düşük doygunluk, yumuşak ton geçişi, gölgelerde crush YOK. Deniz/gökyüzü/açık alan ağırlıklı ama zorunlu değil — "sakin/soft" his öncelik. |
| **Amber Grain** | 4–6 | 1 altın referans + 3–5 destek | Sokak/günlük detay, hafif "yıpranmış" sıcak ton, orta-yüksek gren hissi veren (biraz noisy/textured) görseller iyi çalışır. |

**Toplam:** yaklaşık 19–29 görsel arası. Bu miktar hem Reinhard "altın referans" seçimi için hem de Yöntem B (histogram doğrulama) için yeterli çeşitlilik sağlar — fazlası gereksiz, azı (preset başına 3'ün altı) güvenilir ortalama vermez.

### "Altın Referans" Nasıl Seçilir
Her preset için topladığın görseller arasından **sana en çok "işte bu tam benim istediğim ton" dedirten tek bir görseli** ayrıca işaretle (dosya adına `-GOLDEN` ekleyebilirsin, ör. `moody-teal_01-GOLDEN.png`). Bu, Reinhard motorunun referans alacağı ana görsel olacak; diğerleri doğrulama/ortalama için kullanılacak.

---

## 3. Projeye Ekleme

Görselleri toplarken önerilen klasör yapısı:
```
/reference-images/
  moody-teal/
    moody-teal_01-GOLDEN.png
    moody-teal_02.jpg
    ...
  warm-silhouette/
    ...
  night-cinematic/
    ...
  muted-coastal/
    ...
  amber-grain/
    ...
```
Bunu Curate projesinin köküne (repo içine, `curate-studio` klasörünün yanına) veya ayrı bir `reference-images/` klasörü olarak ekleyebilirsin — agent'a hangi yolda olduğunu prompt içinde belirt.

---

## 4. Agent'a Vereceğin Prompt

Görselleri topladıktan sonra, Curate üzerinde çalışan agent'ına aşağıdaki prompt'u verebilirsin (yol/klasör adını kendi projene göre güncelle):

```
/reference-images/ klasöründe 5 alt klasör var (moody-teal, warm-silhouette, 
night-cinematic, muted-coastal, amber-grain), her birinde birkaç referans 
görsel var ve her klasörde bir tanesi "-GOLDEN" ekiyle işaretli.

Bu klasörü kullanarak curate-preset-spec.md dökümanındaki 5 preset'in 
sayısal değerlerini (contrast, saturation, temperature, tint, fade, grain, 
halation, vignette) kalibre et. Şu adımları izle:

1. Her preset klasöründeki GOLDEN görseli, Curate'in mevcut Reinhard renk 
   eşleştirme fonksiyonundan geçirerek Lab renk uzayında (μ_L, μ_a, μ_b, 
   σ_L, σ_a, σ_b) istatistiklerini çıkar. Bu istatistikleri o preset'in 
   "ana renk profili" olarak kaydet.

2. Aynı klasördeki diğer (GOLDEN olmayan) görseller için de aynı Lab 
   istatistiklerini hesapla ve GOLDEN ile karşılaştır — eğer aynı 
   klasördeki görseller arasında büyük sapma varsa (örn. biri çok daha 
   sıcak/soğuk çıkıyorsa) bunu bana raporla, ben o görseli klasörden 
   çıkarabilirim.

3. curate-preset-spec.md'deki her preset için verdiğim başlangıç sayısal 
   değerlerini (contrast/saturation/temperature/tint/fade/grain/halation/
   vignette), 1. adımda çıkardığın Lab istatistiklerine göre güncelle — 
   yani sabit varsayım değerleri yerine gerçek referans görselden türetilmiş 
   değerleri kullan. Mantıklı dönüşüm için: μ_a/μ_b sapmasını temperature/
   tint'e, σ_L'yi contrast'a, genel doygunluk farkını saturation'a 
   yansıt.

4. Güncellenmiş preset değerlerini curate-preset-spec.md içinde ilgili 
   tablolarda güncelle, hangi görsellerden türetildiğini (GOLDEN dosya adı) 
   her preset tablosunun altına bir satır olarak not düş.

5. Değişiklikleri uygulamadan önce bana özet göster: hangi preset'in hangi 
   değeri ne kadar değişti (örn. "Moody Teal contrast: +25 → +31") — 
   onay verirsem koda geçir.

Slider/manuel ayar arayüzü eklemeyeceğiz, bu tamamen arka planda preset 
değerlerini iyileştirmek için. Kullanıcı (ben) hâlâ sadece preset kartına 
tıklayacağım.
```

---

*Bu yönerge, `curate-preset-spec.md` ile birlikte kullanılmak üzere hazırlanmıştır. Görselleri toplayıp klasöre yerleştirdikten sonra yukarıdaki prompt'u agent'a aynen verebilirsin.*
