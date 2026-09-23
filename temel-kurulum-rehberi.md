# Proje Adı: Curate (Minimalist Post & Dump Studio)

## 1. Proje Amacı ve Felsefesi
Bu uygulama; kişisel sosyal medya paylaşımları, fotoğraf serileri (dump), Instagram/TikTok hikayeleri için tasarlanmış bağımsız, minimalist bir görsel işleme ve küratörlük aracıdır.
Tüm görsel manipülasyon işlemleri (kırpma, filtreler, renk transferi, upscale ve dışa aktarma) sunucu maliyeti olmadan tamamen İstemci Tarafında (Client-Side / HTML5 Canvas & WebGL) kayıpsız olarak gerçekleşecektir.

## 2. Tasarım Dili (UI/UX)
- **Apple Estetiği:** Minimalist, dikkat dağıtmayan, ferah yerleşimler.
- **Renk Paleti & Doku:** Koyu tema tabanlı (deep neutral darks / OLED blacks), hafif yarı saydam paneller (glassmorphism / backdrop-blur), SF Pro benzeri temiz tipografi, mikroskobik 1px border vurguları (`border-white/10`).
- **Etkileşim:** Pürüzsüz geçişler, minimal slider'lar, gereksiz diyalog pencerelerinden arındırılmış doğrudan arayüz.

## 3. Temel Özellikler & Fonksiyonel Gereksinimler

### A. Küratörlük & Sıralama (Dump Canvas)
- **Toplu Yükleme:** Sürükle-bırak (Drag & drop) ile çoklu görsel yükleme.
- **Manuel Sıralama:** Yüklenen görseller yan yana kartlar halinde dizilmeli; HTML5 Drag and Drop API ile sürüklenerek sırası manuel değiştirilebilmeli.
- **Sosyal Medya Arayüz Simülatörü (Interactive Overlays):**
  - Seçilen görsele tıklandığında önizleme modu açılmalı.
  - Canlı overlay katmanları (açılıp kapatılabilir):
    - *Instagram Story Preview:* Sol üst profil simgesi/kullanıcı adı, sağ üst çarpı, alt mesaj kutusu ve buton alanları.
    - *TikTok Story Preview:* Sağ kenardaki beğeni/yorum simgeleri dizisi, alt açıklama alanı.
    - *Instagram Post / Carousel:* Profil başlığı ve alt etkileşim çubuğu.

### B. Manuel Crop & Kompozisyon Motoru
- **Aspect Ratio Seçenekleri:** 4:5 (Dikey Post), 9:16 (Story), 1:1 (Kare), Orijinal.
- **Kompozisyon Kılavuzları (Overlay Çizgileri):**
  - Klasik Üçler Kuralı (Rule of Thirds 3x3 ızgara).
  - Altın Oran (Golden Ratio / Phi grid).
  - Frame-in-Frame (İç içe çerçeve odak çizgileri).
- Kullanıcı görseli pan/zoom ve köşe tutamaçlarıyla serbestçe ayarlayabilmeli.

### C. Görüntü İşleme & Analog Katman Modülleri (Canvas / WebGL)
1. **Reinhard Renk Transferi (Color Match):**
   - Kullanıcı gruptan bir görseli "Referans Kare" olarak seçebilmeli.
   - Lab renk uzayında referansın renk dağılımı seçili görsele aktarılmalı.
   - Etki gücü için bir slider (%0 - %100) bulunmalı.
2. **Organik Film Greni (Procedural Grain):**
   - Statik kaplama görseli yerine matematiksel gürültü.
   - Parlaklığa duyarlı olmalı (gölgelerde ve orta tonlarda yoğun, saf beyazlarda sönük).
   - "Gren Miktarı" ve "Gren Boyutu" slider'ı olmalı.
3. **Halation (Işık Haresi):**
   - Yüksek parlaklıktaki piksellerin (ışık kaynakları, neonlar, parlak kenarlar) çevresine hafif kırmızımsı/turuncu sıcak bir yayılma (glow/diffusion) ekleyen modül.
   - Aç/Kapa toggle butonu, "Yayılma Yarıçapı" ve "Renk Sıcaklığı" (sarı/kırmızı ton dengesi) ayarı.

### D. Kayıpsız Dışa Aktarma & Akıllı Upscale Motoru
- **Akıllı Ölçekleme:** Görselin çözünürlüğü tespit edilmeli. Hedef platformun optimum boyutuna (örn. IG Story için 1080x1920, IG Portrait için 2160x2700 Retina) çekilirken geleneksel **Lanczos3 / Bicubic** enterpolasyonu kullanılmalı; yapay zeka halüsinasyonu olmadan kenarlar keskinleştirilerek büyütülmeli.
- **Metadata Denetimi (EXIF Stripper):** Dışa aktarırken tüm hassas EXIF/GPS verileri tamamen temizlenmeli.
- **Tek Tıkla Dışa Aktarma:** Tekli indirme veya tüm seriyi `dump_[tarih].zip` olarak tek tıkla indirme.

