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
- **Kullanım bağlamı:** Birincil kullanım **mobil** (sahip kararı, 2026-10-02); referans viewport 390×844. Bir çekim/gezi sonrası elindeki dump'ı telefonda hızlıca işleyip paylaşıma hazırlamak için. Masaüstü ikincildir. Hedef kitle: yalnızca Uğur (kişisel araç); `README.md` ve `AGENTS.md` bu tanıma hizalandı.
- **Temel kullanıcı davranışı:** Fotoğrafları yükle → ruh haline uyan preset'e tek tık → gerekirse seriye yay (Batch Sync) → platforma uygun boyutta indir. Hiçbir adımda ince ayar/slider zorunlu değil.

---

## 3. Tasarım Felsefesi (Her Özellik Kararında Sınanacak İlkeler)

1. **Zahmetsizlik önce gelir.** Kullanıcı "profesyonelce ayar yapmak istemiyorum" demiştir — bu açık ve kalıcı bir kısıt. Yeni bir özellik, varsayılan akışa zorunlu bir karar/slider ekliyorsa yanlış tasarlanmıştır.
2. **Preset'ler jenerik değil, kişisel olmalı.** Film simülasyonu isimleri (Portra, Velvia vb.) değil, kullanıcının kendi estetiğinden türetilmiş adlandırılmış preset'ler (Moody Teal, Warm Silhouette, vb. — bkz. Bölüm 5) öncelikli sunulur.
3. **Önizleme = Export.** Kullanıcının ekranda gördüğü, indirdiği dosyayla birebir aynı olmalı. Bu ilke ihlal edildiğinde (şu an olduğu gibi) bu P0 bug sayılır, her şeyin önüne geçer.
4. **Gelişmiş özellikler arka planda durur.** Reinhard referans seçimi, split view gibi niş araçlar ana akışı kalabalıklaştırmaz; "Araçlar" gibi ikincil bir katmanda yaşar.
5. **İstemci taraflı, sunucusuz kalır.** Hiçbir görsel sunucuya yüklenmez; bu bir pazarlama sözü değil, mimari karar — her yeni özellik bu sınırın içinde tasarlanır. **Tek bilinçli istisna (sahip kararı 2026-10-03, Faz AI1):** yalnız Düzenle'deki "AI ile onar", yalnız kullanıcı dokunuşuyla, tek fotoğraf, kendi proxy'miz (`/api/ai`) üzerinden Google Vertex'e gider. Fotoğraf sunucuda saklanmaz, loglanmaz (§4.5 E12).

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
1. ~~Panorama Çelişkisi~~ **KAPANDI (2026-10-02, sahip kararı):** Panorama kalıcı olarak kapsam dışı (`AGENTS.md` §3). Spec'teki tüm panorama ifadeleri çıkarıldı; kodda kalıntı yok (`grep -i panora` app/components/lib/tests: 0 eşleşme).
2. ~~Night Cinematic / Halation Çelişkisi~~ **KAPANDI:** Sahip kararıyla optik halation (Night Cinematic) ve 35mm gren (Amber Grain) serbest; ışık sızıntısı ve vinyet yasak kalır (`AGENTS.md` §3).
3. ~~Hedef Kitle Çelişkisi~~ **KAPANDI (2026-10-02, sahip kararı):** Tek kişilik, kişisel araç; birincil kullanım mobil.
4. ~~Eksik Kaynak Dokümanlar~~ **KAPANDI (sahip kararı 2026-10-08, D30):** `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md` ve `curate-camera-app.md` repoda yok ve eskimiş kabul edildi; kullanılmıyor. Yerlerini ölçülmüş kalibrasyon ve kaynaklı bilgi tabanı alır: `docs/PHOTO-KNOWLEDGE.md`.


### 4.2 — Bilinen Mimari Eksikler (P1 — işlevsel ama performans/ölçeklenebilirlik riski)

