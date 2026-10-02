# Curate Design System (CDS) — Sistem Mimarisi & Tasarım Şartnamesi

> **Versiyon:** 1.0.0 · **Tarih:** 2026-09-27  
> **Konum:** `design/CURATE_DESIGN_SYSTEM.md`  
> **Bağlayıcılık Derecesi:** Mutlak Otorite (Tüm frontend/backend UI geliştirme süreçlerinde birincil referans).  
> **Temel Genetik:** Apple Human Interface Guidelines (Spatial & Dokunsal zarafet) + Raycast (60 FPS, ultra-hızlı aksiyon & yüksek kontrast) + VSCO (Minimalist fotoğraf kontakt baskı & galeri kürasyonu).

---

## 1. Tasarım Felsefesi & Estetik Genetik

Curate, yüksek zevke sahip fotoğrafçılar, küratörler ve dijital yaratıcılar için tasarlanmış bir stüdyo arayüzüdür. Üç temel okulun sentezidir:

1. **Apple HIG (Görünmez Arayüz & Spatial Derinlik):**
   - Arayüz asla fotoğrafın önüne geçmez. İçerik (görsel) sahnedeki tek kahramandır.
   - Mikroskobik yarıçaplar, incecik 1px sınır çizgileri (hairline borders), doğal yay fiziği (spring animations).
2. **Raycast (Aksiyon Önceliği & Koyu Kontrast):**
   - Sıfır gecikme, gereksiz DOM yükünden arındırılmış temiz yapı.
   - Monokrom koyu zemin üzerinde jilet gibi keskin tipografi ve net ayrıştırılmış derinlik katmanları.
3. **VSCO (Analog Ruh & Minimalist Galeri):**
   - Geniş negatif alanlar, fotoğrafları nefes aldıran boşluklar, filmstrip / contact sheet akışları ve fonksiyonel kontrol düğmeleri.

---

## 2. 60:30:10 Renk Matrisi & OLED Koyu Tema Hiyerarşisi

Curate arayüzü katı bir **60:30:10** kuralıyla yönetilir:

```
┌─────────────────────────────────────────────────────────────┐
│ %60 DERİN OLED SİYAH (Zemin & Canvas: #000000)             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ %30 NÖTR KOYU YÜZEY (#0f0f11 elevated / #18181b sheet)│  │
│  │   ┌─────────────────────────────────────────────────┐ │  │
│  │   │ %10 VURGU (#f5f5f7 Warm White / #f5a623 Amber)   │ │  │
│  │   └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| Katman Oranı | Token / Değer | Kullanım Alanı | Açıklama |
|---|---|---|---|
| **%60 Zemin (Base)** | `surface-base` (`#000000`) | Canvas, ana viewport, arka plan | Sonsuz derinlik sağlayan saf OLED siyah. Fotoğrafın sınırlarını serbest bırakır. |
| **%30 Yüzey (Elevated)** | `surface-elevated` (`#0f0f11`)<br>`surface-overlay` (`#18181b`) | Kartlar, bento grid modülleri, floating toolbar, alt paneller (bottom sheets) | %60 zeminden 1px `border-white/8` ile ayrılan, derinliği oluşturan nötr koyu yüzeyler. |
| **%10 Vurgu (Accent)** | `accent-warm-white` (`#f5f5f7`)<br>`accent-amber` (`#f5a623`) | Aktif seçimler, kritik butonlar, durum noktaları, slider kulakçıkları | Tekil ve seyrek kullanılır. Her yerde renk kullanımı arayüzün ciddiyetini bozar. Amber, tekil işlem durumlarını belirtir. |

> **Kod Tabanı Doğruluk Kaynağı:** Renk tanımlarının aktif koddaki mutlak tek kaynağı `tailwind.config.ts` ve `app/globals.css` dosyalarıdır. `design/tokens.curate.json` referans amaçlıdır ve kod tarafından doğrudan import edilmez.

