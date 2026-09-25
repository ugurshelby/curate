# Curate — Kişisel Estetik Preset Sistemi: Spec

**Amaç:** Curate'i jenerik bir film-preset editöründen, Uğur'un kendi fotoğrafçılık karakterine kalibre edilmiş, tek tıkla çalışan bir kürasyon aracına dönüştürmek. Slider ile uğraşma yok — preset seç, uygula, indir.

**Hedef kullanıcı davranışı:** Fotoğrafı yükle → hangi ruh haline yakınsa o preset kartına bas → (opsiyonel) Batch Sync → indir. Hiçbir adımda ince ayar gerekmemeli.

---

## 1. Arka Plan — Neden Bu Değişiklik

Mevcut Curate 10 jenerik film preset'i sunuyor (Portra, CineStill, Velvia vb.) — bunlar sağlam ama kimsenin kişisel imzası değil. Uğur'un çekim karakteri ve referans panoları incelendiğinde 6 net, tekrar eden estetik aile ortaya çıktı (Moody Teal, Warm Silhouette, Night Cinematic, Muted Coastal, Amber Grain ve Monochrome Noir). Bu spec bu 6 aileyi kalıcı, adlandırılmış preset'lere çeviriyor.

**Kullanıcı karakteri (kısa özet):**
- Güçlü yön: silüet/ters ışık, çerçeve-içinde-çerçeve/yansıma, altın saat renk yönetimi, negatif EV ile gökyüzü koruma
- Zayıf yön: EV/ışık koşulu uyumsuzluğu, gölge kırpılması, formül tekrarı
- İstek: teknik ayar değil, **zahmetsiz, hızlı, tek tıkla doğru sonuç**

---

## 2. Altı Preset Ailesi — Tam Spec (Reinhard CIELAB Kalibreli)

Her preset, Curate'in mevcut `filters` state modeline (`contrast, saturation, temperature, tint, fade, highlightTint, shadowTint`) + analog katmanına (`grain, halation, vignette, lightLeak`) karşılık gelen somut değerler olarak tanımlanır. Aşağıdaki değerler Uğur'un `reference-images/` klasöründeki altın referans karelerinden Reinhard renk eşleştirme motoru ve CIELAB istatistikleri ($\mu_L, \mu_a, \mu_b, \sigma_L, \sigma_a, \sigma_b$) çıkarılarak kalibre edilmiştir.

### 2.1 — Moody Teal
*Mimari, gökyüzü olan kareler, Viyana/Budapeşte tarzı seri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +22 | mimari gölge detaylarını koruyan dengeli kontrast ($\sigma_L = 19.39$) |
| Saturation | +10 | editoryal muted renk seviyesi (kroma 10.12) |
| Temperature | −10 (soğuk yönde) | gökyüzü ve suyu teal eksenine oturtur |
| Tint | +5 (yeşil-cyan yönde) | $\mu_a = -1.74$ cyan/yeşil aksı |
| Highlight tint | cyan/teal, hafif | `[-4, 8, 12]` gökyüzü highlight'ları |
| Shadow tint | nötr-hafif mavi | `[-2, 0, 8]` bina gölgelerinde soğukluk |
| Fade | 0 | mimari kontrast korunmalı |
| Grain | 8 (düşük) | mimari netlik öncelikli |
| Halation | 4 (düşük) | |
| Vignette | 12 (hafif) | köprü/kemer kompozisyonu odak derinliği |
| Light leak | kapalı | |

> **Kalibrasyon Notu:** Altın referans: `kopru.jfif` ($\mu_L: 24.43, \mu_a: -1.74, \mu_b: +5.79$). Destek görsel: `sehir-gokdelen.jfif`. `gol-evi.jfif` kırmızı cephe sapması ($\Delta \mu_a = +6.91$) nedeniyle kalibrasyon dışı bırakılmıştır.

