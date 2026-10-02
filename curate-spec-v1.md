# Curate — Geliştirme Spec'i (v1.0)

**Bu döküman neyi sağlar:** Antigravity (Gemini 3.8 Flash) ile yürütülecek çok sayıda ayrı geliştirme oturumunun hepsinin referans alacağı tek kaynak. Her yeni prompt yazılmadan önce buraya bakılır; her tamamlanan iş buradaki kabul kriterlerine göre doğrulanır. Çelişki çıkarsa bu döküman kazanır, o anki prompt değil.

**Durum:** v1.0 — 2026-10-01 itibarıyla mevcut kod tabanının (Antigravity'nin kendi analiz raporu) ve önceki tasarım kararlarının (preset spec, fotoğrafçılık karakteri) birleştirilmesiyle oluşturuldu. Yeni bir karar alındığında bu döküman güncellenir, eski versiyon olarak saklanmaz — tek doğruluk kaynağı hep bu dosyadır.

---

## 1. Problem Tanımı

Uğur, Redmi Note 12 Pro 5G + Old Roll kombinasyonuyla çektiği fotoğrafları (mimari/silüet/yansıma ağırlıklı, "ışığı kahraman yapan" bir estetik) sosyal medya için seri (dump) halinde düzenliyor. Mevcut araçlar (Lightroom mobil, genel preset uygulamaları) ya fazla teknik/yavaş ya da onun kişisel estetiğine kayıtsız jenerik filtreler sunuyor.

Curate bu ihtiyaca cevap vermek için başladı: **tek tık, kişiye özel preset'lerle, slider'a dokunmadan** bir dump'ı düzenleyip platform-hazır halde indirebileceği, tamamen tarayıcı tabanlı bir araç.

**Kritik durum tespiti (2026-10-01):** Kod tabanı geniş bir özellik yüzeyine sahip ama temel işlevlerin bir kısmı çalışmıyor — export fonksiyonları ekrandaki önizlemeyle eşleşmiyor, merkezi state yönetimi hiçbir bileşene bağlı değil. Bu spec hem "neyi inşa ediyoruz" hem "şu an neyin bozuk olduğunu" tek yerde tutar.

---

## 2. Kullanıcı ve Kullanım Şekli

- **Tek kullanıcı:** Uğur. Çok kullanıcılı/paylaşımlı bir ürün değil, kişisel araç.
- **Geliştirme şekli:** Yalnızca Antigravity (Gemini 3.8 Flash) ile, prompt tabanlı, agent'ın geniş inisiyatif aldığı bir süreçle geliştiriliyor. Uğur kod yazmıyor, agent'ın çıktısını değerlendirip yönlendiriyor.
- **Kullanım bağlamı:** Muhtemelen mobilde (telefonda), bir çekim/gezi sonrası elindeki dump'ı hızlıca işleyip paylaşıma hazırlamak için. Masaüstü kullanımı da olası ama öncelik mobil hız ve pratiklik.
- **Temel kullanıcı davranışı:** Fotoğrafları yükle → ruh haline uyan preset'e tek tık → gerekirse seriye yay (Batch Sync) → platforma uygun boyutta indir. Hiçbir adımda ince ayar/slider zorunlu değil.

---

## 3. Tasarım Felsefesi (Her Özellik Kararında Sınanacak İlkeler)

1. **Zahmetsizlik önce gelir.** Kullanıcı "profesyonelce ayar yapmak istemiyorum" demiştir — bu açık ve kalıcı bir kısıt. Yeni bir özellik, varsayılan akışa zorunlu bir karar/slider ekliyorsa yanlış tasarlanmıştır.
2. **Preset'ler jenerik değil, kişisel olmalı.** Film simülasyonu isimleri (Portra, Velvia vb.) değil, kullanıcının kendi estetiğinden türetilmiş adlandırılmış preset'ler (Moody Teal, Warm Silhouette, vb. — bkz. Bölüm 5) öncelikli sunulur.
3. **Önizleme = Export.** Kullanıcının ekranda gördüğü, indirdiği dosyayla birebir aynı olmalı. Bu ilke ihlal edildiğinde (şu an olduğu gibi) bu P0 bug sayılır, her şeyin önüne geçer.
4. **Gelişmiş özellikler arka planda durur.** Reinhard referans seçimi, panorama ayırıcı, split view gibi niş araçlar ana akışı kalabalıklaştırmaz; "Araçlar" gibi ikincil bir katmanda yaşar.
5. **İstemci taraflı, sunucusuz kalır.** Hiçbir görsel sunucuya yüklenmez; bu bir pazarlama sözü değil, mimari karar — her yeni özellik bu sınırın içinde tasarlanır.

---

## 4. Mevcut Mimari (2026-10-01 İtibarıyla Gerçek Durum)

```
curate/
├── app/                      # Next.js 14 App Router, Hub (bento 4 modül seçimi)
├── components/studio/        # CarouselStudio, StoryStudio, FrameStudio, UpscaleStudio, QuickExportSheet
├── lib/
│   ├── core/                 # types, state-machine (headless store), use-studio hook, worker-bridge
│   ├── engine/                # presets (6 ton profili + .CUBE LUT), proxy, harmonize, adaptive-gradient, upscale-lanczos
│   ├── export/                 # platform-specs, exif-sanitizer, zip-packager
│   └── workers/                # image-processor.worker.ts
└── design/                    # CDS v1.0 (OLED siyah, glassmorphism, Apple/Raycast dili)
```

**Yığın:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, jszip, lucide-react. Canvas 2D tabanlı render — WebGL yok.

**Tasarım dili:** CDS v1.0 — OLED siyah zemin, `backdrop-blur` camsı paneller, ince `border-white/10` konturlar, Apple HIG uyumlu tipografi (SF Pro/Inter), daktilo fontları arayüzden arındırılmış.

### 4.1 — Bilinen Kritik Hatalar (P0 Durumu)

- **Hata 1 (CarouselStudio export'u preset/LUT/harmonize filtrelerini uygulamıyor):** [KAPATILDI - 2026-10-01, commit `f73fa6b`] `components/studio/CarouselStudio.tsx` içerisindeki `getExportBlob` fonksiyonu optimize edilerek; harmonize (%20), .CUBE LUT ve aktif preset filtreleri export tuvalindeki fotoğraf alanına birebir yansıtılmıştır.
- **Hata 2 (StoryStudio export'u grid fotoğraflarını hiç çizmiyor):** [KAPATILDI - 2026-10-01, commit `f73fa6b`] `components/studio/StoryStudio.tsx` export motoru 2–6'lı grid hücrelerinin tamamını `drawRoundedRect` kırpması ile tuvale basmaktadır; 5'li grid düzeninde 3. satır tam genişlik geometrisi önizleme ile 100% eşitlenmiştir.
- **Hata 3 (FrameStudio export'u fotoğrafı ve tarih damgasını çizmiyor):** [KAPATILDI - 2026-10-01, commit `f73fa6b`] `FrameStudio.tsx` içerisindeki `getExportBlob` fonksiyonu fotoğrafı, polaroid/mat/gradyan çerçeveyi ve seçiliyse analog turuncu tarih damgasını 1080×1350 tuval üzerine başarıyla çizmektedir.
- **Hata 4 (Merkezi state-machine hiçbir bileşene bağlı değil):** [KAPATILDI - 2026-10-01, commit `f73fa6b`] `lib/core/use-studio.ts` köprüsü üzerinden `useSyncExternalStore` ile tüm 4 stüdyo modülü (`CarouselStudio`, `StoryStudio`, `FrameStudio`, `UpscaleStudio`) merkezi reaktif store'a bağlanmıştır.

### Conflicts Needing Owner Decisions (Sahip Kararı Gerektiren Çelişkiler)

Aşağıdaki çelişkiler açıkta olup agent'lar tarafından karara bağlanamaz:
1. **Panorama Çelişkisi:** Bu spec Faz 4'te panoramayı ikincil katmana taşımayı planlarken, `AGENTS.md` panorama bölücüyü kesinlikle kapsam dışı bırakmış ve koda yeniden eklenmesini yasaklamıştır.
2. **Night Cinematic / Halation Çelişkisi:** Spec Bölüm 5.1'deki "Night Cinematic" preset ailesi güçlü halation gerektirirken, `AGENTS.md` anayasası halation efektini açıkça yasaklamıştır.
3. **Hedef Kitle Çelişkisi:** Bu spec (Bölüm 2) aracı yalnızca Uğur için tek kullanıcılık kişisel bir stüdyo olarak tanımlarken, `AGENTS.md` "amatör fotoğrafçılar", `README.md` ise "amatör ve profesyonel fotoğrafçılar" ifadesini kullanmaktadır.
4. **Eksik Kaynak Dokümanlar:** Bu spec'in referans verdiği `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md` ve `curate-camera-app.md` dosyaları git reposunda mevcut değildir.


### 4.2 — Bilinen Mimari Eksikler (P1 — işlevsel ama performans/ölçeklenebilirlik riski)

| # | Eksik | Etki |
|---|---|---|
| 5 | Web Worker köprüsü (`worker-bridge.ts`) hiç çağrılmıyor | Ağır işlemler (Lanczos, LUT) main thread'de — mobilde donma riski |
| 6 | UpscaleStudio canlı önizlemesi CSS illüzyonu, gerçek Lanczos değil | Önizleme ile export farklı sonuç verebilir |
| 7 | Proxy motoru (`proxy.ts`) kullanılmıyor, tüm görsel base64 DataURL olarak belleğe alınıyor | Çoklu yüksek çözünürlüklü görsellerde mobil tarayıcı bellek şişmesi |
| 8 | QuickExportSheet'te PNG seçimi etkisiz, her zaman JPEG çıkıyor | Kullanıcıya yanlış seçenek sunuluyor |

**Kural:** P0 hataları kapanmadan P1'e geçilmez. P1 kapanmadan yeni özellik (preset genişletme, UI değişikliği vb.) eklenmez — mevcut temel sağlamlaşmadan üzerine inşa etmek, önceki preset kalibrasyon çalışmasında da görüldüğü gibi (koda hiç yansımadı), emeği boşa harcar.

---

## 5. Preset Sistemi — Hedef Tasarım

*(Önceki oturumlarda detaylandırılan spec'in özeti; tam sayısal değerler ve kalibrasyon metodolojisi `curate-preset-spec.md` ve `referans-gorsel-yonergesi.md` dosyalarında.)*

### 5.1 — Altı Preset Ailesi (Hedef)

| Preset | Karakter | Ne zaman önerilir |
|---|---|---|
| Moody Teal | Yüksek kontrast, doygun teal gökyüzü, mimari sıcaklık-soğukluk dengesi | Mimari, gökyüzü baskın kareler |
| Warm Silhouette | Shadow crush, sıcak turuncu-kırmızı, keskin siluet ayrımı | Ters ışık, insan/hayvan silüeti |
| Night Cinematic | Düşük anahtar, tek renkli ışık kaynağı vurgusu, güçlü halation | Gece, iç mekan, neon |
| Muted Coastal | Düşük kontrast, pastel, yumuşak geçiş, crush YOK | Sakin/açık alan, deniz |
| Amber Grain | Sıcak amber, yüksek gren, hafif yıpranmış doku | Sokak, günlük detay, yansıma |
| Monochrome Noir | Yüksek kontrast B&W, derin/crush shadow, minimal grain | Güçlü siluet/gölge B&W kareler |

**Kalibrasyon yöntemi:** Her preset, kullanıcının gerçek referans görsellerinden (Pinterest değil, kendi seçtiği/çektiği kareler) Reinhard CIELAB renk eşleştirme motoruyla türetilir — sabit/tahmini sayılar değil, gerçek görsellerden çıkarılmış Lab istatistikleri kullanılır. Detaylı metodoloji: `referans-gorsel-yonergesi.md`.

**Önemli not:** Mevcut kodda (`lib/engine/presets.ts`) şu an **6 farklı isimli ton profili** var (Clean Contrast, Warm Neutral, Muted Editorial, Golden Hour, 35mm Subtle, B&W Minimal) — bunlar bu spec'teki 6 preset ailesiyle **isim ve değer olarak örtüşmüyor**. Bu iki seti birleştirmek/değiştirmek ayrı, açık bir karar gerektirir (bkz. Açık Sorular, madde 1).

### 5.2 — Arayüz Gereksinimi
- Preset kartları büyük, görsel önizlemeli, "Preset/Renk" hapının en üstünde.
- Slider'lar varsayılan görünümde kapalı; sadece kullanıcı "ince ayar" isterse açılır.
- My Aesthetic çoklu, adlandırılmış profil olarak çalışır (tek profil değil).
- Otomatik öneri (histogram tabanlı preset önerisi) — P1/nice-to-have, zorunlu değil.

---

## 6. Fotoğrafçılık Karakteri — Preset/Özellik Kararlarını Yönlendiren Bağlam

*(Tam döküman: proje dosyası `fotografcilik_karakterim.md`.)*

- **Güçlü yönler:** Silüet/ters ışık ustalığı, çerçeve-içinde-çerçeve/yansıma kompozisyonu, altın saat renk yönetimi, negatif EV ile gökyüzü koruma, mimari diyagonal kompozisyon.
- **Zayıf yönler (çekim tarafında, Curate'in çözemeyeceği ama bilmesi gereken):** Hareket bulanıklığı kontrolsüzlüğü, ışık koşulu/EV uyumsuzluğu, gölge kırpılması, kamera-sahne uyumsuzluğu, kompozisyon tekrarı.
- **Curate'e yansıması:** Preset sistemi bu karakteri *destekleyecek* şekilde kurulmalı (örn. Warm Silhouette preset'i, zaten var olan shadow-crush eğilimini kontrollü/kasıtlı bir estetik aracına çevirir). Curate, çekim hatalarını (motion blur, EV hatası) düzeltmeye çalışan bir araç değildir — bu, kamera/çekim disiplini alanı, ayrı bir konu (bkz. `curate-camera-app.md`, ayrı Android kamera uygulaması planı).

---

## 7. Kapsam Dışı (Non-Goals)

Bunlar bilinçli olarak dışarıda bırakılıyor — "madem elimizdeyiz" diye eklenmemeli:

1. **Çok kullanıcılı/paylaşımlı özellikler** (hesap sistemi, bulut senkronu, paylaşılan preset kütüphanesi). Tek kullanıcılık araç.
2. **Sunucu taraflı işleme.** Mimari karar, performans optimizasyonu bile olsa sunucuya görsel yükleme eklenmez.
3. **AI destekli inpainting/outpainting.** Tanıtım dökümanında "Faz 2" olarak planlanmış ama bu spec'in kapsamında değil — P0/P1 sağlamlaşmadan konuşulmaz.
4. **Gelişmiş manuel renk ayarı arayüzü** (curve editör, kanal bazlı ayrı kontroller). Felsefeyle (Bölüm 3, madde 1) doğrudan çelişir.
5. **Kamera/çekim asistanı özellikleri** (EV önerisi, shutter speed uyarısı vb.) — bu Curate'in değil, ayrı kamera uygulamasının işi.

---

## 8. Öncelik Sırası (Fazlar)

| Faz | İçerik | Kabul Kriteri |
|---|---|---|
| **Faz 1 — Temel Onarım (P0)** | 4 kritik export/state bug'ı çözülür | Üç modülden de export alınır, ekrandaki önizlemeyle piksel düzeyinde tutarlı sonuç çıkar; Hub'dan yüklenen foto ilgili modülde görünür |
| **Faz 2 — Mimari Sağlamlaştırma (P1)** | Worker entegrasyonu, proxy aktivasyonu, gerçek Lanczos önizleme, PNG export düzeltmesi | Yüksek çözünürlüklü 10+ görsellik seri, mobilde donma olmadan işlenir; PNG seçimi gerçek PNG üretir |
| **Faz 3 — Preset Sistemi Birleştirme** | Mevcut 6 ton profili ile hedef 6 preset ailesi arasında karar + kalibrasyon + uygulama | Preset kartları üstte, büyük önizlemeli; her preset gerçek referans görselden türetilmiş değerlere sahip |
| **Faz 4 — UI Sadeleştirme** | Gelişmiş özelliklerin (Reinhard referans, panorama, split view) ikincil katmana taşınması | Ana akışta sadece Preset hapı öne çıkıyor, diğerleri "Araçlar" altında |
| **Faz 5+ — Nice-to-have** | Otomatik preset önerisi, 9:16 dump kolajı iyileştirmeleri, vb. | Ayrı değerlendirilir, bu fazlar tamamlanmadan başlanmaz |

**Kural:** Bir faz, önceki fazın kabul kriteri karşılanmadan başlamaz. Bu, "agent'a geniş inisiyatif ver ama küçük/sıralı görevler halinde" prensibinin somutlaşmış hali.

---

## 9. Prompting Yaklaşımı (Bu Spec'in Nasıl Kullanılacağı)

Gemini 3.8 Flash için doğrulanmış prensip: **kısa, net, hedef odaklı talimat** — aşırı detaylı/adım adım talimat modelin performansını düşürebiliyor (resmi Google dokümantasyonu: "may over-analyze verbose or overly complex prompt engineering techniques").

Buna göre her faz için prompt şöyle yazılır:
1. **Bu spec'e veya ilgili bölümüne referans ver**, tüm detayı prompt içine kopyalama.
2. **Ne istediğini ve kabul kriterini net söyle**, nasıl yapılacağını agent'a bırak.
3. **Kod değişikliğinden önce özet + onay iste** — özellikle state machine gibi geniş etkili değişikliklerde.
4. **tsc + build doğrulamasını her seferinde iste.**
5. Tek seferde tek faz. Faz 1 bitmeden Faz 3'ü prompt'a karıştırma.

---

## 10. Açık Sorular

1. **(Engineering/Uğur)** Mevcut kod tabanındaki 6 ton profili (Clean Contrast vb.) ile hedef 6 preset ailesi (Moody Teal vb.) nasıl birleştirilecek — biri diğerinin yerini mi alacak, yoksa ikisi de mi kalacak (12 preset)? Faz 3 başlamadan karara bağlanmalı.
2. **(Uğur)** Mobil kullanım önceliği ne kadar kesin? Faz 2'deki worker/proxy çalışmasının kapsamını (ne kadar agresif optimize edileceğini) belirler.
3. **(Uğur)** `.CUBE` 3D LUT yükleme özelliği (mevcut kodda var) spec'in felsefesiyle (Bölüm 3, "zahmetsizlik") çelişiyor mu, yoksa "gelişmiş kullanıcı" katmanına mı taşınacak?

---

*Bu döküman `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md` ve Antigravity'nin 2026-10-01 tarihli mevcut durum raporuyla birlikte okunmalıdır. Büyük bir karar/faz değişikliğinde bu dosya güncellenir; sürüm geçmişi ayrıca tutulmaz, güncel hal tek referanstır.*