## 4. Teknik Stack
- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS.
- **UI Kütüphaneleri:** Lucide React (ikonlar), dnd-kit veya framer-motion (pürüzsüz drag-and-drop).
- **İstemci Taraflı İşleme:** HTML5 Canvas API, WebGL (filtreler ve gren için), JSZip (toplu indirme için).
- **Dağıtım (Deployment):** Vercel (PWA konfigürasyonu ile `manifest.json` dahil edilmeli).

# Ek Doküman: Curate Studio — Fonksiyonel Detaylar & Arayüz Spesifikasyonu (Spec)

Bu spesifikasyon, projenin arayüz tasarım prensiplerini, kullanıcı etkileşim modellerini ve görsel işleme algoritmalarının matematiksel/teknik çalışma detaylarını tanımlar.

---

## 1. Apple Tasarım Standartları & Arayüz Detayları

Arayüz "görünmez" olmalıdır; ana odak tamamen kullanıcının fotoğraflarıdır.

* **Tipografi & Hiyerarşi:**
  * Sistem yazı tipi: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif`.
  * Boyutlar: Başlıklar minimal tutulmalı (`text-xs` veya `text-sm`, `tracking-wide`, `uppercase`, `text-neutral-400`).
  * Değer göstergeleri (slider yanındaki sayılar): Sabit genişlikli (`font-mono text-xs text-neutral-300`).
* **Panel & Kart Mimarisi:**
  * Arka Plan: Derin siyah (`#000000` veya `#09090b`).
  * Floating Toolbar & Paneller: `bg-neutral-900/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl`.
  * Kartlar: Fotoğraf kartlarında kalın gölgeler yerine mikro kontur (`border border-white/5 hover:border-white/20 transition-colors`).
* **Etkileşim Standartları:**
  * Slider bileşenleri: Minimum dokunma hedefi (touch target) korunmalı, iz çubuğu ince (`h-1 bg-neutral-800 rounded-full`), tutamaç (thumb) beyaz ve belirgin (`w-4 h-4 bg-white rounded-full shadow-md active:scale-110 transition-transform`).
  * Tıklamalar: Haptic hissi veren mikro basılma animasyonları (`active:scale-95 transition-transform duration-75`).
* **Kürasyon Ekranı Düzeni (Canvas):**
  * Üst Bar: Minimal proje adı, toplam fotoğraf sayısı, "Tümünü İndir (.zip)" aksiyonu.
  * Orta Alan: Yatay kaydırılabilir, serbest sıralanabilir fotoğraf kartları şeridi (Filmstrip / Carousel view). Kartlar arasında akıcı `drag-and-drop` yer değişimi (`dnd-kit`).
  * Alt Bar: Seçili fotoğraf için hızlı aksiyonlar (Crop, Renk, Doku, Simülatör).

---

## 2. Sosyal Medya Simülasyonu & Arayüz Katmanları (UI Overlays)

Bu özellik, kullanıcının fotoğrafı keserken platform arayüzünün görseli nasıl kapatacağını canlı görmesini sağlar.

* **Katman Mantığı:** Canvas üzerine `pointer-events-none` ile binen SVG/HTML şablonları.
* **1. Instagram Story Katmanı:**
  * Üst Bar: Sol üstte 32px yuvarlak profil avatarı alanı, yanında kullanıcı adı placeholder'ı, sağ üstte 24px `X` kapatma butonu. Hikaye ilerleme çizgileri (Story bars) üstte 4px boşlukla yer almalı.
  * Alt Bar: Yuvarlak kenarlı "Mesaj gönder..." input alanı, yanında DM uçak simgesi ve beğeni kalbi.
* **2. TikTok Story / Video Katmanı:**
  * Sağ Kenar Dikey Panel: Profil avatarı (+ ikonuyla), beğeni (kalp + sayı), yorum (balon + sayı), kaydetme (yer imi + sayı), paylaşım (ok simgesi).
  * Alt Bölüm: `@kullaniciadi`, 2 satırlık açıklama metni alanı ve dönen müzik diski ikonu.
* **3. Instagram Post / Carousel Katmanı:**
  * Üst: Profil fotoğrafı + isim + üç nokta.
  * Alt: Kalp, yorum, paylaş simgeleri; sol altta Carousel nokta göstergeleri (`•••`); sağ altta kaydet ikonu.

---

## 3. Kompozisyon & Manuel Kırpma (Crop) Motoru

