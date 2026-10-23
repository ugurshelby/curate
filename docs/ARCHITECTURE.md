# Mimari (ARCHITECTURE)

Kısa ve olgusal. Her bölümde "Son doğrulama". Ayrıntılı ölçüm geçmişi: `docs/reference/curate-reference.md`.

## 1. Yığın
Son doğrulama: 2026-10-20

Next.js 14.2 (App Router, ana sayfa `app/page.tsx`, PIN ekranı `app/kilit/page.tsx`, geçici yoklama `app/probe/page.tsx`, tek sunucu rotası `app/api/ai/route.ts`, PIN kapısı `middleware.ts`), React 18, TypeScript (strict), Tailwind 3.4, `jszip`, `lucide-react`. Test: Vitest. Tarayıcı denetimi: `puppeteer-core` + yerel Chromium (`scripts/audit-ui.mjs`, `scripts/capture-screens.mjs`). Canvas 2D; WebGL yok.

Modül geçişi ana sayfada bileşen durumuyla yapılır (`app/page.tsx`); modüllerin ayrı rotası yok. Durum: `lib/core/state-machine.ts` (başsız store) + `useStudio` (`useSyncExternalStore`).

## 2. Render hattı
Son doğrulama: 2026-10-22 (Büyüt satırı: D38, tarayıcıda sahte proxy ile)

| Modül | Önizleme | Export | Ortak fonksiyon |
|---|---|---|---|
| Düzenle | `<img>`: plan tam çözünürlükte tuvale uygulanır, JPEG 0,95 data URL olarak gösterilir; basılı tutunca orijinal | Orijinal boyutta tuval, aynı plan, güç 1,0 | `applyPlanInStrips` (`lib/engine/intelligent-repair.ts`; plan şeması ve doğrulama `lib/engine/ai-plan.ts`). Plan önce AI'dan (`requestAiPlan`), yoksa yerelden (`generateIntelligentRepairPlan`). Şerit/tek geçiş paritesi: `tests/intelligent-repair.test.ts` |
| Çerçeve | Canvas, `drawFrame` (`previewRenderSize`: sahne kutusu × DPR, export boyutunu aşmaz) | Canvas, `drawFrame` (seçilen `FRAME_SIZES` boyutu); birden çok fotoğrafta her biri, zip | Tek çizim fonksiyonu `lib/engine/frame-render.ts`; çerçeve ölçüleri kısa kenara göre ölçeklenir; renkler `lib/ui/colors.ts`. "Gradyan" zemin: `lib/engine/edge-gradient.ts` (D33), kenar renkleri fotoğrafın çerçeveyle buluşan kısmından, `paintEdgeGradient` ile boyanır |
| Büyüt | `<img>` önce/sonra ayırıcı (`clip-path`); "Standart" iki yanda orijinali, "AI ile Büyüt" sağda "Kullan" denmiş AI sonucunu gösterir (`StudioState.upscaleAi`, oturum belleği) | Standart: Lanczos-3 (2 geçiş), worker'da. AI: model çıktısı hedefe (kaynak × 2/4) tek `drawImage` (yüksek kalite yumuşatma) ile uydurulur, Lanczos yok | `lib/engine/upscale-lanczos.ts`; AI: `/api/ai` görev A (D38) |

Kural: önizleme ve export aynı çizim fonksiyonunu aynı parametre şemasıyla çağırır (AGENTS.md §4). Çerçeve ve Düzenle'de aynı fonksiyon; Büyüt'te önizleme yalnız karşılaştırma görüntüsüdür (bilinen sınır).

Kodda duran ama Faz R'den beri hiçbir modülün çağırmadığı motorlar: `lib/engine/presets.ts` (preset v2), `lib/engine/corrections.ts` (Düzeltme), `lib/engine/edit-geometry.ts` (Kırp), `lib/engine/scene.ts` `suggestSeries`; bileşenler `AiPresetSheet`, `usePanPinch`. Yalnız testleri var. `AiRepairSheet` ve `AiReviewScreen` D38'den beri Büyüt'te kullanılır.

**Ölçüm:** Faz 5 (2026-10-08) önizleme ölçümleri (Carousel ve eski Düzenle preset/sürükleme) kaldırılan kod yollarına aitti; tarihçe `docs/reports/` ve git'te. Üç modüllü hâlde performans ölçülmedi (Prosedür 3 bekliyor).

## 3. Worker / OffscreenCanvas
Son doğrulama: 2026-10-20

- `lib/workers/image-processor.worker.ts` + `lib/core/worker-bridge.ts`: arayüzde yalnız Büyüt export'u kullanır (`workerBridge.upscaleLanczos`). Worker hata verirse bekleyen işler reddedilir, sonrakiler ana thread'de çalışır.
- Önizleme ve diğer export'lar (Düzenle planı, Çerçeve) ana thread'de. OffscreenCanvas yalnız proxy üretiminde (varsa).
- Proxy (≤ 1080 px, JPEG 0,88): küçük resimler.

## 4. Depolama ve kalıcılık
Son doğrulama: 2026-10-20 (Kütüphane ve Tercihler satırları)

Hepsi cihazda (D18). Eşitleyici: `lib/core/device-sync.ts` (store'u izler, 400 ms gecikmeyle sıralı yazar), tarayıcıda `components/studio/DeviceSync.tsx` (layout'ta bir kez; sayfa gizlenince bekleyen yazımı bitirir).