### 2.2 — Warm Silhouette
*Ters ışık, insan/hayvan silüeti, gün batımı figürleri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +36 (yüksek) | shadow crush ve silüet/güneş ayrımı için gerekli |
| Saturation | +22 | zengin gün batımı sıcak kroması (kroma 37.36) |
| Temperature | +18 (sıcak yönde) | $\mu_b = +27.03$ zengin gün batımı sarısı |
| Tint | +8 (kırmızı-magenta yönde) | $\mu_a = +18.49$ yoğun kırmızı/turuncu gökyüzü |
| Highlight tint | sıcak turuncu, güçlü | `[22, 12, -6]` gün batımı ve güneş halesi |
| Shadow tint | nötr derin siyah | `[0, 0, 0]` tam ezilmiş gölge (crushed shadow, $p10_L = 4.57$) |
| Fade | 0 | shadow crush'ı bozmamak için sıfır |
| Grain | 10 | silüet hatlarını temiz tutan hafif doku |
| Halation | 18 (yüksek) | güneş kaynağı etrafında taşan sıcak parıltı |
| Vignette | 15 | silüete odak kazandırır |
| Light leak | kapalı (varsayılan) | |

> **Kalibrasyon Notu:** Altın referans: `gun-batimi-gunese-dokunan-eleman.jfif` ($\mu_L: 27.45, \mu_a: +18.49, \mu_b: +27.03, \sigma_L: 20.19$). Destek görsel: `gun-batimi-kosu.jfif`.

### 2.3 — Night Cinematic
*Gece, iç mekan, tek renkli ışık kaynağı (neon, pencere ışığı)*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +24 | koyu gece zemininde ışık dinamizmi ($\sigma_L = 27.05$) |
| Saturation | −8 | ışık kaynağı rengi parlak, çevre desatüre |
| Temperature | −6 (soğuk gece) | $\mu_b = -10.87$ ile gecenin serin mavi atmosferi |
| Tint | +2 (hafif magenta) | kırmızı araç izleri ve neon dengesi ($\mu_a = +7.40$) |
| Highlight tint | hafif ışıma | `[2, 2, -2]` |
| Shadow tint | belirgin soğuk mavi | `[-4, 0, 14]` derin gece hissi |
| Fade | +4 (hafif) | sinematik "milky black" hissi |
| Grain | 18 (yüksek) | düşük ışık analog film greni |
| Halation | 22 (en yüksek) | neon ve ışık kaynağı etrafında güçlü sinematik taşma |
| Vignette | 18 | |
| Light leak | kapalı | |

> **Kalibrasyon Notu:** Altın referans: `sehir-isiklari-otoyol.jfif` ($\mu_L: 19.84, \mu_b: -10.87, p10_L: 0.00$). Destek görsel: `ic-mekan-bar.jfif`. `mavi-sisli-sehir.jfif` gece neonu yerine sisli gündüz şehir manzarası olduğu için kalibrasyon dışı bırakılmış, ileride "Foggy City / Moody Urban" adayı olarak ayrıştırılmıştır.

### 2.4 — Muted Coastal
*Sakin anlar, deniz, açık alan, yumuşak geçişler*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +6 (düşük) | yumuşak, göz yormayan geçişler |
| Saturation | −15 (belirgin düşük) | pastel/muted his, aşırı solgunluk dengelendi |
| Temperature | −2 (hafif serin-doğal) | dengeli kıyı ışığı |
| Tint | +2 | doğal yeşilimsi ton dengesi |
| Highlight tint | yok | |
| Shadow tint | yok | crush YOK, gölgeler açık |
| Fade | +12 (belirgin) | yumuşak, düşük kontrastlı film matlığı |
| Grain | 6 (minimal) | pürüzsüz sakin doku |
| Halation | 0 | kapalı |
| Vignette | 5 (çok hafif) | |
| Light leak | kapalı | |

> **Kalibrasyon Notu:** Altın referans: `cim-saha.jfif` ($\mu_L: 30.78, \sigma_L: 27.13, \mu_a: -7.79, \mu_b: +19.00$).