* **Canvas Kırpma Mekaniği:**
  * Görsel serbestçe iki parmakla/tekerlekle büyütülüp küçültülebilmeli (Zoom: 1x - 3x).
  * Görsel tıkla-sürükle ile pan edilebilmeli.
* **En-Boy Oranları (Aspect Ratios):**
  * `4:5` (1080 × 1350 / 2160 × 2700) — Instagram dikey post standardı.
  * `9:16` (1080 × 1920) — Story / Reels / TikTok dikey standardı.
  * `1:1` (1080 × 1080) — Klasik kare.
  * `Original` — Görselin orijinal boyut oranını korur.
* **Kılavuz Çizgileri (Toggle edilebilir):**
  * **Rule of Thirds:** 3x3 eşit grid, ince yarı saydam beyaz çizgiler (`stroke-white/30`).
  * **Golden Ratio (Phi Grid):** 1 : 0.618 : 1 oranında bölünmüş ızgara çizgileri.
  * **Frame-in-Frame:** Kenarlardan %10 içeride çizilmiş ikinci bir odak dikdörtgeni.

---

## 4. Görüntü İşleme Modüllerinin Matematiksel Prensipleri

Tüm filtreler saf JavaScript/Wasm veya WebGL fragment shader'ları ile istemci tarafında çalışır.

### A. Reinhard Color Transfer (Renk Eşitleme)
Farklı karelerin renk istatistiklerini referans kareye uydurur:
1. Kaynak ($S$) ve Referans ($R$) pikselleri $sRGB$ uzayından $CIELAB$ ($L^*, a^*, b^*$) renk uzayına dönüştürülür.
2. Her kanal için ortalama ($\mu$) ve standart sapma ($\sigma$) hesaplanır.
3. Ölçekleme formülü uygulanır:
   $$L'_{S} = (L_S - \mu_S^L) \cdot \left(\frac{\sigma_R^L}{\sigma_S^L}\right) + \mu_R^L$$
   $$(a \text{ ve } b \text{ kanallarına da aynı formül uygulanır})$$
4. Sonuç tekrar $sRGB$'ye dönüştürülür.
5. **Yoğunluk Kontrolü:** Orijinal görsel ile transfer edilmiş görsel arasında slider oranına göre lineer interpolasyon (`lerp`) yapılır: $\text{Output} = (1 - t) \cdot S + t \cdot S'$.

### B. Organik Film Greni (Luminance-Aware Procedural Grain)
Statik görsel overlay yerine matematiksel gürültü üretir:
* Piksellerin parlaklığı ($Y$) hesaplanır: $Y = 0.299R + 0.587G + 0.114B$.
* **Eğri (Curve):** Gren orta tonlarda ($Y \approx 0.5$) en yüksek şiddette olmalı, zifiri gölgelerde ($Y < 0.05$) ve parlak patlamalarda ($Y > 0.95$) sönümlenmelidir:
  $$\text{Weight}(Y) = 4.0 \cdot Y \cdot (1.0 - Y)$$
* Pseudo-random gürültü üretilip ağırlıkla çarpılarak piksellere eklenir:
  $$\text{Pixel}' = \text{Pixel} + \text{Noise} \cdot \text{Weight}(Y) \cdot \text{Intensity}$$

### C. Halation (Işık Haresi & Sıcak Yayılma)
Film şeridinin arkasındaki kırmızı yansıma katmanını simüle eder:
* **Eşikleme:** Yalnızca belirli bir parlaklığın üzerindeki alanlar seçilir ($Y > 0.85$).
* **Ayırma & Renklendirme:** Bu izole edilen parlak piksellere kırmızı/turuncu renk ağırlığı verilir (Kullanıcının belirleyeceği "Sıcaklık" değerine göre sarıdan derin kırmızıya kayar).
* **Yayılma (Blur):** İzole parlak katmana geniş çaplı Gaussian Blur uygulanır.
* **Harmanlama (Screen Blend):** Oluşan bulanık kırmızı katman, ana görselin üzerine *Screen* harmanlama moduyla bindirilir.

---

## 5. Dışa Aktarma & Akıllı Büyütme Motoru (Lanczos Upscale)

* **Ölçekleme Mantığı:**
  * Görsel hedef çözünürlükten küçükse veya kırpma sonucu piksel kaybı yaşandıysa; standart tarayıcı büyütmesi (`bilinear`) devre dışı bırakılır.
  * Konvolüsyon çekirdeği olarak **Lanczos-3** filtresi kullanılarak kenar kontrastı korunur:
    $$L(x) = \begin{cases} \text{sinc}(x) \cdot \text{sinc}(x/3) & \text{eğer } -3 < x < 3 \\ 0 & \text{diğer} \end{cases}$$
