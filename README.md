# Curate Studio — Minimalist Editorial Photo Darkroom (v0.1.0)

Curate Studio; Uğur'un kişisel, tek kullanıcılı ve **mobil öncelikli** aracıdır: bir fotoğrafı onarmak (Düzenle), büyütmek (Büyüt) ve çerçevelemek (Çerçeve) için hafif, istemci taraflı (Canvas & Web Worker) bir fotoğraf stüdyosudur. Fotoğraflar cihazda kalır; tek istisna Düzenle'deki AI onarımı (kullanıcı dokunuşuyla, tek fotoğraf, kendi proxy'miz üzerinden; model yalnız ışık/renk planı döndürür).

Ajan ve geliştirici için başlangıç: `AGENTS.md` (Claude için `CLAUDE.md`) → `docs/INDEX.md` → `docs/STATE.md`.

Apple Human Interface Guidelines (Spatial hiyerarşi), Raycast (ultra hızlı aksiyon & koyu tema kontrastı) ve VSCO (minimalist galeri & filmstrip) felsefesinin sentezidir.

---

## 🌟 Üç Modül

Son doğrulama: 2026-10-20 (kod okuma). Faz R (D37, commit `9afb9ae`) ile Carousel ve Story modülleri, Preset satırı, Kırp ve Düzeltme sekmeleri kaldırıldı.

### 1. Düzenle (AI Onar + Direktif, tek fotoğraf)
- **Direktif:** Serbest metin kutusu ve 5 hazır direktif (Patlak Işığı Topla, Özneyi Aydınlat, Pus Gider & Canlandır, Renk Kaymasını Nötrle, Gece & Gölge Detay).
- **İki aşama:** Önce cihazda fotoğrafın teknik şeması çıkarılır (`lib/engine/intelligent-repair.ts`). Sonra fotoğrafın küçük kopyası (uzun kenar ≤ 768, JPEG 0,8) direktif ve şemayla kendi proxy'miz (`/api/ai`) üzerinden Google Vertex'e gider; geri yalnız ışık/renk planı (JSON) gelir, görsel üretilmez. Yanıt gelmezse (bağlantı, kota, hata) yerel sezgisel plan kullanılır.
- **Uygulama:** Plan cihazda, şeritler hâlinde tam çözünürlükte uygulanır (`applyPlanInStrips`); sahneye basılı tutunca orijinal görünür; "Sıfırla" planı atar.
- **Export:** Tek dosya `curate_ai_repair_01.jpg`, fotoğrafın kendi çözünürlüğünde; önizleme ve export aynı plan ve aynı fonksiyon.

### 2. Büyüt (yerel Lanczos-3)
- 2× / 4×. Güvenli sınır: çıktının uzun kenarı en çok 8192 px ve alanı en çok 16 MP (varsayım); aşan çarpan kapanır ve "Bu boyut için çok büyük" yazar.
- Export her zaman worker'da 2 geçişli Lanczos-3 (`lib/engine/upscale-lanczos.ts`); dosya `curate_upscale_01.jpg`.
- Önce/sonra ayırıcı. "Standart Büyütme" önizlemesi orijinal görseli gösterir; "AI ile Büyüt" seçeneği yalnız önizlemede yerel bir kontrast ayarı (±%5) gösterir, ağa gitmez ve export'u değiştirmez.

### 3. Çerçeve (tekil ya da toplu)
- Stiller: Polaroid, Polaroid Geniş, Polaroid Kare, Mat (beyaz, krem, siyah, antrasit, özel), Gradyan (Akıllı Gradyan, Günbatımı, Derin Gece, Pastel). Akıllı gradyan fotoğrafın çerçeveyle buluşan kenarlarının renginden kurulur (D33).
- Kenar boşluğu ve köşe yuvarlaklığı kaydırıcıları; günün tarihini taşıyan turuncu tarih damgası.
- 10 standart oran (4:5, 1:1, 9:16, 3:4, 2:3, 5:4, 4:3, 3:2, 16:9, 1.91:1); "4K" ile kısa kenar 2160 (16:9 → 3840×2160). Önizleme ve export aynı çizim fonksiyonu (`lib/engine/frame-render.ts`).
- Birden çok fotoğraf varsa aynı stil hepsine uygulanır ve zip iner (`curate_frame_N.zip`, içinde `curate_frame_01.jpg`…).

### Ortak
- **Kutsal Viewport Kuralı:** Görsel header'ın ve panelin altında kalmaz (`design/CURATE_DESIGN_SYSTEM.md` §6). Son ölçüm Faz M1'de (eski modül seti, `docs/reports/2026-10-03-phases.md`); üç modüllü hâlde ve telefonda doğrulanmadı.

## 🚀 Dışa Aktarma

- **Kalite:** Varsayılan sRGB JPEG %97. Dosya 8 MB'ı aşarsa kalite kademeli düşer (%94, %91, …) ve export sayfasında gösterilir. PNG "Gelişmiş" altındadır. Kod şu an 8 MB sınırını Büyüt'e de uyguluyor (`platform="edit"`); bu D14 ile çelişir, açık hata olarak `docs/STATE.md`'de.
- **Gizlilik:** GPS, cihaz seri numaraları ve özel EXIF verileri dışa aktarma anında otomatik soyutlanır.
- **Format Desteği:** JPEG, PNG, WEBP; HEIC desteği cihazın yerel tarayıcı desteğine bağlıdır (harici JS decoder paketi bulunmamaktadır).
- **İndirme:** Tek görsel her zaman doğrudan dosya olarak iner; zip yalnız Çerçeve'de birden çok fotoğrafta.

## 🎨 Preset'ler

Preset motoru (`lib/engine/presets.ts`, 16 preset, 4 aile) kodda duruyor ama Faz R'den beri hiçbir modül arayüzde preset sunmuyor.

## 💾 Cihazda hatırlama

Fotoğraflar ve tercihler yalnız bu cihazda kalır: tercihler localStorage'da, fotoğraflar (isteğe bağlı, varsayılan açık) IndexedDB'de. Ana sayfadaki "Fotoğrafları bu cihazda hatırla" anahtarı kapatılınca cihazdaki kopyalar silinir. Sınır: 40 fotoğraf / 400 MB.

## 🧪 Referans Görseller

`public/reference-images/` altındaki 13 görsel sahip kararıyla repoda kalır. Kütüphane boş başlar. Ana sayfada (ikincil bağlantı) ve modül içi "+" menüsünde "Referans görsel yükle" eylemi vardır (çoklu seçim, "Hepsi"; Düzenle/Büyüt tek görsel, Çerçeve ve ana sayfa en çok 13). Görseller aynı kökten yüklenir, hiçbir yere gönderilmez.

`?perf=1` ile açılan küçük geliştirme göstergesi kare süresini, son önizleme çizim süresini ve uzun görev sayısını gösterir.

---

## 🎨 Tasarım Sistemi: Curate Design System (CDS)

- **Renk (Faz C):** OLED siyah zemin (`#000000`), nötr yüzeyler (`#1C1C1E`, `#2C2C2E`), tek ince ayırıcı (`#38383A`), yazı `#FFFFFF` / `#AEAEB2` / `#8E8E93` ve tek vurgu iOS mavisi (`#0A84FF`; dolgu zemini `#0071E3`). Vurgu yalnız seçili öğede, kaydırıcı dolgusunda, ana eylemde ve odak halkasında; fotoğraf üstündeki her katman renksiz.
- **Liquid Glass:** `backdrop-blur-xl`, ayırıcı kenar, rim light yansıması (ekranda en çok 3 cam yüzey).
- **Tipografi:** Apple cihazlarında SF, diğerlerinde `next/font` ile kendi alan adımızdan sunulan Inter; 12 px alt sınır; arayüzde monospace yok. Ayrıntı: `design/CURATE_DESIGN_SYSTEM.md` (v3).
- **Ana sayfa:** tek "Fotoğraf ekle" yüzeyi (dokun ya da sürükle bırak), üç modül kartı, tek güven rozeti ("Yerel ve gizli işleme"). Arayüz metinleri `lib/i18n/tr.ts`'te.
- **Ergonomi:** Minimum 44×44px dokunma hedefleri (`touch-target`).
- **Renk Kaynağı:** Renk paletinin koddaki mutlak tek kaynağı `app/globals.css` `:root` değişkenleridir (`tailwind.config.ts` yalnız bunlara bağlanır); export içeriği renkleri `lib/ui/colors.ts`'tedir. `design/tokens.curate.json` referans amaçlıdır.

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

# Build çıktısında sır taraması (build sonrası)
npm run check:secrets
```

- **Yoklama (geçici):** `/probe` sayfası (ana sayfadan linklenmez, PIN kapısının arkasında) ve `probe-apk/` (Expo, ayrı paket) telefonun kamera/donanım tavanını ölçer; ayrıntı ve silme koşulu `docs/probe/README.md`. Akış testi: `AUDIT_PIN=<test PIN> node scripts/probe-fake-camera.mjs`.
- **CI/CD:** GitHub Actions iş akışı (`.github/workflows/ci.yml`) `main`'e her push'ta ve pull request'te `tsc`, `lint`, `test` ve `build` kontrollerini otomatik çalıştırır.

