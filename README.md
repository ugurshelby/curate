# Curate Studio — Minimalist Editorial Photo Darkroom (v2.0)

Curate Studio; amatör ve profesyonel fotoğrafçıların Instagram ve TikTok için hızlı, rafine ve tutarlı **Carousel Dump** ve **Story Dump** üretmesini sağlayan hafif, tamamen istemci taraflı (Client-Side / HTML5 Canvas & Web Worker) bir fotoğraf stüdyosudur.

Apple Human Interface Guidelines (Spatial hiyerarşi), Raycast (ultra hızlı aksiyon & koyu tema kontrastı) ve VSCO (minimalist galeri & filmstrip) felsefesinin sentezidir.

---

## 🌟 Temel 4 Stüdyo Modülü

### 1. Carousel Dump (4:5)
- **Sahne Mimarisi:** Varsayılan 4:5 Fill modu, tek tıkla Fit/Fill geçişi, izole wheel zoom.
- **Platform Safe-Zone:** Yarı saydam göz ikonuyla Instagram Post arayüz (profil başlığı, kaydetme/beğeni butonları) katmanı.
- **Filmstrip & Long-Press Menüsü:** Kart üzerinde uzun basıldığında (`long-press` ~450ms) `01 Kapak Yap`, `Seriyi Bu Renge Eşitle (Hero Harmonize)` ve `Seriden Çıkar` seçenekleri.
- **Hero Renk Eşitleme:** Seçili karenin renk ve pozlama dengesini tüm seriye nazikçe (%20) işler; asla aşırı deformasyon yapmaz.
- **Kutsal Viewport Kuralı:** Düzenleme paneli açıldığında görsel sahnesi yukarı çekilir ve hafifçe küçülür (`scale(0.88)`), görsel asla panelin arkasında kaybolmaz.

### 2. Story Dump (9:16)
- **iPhone Mockup Sahnesi:** Dynamic Island ve yuvarlatılmış kasa sınırlarıyla gerçekçi dikey iPhone ekranı.
- **Akıllı Grid:** 2, 3, 4, 5 ve 6'lı otomatik kolaj şablonları.
- **Tekil "Space" Kontrolü:** Tek bir slider ile fotoğrafların hem kendi aralarındaki hem telefon kenarlarındaki boşluklarını yönetme.
- **Akıllı Gradyan:** Fotoğrafların kenar piksellerinden otomatik türetilen organik arka plan gradyanı; siyah, beyaz ve antrasit zemin seçenekleri.
- **İki Tıkla Swap:** Fotoğraflara sırayla dokunarak hücreler arasında anında yer değiştirme.

### 3. Minimal Çerçeve
- Tekil görsel için `Polaroid`, `Matte` ve `Akıllı Gradyan` çerçeveleri.
- Genişlik ve köşe yuvarlaklığı slider'ları.
- Günün tarihini taşıyan analog turuncu dijital tarih damgası toggle'ı.

### 4. Kayıpsız Upscale (Lanczos-3)
- Matematiksel $L(x) = \text{sinc}(x) \cdot \text{sinc}(x/3)$ 2-pass Lanczos konvolüsyon motoru (2x ve 4x büyütme).
- Kaydırılabilir Before/After Split View çizgisiyle canlı keskinlik analizi.

---

## 🚀 Sıfır Veri Sızıntılı Dışa Aktarma (Zero-Waste Export)

- **Instagram Post:** Tam **1080 × 1350 px** (`4:5`), %92 optimize JPEG.
- **Instagram Story:** Tam **1080 × 1920 px** (`9:16`).
- **Gizlilik:** GPS, cihaz seri numaraları ve özel EXIF verileri dışa aktarma anında otomatik soyutlanır.
- **JSZip:** Tüm seri `dump_01.jpg`, `dump_02.jpg` şeklinde sıralı isimlendirilerek tek tıkla `.zip` olarak indirilir.

---

## 🎨 Tasarım Sistemi: Curate Design System (CDS)

- **60:30:10 Kuralı:** %60 OLED Siyah (`#000000`), %30 Yükseltilmiş Panel (`#0f0f11` / `#18181b`), %10 Nötr Vurgu (Apple Sıcak Beyaz / Minimal Amber `#f5a623`).
- **Liquid Glass:** `backdrop-blur-xl`, `border-white/10`, rim light yansıması `inset 0 1px 0 rgba(255,255,255,0.12)`.
- **Tipografi:** Yalnızca Apple HIG standart sans-serif (`-apple-system, BlinkMacSystemFont, SF Pro, Inter`). Asla rastgele monospace font kullanılmaz.
- **Ergonomi:** Minimum 44×44px dokunma hedefleri (`touch-target`).

---

## 💻 Geliştirme & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Tip kontrolü ve üretim derlemesi
npx tsc --noEmit
npm run build
```
