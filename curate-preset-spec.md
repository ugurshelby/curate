# Curate — Kişisel Estetik Preset Sistemi: Spec

**Amaç:** Curate'i jenerik bir film-preset editöründen, Uğur'un kendi fotoğrafçılık karakterine kalibre edilmiş, tek tıkla çalışan bir kürasyon aracına dönüştürmek. Slider ile uğraşma yok — preset seç, uygula, indir.

**Hedef kullanıcı davranışı:** Fotoğrafı yükle → hangi ruh haline yakınsa o preset kartına bas → (opsiyonel) Batch Sync → indir. Hiçbir adımda ince ayar gerekmemeli.

---

## 1. Arka Plan — Neden Bu Değişiklik

Mevcut Curate 10 jenerik film preset'i sunuyor (Portra, CineStill, Velvia vb.) — bunlar sağlam ama kimsenin kişisel imzası değil. Uğur'un çekim karakteri ve referans panoları (Pinterest) incelendiğinde 5 net, tekrar eden estetik aile ortaya çıktı. Bu spec bu 5 aileyi kalıcı, adlandırılmış preset'lere çeviriyor.

**Kullanıcı karakteri (kısa özet):**
- Güçlü yön: silüet/ters ışık, çerçeve-içinde-çerçeve/yansıma, altın saat renk yönetimi, negatif EV ile gökyüzü koruma
- Zayıf yön: EV/ışık koşulu uyumsuzluğu, gölge kırpılması, formül tekrarı
- İstek: teknik ayar değil, **zahmetsiz, hızlı, tek tıkla doğru sonuç**

---

## 2. Beş Preset Ailesi — Tam Spec

Her preset, Curate'in mevcut `filters` state modeline (`contrast, saturation, temperature, tint, fade, highlightTint, shadowTint`) + analog katmanına (`grain, halation, vignette, lightLeak`) karşılık gelen somut değerler olarak tanımlanır. Değerler mevcut slider aralıklarına (0–100 veya ilgili preset'in kendi aralığı) göre verilmiştir; agent kodda karşılık gelen state'e bu sayıları yazmalı.

### 2.1 — Moody Teal
*Mimari, gökyüzü olan kareler, Viyana/Budapeşte tarzı seri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +25 | dramatik gökyüzü/bina ayrımı |
| Saturation | +15 | özellikle mavi kanalda |
| Temperature | −8 (soğuk yönde) | gökyüzünü teal'e çeker |
| Tint | +4 (yeşil-cyan yönde) | klasik "moody" teal-orange dengesinin teal yarısı |
| Highlight tint | cyan/teal, hafif | gökyüzü highlight'ları |
| Shadow tint | nötr-hafif mavi | bina gölgelerinde soğukluk |
| Fade | 0 | kontrast korunmalı, fade bunu yumuşatır |
| Grain | 8 (düşük) | mimari netlik öncelikli |
| Halation | 5 (düşük) | |
| Vignette | 10 (hafif) | |
| Light leak | kapalı | |

### 2.2 — Warm Silhouette
*Ters ışık, insan/hayvan silüeti, gün batımı figürleri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +35 (yüksek) | shadow crush için gerekli |
| Saturation | +20 | turuncu/kırmızı arka planı güçlendirir |
| Temperature | +15 (sıcak yönde) | |
| Tint | +5 (kırmızı-magenta yönde) | |
| Highlight tint | sıcak turuncu, orta-güçlü | gün batımı bölgesi |
| Shadow tint | nötr, ama shadow'lar mümkün olduğunca siyaha çökmeli | crushed shadow burada istenen efekt |
| Fade | 0 | fade shadow crush'ı bozar, kaçınılmalı |
| Grain | 12 | hafif film hissi |
| Halation | 15 (orta-yüksek) | güneş/parlak kaynak etrafında sıcak taşma |
| Vignette | 15 | siluet'e odak kazandırır |
| Light leak | kapalı (varsayılan) — istenirse "warm-side" opsiyonel | |

### 2.3 — Night Cinematic
*Gece, iç mekan, tek renkli ışık kaynağı (neon, pencere ışığı)*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +20 | |
| Saturation | −10 (genel), ama ışık kaynağı rengi korunur | selektif değil, genel düşük doygunluk + güçlü tek renk noktası doğal olarak öne çıkar |
| Temperature | sahneye göre değişken — varsayılan nötr | bu preset'in tek istisnası: ışık kaynağı zaten renkli olduğu için WB'yi aşırı çekmemek gerekir |
| Tint | 0 | |
| Highlight tint | yok / minimal | ışık kaynağının kendi rengi zaten baskın |
| Shadow tint | hafif mavi-mor (soğuk) | gece hissini pekiştirir |
| Fade | +5 (çok hafif) | tam siyahı biraz açar, sinematik "milky black" hissi |
| Grain | 20 (yüksek) | düşük ışık filmine benzer, kasıtlı |
| Halation | 20 (yüksek) | ışık kaynağı etrafında güçlü taşma — bu preset'in imzası |
| Vignette | 20 | |
| Light leak | kapalı | |

### 2.4 — Muted Coastal
*Sakin anlar, deniz, açık alan, yumuşak geçişler*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +5 (çok hafif) | diğer 4 preset'in aksine düşük kontrast |
| Saturation | −20 (belirgin düşük) | pastel/muted his |
| Temperature | −3 (hafif soğuk-nötr) | |
| Tint | 0 | |
| Highlight tint | yok | |
| Shadow tint | yok, shadow'lar açık tutulur | crush YOK — bu preset'in diğerlerinden ayrıldığı nokta |
| Fade | +15 (belirgin) | yumuşak, düşük kontrastlı film hissi |
| Grain | 5 (minimal) | |
| Halation | 0 | |
| Vignette | 5 (çok hafif) | |
| Light leak | kapalı | |

