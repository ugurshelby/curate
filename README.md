# Curate Studio — Minimalist Editorial Photo Darkroom (v0.1.0)

Curate Studio; Uğur'un kişisel, tek kullanıcılı ve **mobil öncelikli** aracıdır: Instagram ve TikTok için hızlı, rafine ve tutarlı **Carousel Dump** ve **Story Dump** üretmek için hafif, tamamen istemci taraflı (Client-Side / HTML5 Canvas & Web Worker) bir fotoğraf stüdyosudur.

Apple Human Interface Guidelines (Spatial hiyerarşi), Raycast (ultra hızlı aksiyon & koyu tema kontrastı) ve VSCO (minimalist galeri & filmstrip) felsefesinin sentezidir.

---

## 🌟 Temel 4 Stüdyo Modülü

### 1. Carousel Dump (4:5)
- **Sahne Mimarisi:** Varsayılan 4:5 Fill modu, tek tıkla Fit/Fill geçişi, izole wheel zoom.
- **Platform Safe-Zone:** Yarı saydam göz ikonuyla Instagram Post arayüz (profil başlığı, kaydetme/beğeni butonları) katmanı.
- **Filmstrip & İşlem Menüsü:** Kart üzerinde masaüstünde sağ tık, mobilde çift dokunma (~320ms) ile `Kapak yap`, `Seriyi bu renge eşitle (Hero Harmonize)` ve `Seriden çıkar`. Sıralama: dokunmatikte basılı tut (350ms) ve sürükle, farede sürükle.
- **Düzenleme Paneli:** Preset'ler yatay kaydırmalı tek satır, kartlarda seçili fotoğrafın küçük önizlemesi; `.cube` LUT ve Hero Harmonize kapalı "Araçlar" bölümünde. Instagram/TikTok hedef geçişi sahnenin altında (varsayılan Instagram); göz düğmesi platform arayüz katmanını gizler/gösterir (katman export'a hiçbir zaman yazılmaz).
- **Hero Renk Eşitleme:** Seçili karenin renk ve pozlama dengesini tüm seriye nazikçe (%20) işler; asla aşırı deformasyon yapmaz.
- **Kutsal Viewport Kuralı:** Görsel, düzenleme panelinin/header'ın/filmstrip'in altında kalmaz (`design/CURATE_DESIGN_SYSTEM.md` §6). Faz M1'de 360×740, 390×844 ve 430×932'de dört modülde ölçüldü, örtüşme 0 (`docs/reports/2026-10-03-phases.md`). Telefonda doğrulanmadı.

### 2. Story Dump (9:16)
- **iPhone Mockup Sahnesi:** Dynamic Island ve yuvarlatılmış kasa sınırlarıyla dikey telefon ekranı; sahneye sığacak şekilde ölçeklenir. Instagram story güvenli alanı gösterilir (platform geçişi yok).
- **Otomatik Grid:** Story en az 2, en fazla 6 fotoğraf alır; grid sayısı fotoğraf sayısına eşittir (kullanıcı seçmez). 2'den azsa Export kapalıdır ("En az 2 fotoğraf ekle"); 6 doluyken ekleme kapanır, fazlası alınmaz.
- **Güvenli Alan:** Hücreler Story'nin üst (ilerleme çubuğu, hesap satırı) ve alt (mesaj çubuğu) bantlarının dışında kalır; export aynı geometriyi kullanır (bant yüksekliği 250 px, sahip onaylı; telefonda karşılaştırılmadı).
- **Hücre Başına Kadraj:** Sürükleyerek konumlandırma, iki parmakla yakınlaştırma (kenarda rubber-band), seçili hücrede "Değiştir" ve "Sıfırla". Konum ve yakınlaştırma export'a birebir yansır.
- **Boşluk:** Tek bir slider ile fotoğrafların hem kendi aralarındaki hem telefon kenarlarındaki boşluklarını yönetme.
- **Akıllı Gradyan:** Fotoğrafların kenar piksellerinden otomatik türetilen organik arka plan gradyanı; siyah, beyaz ve antrasit zemin seçenekleri.
- **İki Dokunuşla Takas:** Bir hücreyi seçip başka bir hücreye dokunmak yerlerini değiştirir.