| # | Eksik | Etki |
|---|---|---|
| 5 | **[Faz M2 tamam: seçenek A, worker yok]** Carousel önizlemesi artık tam çözünürlükte değil (bkz. #11); ana thread'de kalıyor. Worker hâlâ yalnız Upscale export'unda kullanılıyor (`workerBridge.upscaleLanczos`). Preset/harmonize/metrik/gradyan köprü metotları hiçbir yerden çağrılmıyor; Carousel önizleme ve export ana thread'de | Carousel preset değişiminde ana thread kilidi: 12MP fotoğrafta preset başına 500–728ms uzun görev (masaüstü tarayıcı, 2026-10-02 ölçümü) |
| 6 | UpscaleStudio önizlemesi CSS filtresi (etiket artık Lanczos demiyor); export gerçek Lanczos-3 | Önizleme ile export farklıdır; etiket dürüst, kusur bilinen sınırdır |
| 7 | **[Faz M2]** Önizleme orijinali bir kez çözüp 1080×1350 kırpılmış tabanı önbellekliyor (proxy pariteyi bozacağı için kullanılmadı). Proxy (≤1080 px) üretiliyor ama yalnız filmstrip küçük resimlerinde kullanılıyor; önizleme ve export tam çözünürlüklü `originalUrl` yüklüyor | Önizleme 4000×3000 tuvalde işleniyor; bellek ve CPU maliyeti |
| 8 | ~~PNG seçimi etkisiz~~ **KAPANDI** (`f73fa6b`): PNG gerçek PNG üretir | — |

### 4.3 — Açık Hatalar (2026-10-02 ölçümü; faz bağlantısı §4.4)

| # | Hata | Kanıt |
|---|---|---|
| 9 | ~~**[Faz M1]** Mobil düzenleme paneli görseli kapatıyor~~ **KAPANDI (M1, 2026-10-03):** 360×740, 390×844, 430×932'de örtüşme 0 (`docs/reports/2026-10-03-phases.md`). Eski ölçüm: 390×844'te panel açık + preset seçili: sahne y=107–501, panel y=186–730; görselin ≈%80'i panelin altında. Panel preset yokken bile görselin ≈%53'ünü örter | `docs/reports/2026-10-02-audit.md` §1 |
| 10 | ~~**[Faz M1]** Mobil header tek satıra sığmıyor~~ **KAPANDI (M1, 2026-10-03):** header 52px tek satır. Eski ölçüm: (95px, 4 satıra kırılan başlık, Export düğmesi sağ kenarı 444px'e taşıyor, ekran 390) | aynı rapor |
| 11 | ~~**[Faz M2]**~~ **KAPANDI (M2, 2026-10-03):** önizleme 1080×1350 (sürüklerken 540×675), export ile aynı fonksiyon ve parametre şeması; parite testi 0 bayt fark; preset değişimi 500–728 ms → 54–68 ms (masaüstü). Eski bulgu: Canlı önizleme tam çözünürlükte işleniyor; önizleme ve export aynı fonksiyonu **farklı parametrelerle** çağırıyor (önizleme `fitMode:"fill"` sabit ve tam boyutlu tuval; export 1080×1350). Gren/halation çözünürlüğe bağlı olduğundan eşitlik garanti değil | aynı rapor |

### 4.4 — Sahip Kararları (2026-10-02) ve Faz Bağlantısı

Faz sırası: **K** (bu kararların dokümana işlenmesi, ölü kod temizliği) → **M1** (mobil iskelet) → **M2** (render hattı, seçenek A) → **S** (Story ve Export). Bir faz, öncekinin kabul kriteri karşılanmadan başlamaz (§8 kuralı).

| # | Karar | Faz | Durum |
|---|---|---|---|
| K1 | **TikTok ayrı export.** Carousel'deki Instagram/TikTok geçişi hem önizlemeyi hem export'u belirler. Instagram: 1080×1350 (4:5). TikTok: 1080×1920 (9:16) **[VARSAYIM — doğrulanmadı; sahip telefonda deneyip onaylayacak]**. Fit/Fill, preset, harmonize ve parite kuralları iki modda aynı. TikTok önizlemesi 9:16 sahnede çizilir; TikTok arayüz güvenli alanı (sağ buton sütunu, alt açıklama) önizlemede gösterilir, export'a yazılmaz. `lib/export/platform-specs.ts` iki hedefi veri olarak tutar. Dosya adı: `dump_01.jpg` (Instagram), `tiktok_01.jpg` (TikTok). | S | **Uygulandı (S, 2026-10-03)**: `PLATFORM_SPECS.tiktok_9_16` (`verified: false`), Carousel 9:16 sahne + export, `tiktok_N.zip`; parite testi 1080×1920 |
| K2 | **Story: en az 2, en fazla 6 fotoğraf.** Grid sayısı fotoğraf sayısına eşit ve otomatik; kullanıcı seçmez (grid seçici kalkar). 2'den az fotoğrafta Export pasif + kısa ipucu: "En az 2 fotoğraf ekle". 6 doluyken ekleme yolu kapanır, fazlası alınmaz, kısa uyarı verilir. Tek fotoğraflık Story bu modülün işi değildir; tek kare için Çerçeve (ve planlanan Düzenle modülü, bkz. §10 soru 4). | S | **Uygulandı (S)**: grid seçici kaldırıldı, `lib/engine/story-layout.ts`, testli |
| K3 | **Referans görseller kalır, test yükleme eklenir.** `public/reference-images/` altındaki 13 görsel repoda kalır. Ana sayfada ikincil görünümde "Referans Görsel Yükle": küçük önizleme ızgarası, çoklu seçim, "Hepsi" kısayolu; seçilenler kütüphaneye eklenir. Modül içinde de alt çubuktaki "+" menüsünde aynı eylem; modül sınırlarına uyar (Story 2–6, Çerçeve ve Upscale tek görsel). Yükleme aynı kökten `fetch` → `Blob` (`.jfif` için tür açıkça `image/jpeg`) → `createObjectURL`; görseller hiçbir yere gönderilmez. Kütüphane boş başlar; referanslar yalnız kullanıcı isteyince girer. | M1 | **Uygulandı (M1)**: `lib/core/reference-images.ts`, `ReferencePicker.tsx`, testli |
| K4 | **Panorama kalıcı olarak kapatıldı.** | K | Uygulandı (bu commit) |
| K5 | Durum renkleri amber/nötr (yeşil "Hero aktif" ve TikTok kırmızısı kalkar). Frame export 1080×1350 kalır. | M1 (renk), — (Frame: değişiklik yok) | **Uygulandı (M1)**; amber Faz C ile iOS mavisine geçti (K6). Frame boyutu 2026-10-08 sahip kararıyla genişledi (D29): 10 standart oran, standart (kısa kenar 1080) ya da 4K (kısa kenar 2160); varsayılan 1080×1350. Veri: `FRAME_SIZES` |
| K6 | **Renk sistemi (sahip kararı 2026-10-03, Faz C):** amber (`#f5a623`) kalkar; zemin `#000000`, yüzeyler `#1C1C1E`/`#2C2C2E`, ayırıcı `#38383A`, yazı `#FFFFFF`/`#AEAEB2`/`#8E8E93`, vurgu `#0A84FF`, hata `#FF453A`, başarı `#30D158`. Vurgu yalnız seçili öğe, kaydırıcı dolgusu, ana eylem, odak halkası. Fotoğraf üstü her katman renksiz. Yeşil yalnız başarı, kırmızı yalnız hata/silme. Tek kaynak `app/globals.css`. Dolgu zemini `#0071E3` (beyaz yazı 4,7:1; `#0A84FF` ile 3,65:1), sahip onayı 2026-10-03. | C | **Uygulandı (C)** |
| M1-a | Mobil panel yeniden tasarımı onaylandı: preset'ler yatay kaydırmalı tek satır; `.cube` LUT ve Hero Harmonize "Araçlar" altında kapalı bölümde. | M1 | **Uygulandı (M1)**; `.cube` LUT 2026-10-08'de sahip kararıyla kaldırıldı (D31); "Araçlar"da yalnız seri renk uyumu kaldı |
| M2-a | Önizleme render hattı: denetim raporu §2 seçenek **A** (CPU, doğru çözünürlük, export ile aynı fonksiyon ve parametre şeması). WebGL ve worker bu fazda yok. | M2 | **Uygulandı (M2)**; telefon ölçümü sonrası C değerlendirilecek (`docs/reports/2026-10-03-phases.md`) |
| S-a | Story'de Instagram/TikTok geçişi kalkar; fotoğraflar story güvenli alanına (üst ilerleme çubuğu/hesap satırı, alt mesaj çubuğu) yerleşir ve export aynı geometriyi kullanır; hücre başına yer değiştirme, görsel değiştirme, sürükleyerek konumlandırma ve iki parmakla yakınlaştırma; konum/zoom export'a birebir yansır. | S | **Uygulandı (S)**: güvenli alan 250/250 px (sahip onayı 2026-10-03; telefonda karşılaştırılmadı), `computeCellDraw` önizleme ve export'ta ortak |
| S-b | Export: tek görsel her zaman doğrudan dosya iner, zip yalnız çoklu Carousel serisinde. Varsayılan en yüksek kalite: tam hedef boyut, sRGB, JPEG 0.97; dosya 8 MB'ı aşarsa kalite kademeli düşer ve kullanıcıya gösterilir. PNG ve format seçimi "Gelişmiş" altında. Export sayfasında jargon yok; hedef olarak gerçek boyut (örn. 1080×1350) yazılır. | S | **Uygulandı (S)**: `lib/export/export-plan.ts`, testli. 8 MB sınırı platform hedeflerine (post, story, TikTok, Çerçeve) uygulanır; Upscale'e uygulanmaz (sahip onayı, §10 soru 8) |

Geçersiz kılınan taslak satırlar: önceki Faz S taslağındaki "1 fotoğraf tam kadraj" ve "6'dan fazlasında ilk 6'sı" K2 ile geçersizdir; "TikTok seçiliyken dışa aktarım boyutu: sahip kararı bekliyor" K1 ile kapanmıştır (varsayım + telefonda doğrulama). Bu satırlar spec'e hiç işlenmemişti.

### 4.5 — Düzenle Modülü (Faz D1, D2; sahip onayı 2026-10-03)

| # | Karar | Faz | Durum |
|---|---|---|---|
| E1 | Beşinci modül **"Düzenle"**: tek fotoğraf, Lightroom'un basit hâli. Sahip fotoğraf ve teknik terim bilmez; akış zahmetsiz olmalı. Sekmeler: Preset, Kırp (D1), Düzeltme (D2). | D1 | **Uygulandı (D1, 2026-10-03)**: `EditStudio.tsx`; Düzeltme sekmesi tanımlı, gizli |
| E2 | Bölüm 7 madde 4 (manuel renk arayüzü yok) aynen geçerli: curve, kanal, ton ayrımı, HSL yok. **Tek istisna** D2'deki "Düzeltme" sekmesi: her satır tek açma/kapama ve tek şiddet kaydırıcısı. | D1, D2 | Kayıt |
| E3 | Vinyet yasağı estetik vinyet **eklemeyi** kapsar. Lens kaynaklı kenar kararmasını **düzeltmek** yasak değildir (`AGENTS.md` §3). | D2 | Kayıt |
| E4 | Düzenle export'u kırpılmış fotoğrafı kendi çözünürlüğünde verir, uzun kenar en çok 4096 px. Instagram/TikTok boyutu Carousel ve Story'nin işidir. **[VARSAYIM — sahip telefonda kullanıp onaylayacak]** | D1 | **Uygulandı (D1)**: `editOutputSize`, testli |
| E5 | Preset sekmesi: yatay preset satırı (fotoğrafın önizlemesiyle) + tek "Miktar" kaydırıcısı; Carousel'deki render adımlarıyla (M2 taban + görünüm). | D1 | **Uygulandı (D1)**: taban adımına kırp geometrisi eklendi (`CarouselRenderOptions.crop`), yeni render yolu yok; önizleme uzun kenarı 1350 px, sürüklerken yarısı |
| E6 | Kırp sekmesi: oranlar Serbest, Orijinal, 1:1, 4:5, 9:16, 16:9; çerçeve sahnede sabit, fotoğraf altında sürüklenir ve iki parmakla yakınlaşır (Story'deki pointer/rubber-band mantığı ortak); Serbest oranda çerçeve köşelerden boyutlanır; 90° döndürme, −10°…+10° ince açı, yatay çevirme. | D1 | **Uygulandı (D1)**: `lib/engine/edit-geometry.ts`; jestler Story ile ortak `usePanPinch` |
| E7 | Sahneye basılı tutunca orijinal görünür, bırakınca düzenlenmiş hâl döner. Orijinal = kırpılmamış, preset'siz fotoğraf; **yalnız Preset sekmesinde** (Kırp sekmesinde basılı tutma kırpma hareketidir) (sahip kararı 2026-10-03). | D1 | **Uygulandı (D1)** |
| E8 | Export: her zaman tek dosya, doğrudan iner, `duzenle_01.jpg`, JPEG 0.97, 8 MB'ı aşarsa basamaklı düşüş ve gösterim; PNG "Gelişmiş" altında. | D1 | **Uygulandı (D1)**: `PLATFORM_SPECS.edit` |
| E9 | Yükleme: kütüphane boş başlar; "+" menüsünde Fotoğraf Yükle ve Referans Görsel Yükle (tek seçim); sınır 1 fotoğraf. Alt çubukta "Büyüt" düzenlenmiş hâli (kırpılmış + preset'li) yeni fotoğraf olarak kütüphaneye ekler ve Upscale'i onunla açar (sahip kararı 2026-10-03). Upscale çıktısı uzun kenar en çok **8192 px** ve alan en çok **16 MP** **[VARSAYIM, telefonda ölçülmedi]**; aşan çarpan kapanır ve yanında "Bu boyut için çok büyük" yazar. | D1 | **Uygulandı (D1)**: `UPSCALE_MAX_LONG_EDGE`, testli |
| E11 | **Türetilmiş fotoğraf (sahip kararı 2026-10-03, hafif yol):** kayıtta isteğe bağlı `sourceId` ve `derivedBy` ("upscale", ileride "ai"); sürüm yapısı yok. Tek ortak `addResultItem`: kaynağın arkasına ekler ve seçer, ayarlar sıfır başlar. Diğer modüller sıradan fotoğraf olarak görür (sınırlara sayılır), rozet "Büyütülmüş". Düzenle'de "Kaynağa dön" (44px) kaynağı ayarlarıyla açar. Türetilmiş silinirse yalnız o; kaynak silinirse türetilmişler kalır, `sourceId` temizlenir; her silmede URL'ler bırakılır. Kaynak başına en çok 2 türetilmiş, üçüncüde en eskisi silinir ve kısa mesaj gösterilir. | D1b | **Uygulandı**, `tests/derived-items.test.ts` |
| E10 | Düzeltme sekmesi (Otomatik + Noise Azalt, Kenar Netliği, Kenar Renk Düzelt, Gölge Aç, Parlak Alan Kurtar, Pus Gider); yalnız iyileştirir, detay üretmez; **Düzeltme sekmesinde** AI tabanlı onarım yok (AI, ayrı "AI ile onar" eylemidir, E12). | D2 | **Uygulandı (D2, 2026-10-08)**: `lib/engine/corrections.ts` (sabit sıra, satır başına aç/kapa + şiddet, Otomatik istatistikle; parçalı export), önizleme worker'da, `tests/corrections.test.ts` (16) + parite testi; telefonda doğrulanmadı |
| E13 | **Yerel ışık maskeleri ve AI Preset (sahip kararı 2026-10-08, görev belgesi §4.1, §8.3):** Lens vinyetini **düzeltmek** serbesttir. AI destekli yerel ışık maskeleri (doğrusal/radyal gradyan, çokgen) yalnız bir "AI Preset" planının içinde, doğrulayıcının sert sınırlarıyla serbesttir; bağımsız estetik vinyet eklemek yasak kalır. AI Preset'te model görseli üretmez, yalnız JSON ışık/renk planı döndürür; Curate planı yerel motorla uygular. Sahip tasarımı onayladı (D28). Düzenle → Preset satırında "AI Preset" kartı, 4 stil (Doğal Portre, Altın Saat, Sinematik Gece, Temiz Gündüz); giden: orijinal fotoğrafın ≤ 768 px JPEG 0,8 kopyası; dönen: yalnız JSON plan (yanıt şeması zorunlu); sunucu ve istemci doğrular/sınırlar; plan orijinal fotoğraf koordinatlarında, kırpımdan bağımsız; tek "Miktar" kaydırıcısı × güvenli ölçek (ezme/patlatma payı ≤ %0,5); plan cihazda fotoğrafla saklanır. | AI2 | **Uygulandı (2026-10-08)**: `lib/engine/ai-plan.ts`, görev `P` `lib/ai/server.ts`, `components/studio/AiPresetSheet.tsx`; testli, sahte yanıtla tarayıcıda doğrulandı; gerçek model çağrısı [DOĞRULANMADI] (kapsayıcıda anahtar yok) |
| E12 | **"AI ile onar" (sahip kararı 2026-10-03, Faz AI1):** Düzenle alt çubuğunda eylem; dört görev: Büyüt (A, 4K), Gürültü temizle (B, 2K), Kenar ve renk kayması düzelt (C, 2K), Patlak alanı ve pusu kurtar (D, 2K). Model görev başına: A/B/C Flash, D Pro (Flash D'de güneş diski uydurdu). Test edilmiş istemler aynen; model adı, boyut, istem, süre ve ₺ tahmini yalnız `lib/ai/config.ts`. Giden: **aktif fotoğrafın kendi pikselleri** (ayarsız; türetilmişse onun pikselleri), uzun kenar ≤ 2048, JPEG 0.92. Sunucu (Vercel, `maxDuration` 120) 4 MB üstünü reddeder, sonucu JPEG q92'ye çevirir, 4,3 MB'a sığana kadar kaliteyi (≥ 80) sonra boyutu düşürür. Erişim (Faz P1, sahip kararı 2026-10-07): 4 haneli PIN (`CURATE_AI_PASSWORD`, yalnız sunucu ortam değişkeni; 4 rakam değilse `not_configured`) yeni cihazda bir kez girilir (`PUT /api/ai`, 4. hanede kendiliğinden gönderilir); sunucu imzalı HttpOnly çerez verir (365 gün, `Secure`, `SameSite=Strict`, `Path=/api/ai`; imza anahtarı Vertex anahtarı + PIN'den türetilir, PIN değişince eşli tüm cihazlar düşer); "Bu cihazı unut" (`DELETE`) çerezi siler. PIN tarayıcıda saklanmaz. Yanlış PIN sınırı: IP başına günde 5, genel günde 10, ayda 30 (atomik ayrılır; eşli cihazlar etkilenmez); başka siteden gelen istek (`Sec-Fetch-Site`) 403. Kota günde 20, ayda 150 (env), model çağrısından önce atomik ayrılır; sayaç Upstash Redis REST, yoksa bellek; sayaç hatası "Sunucu sayacına ulaşılamadı" (model çağrılmaz); `AI_ENABLED=false` hepsini kapatır (Preview ortamında kapalı, sahip kararı S4). Yeniden deneme yalnız 429/503'te bir kez ve kalan süre yetiyorsa. Sonuç önce tam ekran önce/sonra sayfasında ("AI bazen fotoğrafta olmayan bir şey ekleyebilir. Kaydetmeden önce kontrol et."; basılı tut: orijinal; hafif "Buraya dikkatli bak" işareti, kesin tespit değil); "Kullan" ortak `addResultItem` ile türetilmiş ("AI sonucu") ekler, "At" hiçbir şey eklemez. Silinecek en eski kopya AI sonucuysa önce onay sorulur. İptal: "İptal edildi; ücret yansımış olabilir." Gizlilik notu: "Bu işlem için fotoğraf Google'a gönderilir." Sonuç görseli açılamazsa sayfa "Sonuç açılamadı." der ve görev listesine döner. Renk geri eşleme yok. Inpainting/outpainting yasağı (§7.3) sürer. | AI1, P1 | **Uygulandı (AI1, P1 2026-10-07)**: `lib/ai/*`, `app/api/ai/route.ts`, testli; gerçek çağrı yalnız B, yerelde (AI1); PIN akışı yerel sunucuda tarayıcıyla doğrulandı, telefonda doğrulanmadı |

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

**Durum (2026-10-08, preset kütüphanesi v2, `docs/DECISIONS.md` D24/D26):** bu 6 aile "İmza" ailesi olarak korunup yeni motorla (uçları sabit ton eğrisi, cilt korumalı canlılık) yeniden ifade edildi; yanına Temel, Portre ve Işık aileleri eklendi (toplam 16). Kalibrasyon ölçümleri `docs/PHOTO-KNOWLEDGE.md` §7. **Önceki durum (2026-10-02):** `lib/engine/presets.ts` artık bu 6 ailenin kodunu içeriyor (`moody_teal`, `warm_silhouette`, `night_cinematic`, `muted_coastal`, `amber_grain`, `monochrome_noir`); eski 6 genel profil kodda yok. Değerlerin gerçek referans görsellerden Reinhard ile türetilip türetilmediği doğrulanmadı (kaynak dokümanlar repoda yok, bkz. çelişki 4).

### 5.2 — Arayüz Gereksinimi
- Preset kartları büyük, görsel önizlemeli, "Preset/Renk" hapının en üstünde.
- Slider'lar varsayılan görünümde kapalı; sadece kullanıcı "ince ayar" isterse açılır.
- My Aesthetic çoklu, adlandırılmış profil olarak çalışır (tek profil değil).
- Otomatik öneri (histogram tabanlı preset önerisi) — P1/nice-to-have, zorunlu değil. **Uygulandı (2026-10-08):** preset satırının başındaki "Otomatik" kartı (Düzenle: tek kare; Carousel: seri oylaması), `lib/engine/scene.ts`.

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
2. **Sunucu taraflı işleme.** Mimari karar, performans optimizasyonu bile olsa sunucuya görsel yükleme eklenmez. Tek istisna §4.5 E12 ("AI ile onar", sahip kararı 2026-10-03); başka hiçbir modül görsel göndermez.
3. **AI destekli inpainting/outpainting.** Tanıtım dökümanında "Faz 2" olarak planlanmış ama bu spec'in kapsamında değil — P0/P1 sağlamlaşmadan konuşulmaz.
4. **Gelişmiş manuel renk ayarı arayüzü** (curve editör, kanal bazlı ayrı kontroller, ton ayrımı, HSL). Tek istisna: Düzenle modülünün Düzeltme sekmesi, satır başına tek açma/kapama ve tek şiddet kaydırıcısı (§4.5 E2). Felsefeyle (Bölüm 3, madde 1) doğrudan çelişir.
5. **Kamera/çekim asistanı özellikleri** (EV önerisi, shutter speed uyarısı vb.) — bu Curate'in değil, ayrı kamera uygulamasının işi.

---

## 8. Öncelik Sırası (Fazlar)

| Faz | İçerik | Kabul Kriteri |
|---|---|---|
| **Faz 1 — Temel Onarım (P0)** | 4 kritik export/state bug'ı çözülür | Üç modülden de export alınır, ekrandaki önizlemeyle piksel düzeyinde tutarlı sonuç çıkar; Hub'dan yüklenen foto ilgili modülde görünür |
| **Faz 2 — Mimari Sağlamlaştırma (P1)** | Worker entegrasyonu, proxy aktivasyonu, gerçek Lanczos önizleme, PNG export düzeltmesi | Yüksek çözünürlüklü 10+ görsellik seri, mobilde donma olmadan işlenir; PNG seçimi gerçek PNG üretir |
| **Faz 3 — Preset Sistemi Birleştirme** | Mevcut 6 ton profili ile hedef 6 preset ailesi arasında karar + kalibrasyon + uygulama | Preset kartları üstte, büyük önizlemeli; her preset gerçek referans görselden türetilmiş değerlere sahip |
| **Faz 4 — UI Sadeleştirme** | Gelişmiş özelliklerin (Reinhard referans, split view, `.cube` LUT, Hero Harmonize) ikincil katmana taşınması (mobil kısmı Faz M1'e bağlandı) | Ana akışta sadece Preset hapı öne çıkıyor, diğerleri "Araçlar" altında |
| **Faz K — Kararların işlenmesi** | §4.4 kararları dokümanlara, ölü kod temizliği | Spec/README/AGENTS/reference tutarlı; kalite kapıları geçer |
| **Faz M1 — Mobil iskelet** | §4.3 #9–10, K3, K5, M1-a; CDS §6 sözleşmesi | Prosedür 2 betiği 360×740, 390×844, 430×932'de geçer |
| **Faz M2 — Render hattı (A)** | §4.3 #11, §4.2 #5/#7, Hero metrik kaynağı | Önizleme ve export 1080×1350'de aynı çıktı (veya belgelenmiş tolerans) |
| **Faz S — Story ve Export** | K1, K2, S-a, S-b | Export boyutları/MIME ve tek/çoklu indirme testlerle doğrulanır; parite korunur |
| **Faz D1 — Düzenle: iskelet, Preset, Kırp** | §4.5 E1, E4–E9 | Prosedür 2 Düzenle'de 360/390/430'da geçer; kırpma matematiği, export boyut/MIME ve parite testleri |
| **Faz AI1 — Düzenle: AI ile onar** | §4.5 E12 | Sahte fetch'le istek şeması, eşlemeler, şifre/kota/4 MB/JPEG/görsel yok testleri; build çıktısında sır yok (`npm run check:secrets`); Prosedür 2 yeni sayfaları 360/390/430'da geçer |
| **Faz P1 — AI erişimi: PIN ile cihaz eşleme** | §4.5 E12 (Erişim) | Çerez/PIN/sınır/atomik kota/sayaç hatası testleri; PIN değeri repoda 0; Prosedür 2 PIN adımıyla 360/390/430'da geçer (`docs/reports/2026-10-07-ai-pin-plan.md`) |
| **Faz H1 — Sağlamlık** | Rapor 2026-10-07 B1–B6 | Worker çökmesi bekleyen işi bırakmaz, açılamayan dosya mesajla çıkar, bozuk JPEG'de export patlamaz; testli |
| **Faz C — Renk sistemi** | §4.4 K6 | Kodda `#f5a623` ve türevi 0; sabit renk yalnız `app/globals.css` ve `lib/ui/colors.ts`; kontrast tablosu; Prosedür 2 beş modül ve yeni sayfalarda 360/390/430'da değişmeden geçer |
| **Faz D2 — Düzenle: Düzeltme sekmesi** | §4.5 E3, E10 | Sentetik görsellerle ölçülebilir kabul (spec dışı prompt `prompt-D2.md`), parite testi |
| **Faz Y — Yoklama (geçici, 2026-10-08)** | Ürün özelliği yok: `/probe` web yoklaması ve `probe-apk/` native test APK'sı telefonun kamera/donanım tavanını ölçer, `probe/v1` JSON üretir (`docs/probe/README.md`) | Kök kapılar sıfır hata, `probe-apk` kök kapıları etkilemez; sahte kamerayla sayfa çökmeden geçerli JSON üretir; ağa veri gitmez. Telefonda doğrulama sahipte. Yol haritası kararı verilince iki araç silinir |
| **2026-10-08 görev belgesi** | Faz 0–6: anayasa, tasarım dili v3, arayüz, erişim/kalıcılık/PWA, D2 + preset kütüphanesi + AI Preset | Sıra ve kabul: `docs/ROADMAP.md`; durum: `docs/STATE.md` |
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

1. **Karar verildi (2026-10-08, `docs/DECISIONS.md` D24):** preset kütüphanesinin kapsamı ajana bırakıldı; mevcut 6 aile korunarak genişletilir. Eski metin: **(Uğur)** Hedef 6 preset ailesi kodda uygulandı, eski 6 profil kaldırıldı. Bu değişimin kalıcı karar olarak onaylanıp onaylanmadığı ve değerlerin referans görsellerden kalibrasyonu (Faz 3) sahibin teyidini bekliyor.
2. ~~Mobil kullanım önceliği~~ **KAPANDI (2026-10-02):** Birincil kullanım mobil. Worker/proxy/render hattı kapsamı `docs/reports/2026-10-02-audit.md` §2'deki seçeneklerden sahip tarafından seçilir.
3. ~~`.CUBE` LUT yeri~~ **KAPANDI (2026-10-02):** "Araçlar" altında kapalı bölüm (M1-a). **2026-10-08 (D31):** sahip "işine yaramıyorsa sil" dedi; uzman aracı olduğu ve preset kütüphanesi aynı işi gördüğü için kaldırıldı.
4. ~~Düzenle modülü~~ **TANIMLANDI (2026-10-03):** §4.5, Faz D1 ve D2.
5. ~~Carousel hedef geçişi~~ **KAPANDI (2026-10-03):** Her zaman bir hedef seçili, varsayılan Instagram. Arayüz katmanı sahne altındaki göz düğmesiyle gizlenebilir (varsayılan görünür; export'a hiçbir durumda yazılmaz).
6. **(Uğur)** K1: TikTok 1080×1920 boyutu telefonda doğrulanacak.
7. ~~Story ve 6'dan fazla fotoğraflı kütüphane~~ **KAPANDI (sahip onayı 2026-10-03):** Story ilk 6'sını kullanır ve bunu uyarıyla gösterir.
8. ~~8 MB sınırı ve Upscale~~ **KAPANDI (sahip onayı 2026-10-03):** Sınır yalnız platform hedeflerine (post, story, TikTok, Çerçeve) uygulanır; Upscale'e uygulanmaz.
9. ~~Story güvenli alan bandı~~ **KAPANDI (sahip onayı 2026-10-03):** 250 px üst ve alt. Telefonda Instagram arayüzüyle karşılaştırma hâlâ yapılmadı.
11. ~~Faz C vurgu dolgusu~~ **KAPANDI (sahip onayı 2026-10-03):** `#0071E3`. Tarih damgası turuncu kalır.
12. ~~AI telefonda erişim~~ **KAPANDI (sahip kararı 2026-10-07, Faz P1):** 4 haneli PIN ile cihaz eşleme; S1–S6 önerileri kabul (yalnız AI kilitli, 365 gün, sınırlar 5/10/30, Preview'da AI kapalı, PIN'i Vercel'e ajan yazar, geçici çözüm yok). Telefonda doğrulama sahipte. **2026-10-08 notu:** "PIN'i Vercel'e ajan yazar" izni görev belgesi §1.6 ile kalktı (D17); "yalnız AI kilitli" kararını görev belgesi §7-A yeniden açtı; sahip tüm uygulama kapısını onayladı (D27) ve uygulandı: aynı PIN `/kilit` ekranında tüm uygulamayı açar, çerez `curate_session` (Path=/, SameSite=Lax, 365 gün kayan), eşleme `AI_ENABLED`'dan bağımsız; eski `curate_ai` çerezi bir sürüm kabul edilir.
13. **(Uğur)** Faz Y (Yoklama): `/probe` ve "Curate Probe" APK'sının Redmi'de ürettiği iki JSON getirildiğinde yol haritası çizilir. §7 madde 5 kamera/çekim asistanı özelliklerini kapsam dışı sayar; sonuçların Curate'e mi, ayrı bir kamera uygulamasına mı yoksa hiçbir yere mi gideceği sahip kararıdır.
10. **(Uğur)** AI1: Vercel'de gerçek süre ve zaman aşımı, telefonda akış, gerçek maliyet (Billing) ve sayacın dağıtık çalışması doğrulanmadı; ₺ tahminleri üçüncü taraf fiyatlarıdır.

---

*Bu döküman `curate-preset-spec.md`, `referans-gorsel-yonergesi.md`, `fotografcilik_karakterim.md` ve Antigravity'nin 2026-10-01 tarihli mevcut durum raporuyla birlikte okunmalıdır. Büyük bir karar/faz değişikliğinde bu dosya güncellenir; sürüm geçmişi ayrıca tutulmaz, güncel hal tek referanstır.*