### 2.5 — Amber Grain
*Sokak, yansıma/cam, günlük detay kareleri*

| Parametre | Değer | Not |
|---|---|---|
| Contrast | +15 | |
| Saturation | +10 | |
| Temperature | +10 (sıcak) | |
| Tint | +8 (kırmızı-amber yönde) | belirgin sıcak renk kimliği |
| Highlight tint | amber, orta | |
| Shadow tint | hafif kahverengi | "yıpranmış" film hissi |
| Fade | +10 | |
| Grain | 25 (en yüksek preset) | bu ailenin imza özelliği |
| Halation | 8 | |
| Vignette | 20 (belirgin) | |
| Light leak | "subtle" — açık, düşük yoğunluk | opsiyonel ama önerilir |

> **Not (uygulama aşaması için):** Yukarıdaki sayılar başlangıç noktasıdır. Agent, Uğur'un gerçek referans karelerinden (Viyana mimari serisi → Moody Teal; kedi/silüet kareleri → Warm Silhouette; vb.) Reinhard renk eşleştirme motorunu kullanarak bu değerleri kalibre edebilir — yani bu preset'ler ileride "referans kareden türetilmiş" hale getirilip ince ayarlanabilir. Ama ilk sürüm için yukarıdaki sabit değerler yeterli ve doğrudan koda geçirilebilir.

---

## 3. Arayüz Gereksinimleri — Zahmetsizlik Önceliği

Bu bölüm, "sade/minimal, tek tık, ayar yapmak istemiyorum" prensibinin somut UI karşılığıdır.

### 3.1 — Preset Seçim Ekranı Yeniden Tasarımı
- **Mevcut durum:** 10 film preset'i muhtemelen tek bir liste/grid'de, isimle sıralı.
- **Değişiklik:** 5 yeni preset, **büyük görsel önizlemeli kartlar** olarak "Preset / Renk" hapının EN ÜSTÜNDE, ayrı bir bölüm başlığıyla (örn. "Senin Presetlerin") gösterilir. Mevcut 10 film preset'i bunun altında "Diğer Film Presetleri" başlığı altında kalabilir — silinmesine gerek yok, sadece öncelik sırası değişiyor.
- Her kart: preset adı + küçük renk/ton örneği (gerçek zamanlı önizleme, seçili fotoğraf üzerinde) + tek tık uygula.
- **Slider hiçbir zaman varsayılan görünümde açık olmamalı.** Preset uygulandıktan sonra "ince ayar" bir kullanıcı isterse açılan, katlanmış (collapsed) bir bölüm olmalı — zorunlu adım değil.

### 3.2 — "Otomatik Öneri" (opsiyonel ama güçlü önerilir)
Fotoğraf yüklendiğinde, kaba bir ışık/histogram analiziyle (parlaklık dağılımı, dominant renk sıcaklığı) 5 preset'ten birini **otomatik önerir** — kullanıcı hâlâ tıklamak zorunda ama "hangisini seçsem" kararını azaltır. Örnek mantık:
- Görüntü genel olarak koyu + tek parlak nokta → Night Cinematic öner
- Yüksek kontrast + düz siyah bölgeler (histogram'da shadow'da yığılma) → Warm Silhouette öner
- Gökyüzü baskın (üst 1/3'te mavi/gri) → Moody Teal öner
- Düşük genel kontrast, orta parlaklık → Muted Coastal öner
- Diğer her şey → Amber Grain (varsayılan/genel amaçlı)

Bu öneri **hiçbir zaman otomatik uygulanmaz** — sadece önerilen kart hafif vurgulanır (örn. ince kenarlık/glow). Kullanıcı yine de istediğini seçer.

### 3.3 — My Aesthetic'in Çoklanması
- Mevcut My Aesthetic (`curate-studio:aesthetic-presets:v1`) tek profil tutuyor. Bunu **adlandırılmış, çoklu profil listesine** çevir — veri modeli zaten `{effect, border, timestamp}` şeklinde olduğu için sadece bir dizi/map'e taşımak yeterli: `{ [presetName]: { effect, border, timestamp } }`.
- 5 preset ailesi, varsayılan olarak My Aesthetic listesinde hazır gelir (kullanıcı "kaydet" yapmadan). Kullanıcı bunları istediği gibi güncelleyip üzerine kaydedebilir (örn. bir süre sonra "Amber Grain"i kendi zevkine göre hafif değiştirip aynı isimle tekrar kaydetmek).

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

1. 5 preset'i mevcut `filters` state şemasına yaz, preset seçim UI'ında üstte, büyük kartlarla göster
2. My Aesthetic'i çoklu-profil yapısına taşı, 5 preset'i varsayılan olarak doldur
3. Preset kartlarına gerçek zamanlı küçük önizleme ekle (seçili fotoğraf üzerinde)
4. Otomatik öneri mantığını ekle (histogram tabanlı, opsiyonel/aşama 2 olarak da ertelenebilir)
5. Gelişmiş özellikleri (Reinhard referans, panorama, split view) ayrı "Araçlar" sekmesine taşı

---

*Bu spec, `curate-preset-spec.md` olarak Uğur'un Curate ajanına doğrudan referans/uygulama dökümanı olarak verilmek üzere hazırlanmıştır. Değerler başlangıç noktasıdır; gerçek kalibrasyon Uğur'un kendi referans fotoğraflarıyla test edilerek ince ayarlanabilir.*