### 3. Minimal Çerçeve
- Tekil görsel için `Polaroid`, `Matte` ve `Akıllı Gradyan` çerçeveleri.
- Genişlik ve köşe yuvarlaklığı slider'ları.
- Günün tarihini taşıyan analog turuncu dijital tarih damgası toggle'ı.

### 4. Kayıpsız Upscale (Lanczos-3)
- Güvenli sınır: çıktının uzun kenarı en çok 8192 px (varsayım); aşan çarpan kapanır ve "Bu boyut için çok büyük" yazar.
- Matematiksel $L(x) = \text{sinc}(x) \cdot \text{sinc}(x/3)$ 2-pass Lanczos konvolüsyon motoru (dışa aktarmada gerçek kayıpsız 2x ve 4x büyütme).
- Kaydırılabilir Before/After Split View çizgisiyle keskinlik önizlemesi (önizleme hızlı kontrast simülasyonu, export anında tam Lanczos-3 render).

---
### 5. Düzenle (tek fotoğraf)
- **Preset:** Yatay preset satırı (fotoğrafın kendi önizlemesiyle) ve tek "Miktar" kaydırıcısı. Carousel ile aynı render adımları.
- **Kırp:** Serbest, Orijinal, 1:1, 4:5, 9:16, 16:9; çerçeve sabit, fotoğraf altında sürüklenir ve iki parmakla yakınlaşır (Story ile ortak hareket kodu, kenarda rubber-band); Serbest oranda köşeden boyutlanır; 90° döndürme, −10°…+10° ufuk düzeltme, yatay çevirme.
- **Önce/sonra:** Preset sekmesinde sahneye basılı tut → kırpılmamış, preset'siz orijinal.
- **Export:** Tek dosya `duzenle_01.jpg`, kırpımın kendi çözünürlüğünde (uzun kenar en çok 4096 px, varsayım), JPEG %97, 8 MB üstünde basamaklı düşüş.
- **Büyüt:** Düzenlenmiş hâli yeni fotoğraf olarak ekleyip Upscale'i onunla açar.
- Düzeltme sekmesi (Faz D2) henüz yok.

## 🚀 Dışa Aktarma

- **Instagram Post:** Tam **1080 × 1350 px** (`4:5`).
- **TikTok (Carousel hedefi):** **1080 × 1920 px** (`9:16`) — sahip varsayımı, telefonda doğrulanmadı. Carousel'deki Instagram/TikTok geçişi önizlemeyi ve export'u birlikte belirler; TikTok arayüz güvenli alanı yalnız önizlemede görünür.
- **Instagram Story:** Tam **1080 × 1920 px** (`9:16`).
- **Kalite:** Varsayılan sRGB JPEG %97. Dosya 8 MB'ı aşarsa kalite kademeli düşer (%94, %91, …) ve export sayfasında gösterilir. PNG "Gelişmiş" altındadır. Upscale platform hedefi olmadığı için 8 MB sınırı uygulanmaz.
- **Gizlilik:** GPS, cihaz seri numaraları ve özel EXIF verileri dışa aktarma anında otomatik soyutlanır.
- **Format Desteği:** JPEG, PNG, WEBP; HEIC desteği cihazın yerel tarayıcı desteğine bağlıdır (harici JS decoder paketi bulunmamaktadır).
- **İndirme:** Tek görsel her zaman doğrudan dosya olarak iner (`dump_01.jpg`, `tiktok_01.jpg`, `story_01.jpg`, `frame_01.jpg`, `duzenle_01.jpg`). Zip yalnız çoklu Carousel serisinde: `dump_N.zip` / `tiktok_N.zip`, içinde `dump_01.jpg`, `dump_02.jpg`…

## 🧪 Referans Görseller

`public/reference-images/` altındaki 13 görsel sahip kararıyla repoda kalır. Kütüphane boş başlar. Ana sayfada ve modül içi "+" menüsünde ikincil "Referans Görsel Yükle" eylemi vardır (çoklu seçim, "Hepsi"; Story en çok 6, Çerçeve/Upscale tek görsel). Görseller aynı kökten yüklenir, hiçbir yere gönderilmez.

`?perf=1` ile açılan küçük geliştirme göstergesi kare süresini, son önizleme çizim süresini ve uzun görev sayısını gösterir.

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

