# CURATE STUDIO — AGENT DEVELOPMENT DIRECTIVE & OPERATING CONSTITUTION

Bu belge, Curate Studio kod tabanında çalışan tüm yapay zeka agent'ları (Cursor, Windsurf, Claude Code, Antigravity vb.) için bağlayıcı ana anayasadır. 
Herhangi bir geliştirme, refactor veya hata düzeltme işlemine başlamadan önce bu belgedeki kuralların okunması ve uygulanması zorunludur.

---

## 1. ÜRÜN VİZYONU & DEĞİŞMEZ KAPSAM (SCOPE LOCK)

Curate Studio; amatör fotoğrafçıların Instagram ve TikTok için hızlı, rafine ve tutarlı **Carousel Dump** ve **Story Dump** üretmesini sağlayan hafif, istemci taraflı (client-side) bir stüdyodur.

### Kesinlikle Kapsam Dışı Olanlar (YAPILMAYACAK):
- Halation (ışık haresi), prosedürel film greni, analog ışık sızıntısı (light leak), vinyet katmanları KODLANMAYACAKTIR.
- Kesintisiz Panorama Bölücü kaldırılmıştır; eklenmeyecektir.
- AI Inpainting / Outpainting bu fazda yoktur; Faz 2'ye kadar ertelenmiştir.
- Ağır piksel işleme filtreleri ve akordeon ayar labirentleri YASAKTIR.

### Temel 4 Modül Mimarisi:
Uygulama ana sayfada yalnızca 4 bağımsız stüdyo modülüne ayrılır:
1. **Carousel Dump (4:5):** Sıralanabilir filmstrip, Instagram/TikTok preview, nazik seri renk eşitleme (harmonize), global preset.
2. **Story Dump (9:16):** Gerçekçi iPhone ekranı kabuğu, Instagram Story overlay, 2–6'lı akıllı grid, tekil "Space" slider'ı, akıllı gradyan ve Polaroid çerçeve.
3. **Minimal Çerçeve:** Tek görsel için Polaroid, Matte ve Akıllı Gradyan çerçeve, isteğe bağlı günün analog tarih damgası.
4. **Kayıpsız Upscale:** Lanczos-3 matematiksel büyütme (2x/4x) ve Split View karşılaştırma.

---

## 2. ARAYÜZ VE TASARIM SİSTEMİ PROTOKOLÜ (CDS)

Tasarım sistemi otoritesi `design/CURATE_DESIGN_SYSTEM.md` belgesidir[cite: 28, 29]. Apple HIG, Raycast ve VSCO füzyonudur[cite: 28].

### Kutsal Viewport Kuralı (Mobile Stage Lock):
- Görsel sahnesi KUTSALDIR. Hiçbir panel, modal veya toolbar fotoğrafın üzerine binemez (`floating overlay over image` kesinlikle yasaktır).
- Mobilde (`sm:` altı) ekran `h-dvh` dikey flex alanına ayrılır. Alttaki düzenleme paneli açıldığında üstteki görsel sahnesi orantılı olarak küçülür (`transform: translateY(-8px) scale(0.88)` / `object-contain`), görsel engelsiz görünür kalır.
- Düzenleme moduna girildiğinde en alttaki Filmstrip dikey alan kazanmak için yumuşakça gizlenir; panel kapatıldığında geri gelir.

### Tipografi ve Renk Kuralları:
- **Font:** Sadece `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif`. Arayüz metinlerinde, başlıklarda veya butonlarda **asla daktilo tipi monospace font KULLANILAMAZ**[cite: 27, 28].
- **Renk Oranı:** %60 OLED Siyah (`#000000`), %30 Derin Yüzey (`#0f0f11`, `#18181b`), %10 Nötr Vurgu (Apple Sıcak Beyaz / Minimal Amber).
- Mor, sarı, yeşil gibi dağınık renk cümbüşleri YASAKTIR[cite: 28, 31]. Bütün buton ve aktif durumlar tekil aksan rengine bağlı kalacaktır[cite: 28, 30, 31].
- Debug amaçlı string kalıntıları (`Acik`, `Kapali`, `Proxy 864x1080` vb.) arayüze basılamaz[cite: 29, 30, 31].

---

## 3. RENDER, PERFORMANS VE İŞ AKIŞI PRENSİPLERİ

1. **60 FPS Reaktif Render:**
   - Slider etkileşimlerinde layout thrashing ve DOM reflow YASAKTIR.
   - Panel açılış/kapanışları yalnızca GPU dostu `transform: translate3d` ve `will-change: transform` ile yönetilir.
   - Slider sürüklenirken ağır hesaplamalar `requestAnimationFrame` (rAF) ile sınırlandırılır.

2. **Non-Destructive & Proxy İş Akışı:**
   - Ekranda gösterilen önizleme 1080p proxy görseldir; dışa aktarılırken Lanczos-3 orijinal tam piksellere uygulanır.
   - Her modül bağımsız katmanlı state tutar: Orijinal piksele asla yıkıcı (destructive) gömme yapılmaz.

3. **Akıllı Sıfırlama ve Eşitleme Mantığı:**
   - Bir preset seçildiğinde önceki preset'in üstüne binmez; görsel sıfırlanıp yeni preset uygulanır.
   - Seriden bir kare seçilip "Tüm Seriyi Bu Kareye Eşitle" dendiğinde sadece %15–%25 oranında nazik pozlama/renk sıcaklığı aktarılır. Başka kare seçilirse önceki eşitleme temizlenir.
   - Presetler veya renk eşitlemeleri ASLA kırpma (crop/ratio) değerlerini kopyalayamaz.

4. **Zero-Waste Export (Platform Standardı):**
   - Instagram Post: Tam **1080 × 1350 px** (`4:5`), %92 JPEG kalitesi.
   - Instagram / TikTok Story: Tam **1080 × 1920 px** (`9:16`).
   - Dışa aktarma anında EXIF/GPS verileri otomatik soyutlanır; dosyalar sıralı isimlendirilir (`dump_01.jpg`, `dump_02.jpg`).

---

## 4. AGENT ÇALIŞMA PROTOKOLÜ (MANDATORY VERIFICATION)

Herhangi bir agent kod yazdıktan veya değişiklik yaptıktan sonra şu adımları sırayla tamamlamadan görevi bitti sayamaz:

1. **Tip ve Derleme Kontrolü:**
   - `npx tsc --noEmit` çalıştırılmalı ve 0 hata vermelidir.
   - `npm run build` hatasız tamamlanmalıdır.
2. **Viewport Kontrolü:**
   - Yapılan değişikliğin mobil dikey görünümde görselin üstünü kapatmadığı kod düzeyinde doğrulanmalıdır.
3. **Temiz Diff:**
   - İlgisiz dosyalarda boşluk/biçimlendirme değişiklikleri yapılmamalı, commit mesajları `feat:`, `fix:`, `refactor:` standartlarına uymalıdır.