| Ne | Nerede | Durum |
|---|---|---|
| Fotoğraflar (çalışma anı) | Bellek (`URL.createObjectURL`) | Var |
| Kütüphane önbelleği | IndexedDB `curate-library` (`photos`: kullanıcının eklediği orijinal dosya; `meta`: sıra, seçim, fotoğraf başına ayarlar; `edits` ve `cellTransforms` Faz R öncesi Düzenle/Story alanları, hâlâ yazılıyor) — `lib/core/library-cache.ts` | Var; varsayılan açık, ana sayfadaki anahtarla kapanır (kapanınca cihazdaki kopyalar silinir). Sınır: 40 fotoğraf, 400 MB, kalan kotanın en çok yarısı. Kütüphane temizlenince önbellek de silinir. Kota dolarsa sığanlar kalır ve ana sayfa söyler; IndexedDB yoksa (gizli sekme) "saklanamıyor" der |
| Tercihler | localStorage `curate.prefs.v1` (Çerçeve ayarları, Büyüt çarpanı, fotoğraf hafızası açık/kapalı, favoriler; Faz R'den kalan `carouselView`, `globalPreset`, `story` alanları hâlâ yazılıyor, arayüz okumuyor) — `lib/core/prefs.ts` | Var; okurken doğrulanır, bozuk veride varsayılan |
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
Son doğrulama: 2026-10-22 (görüntü görevi A Büyüt'e bağlandı, D38)

- Tek sunucu rotası: `app/api/ai/route.ts` (Node runtime, `maxDuration` 120 sn). Mantık `lib/ai/server.ts`; yapılandırma (model, istem, boyut, ₺) yalnız `lib/ai/config.ts`; sayaç `lib/ai/quota.ts`; istemci `lib/ai/client.ts`.
- `GET` durum/kalan hak, `PUT` PIN ile eşleme (uygulama oturum çerezi; `AI_ENABLED=false` iken de çalışır, yanıt `{enabled:false}`), `POST` görev, `DELETE` cihazı unut (oturum biter, kilit ekranı). Başka siteden istek (`Sec-Fetch-Site`) 403.
- Görüntü görevleri A–D (`AI_TASKS`): arayüzde yalnız A kullanılır, Büyüt → "AI ile Büyüt" (`gemini-3.1-flash-image`, 4K, ~30 sn, ~₺8; D38). B, C, D Faz R'den beri arayüzsüz. Tek model, 429/503'te süre yetiyorsa bir bekleyişli tekrar.
- Giden: aktif fotoğrafın kendi pikselleri, uzun kenar ≤ 2048, JPEG 0,92 (Büyüt yalnız ≤ 2048 px kaynakta açılır, küçültme olmaz); sunucu 4 MB üstünü reddeder. Dönen sonuç JPEG, ≤ 4,3 MB.
- AI Preset (görev `P`, D28, D34): `x-curate-style` başlığı + ≤ 768 px JPEG; model yalnız JSON döner (`responseMimeType` + `responseSchema`; şemada `enum` yalnız STRING alanda), `validatePlan` ile sunucuda ve istemcide sınırlanır. Adaylar sırayla (`AI_PLAN_MODELS`: `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-flash`): 400, 404, 429, 5xx ve geçersiz yanıtta sıradakine geçilir, 401/403'te zincir durur. Zincir bitince hata türü: geçersiz plan > yoğun > sunucu > reddedildi > bulunamadı (`bad_plan`, `model_busy`, `model_error`, `model_rejected`, `model_missing`; anahtar için `model_auth`). Günlük: görev, model, HTTP durumu, tür, süre, Google `error.status` ve ilk 200 karakter mesaj. Ölçülen süre (2026-10-08, tek çağrı): 3.5-flash 26 sn, 3.5-flash-lite 4 sn, 2.5-flash 27 sn. Yanıt `{plan, model}`.
- Çağrı sayısı sınırı (ikincil güvenlik): varsayılan günde 80, ayda 1000; `AI_DAILY_LIMIT` / `AI_MONTHLY_LIMIT` Vercel'de tanımlıysa onlar geçerli. Model çağrısından önce atomik ayrılır. Yanlış PIN sınırları: IP 5/gün, genel 10/gün, 30/ay.
- Para bütçesi (D35, `lib/ai/budget.ts`): üç Upstash sayacı kuruş cinsinden (`curate:ai:try:day:<gün>` 2 gün TTL, `curate:ai:try:total` süresiz, `curate:ai:try:month:<ay>` 32 gün TTL; gün ve ay Europe/Istanbul). Pencere sonuna (`AI_BUDGET_WINDOW_END`, varsayılan 2026-12-17) kadar günlük + toplam tavan, sonra günlük + aylık tavan denetlenir; üçü de yazılır. Her Google çağrısından önce `costTry × 1,25` ayrılır (INCRBY), tavan aşılırsa geri alınır ve 429 döner; Google 4xx verirse iade edilir (DECRBY), 5xx/zaman aşımı/iptal ücretli kalır. Zincirde her aday ayrı çağrıdır. Varsayılanlar: toplam ₺6000, günlük ₺300, aylık (pencere sonrası) ₺200; env bozuksa varsayılan. Aynı anda tek ücretli istek: `curate:ai:busy` (10 sn TTL, bitince serbest). `GET` yanıtı ve başarılı `POST` başlığı (`x-curate-remaining-try`) kalan ₺'yi taşır. Redis yoksa sayaçlar sunucu belleğinde (kalıcı değil).
- Sırlar (yalnız ad): `VERTEX_API_KEY`, `CURATE_AI_PASSWORD`, `AI_ENABLED`, `AI_DAILY_LIMIT`, `AI_MONTHLY_LIMIT`, `AI_BUDGET_TRY_TOTAL`, `AI_BUDGET_TRY_DAILY`, `AI_BUDGET_WINDOW_END`, `AI_BUDGET_TRY_MONTHLY_AFTER`, `UPSTASH_REDIS_REST_URL/TOKEN` veya `KV_REST_API_URL/TOKEN`. Hepsi yalnız Vercel sunucu ortamında.

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