### Metin Renk Hiyerarşisi
- **Primary Text (`#f5f5f7`):** Apple Warm White — başlıklar, aktif etiketler, yüksek kontrastlı ana veri.
- **Secondary Text (`#a1a1aa`):** Neutral 400 — açıklama metinleri, standart buton etiketleri.
- **Muted Text (`#71717a`):** Neutral 500 — EXIF verisi, boyut bilgisi, pasif kılavuzlar.
- **Disabled Text (`#3f3f46`):** Neutral 700 — kullanım dışı kontroller.

---

## 3. Tipografi İlkeleri

> **YASAK:** Arayüzün genelinde veya etiketlerde rastgele monospaced font kullanılmaz. Monospaced fontlar yalnızca kesin ölçü gerektiren sayısal değerlerde (zoom yüzdesi, timestamp, piksel koordinatı) `tabular-nums` amacıyla kullanılır.

- **Birincil Font Ailesi:** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif`
- **İkincil Sayısal Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` (Sadece EXIF/puanlama pencerelerinde).

### Boyut & Ağırlık Hiyerarşisi
1. **Display / Hero:** 24px–32px | Weight: `600` (SemiBold) | Letter-spacing: `-0.03em`
2. **Title / Section Header:** 16px–18px | Weight: `500` (Medium) | Letter-spacing: `-0.02em`
3. **Body / Interface Label:** 13px–14px | Weight: `400` (Regular) veya `500` (Medium) | Letter-spacing: `-0.01em`
4. **Caption / Micro Badge:** 11px–12px | Weight: `500` (Medium) | Letter-spacing: `0.02em` (Genişletilmiş izleme)

---

## 4. Spatial & Radius Ölçekleri

Elemanların iç içe geçişlerinde radius orantısı korunur (Parent Radius = Child Radius + Padding):

- **`radius-sm` (8px):** İç butonlar, badge'ler, minyatür seçiciler.
- **`radius-md` (12px):** Standart butonlar, input alanları, segment kontrollü sekmeler.
- **`radius-lg` (18px):** Yüzen araç çubukları (floating toolbars), kartlar, açılır popover pencereleri.
- **`radius-sheet` (28px):** Mobil alt paneller (bottom sheets), tam ekran modal kartları, stüdyo çerçevesi.
- **`radius-full` (9999px):** Pill tarzı hızlı durum göstergeleri, simge rozetleri.

---

## 5. Liquid Glass (Cam Efekti) Standartları

Cam efektleri sadece yükseltilmiş (floating) ve arkasında görsel geçen katmanlarda uygulanır:

- **Arka Plan Dolgusu:** `rgba(15, 15, 17, 0.72)` (OLED uyumlu yarı saydam koyuluk)
- **Filtre:** `backdrop-blur(20px)` (Performans için `backdrop-blur-xl` sınırı aşılmaz)
- **Kenarlık (Border):** `1px solid rgba(255, 255, 255, 0.08)`
- **Işık Yansıması (Rim Light):** `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.5)`
- **GPU Optimizasyonu:** `transform: translate3d(0, 0, 0)` ve `will-change: transform` ile GPU katmanında render edilir. Aynı ekranda 3'ten fazla cam yüzey açılmaz.

---

## 6. Mobil Viewport & Düzenleme Modu Davranış Protokolü

> **KRİTİK ERGONOMİK KURAL:** Düzenleme (edit/studio) modunda görsel, alt panelin (sheet) ya da kontrol barlarının altında KESİNLİKLE EZİLMEZ veya GİZLENMEZ.

### Viewport Güvenli Alan Mimarisi:
1. **Dinamik Çalışma Alanı (`canvas-viewport`):**
   - Canvas ve fotoğraf görüntüleyici, ekrandaki yüzen barların (Header, Bottom Sheet, Floating Pill) işgal ettiği yükseklikleri hesaplayarak aradaki güvenli alana yerleşir.
   - Mobilde alt panel açıldığında, görsel alanı daralır (`padding-bottom: env(safe-area-inset-bottom, 34px) + sheetHeight`) ve görsel merkezde kalacak şekilde scale edilir.
