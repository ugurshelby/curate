# Curate Studio — Minimalist Editorial Photo Darkroom (v0.1.0)

Curate Studio; Uğur'un kişisel, tek kullanıcılı ve **mobil öncelikli** aracıdır: Instagram ve TikTok için hızlı, rafine ve tutarlı **Carousel Dump** ve **Story Dump** üretmek için hafif, tamamen istemci taraflı (Client-Side / HTML5 Canvas & Web Worker) bir fotoğraf stüdyosudur.

Apple Human Interface Guidelines (Spatial hiyerarşi), Raycast (ultra hızlı aksiyon & koyu tema kontrastı) ve VSCO (minimalist galeri & filmstrip) felsefesinin sentezidir.

---

## 🌟 Temel 4 Stüdyo Modülü

### 1. Carousel Dump (4:5)
- **Sahne Mimarisi:** Varsayılan 4:5 Fill modu, tek tıkla Fit/Fill geçişi, izole wheel zoom.
- **Platform Safe-Zone:** Yarı saydam göz ikonuyla Instagram Post arayüz (profil başlığı, kaydetme/beğeni butonları) katmanı.
- **Filmstrip & İşlem Menüsü:** Kart üzerinde masaüstünde sağ tık, mobilde çift dokunma (`double-tap` ~320ms) ile `01 Kapak Yap`, `Seriyi Bu Renge Eşitle (Hero Harmonize)` ve `Seriden Çıkar` seçenekleri.
- **Hero Renk Eşitleme:** Seçili karenin renk ve pozlama dengesini tüm seriye nazikçe (%20) işler; asla aşırı deformasyon yapmaz.
- **Kutsal Viewport Kuralı (hedef):** Görsel, düzenleme panelinin/header'ın/filmstrip'in altında kalmaz (`design/CURATE_DESIGN_SYSTEM.md` §6). **Güncel durum:** 390×844'te panel açıkken ihlal ediliyor (2026-10-02 ölçümü, `docs/reports/2026-10-02-audit.md` §1); düzeltme bekliyor.

### 2. Story Dump (9:16)
- **iPhone Mockup Sahnesi:** Dynamic Island ve yuvarlatılmış kasa sınırlarıyla gerçekçi dikey iPhone ekranı.
- **Grid:** 2, 3, 4, 5 ve 6'lı kolaj şablonları. Bugün grid sayısını kullanıcı seçiyor; **planlanan (Faz S):** grid sayısı fotoğraf sayısına eşit ve otomatik, Story en az 2 en fazla 6 fotoğraf alır.
- **Tekil "Space" Kontrolü:** Tek bir slider ile fotoğrafların hem kendi aralarındaki hem telefon kenarlarındaki boşluklarını yönetme.
- **Akıllı Gradyan:** Fotoğrafların kenar piksellerinden otomatik türetilen organik arka plan gradyanı; siyah, beyaz ve antrasit zemin seçenekleri.
- **İki Tıkla Swap:** Fotoğraflara sırayla dokunarak hücreler arasında anında yer değiştirme.

### 3. Minimal Çerçeve
- Tekil görsel için `Polaroid`, `Matte` ve `Akıllı Gradyan` çerçeveleri.
- Genişlik ve köşe yuvarlaklığı slider'ları.
- Günün tarihini taşıyan analog turuncu dijital tarih damgası toggle'ı.

### 4. Kayıpsız Upscale (Lanczos-3)
- Matematiksel $L(x) = \text{sinc}(x) \cdot \text{sinc}(x/3)$ 2-pass Lanczos konvolüsyon motoru (dışa aktarmada gerçek kayıpsız 2x ve 4x büyütme).
- Kaydırılabilir Before/After Split View çizgisiyle keskinlik önizlemesi (önizleme hızlı kontrast simülasyonu, export anında tam Lanczos-3 render).

---

## 🚀 Sıfır Veri Sızıntılı Dışa Aktarma (Zero-Waste Export)

- **Instagram Post:** Tam **1080 × 1350 px** (`4:5`), %92 optimize JPEG.
- **Instagram Story:** Tam **1080 × 1920 px** (`9:16`).
- **Planlanan (Faz S, sahip kararı 2026-10-02):** Carousel'de Instagram/TikTok geçişi export hedefini de belirler. TikTok 1080 × 1920 (9:16, telefonda doğrulanmadı), dosya adı `tiktok_01.jpg`. Tek görsel doğrudan dosya olarak iner, zip yalnız çoklu Carousel serisinde. Varsayılan JPEG 0.97; PNG "Gelişmiş" altında.
- **Gizlilik:** GPS, cihaz seri numaraları ve özel EXIF verileri dışa aktarma anında otomatik soyutlanır.
- **Format Desteği:** JPEG, PNG, WEBP; HEIC desteği cihazın yerel tarayıcı desteğine bağlıdır (harici JS decoder paketi bulunmamaktadır).
- **JSZip:** Tüm seri `dump_01.jpg`, `dump_02.jpg` şeklinde sıralı isimlendirilerek tek tıkla `.zip` olarak indirilir.

## 🧪 Referans Görseller

`public/reference-images/` altındaki 13 görsel sahip kararıyla repoda kalır. Kütüphane boş başlar. **Planlanan (Faz M1):** ana sayfada ve modül içi "+" menüsünde ikincil "Referans Görsel Yükle" eylemi; görseller aynı kökten yüklenir, hiçbir yere gönderilmez.

---

## 🎨 Tasarım Sistemi: Curate Design System (CDS)

- **60:30:10 Kuralı:** %60 OLED Siyah (`#000000`), %30 Yükseltilmiş Panel (`#0f0f11` / `#18181b`), %10 Nötr Vurgu (Apple Sıcak Beyaz / Minimal Amber `#f5a623`).
- **Liquid Glass:** `backdrop-blur-xl`, `border-white/10`, rim light yansıması `inset 0 1px 0 rgba(255,255,255,0.12)`.
- **Tipografi:** Yalnızca Apple HIG standart sans-serif (`-apple-system, BlinkMacSystemFont, SF Pro, Inter`). Asla rastgele monospace font kullanılmaz.
- **Ergonomi:** Minimum 44×44px dokunma hedefleri (`touch-target`).
- **Renk Kaynağı:** Renk paletinin koddaki mutlak tek kaynağı `tailwind.config.ts` ve `app/globals.css` dosyalarıdır. `design/tokens.curate.json` referans amaçlıdır.

---

## 💻 Geliştirme & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Mantık testlerini çalıştırın (Vitest)
npm test

# Tip kontrolü, lint ve üretim derlemesi
npx tsc --noEmit
npm run lint
npm run build
```

- **CI/CD:** GitHub Actions iş akışı (`.github/workflows/ci.yml`) pull request aşamasında `tsc`, `lint`, `test` ve `build` kontrollerini otomatik çalıştırır.

