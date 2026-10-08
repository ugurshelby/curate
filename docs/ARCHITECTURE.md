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
| Carousel | `CarouselPreviewRenderer` (canvas, 1080×1350 veya 1080×1920; kaydırıcı sürüklenirken yarı boyut) | `drawCarouselFrame` aynı seçeneklerle, tam boyut | `lib/engine/carousel-render.ts`: adım 1 `renderCarouselBase` (zemin + kırp/sığdır + seri uyumu), adım 2 `applyCarouselLook` (preset). Parite: `tests/carousel-parity.test.ts` (0 bayt fark) |
| Düzenle | Aynı renderer, taban adımında kırp geometrisi (`crop`) ve Düzeltme (`corrections`, worker'da: `workerBridge.applyCorrections`, sonuç `setBase` ile önbelleğe), uzun kenar 1350 | Aynı adımlar, kırpımın kendi boyutu (≤ 4096); Düzeltme worker'da, 2,5 MP üstünde paylı parçalarla | `lib/engine/edit-geometry.ts` `drawEditGeometry`, `lib/engine/corrections.ts` `applyCorrections`. Parite: `tests/carousel-parity.test.ts` (worker yolu dahil 0 fark) |
| Story | DOM (hücre başına `<img>` + CSS dönüşüm) | Canvas 1080×1920 | Geometri ortak: `computeStoryCells`, `computeCellDraw` (`lib/engine/story-layout.ts`). Piksel paritesi yok, geometri paritesi var |
| Çerçeve | Canvas, `drawFrame` (gösterilen boyutta) | Canvas, `drawFrame` (seçilen `FRAME_SIZES` boyutu) | Tek çizim fonksiyonu `lib/engine/frame-render.ts`; çerçeve ölçüleri kısa kenara göre ölçeklenir; renkler `lib/ui/colors.ts` |
| Büyüt | CSS (yalnız önizleme, "Lanczos" diye etiketlenmez) | Lanczos-3 (2 geçiş), worker'da | `lib/engine/upscale-lanczos.ts` |

**Preset motoru (v2, 2026-10-08):** `lib/engine/presets.ts` — beyaz dengesi kazancı + pozlama + ton eğrisi (uçları sabit, yumuşak omuz) kanal başına 256 girişli tabloda; ardından cilt korumalı canlılık/doygunluk, sınırlı iç ton kaydırma, (yalnız izinli preset'lerde) hale ve gren. Tek "Miktar" tüm değerleri 0'dan ölçekler.

Kural: önizleme ve export aynı çizim fonksiyonunu aynı parametre şemasıyla çağırır (AGENTS.md §4). Story/Çerçeve/Büyüt'te bu kural geometri düzeyinde sağlanıyor; piksel düzeyinde değil (bilinen sınır).

Önizleme bir kez çözülmüş orijinalden çizilir; taban adımı (boyut, sığdırma, uyum, kırp anahtarıyla) önbelleklenir, kaydırıcı yalnız görünüm adımını yeniden hesaplar. Kare başına en çok bir çizim (`requestAnimationFrame`).

**Önizleme çözünürlüğü (Faz 5, 2026-10-08):** `previewRenderSize` önizlemeyi export boyutundan büyük olmamak üzere sahnenin CSS kutusu × piksel yoğunluğu kadar çizer; yoğunluk en çok 2 (`PREVIEW_MAX_DPR`). Kaydırıcı sürüklenirken yarısı. Gren export ızgarasında örneklenir (`outputWidth`), yani ölçek dışında aynı sonuç. Taslak taban boşta önceden hesaplanır (`prepareBase`, `whenIdle`). Preset çekirdeği kanal başına 256 girişli tablolarla tek geçiş.

**Ölçüm (Chromium 1194, 390×844, DPR 2,75, 12 MP sentetik JPEG, production build; telefonda ölçülmedi):**

| Durum | Taban (önce) | Sonra |
|---|---|---|
| Carousel preset değişimi, masaüstü CPU (medyan çizim) | 57 ms (DPR 1) | 19 ms |
| Carousel preset değişimi, 4× CPU yavaşlatma | 256 ms | 71 ms (panel açıldıktan sonraki ilk dokunuş 263 ms) |
| Carousel sürükleme karesi, 4× (medyan / en kötü) | 69 / 131 ms | 17,8 / 30,8 ms |
| Düzenle preset değişimi, 4× | 259 ms | 32 ms |
| Düzenle sürükleme karesi, 4× (medyan / en kötü) | 64 / 116 ms | 7,6 / 18,3 ms |

4× CPU yavaşlatma Redmi sınıfı telefonun yaklaşık taklididir; gerçek cihaz ölçümü yok.

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
| Cihaz oturumu (kapı + AI) | HttpOnly çerez `curate_session` (Path=/, SameSite=Lax, Secure, 365 gün, 30 günden eskiyse yenilenir) — `lib/access/session.ts` | Var (D27). Eski `curate_ai` (Path=/api/ai) bir sürüm daha AI'da kabul edilir, eşlemede silinir |
| Eski AI şifresi | localStorage `curate.ai.password` | Açılışta silinir |
| Kota sayaçları | Upstash Redis REST (yoksa sunucu belleği) | Var |

Object URL'ler `registerUrl`/`revokeUrl` (`lib/engine/proxy.ts`) ile izlenir; silmede ve "Temizle"de serbest bırakılır.

## 5. PWA
Son doğrulama: 2026-10-08

- `public/manifest.json`: `id`/`start_url`/`scope` `/`, `display: standalone`, `lang: tr`, tema/zemin `#000000`, simgeler PNG 192, 512, maskeli 512 (güvenli alan dolgulu) ve SVG. `app/layout.tsx` metadata ile bağlı (`manifest`, `apple-touch-icon` 180, `appleWebApp`). Simgeler `node scripts/make-icons.mjs` ile `public/icon.svg`'den üretilir.
- Chromium 1194 `Page.getInstallabilityErrors`: 0 hata (2026-10-08, yerel production). Telefonda kurulum doğrulanmadı.
- Service worker yok: çevrimdışı açılış ve "yeni sürüm hazır" akışı yok; her açılış ağdan en güncel sürümü alır (eski sürüme takılma riski yok). Eklenmesi KIRMIZI: önce güncelleme stratejisi planı.
- `<html lang="tr">`, `viewport-fit=cover`, güvenli alan değişkenleri (`--safe-area-top/bottom`), `theme-color` `#000000`.

## 6. AI proxy ve kota
Son doğrulama: 2026-10-08

- Tek sunucu rotası: `app/api/ai/route.ts` (Node runtime, `maxDuration` 120 sn). Mantık `lib/ai/server.ts`; yapılandırma (model, istem, boyut, ₺) yalnız `lib/ai/config.ts`; sayaç `lib/ai/quota.ts`; istemci `lib/ai/client.ts`.
- `GET` durum/kalan hak, `PUT` PIN ile eşleme (uygulama oturum çerezi; `AI_ENABLED=false` iken de çalışır, yanıt `{enabled:false}`), `POST` görev, `DELETE` cihazı unut (oturum biter, kilit ekranı). Başka siteden istek (`Sec-Fetch-Site`) 403.
- Giden: aktif fotoğrafın kendi pikselleri, uzun kenar ≤ 2048, JPEG 0,92; sunucu 4 MB üstünü reddeder. Dönen sonuç JPEG, ≤ 4,3 MB.
- Kota: günde 20, ayda 150 (env ile değişir), model çağrısından önce atomik ayrılır. Yanlış PIN sınırları: IP 5/gün, genel 10/gün, 30/ay.
- Sırlar (yalnız ad): `VERTEX_API_KEY`, `CURATE_AI_PASSWORD`, `AI_ENABLED`, `AI_DAILY_LIMIT`, `AI_MONTHLY_LIMIT`, `UPSTASH_REDIS_REST_URL/TOKEN` veya `KV_REST_API_URL/TOKEN`. Hepsi yalnız Vercel sunucu ortamında.

## 6b. Tüm uygulama kapısı (D27)
Son doğrulama: 2026-10-08

- `middleware.ts` (Edge) her istekte `decideAccess` (`lib/access/session.ts`) çağırır: geçerli `curate_session` yoksa sayfa `/kilit?next=…`'e yönlenir (307), bozuk çerez silinir. Kapı dışı: `/kilit`, `/api/*` (kendi çerez kontrolü), `/_next/*`, `/manifest.json`, simgeler, `/favicon.ico`. Referans görseller kapı arkasında.
- İmza: HMAC-SHA256, anahtar `HMAC(VERTEX_API_KEY, "curate-session-v1:" + PIN)`, yalnız Web Crypto (Edge ve Node aynı kod; `tests/access.test.ts` node:crypto referans imzasıyla eşler). PIN değişince tüm cihazlar düşer. Değişkenlerden biri yoksa kapı kapalı kalır (fail closed).
- Kayan ömür: çerez 30 günden eskiyse middleware 365 günlük yenisini verir. Kapılı yanıtlar `Cache-Control: private, no-store`.
- Tanı: `/kilit` yanıtı `X-Curate-Gate: ready` ya da `not-configured` (değer içermez). - PIN ekranı `app/kilit/page.tsx`: 4 kutu, 4. hanede kendiliğinden gönderim, `PUT /api/ai`; yanlış PIN sınırları aynı (IP 5/gün, genel 10/gün, 30/ay). Başarıda `next` yalnız aynı kökenli yola (`safeNext`).
- Yerel denetim: sunucu test değerleriyle başlatılır, betikler `scripts/lib/unlock.mjs` ile kapıyı açar (Prosedür 2).

## 7. Güvenlik başlıkları
Son doğrulama: 2026-10-08

`next.config.mjs`: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`. EXIF: export tuvalden yeniden kodlanır ve `sanitizeJpegBuffer` APP1/APP2 yüklerini sıfırlar.

## 8. Yayın
Son doğrulama: 2026-10-08

Vercel projesi `curate` (Node 24.x). Üretim alan adı `curate-teal-omega.vercel.app`; `main` dalına push üretime dağıtır (alan adı `curate-git-main-…` ve 2026-10-07 log kaydı). GitHub Actions (`.github/workflows/ci.yml`): `main` push ve PR'da tsc, lint, test, build.