* **Platform Preset Boyutları:**
  * `Instagram Post (Retina)`: 2160 × 2700 px (Lanczos ile keskinleştirilmiş 4:5).
  * `Instagram / TikTok Story`: 1080 × 1920 px (9:16).
  * `Ultra HD Archive`: Orijinal en-boy oranında maksimum 4K piksel sınırı.
* **EXIF Temizleme (Sanitization):**
  * Canvas üzerinden `canvas.toBlob('image/jpeg', 0.95)` veya `toBlob('image/png')` olarak yeniden çizilip dışa aktarıldığı için coğrafi konum (GPS), cihaz seri numarası gibi tüm meta veriler otomatik olarak piksellerden soyutlanır.

  # Ek Yönerge: Tasarım Sistemi, Skill Kuralları ve UI Standartları

Bu projede temel tasarım otoritesi **`skills/apple-design`** modülüdür[cite: 13]. Arayüz geliştirilirken projenin kök dizinindeki `skills/` ve `design-refernces/` klasörlerinde yer alan dokümantasyonlar doğrudan bağlayıcı kural olarak kabul edilecektir.

Geliştirmeye başlamadan önce aşağıdaki dosya ve skill hiyerarşisini oku ve uygula:

---

### 1. Skill Seti & Uygulama Prensipleri (`skills/`)
Geliştirme esnasında ilgili adımlarda şu skill modüllerindeki kuralları referans al[cite: 13]:

- **`apple-design` (Ana Otorite):** Temiz tipografi, ferah boşluklar (spatial balance), kusursuz radius hiyerarşisi ve dikkat dağıtmayan "görünmez" arayüz yapısı[cite: 13].
- **`minimalist-ui` & `pick-ui-library`:** Bileşen karmaşasından kaçın[cite: 13]. Yalnızca amaca hizmet eden minimal, native hissettiren UI elemanlarını entegre et[cite: 13].
- **`animate`, `animation-vocabulary` & `review-animations`:** Tüm kart sürükleme, modal açılış, overlay toggle ve slider etkileşimlerinde abartısız, yaylanmayan (spring / ease-out), mikroskobik 60fps akıcı geçişler kurgula[cite: 13].
- **`image-to-code` & `imagegen-frontend-web`:** Canvas üzerinde render edilen fotoğraf, kılavuz çizgileri ve mockup katmanlarını hatasız CSS/Canvas piksellerine dök[cite: 13].

---

### 2. Tasarım Referans Dokümanları (`design-refernces/`)
Arayüz bileşenlerini inşa ederken aşağıdaki dokümanların kurallarını birebir yansıt[cite: 14]:

- **`dark-mode-first.md` & `60-30-10-renk-kurali.md`:** 
  - Arayüz tamamen koyu tema odaklı inşa edilecek[cite: 14]. 
  - %60 derin arka plan siyahı (`#000000` / `#09090b`), %30 yüzey/panel tonları (nötr koyu gri tonları), %10 beyaz ve açık nötr vurgular[cite: 14].
- **`glassmorphism.md` & `liquid-glass-visual-identity-guidelines.md`:** 
  - Yüzen kontrol barları, crop paneli ve simülatör pencereleri için `backdrop-blur-xl`, yarı saydam koyu arka planlar (`bg-neutral-900/60`) ve mikroskobik 1px kenarlıklar (`border-white/10`) kullan[cite: 14].
- **`card-based.md` & `bento-grid.md`:** 
  - Fotoğraf yükleme ve kürasyon (dump) akışında kart yapılarını ve grid hiyerarşisini bu rehbere göre kur[cite: 14].
- **`loading-states-process-feedback.md` & `autosave-rehberi.md`:** 
  - Çoklu görsel işleme, Reinhard renk transferi hesaplaması ve Lanczos upscale süreçlerinde kullanıcıya sade ve pürüzsüz geri bildirim (progress/feedback) sun[cite: 14].
- **`touch-hover-capability.md` & `mobile-design.md`:** 
  - Hem masaüstü cursor/hover kontrollerini hem de PWA olarak mobilde çalışırken dokunmatik jestleri (pan/pinch-to-zoom) kusursuz destekle[cite: 14].
- **`ux-laws-reference.md`:** 
  - Fitts ve Hick yasalarını gözet; temel aksiyon butonlarını (Crop, Export, Overlay) başparmak ve kolay erişim alanlarında tut[cite: 14].

---

### 3. Agent Geliştirme Talimatı
Projeyi kodlarken ilk iş olarak `skills/apple-design` altındaki temel direktifleri ve `design-refernces/` altındaki ilgili Markdown dosyalarını analiz et[cite: 13, 14]. Hazırlayacağın bileşenleri, layout mimarisini ve Tailwind yapılandırmasını bu kurallarla tam uyumlu şekilde başlat[cite: 13, 14].