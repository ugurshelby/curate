# Curate — Minimalist Post & Dump Studio

Curate, kişisel sosyal medya paylaşımları, fotoğraf serileri (dump) ve Instagram/TikTok hikayeleri için tasarlanmış bağımsız, minimalist bir görsel işleme ve küratörlük aracıdır.

Tüm görsel manipülasyon işlemleri (kırpma, filtreler, renk transferi, upscale ve dışa aktarma) sunucu maliyeti olmadan tamamen **İstemci Tarafında (Client-Side / HTML5 Canvas & WebGL)** kayıpsız olarak gerçekleşir.

---

## 🌟 Temel Özellikler

### 1. Küratörlük & Sıralama (Dump Canvas)
- **Toplu Yükleme:** Sürükle-bırak (Drag & drop) ile çoklu görsel yükleme veya tek tıkla yüksek çözünürlüklü örnek fotoğraf serisi.
- **Akıcı Yeniden Sıralama:** Film şeridi kartları sürüklenerek veya ok butonlarıyla manuel yeniden sıralanabilir.
- **Referans Kare Belirleme:** Bir görsel ⭐ ile renk transferi referans karesi olarak atanabilir.

### 2. Sosyal Medya Arayüz Simülatörü (Interactive Overlays)
- **Instagram Story:** Üst hikaye barları, avatar, kullanıcı adı, kapatma ikonu, alt DM mesaj input kutusu ve butonları.
- **TikTok Story / Video:** Sağ kenar dikey etkileşim çubuğu (+ avatar, beğeni, yorum, yer imi, paylaşım sayıları), alt kullanıcı adı, açıklama ve dönen müzik diski.
- **Instagram Post / Carousel:** Profil başlığı, 3 nokta; alt etkileşim çubuğu ve carousel pagination nokta göstergeleri (`•••`).

### 3. Kompozisyon & Manuel Kırpma Motoru
- **Aspect Ratio Seçenekleri:** `4:5` (Dikey Post), `9:16` (Story/Reels), `1:1` (Kare) ve `Orijinal` (tam piksel oranı).
- **Kompozisyon Kılavuzları:**
  - Rule of Thirds (3x3 grid)
  - Golden Ratio (Phi grid 1 : 0.618 : 1)
  - Frame-in-Frame (İç odak dikdörtgeni)
- **Doğrudan Manipülasyon:** Mouse drag / touch gestures ile serbest Pan, wheel / slider / pinch-to-zoom ile 1x - 3x yakınlaştırma, çift tıklama ile hızlı zoom.

### 4. Görüntü İşleme & Analog Katmanlar
- **Reinhard Renk Transferi:** Referans kare ile seçili görselin $sRGB \leftrightarrow CIELAB$ istatistiksel ($\mu, \sigma$) dağılımını eşleştirme ve %0 - %100 lerp harmanlama.
- **Organik Film Greni:** Luminance-aware $\text{Weight}(Y) = 4.0 \cdot Y \cdot (1.0 - Y)$ parabolik eğrisi ile orta tonlarda yoğunlaşan gürültü sentezi.
- **Halation (Işık Haresi):** $Y > 0.82$ parlaklık eşiklemesi, sıcak amber/kırmızı yayılma ve *Screen* blend modu.
- **Canlı "Önce / Sonra":** Klavyede `Space` veya arayüzdeki "Basılı Tut: Önce" butonuyla ham görsel ve filtreli halini anlık kıyaslama.

### 5. Kayıpsız Dışa Aktarma & Lanczos-3 Upscale Motoru
- **Lanczos-3 Resampling:** Yapay zeka halüsinasyonu olmadan kenarları keskinleştirerek optimum platform çözünürlüğüne büyütme ($L(x) = \text{sinc}(x) \cdot \text{sinc}(x/3)$).
- **Platform Presetleri:**
  - Instagram Post (Retina): 2160 × 2700 px (Lanczos-3 4:5)
  - Instagram / TikTok Story: 1080 × 1920 px (9:16)
  - Square HD: 1080 × 1080 px (1:1)
  - Ultra HD Archive: Orijinal en-boy oranında kayıpsız format
- **EXIF Temizleme:** Canvas üzerinden blob serialization yapıldığı için GPS ve cihaz meta verileri otomatik olarak silinir.
- **Tek Tıkla ZIP:** Tüm seriyi `dump_[tarih].zip` olarak tek tıkla indirme.

---

## 🎨 Tasarım Sistemi & Apple Estetiği

- **60:30:10 Kuralı:** %60 Derin Siyah (`#000000`, OLED), %30 yarı saydam paneller (`bg-neutral-900/80`, `backdrop-blur-xl`), %10 beyaz ve ince kontur vurguları (`border-white/10`, rim-light `inset 0 1px 0 rgba(255,255,255,0.12)`).
- **Tipografi:** SF Pro Display & SF Pro Text benzeri Apple sistem tipografisi.
- **Dokunsal Geri Bildirim:** Mikro basılma haptikleri (`active:scale-95`).

---

## 💻 Kurulum & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi
npm run build
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.