2. **Dokunmatik Hedefleri (Touch Targets):**
   - Tüm etkileşimli alanlar minimum **44×44px** dokunma alanına (`min-w-[44px] min-h-[44px]`) sahip olmalıdır. İkon 18px olsa bile tıklanabilir alan 44px'dir.
3. **Hover & Touch Ayrımı:**
   - `:hover` durumları yalnızca `@media (hover: hover) and (pointer: fine)` içinde çalışır.
   - Dokunmatik ekranlarda (`pointer: coarse`) yapışkan hover oluşmaması için `:active` ile `scale(0.97)` mikro dokunma tepkisi verilir.

---

## 7. Hareket & Animasyon Kuralları (Emil Kowalski Standartları)

Animasyonlar süs değil, uzamsal mantık ve dokunsal geri bildirim sağlar:

1. **Yasaklar:**
   - Sık yapılan işlemlerde (klavye kısayolu, araç seçimi) geciktirici animasyon yapılmaz.
   - `width`, `height`, `top`, `left` animasyonları yasaktır (Layout Thrashing önlenir).
   - Yalnızca `transform` ve `opacity` özellikleri canlandırılır.
2. **Zamanlama Fonksiyonları:**
   - **iOS Doğal Yay (Sheet & Panel Açılışları):** `cubic-bezier(0.32, 0.72, 0, 1)` | 380ms
   - **Hızlı Geri Bildirim (Buton Basımı & Toggle):** `cubic-bezier(0.16, 1, 0.3, 1)` | 150ms–250ms
3. **Reduced Motion:**
   - `@media (prefers-reduced-motion: reduce)` altında tüm geçiş süreleri `0ms`'ye çekilir veya yumuşak bir fade'e dönüştürülür.

---

## 8. Test & Kalibrasyon Seti Uyumluluğu

CDS bileşenleri, `curate/design/reference-images/` klasöründeki test fotoğraflarına göre kalibre edilmiştir:

- **Yüksek Parlaklıkta Sahne (`gun-batimi-gunese-dokunan-eleman.jfif`, `gol-evi.jfif`):**
  - Cam panellerin ve kontrollerin arka planındaki fotoğrafın parlaklığına karşı `border-white/10` ve `bg-black/60` karartma oranları test edilmiştir; beyaz zeminlerde butonlar kaybolmaz.
- **Koyu & Yüksek Kontrastlı Gece Sahneleri (`ic-mekan-bar.jfif`, `sehir-isiklari-otoyol.jfif`):**
  - Amber vurgusu (`#f5a623`) ve OLED siyah zemin, gece fotoğraflarının derinliğini bozmadan net okunabilirlik sağlar.
- **Minimal Mimari & Portre (`tabela.jfif`, `kovboy.jfif`):**
  - İnce tipografi ve çerçeveleme ızgaraları fotoğrafın kompozisyonuna engel olmayacak şeffaflıktadır.

---

## 9. Uygulama Entegrasyon Eşlemesi

| Tasarım Sistemi | Tailwind Sınıfı | Global CSS Değişkeni |
|---|---|---|
| Zemin Siyahı | `bg-surface-base` | `--surface-base: #000000;` |
| Yükseltilmiş Panel | `bg-surface-elevated` | `--surface-elevated: #0f0f11;` |
| Yüzen Sheet / Popover | `bg-surface-overlay` | `--surface-overlay: #18181b;` |
| Mikro Sınır | `border-border-subtle` | `--border-subtle: rgba(255,255,255,0.08);` |
| Apple Warm White | `text-accent-warm` | `--accent-warm: #f5f5f7;` |
| Minimal Amber | `text-accent-amber`, `bg-accent-amber` | `--accent-amber: #f5a623;` |
| Cam Panel | `glass-panel` | `.glass-panel { ... }` |
| Dinamik Canvas Alanı | `canvas-viewport` | `.canvas-viewport { ... }` |