### 2.5 — Amber Grain
*Sokak, yansıma/cam, günlük detay kareleri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +18 | tren penceresi ve gövde ayrımı ($\sigma_L = 25.34$) |
| Saturation | +12 | sıcak amber ton doygunluğu |
| Temperature | +12 (sıcak) | $\mu_b = +15.36$ sıcak akkor tren ışığı |
| Tint | +7 (kırmızı-amber yönde) | $\mu_a = +6.61$ sıcak renk kimliği |
| Highlight tint | amber, orta | `[14, 8, -6]` |
| Shadow tint | hafif kahverengi | `[8, 4, -4]` yıpranmış film hissi |
| Fade | +8 | dengeli koyu paneller |
| Grain | 24 (en yüksek) | bu ailenin imza analog greni |
| Halation | 10 | pencere kenarlarında sıcak sızma |
| Vignette | 18 | çerçeve-içinde-çerçeve odağı |
| Light leak | subtle (miktar 25) | analog sızma açık |

> **Kalibrasyon Notu:** Altın referans: `tren.jfif` ($\mu_L: 23.87, \sigma_L: 25.34, \mu_a: +6.61, \mu_b: +15.36$).

### 2.6 — Monochrome Noir
*Yüksek kontrast, kömür siyahı derin ezilmiş gölgeler, saf beyaz parıltı ve grafiksel hatlar*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +40 (maksimum) | tüm presetler içindeki en yüksek kontrast ($\sigma_L = 36.78$) |
| Saturation | −100 | saf monokrom / siyah-beyaz ($C^* = 0.00$) |
| Temperature | 0 | nötr |
| Tint | 0 | nötr |
| Highlight tint | yok | `[0, 0, 0]` |
| Shadow tint | yok | `[0, 0, 0]` saf derin siyah |
| Fade | 0 | shadow crush koruması: siyahlar zifiri kalmalı ($p10_L = 0.00$) |
| Grain | 8 (düşük/temiz) | klasik B&W greni yerine grafiksel keskin hatlar |
| Halation | 0 | kapalı |
| Vignette | 15 | köşeleri karartıp özneye/ışığa odaklayan noir hissi |
| Light leak | kapalı | |

> **Kalibrasyon Notu:** Altın referans: `tabela.jfif` ("GO SLOW" — $\mu_L: 31.13, \sigma_L: 36.78, p10_L: 0.00, p90_L: 88.82$). Destek görsel: `kovboy.jfif` (low-key silüet — $\mu_L: 11.49$). Klasik nötr B&W'den (Leica M / Ilford HP5: $\sigma_L \approx 14$, grain 26-36, fade +8) farklı olarak tam shadow crush, çok yüksek kontrast ve keskin grafiksel hatlar barındırır.

---

## 3. Arayüz Gereksinimleri — Zahmetsizlik Önceliği

Bu bölüm, "sade/minimal, tek tık, ayar yapmak istemiyorum" prensibinin somut UI karşılığıdır.

### 3.1 — Preset Seçim Ekranı Yeniden Tasarımı
- **Mevcut durum:** 10 film preset'i muhtemelen tek bir liste/grid'de, isimle sıralı.
- **Değişiklik:** 6 yeni preset (5 renkli + Monochrome Noir), **büyük görsel önizlemeli kartlar** olarak "Preset / Renk" hapının EN ÜSTÜNDE, ayrı bir bölüm başlığıyla (örn. "Senin Presetlerin") gösterilir. Mevcut 10 film preset'i bunun altında "Diğer Film Presetleri" başlığı altında kalabilir — silinmesine gerek yok, sadece öncelik sırası değişiyor.
- Her kart: preset adı + küçük renk/ton örneği (gerçek zamanlı önizleme, seçili fotoğraf üzerinde) + tek tık uygula.
- **Slider hiçbir zaman varsayılan görünümde açık olmamalı.** Preset uygulandıktan sonra "ince ayar" bir kullanıcı isterse açılan, katlanmış (collapsed) bir bölüm olmalı — zorunlu adım değil.

