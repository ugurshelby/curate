# Curate Studio — Günlük Geliştirme Logu

## 2026-10-01: Spec v1.0 Bulgularının Kapatılması ve Doğrulanması

### 1. Kapsam ve Yapılan Düzeltmeler

#### A. Carousel fitMode ve Zemin Rengi Eşitlemesi
- **Sorun:** Carousel modunda Fit seçildiğinde export işlemi daima Fill (cover kırpma) yapıyordu ve önizlemedeki `#0a0a0c` arka plan rengi yansımıyordu.
- **Çözüm:** `components/studio/CarouselStudio.tsx` içerisindeki `getExportBlob` fonksiyonu güncellendi.
  - `fitMode === "fit"` olduğunda 1080x1350 tuval önizleme sahnesiyle birebir eşleşen `#0a0a0c` rengiyle dolduruldu.
  - Görselin en-boy oranı ile 4:5 hedef oranı kıyaslanarak letterbox/pillarbox yerleşim koordinatları (`targetX`, `targetY`, `targetDrawW`, `targetDrawH`) hesaplandı.
  - Renk harmonize, LUT ve Preset filtreleri yalnızca fotoğraf alanına uygulandı; zemin pikselleri kirlenmeden korundu.
  - `fitMode === "fill"` durumunda mevcut 4:5 cover kırpma davranışı korundu.

#### B. Story 5'li Grid Önizleme ve Export Geometrisi Eşliği
- **Sorun:** Story 5'li grid düzeninde export tarafında 5. görsel 3. satırda tam genişlik (`usableW`) kaplarken, önizleme tarafında `grid-rows-3 grid-cols-2` içerisinde tek sütun kaplayarak sağ tarafında boş hücre bırakıyordu.
- **Çözüm:** `components/studio/StoryStudio.tsx` önizleme JSX'inde `slotCount === 5 && idx === 4` hücresine `col-span-2` eklendi.
  - Böylece 3. satır tam genişlik kaplayarak önizleme ile export geometrisi 100% eşitlendi.
  - Boş hücre kalmayan, dengeli editoryal düzen sağlandı.

#### C. QuickExportSheet PNG / JPEG Formatı Yayılımı
- **Sorun:** QuickExportSheet üzerinde kullanıcı JPEG ya da PNG seçebilmesine rağmen export fonksiyonları hep sabit JPEG üretiyordu ve zip dosya uzantıları `.jpg` kalıyordu.
- **Çözüm:**
  - `lib/export/zip-packager.ts`: `item.blob.type === 'image/png' ? 'png' : 'jpg'` kuralı ile zip içi dosya uzantıları dinamikleştirildi.
  - `components/studio/QuickExportSheet.tsx`: `item.getBlob(format)` ile format argümanı iletildi, zip indirme adına format etiketi eklendi.
  - `CarouselStudio.tsx`, `StoryStudio.tsx`, `FrameStudio.tsx`, `UpscaleStudio.tsx`: `getExportBlob` imzalarına `format: "jpeg" | "png" = "jpeg"` parametresi eklendi, `canvas.toBlob` MIME tipi (`image/png` / `image/jpeg`) seçilen formata bağlandı.

---

### 2. Doğrulama ve Test Sonuçları

- **TypeScript Kontrolü (`npx tsc --noEmit`):**
  - Hata sayısı: 0 (Temiz).
- **Üretim Derlemesi (`npm run build`):**
  - Next.js 14.2.35 derlemesi 0 hata ile tamamlandı, 4/4 statik rota derlendi.
- **Çalıştırılarak Yapılan Fonksiyonel Doğrulamalar (`scratch/verify-spec-fixes.mjs`):**
  - **PNG / JPEG:** Mock bloblarla çalıştırıldı. `dump_01.jpg` ve `dump_02.png` üretildi, `sanitizeImageBlob` ve `packageDumpZip` mime tipini ve uzantısını başarıyla doğruladı.
  - **Carousel Fit:** 1920x1080 yatay görsel için üst/alt letterbox (371px offset, 608px yükseklik, `#0a0a0c` zemin), 1080x1920 dikey görsel için sol/sağ pillarbox (161px offset, 759px genişlik) matematiksel olarak doğrulandı.
  - **Story 5'li Grid:** 1-4 hücreler 2x2 grid, 5. hücre 3. satır tam genişlik (`usableW: 1024px`, `colSpan: 2`) olarak çalıştırıldı ve boş hücre kalmadığı teyit edildi.
- **Export Pipeline Bütünlüğü:**
  - Hero harmonize, .CUBE LUT, presets, analog turuncu tarih damgası ve Lanczos-3 pipeline'larının kesintisiz çalıştığı doğrulandı.

---

### 3. Başlangıç State'indeki 7 Referans Görsel Tespiti
- **Gözlem:** `lib/core/state-machine.ts` içindeki `DEFAULT_REFERENCE_PHOTOS` (p1-p7), `INITIAL_ITEMS` olarak atanmış durumda. Kullanıcı stüdyo modüllerini açtığında ya da Hub'dan fotoğraf yüklediğinde (`addItems` listenin sonuna eklediği için) bu 7 görsel filmstrip ve grid'de gerçek kullanıcıya görünmektedir.
- **Değerlendirme:** `curate-spec-v1.md` dokümanına göre Curate, kullanıcının kendi fotoğraflarını yükleyip tek tıkla işlediği kişisel bir araçtır; spec'te varsayılan mock fotoğraflar yer almamaktadır. Bu 7 görsel, geliştirme sürecinde arayüzün boş kalmaması için eklenmiş **geliştirme kalıntısı (mock / seed data)** niteliğindedir.
- **İşlem:** Talimat doğrultusunda bu turda herhangi bir değişiklik yapılmamış, durum tespit olarak kayıt altına alınmıştır.
