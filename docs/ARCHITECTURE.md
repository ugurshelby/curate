# Mimari (ARCHITECTURE)

Kısa ve olgusal. Her bölümde "Son doğrulama". Ayrıntılı ölçüm geçmişi: `docs/reference/curate-reference.md`.

## 1. Yığın
Son doğrulama: 2026-10-08

Next.js 14.2 (App Router, tek sayfa `app/page.tsx` + tek sunucu rotası `app/api/ai/route.ts`), React 18, TypeScript (strict), Tailwind 3.4, `jszip`, `lucide-react`. Test: Vitest. Tarayıcı denetimi: `puppeteer-core` + yerel Chromium (`scripts/audit-ui.mjs`, `scripts/capture-screens.mjs`). Canvas 2D; WebGL yok.

Modül geçişi tek sayfada bileşen durumuyla yapılır (`app/page.tsx`); rota yok. Durum: `lib/core/state-machine.ts` (başsız store) + `useStudio` (`useSyncExternalStore`).

## 2. Render hattı: taban + görünüm
Son doğrulama: 2026-10-08

| Modül | Önizleme | Export | Ortak fonksiyon |
|---|---|---|---|
| Carousel | `CarouselPreviewRenderer` (canvas, 1080×1350 veya 1080×1920; kaydırıcı sürüklenirken yarı boyut) | `drawCarouselFrame` aynı seçeneklerle, tam boyut | `lib/engine/carousel-render.ts`: adım 1 `renderCarouselBase` (zemin + kırp/sığdır + seri uyumu), adım 2 `applyCarouselLook` (preset veya `.cube`). Parite: `tests/carousel-parity.test.ts` (0 bayt fark) |
| Düzenle | Aynı renderer, taban adımında kırp geometrisi (`crop`), uzun kenar 1350 | `drawCarouselFrame`, kırpımın kendi boyutu (≤ 4096) | `lib/engine/edit-geometry.ts` `drawEditGeometry` |
| Story | DOM (hücre başına `<img>` + CSS dönüşüm) | Canvas 1080×1920 | Geometri ortak: `computeStoryCells`, `computeCellDraw` (`lib/engine/story-layout.ts`). Piksel paritesi yok, geometri paritesi var |
| Çerçeve | DOM | Canvas 1080×1350 | Renkler `lib/ui/colors.ts`; çizim kodu modül içinde |
| Büyüt | CSS (yalnız önizleme, "Lanczos" diye etiketlenmez) | Lanczos-3 (2 geçiş), worker'da | `lib/engine/upscale-lanczos.ts` |

Kural: önizleme ve export aynı çizim fonksiyonunu aynı parametre şemasıyla çağırır (AGENTS.md §4). Story/Çerçeve/Büyüt'te bu kural geometri düzeyinde sağlanıyor; piksel düzeyinde değil (bilinen sınır).

Önizleme bir kez çözülmüş orijinalden çizilir; taban adımı (boyut, sığdırma, uyum, kırp anahtarıyla) önbelleklenir, kaydırıcı yalnız görünüm adımını yeniden hesaplar. Kare başına en çok bir çizim (`requestAnimationFrame`).

## 3. Worker / OffscreenCanvas
Son doğrulama: 2026-10-08

- `lib/workers/image-processor.worker.ts` + `lib/core/worker-bridge.ts`: yalnız Büyüt export'u kullanır (`workerBridge.upscaleLanczos`). Worker hata verirse bekleyen işler reddedilir, sonrakiler ana thread'de çalışır.
- Önizleme ve diğer export'lar ana thread'de. OffscreenCanvas yalnız proxy üretiminde (varsa).
- Proxy (≤ 1080 px, JPEG 0,88): filmstrip ve preset kartı küçük resimleri.

## 4. Depolama ve kalıcılık
Son doğrulama: 2026-10-08

Hepsi cihazda (D18). Eşitleyici: `lib/core/device-sync.ts` (store'u izler, 400 ms gecikmeyle sıralı yazar), tarayıcıda `components/studio/DeviceSync.tsx` (layout'ta bir kez; sayfa gizlenince bekleyen yazımı bitirir).