### 3.2 — "Otomatik Öneri" (opsiyonel ama güçlü önerilir)
Fotoğraf yüklendiğinde, kaba bir ışık/histogram analiziyle (parlaklık dağılımı, dominant renk sıcaklığı, monokrom kroma) 6 preset'ten birini **otomatik önerir** — kullanıcı hâlâ tıklamak zorunda ama "hangisini seçsem" kararını azaltır. Örnek mantık:
- Aşırı düşük renk doygunluğu / yüksek kontrastlı monokrom → Monochrome Noir öner
- Görüntü genel olarak koyu + tek parlak nokta → Night Cinematic öner
- Yüksek kontrast + düz siyah bölgeler (histogram'da shadow'da yığılma) → Warm Silhouette öner
- Gökyüzü baskın (üst 1/3'te mavi/gri) → Moody Teal öner
- Düşük genel kontrast, orta parlaklık → Muted Coastal öner
- Diğer her şey → Amber Grain (varsayılan/genel amaçlı)

Bu öneri **hiçbir zaman otomatik uygulanmaz** — sadece önerilen kart hafif vurgulanır (örn. ince kenarlık/glow). Kullanıcı yine de istediğini seçer.

### 3.3 — My Aesthetic'in Çoklanması
- Mevcut My Aesthetic (`curate-studio:aesthetic-presets:v1`) tek profil tutuyor. Bunu **adlandırılmış, çoklu profil listesine** çevir — veri modeli zaten `{effect, border, timestamp}` şeklinde olduğu için sadece bir dizi/map'e taşımak yeterli: `{ [presetName]: { effect, border, timestamp } }`.
- 6 preset ailesi, varsayılan olarak My Aesthetic listesinde hazır gelir (kullanıcı "kaydet" yapmadan). Kullanıcı bunları istediği gibi güncelleyip üzerine kaydedebilir (örn. bir süre sonra "Amber Grain"i kendi zevkine göre hafif değiştirip aynı isimle tekrar kaydetmek).

### 3.4 — Batch Sync Davranışı
Mevcut Batch Sync zaten filtre+çerçeve+damga+upscale'i kopyalıyor, kırpma hariç — bu doğru davranış, **değişmemeli**. Tek ek: preset kartından direkt "Bu preset'i tüm seriye uygula" kısayolu (mevcut akışta önce kareye tıklayıp sonra Sync yapmak yerine, dump görünümünden de erişilebilir tek adım).

### 3.5 — Gereksiz Karmaşıklığı Azaltma
Uğur'un "ayar yapmak istemiyorum" ifadesine göre, aşağıdakiler **varsayılan akıştan gizlenmeli** (silinmesin, ama ilk katmanda görünmesin):
- Reinhard renk eşleştirme referans işaretleme (⭐) — ileri düzey kullanıcı özelliği, "Gelişmiş" alt menüsüne taşınabilir
- Panorama ayırıcı, split view — bunlar niş araçlar, ana akıştan ayrı bir "Araçlar" sekmesine alınabilir
- Kırpma kılavuzları (rule of thirds vb.) sadece Kırpma hapına tıklandığında görünür kalmalı, varsayılan görünümde değil

Amaç: **Dört hap → şimdi fiilen "bir hap" (Preset) + arka planda duran diğer üçü.** Kullanıcı %90 zamanını Preset hapında geçirecek.

---

## 4. Uygulama Önceliği (Agent İçin Sıralama)

1. 6 preset'i mevcut `filters` state şemasına yaz, preset seçim UI'ında üstte, büyük kartlarla göster
2. My Aesthetic'i çoklu-profil yapısına taşı, 6 preset'i varsayılan olarak doldur
3. Preset kartlarına gerçek zamanlı küçük önizleme ekle (seçili fotoğraf üzerinde)
4. Otomatik öneri mantığını ekle (histogram tabanlı, opsiyonel/aşama 2 olarak da ertelenebilir)
5. Gelişmiş özellikleri (Reinhard referans, panorama, split view) ayrı "Araçlar" sekmesine taşı

---

*Bu spec, `curate-preset-spec.md` olarak Uğur'un Curate ajanına doğrudan referans/uygulama dökümanı olarak verilmek üzere hazırlanmıştır. Değerler başlangıç noktasıdır; gerçek kalibrasyon Uğur'un kendi referans fotoğraflarıyla test edilerek ince ayarlanabilir.*