| Ne | Nerede | Durum |
|---|---|---|
| Fotoğraflar (çalışma anı) | Bellek (`URL.createObjectURL`) | Var |
| Kütüphane önbelleği | IndexedDB `curate-library` (`photos`: kullanıcının eklediği orijinal dosya; `meta`: sıra, seçim, Düzenle ve Story kadraj ayarları) — `lib/core/library-cache.ts` | Var; varsayılan açık, ana sayfadaki anahtarla kapanır (kapanınca cihazdaki kopyalar silinir). Sınır: 40 fotoğraf, 400 MB, kalan kotanın en çok yarısı. Kütüphane temizlenince önbellek de silinir. Kota dolarsa sığanlar kalır ve ana sayfa söyler; IndexedDB yoksa (gizli sekme) "saklanamıyor" der |
| Tercihler | localStorage `curate.prefs.v1` (Carousel hedef/doldur/katman, son seri preset'i ve miktarı, Story boşluk/zemin, Çerçeve ayarları, Büyüt çarpanı, fotoğraf hafızası açık/kapalı, favoriler) — `lib/core/prefs.ts` | Var; okurken doğrulanır, bozuk veride varsayılan |
| AI cihaz eşleme | HttpOnly çerez `curate_ai` (Path=/api/ai, 365 gün) | Var |
| Eski AI şifresi | localStorage `curate.ai.password` | Açılışta silinir |
| Kota sayaçları | Upstash Redis REST (yoksa sunucu belleği) | Var |

Object URL'ler `registerUrl`/`revokeUrl` (`lib/engine/proxy.ts`) ile izlenir; silmede ve "Temizle"de serbest bırakılır.

## 5. PWA
Son doğrulama: 2026-10-08

- `public/manifest.json` var (`display: standalone`, tema/zemin `#000000`, yalnız SVG simge). `app/layout.tsx` manifest'i bağlamıyor (Next metadata'da `manifest` yok). PNG simge (192/512) ve maskable simge yok.
- Service worker yok; çevrimdışı çalışma ve güncelleme akışı yok.
- `<html lang="tr">`, `viewport-fit=cover`, güvenli alan değişkenleri (`--safe-area-top/bottom`).
- Eksikler Faz 4-C'de.

## 6. AI proxy ve kota
Son doğrulama: 2026-10-08

- Tek sunucu rotası: `app/api/ai/route.ts` (Node runtime, `maxDuration` 120 sn). Mantık `lib/ai/server.ts`; yapılandırma (model, istem, boyut, ₺) yalnız `lib/ai/config.ts`; sayaç `lib/ai/quota.ts`; istemci `lib/ai/client.ts`.
- `GET` durum/kalan hak, `PUT` PIN ile eşleme (çerez), `POST` görev, `DELETE` cihazı unut. Başka siteden istek (`Sec-Fetch-Site`) 403.
- Giden: aktif fotoğrafın kendi pikselleri, uzun kenar ≤ 2048, JPEG 0,92; sunucu 4 MB üstünü reddeder. Dönen sonuç JPEG, ≤ 4,3 MB.
- Kota: günde 20, ayda 150 (env ile değişir), model çağrısından önce atomik ayrılır. Yanlış PIN sınırları: IP 5/gün, genel 10/gün, 30/ay.
- Sırlar (yalnız ad): `VERTEX_API_KEY`, `CURATE_AI_PASSWORD`, `AI_ENABLED`, `AI_DAILY_LIMIT`, `AI_MONTHLY_LIMIT`, `UPSTASH_REDIS_REST_URL/TOKEN` veya `KV_REST_API_URL/TOKEN`. Hepsi yalnız Vercel sunucu ortamında.
- Uygulamanın geri kalanı (sayfa, modüller) PIN'siz açılır. Tüm uygulama kapısı: Faz 4-A, sahip onayı bekliyor.

## 7. Güvenlik başlıkları
Son doğrulama: 2026-10-08

`next.config.mjs`: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`. EXIF: export tuvalden yeniden kodlanır ve `sanitizeJpegBuffer` APP1/APP2 yüklerini sıfırlar.

## 8. Yayın
Son doğrulama: 2026-10-08

Vercel projesi `curate` (Node 24.x). Üretim alan adı `curate-teal-omega.vercel.app`; `main` dalına push üretime dağıtır (alan adı `curate-git-main-…` ve 2026-10-07 log kaydı). GitHub Actions (`.github/workflows/ci.yml`): `main` push ve PR'da tsc, lint, test, build.
