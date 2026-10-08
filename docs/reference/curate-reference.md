# Curate — Kanonik Referans

Deponun gerçekte ne içerdiğinin ölçülmüş kaydı. Kararlar `docs/DECISIONS.md`'de, mimari özet `docs/ARCHITECTURE.md`'de, durum `docs/STATE.md`'de. Bu dosya çelişkileri kaydeder, karar vermez.
**Kanıt etiketleri:** [ÖLÇÜLDÜ] burada çalıştırıldı veya okundu · [ÇIKARIM] o kanıttan akıl yürütme · [DOĞRULANMADI] denetlenmedi (neden yazılı).

---

## 1. Amaç ve kullanıcı
Son doğrulama: 2026-10-08

Tek kullanıcılı (Uğur) kişisel fotoğraf stüdyosu; telefonda web uygulaması; birincil kullanım mobil (390×844). Beş modül: Carousel, Story, Çerçeve, Büyüt, Düzenle. Ayrıntı `docs/PRODUCT.md`. [ÖLÇÜLDÜ] `AGENTS.md`, `curate-spec-v1.md` §2, `README.md`, kod.

Ortak ürün kuralları: önizleme = export (spec §3.3, uyumsuzluk P0); fotoğraf cihazda kalır, tek istisna Düzenle'deki AI (spec §3.5, §4.5 E12); hiçbir adımda kaydırıcı zorunlu değil (spec §3.1).

## 2. Ölçülmüş durum
Son doğrulama: 2026-10-08

| Kontrol | Sonuç | Etiket |
|---|---|---|
| `npx tsc --noEmit` | çıkış 0 | [ÖLÇÜLDÜ] 2026-10-08 |
| `npm run lint` | "No ESLint warnings or errors" | [ÖLÇÜLDÜ] 2026-10-08 |
| `npm test` | 19 dosya, 253 test geçti (oturum başında 14 / 150) | [ÖLÇÜLDÜ] 2026-10-08 |
| `npm run build` | çıkış 0; `/` ≈ 33 kB, `/api/ai` dinamik | [ÖLÇÜLDÜ] 2026-10-08 |
| `npm run check:secrets` | 84 dosya (26 istemci), 0 gerçek değer arandı (`.env` yok), 0 bulgu | [ÖLÇÜLDÜ] 2026-10-08 |
| Prosedür 2 (`scripts/audit-ui.mjs`, production build, Chromium 1194 emülasyon) | 52 ekran (360/390/430 + masaüstü ana sayfa; Düzeltme dahil) geçti, en düşük metin kontrastı 4,70 | [ÖLÇÜLDÜ] 2026-10-08 |
| Export (Chromium, indirilen dosya ölçüldü) | Instagram tek 1080×1350, 3 kare zip, TikTok zip 1080×1920, Story 1080×1920, Çerçeve 1080×1350 / 1080×1920 / 1080×566 / 2160×2160 (4K) / 3840×2160 (4K 16:9), önizleme–export ortalama fark ≤ 2,9/255, Düzenle+Düzeltme 4000×3000; hepsinde EXIF yok | [ÖLÇÜLDÜ] 2026-10-08 |
| Canlı (`curate-teal-omega.vercel.app`, yalnız okuma) | 10 dağıtım READY; güvenlik başlıkları 4/4; manifest ve simge 200; `lang="tr"`; `/api/ai` çerezsiz `pin_required` | [ÖLÇÜLDÜ] 2026-10-08 |
| Telefon, yatay yön, gerçek dokunma, gerçek parlaklık | Denenmedi | [DOĞRULANMADI] cihaz yok |

Bilinen sınırlar (kod okuma): Story/Çerçeve/Büyüt önizlemesi export ile aynı geometriyi kullanır, aynı piksel fonksiyonunu değil; Story ve Çerçeve preset uygulamaz; Büyüt önizlemesi CSS filtresidir ("Lanczos" diye etiketlenmez). [ÖLÇÜLDÜ] kod.

## 3. Mimari
Son doğrulama: 2026-10-08

Özet ve tablo `docs/ARCHITECTURE.md`'de; dosya haritası `docs/INDEX.md`'de. Burada yalnız olgular:
- Tek sayfa (`app/page.tsx`) + tek sunucu rotası (`app/api/ai/route.ts`). `middleware` yok. [ÖLÇÜLDÜ] `git ls-files`.
- Carousel ve Düzenle önizleme/export aynı iki adımı (`renderCarouselBase`, `applyCarouselLook`) aynı seçeneklerle çağırır; `tests/carousel-parity.test.ts` 1080×1350'de 0 bayt fark bulur. [ÖLÇÜLDÜ]
- Worker yalnız Büyüt export'unda. [ÖLÇÜLDÜ] grep.
- En büyük dosyalar: `EditStudio.tsx` 870, `CarouselStudio.tsx` 567, `StoryStudio.tsx` 545, `lib/core/state-machine.ts` 485, `lib/ai/server.ts` 481 satır. [ÖLÇÜLDÜ] `wc -l`.

## 4. Veri ve altyapı
Son doğrulama: 2026-10-08

| Konu | Durum | Etiket |
|---|---|---|
| Veritabanı, şema | Yok | [ÖLÇÜLDÜ] |
| Dış API | Google Vertex `generateContent` yalnız `/api/ai` üzerinden; Upstash Redis REST (kota) | [ÖLÇÜLDÜ] kod |
| Kimlik | Tüm uygulama (D27): 4 haneli PIN (`CURATE_AI_PASSWORD`, sunucu) → `/kilit` → imzalı HttpOnly çerez `curate_session` (Path=/, 365 gün kayan, SameSite=Lax, Secure); `middleware.ts` her sayfayı kontrol eder; manifest/simgeler/`_next` açık, referans görseller kapalı | [ÖLÇÜLDÜ] testler + yerel production (curl: çerezsiz `/` → 307 `/kilit`; çerezli 200; `next=https://…` → `/`) + Chromium (PIN ekranı, yanlış PIN, doğru PIN). Telefonda [DOĞRULANMADI] |
| Tarayıcı depolama | localStorage `curate.prefs.v1` (tercihler); IndexedDB `curate-library` (fotoğraf hafızası, varsayılan açık, 40 fotoğraf / 400 MB). Eski `curate.ai.password` açılışta silinir | [ÖLÇÜLDÜ] `tests/device-sync.test.ts`, Chromium'da ekle → yenile → geri geldi (2026-10-08) |
| Ortam değişkenleri (ad) | `VERTEX_API_KEY`, `CURATE_AI_PASSWORD`, `AI_ENABLED`, `AI_DAILY_LIMIT`, `AI_MONTHLY_LIMIT`, `UPSTASH_REDIS_REST_URL/TOKEN` veya `KV_REST_API_URL/TOKEN` (`.env.example`) | [ÖLÇÜLDÜ] |
| Dal | Yalnız `main` (uzakta tek dal) | [ÖLÇÜLDÜ] `git ls-remote` 2026-10-08 |
| CI | `.github/workflows/ci.yml`: `main` push/PR, Node 22, tsc/lint/test/build | [ÖLÇÜLDÜ] dosya; koşu sonuçları [DOĞRULANMADI] |
| Vercel | Proje `curate`, Node 24.x, son üretim dağıtımı READY; alan adları `curate-teal-omega.vercel.app`, `curate-git-main-…`; SSO koruması `all_except_custom_domains`, şifre koruması kapalı | [ÖLÇÜLDÜ] Vercel API (yalnız okuma) 2026-10-08 |
| PWA | Manifest bağlı (`lang: tr`, standalone), PNG 192/512/maskeli + apple-touch-icon; Chromium kurulabilirlik hatası 0; service worker yok | [ÖLÇÜLDÜ] `tests/pwa.test.ts`, CDP 2026-10-08; telefonda kurulum [DOĞRULANMADI] |

## 5. Güvenlik, sırlar, maliyet
Son doğrulama: 2026-10-08

- Repo herkese açık (GitHub API `visibility: public`). [ÖLÇÜLDÜ]
- İzlenen dosyalarda sır şekilli dize (Google anahtarı, özel anahtar, GitHub/Slack/AWS token, JWT kalıpları): 0 dosya. [ÖLÇÜLDÜ] `git grep` 2026-10-08.
- İzlenen kişisel görünümlü dosyalar: yalnız 13 referans görsel (`public/reference-images/*.jfif`, sahip kararıyla). [ÖLÇÜLDÜ]
- Sırlar yalnız Vercel sunucu ortamında; `NEXT_PUBLIC_*` sır yok. 4 haneli PIN `check:secrets` ile değerle taranamaz; güvencesi tasarım: yalnız `lib/ai/server.ts` karşılaştırır. [ÖLÇÜLDÜ]
- Güvenlik başlıkları: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy: same-origin`, `nosniff`. [ÖLÇÜLDÜ] `next.config.mjs`
- Kötüye kullanım sınırları: kota günde 20 / ayda 150 (atomik); yanlış PIN IP 5/gün, genel 10/gün, 30/ay; `AI_ENABLED=false` hepsini kapatır (Preview'da kapalı). Sayaç dağıtık yükte [DOĞRULANMADI].
- Maliyet tahmini (`lib/ai/config.ts`): A ~₺8, B ~₺5, C ~₺5, D ~₺7; üçüncü taraf fiyatı [DOĞRULANMADI]. En kötü durum varsayılanlarla ayda 150 çağrı.
- EXIF: export tuvalden yeniden kodlanır; `sanitizeJpegBuffer` APP1/APP2 yüklerini sıfırlar, bozuk segmentte atmadan durur. [ÖLÇÜLDÜ] `tests/robustness.test.ts`

## 6. Kalite kapıları
Son doğrulama: 2026-10-08

| Kapı | Nerede | Durum |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | geçiyor |
| Lint | `npm run lint` | geçiyor |
| Test | `npm test` (Vitest) | 253/253 |
| Build | `npm run build` | geçiyor |
| Sır taraması | `npm run check:secrets` | 0 bulgu |
| Renk belirteçleri | `tests/color-tokens.test.ts` | geçiyor |
| Tasarım kuralları | `tests/ui-rules.test.ts` (12 px, monospace, 44 px, jargon, malzeme, self-host yazı tipi) | geçiyor (2026-10-08) |
| Mobil denetim | `scripts/audit-ui.mjs` (Prosedür 2) | 52 ekran geçiyor (emülasyon) |

## 7. Konvansiyonlar
Son doğrulama: 2026-10-08

1. Platform boyutları veri olarak `lib/export/platform-specs.ts`'te; varsayılan JPEG 0,97, 8 MB üstünde basamak (yalnız platform hedefleri).
2. Başsız store + `useSyncExternalStore`.
3. Yıkıcı olmayan işleme: her işlem yeni tuval/ImageData kopyasında.
4. Renkler yalnız `app/globals.css` belirteçlerinden; export renkleri `lib/ui/colors.ts`.
5. Model adları, istemler, ₺ yalnız `lib/ai/config.ts`.
6. Commit önekleri: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.

## 8. Geçmiş ve tekrarlayan sorunlar
Son doğrulama: 2026-10-08

- Panorama, ışık sızıntısı ve vinyet bir kez eklenip kaldırıldı; artık kapsam kilidinde. Git geçmişinden geri getirilmez.
- Önizleme/export ayrışması (Faz M2'ye kadar) ve mobilde panelin fotoğrafı örtmesi (Faz M1'e kadar) en sık tekrar eden sorunlardı; ölçüm sözleşmesi (CDS §6) ve parite testleri bunun için var.
- Tek büyük yeniden yazım (`8b5eddf`) riskliydi; küçük, çalışan commit kuralı bundan.
- Faz kayıtları: `docs/reports/2026-10-02-audit.md`, `2026-10-03-phases.md`, `2026-10-07-ai-pin-plan.md`.

## 9. Bilinen çelişkiler (kayıt; karar `docs/DECISIONS.md` / sahip)
Son doğrulama: 2026-10-08

| # | Çelişki | Durum |
|---|---|---|
| C1 | Spec §3.2 ve §5.1 kişisel İngilizce adlı 6 preset ailesi der; görev belgesi §8.4 Türkçe adlı 12–16 presetlik kütüphane ister ve kararı ajana bırakır | Faz 5'te: mevcut 6 aile korunarak yeni kütüphaneye eklenir (D24); spec kararı değişmez |
| C2 | 2026-10-07 karar S1 "PIN yalnız AI için"; görev belgesi §7-A tüm uygulama kapısı ister | Kapandı: sahip planı onayladı (D27), uygulandı 2026-10-08 |
| C3 | 2026-10-07 S5 "PIN'i Vercel'e ajan yazar"; görev belgesi §1.6 Vercel'e araçla dokunmayı yasaklar | Yeni kural geçerli (D17) |
| C4 | Eski UI kural dosyası CDS'i apple-design'ın üstüne koyar; görev belgesi apple-design ilkelerini üste koyar | Görev belgesi geçerli (D21) |
| C5 | CDS v2 "özel font eklenmez"; görev belgesi self-host bir yedek yazı tipi ister | Faz 2'de CDS v3 ile çözülür |
| C6 | Ana sayfa altbilgisi "Sıfır Sunucu Yükü (100% Client-Side)" der; AI1'den beri AI istisnası var | Faz 3'te metin düzeltilir |
| C7 | Eski Prosedür 2 ve UI kural dosyası en küçük yazıyı 11 px der; CDS 12 px | 12 px (Faz 1/2'de düzeltildi) |
| C8 | Spec §8 Faz D2 "spec dışı prompt `prompt-D2.md`"ye atıf yapar; dosya repoda yok | D2 kabul kriteri görev belgesi §8.2'den alınır |

## 10. Boşluklar (niyet ↔ gerçek, şiddet sırasıyla)
Son doğrulama: 2026-10-08

1. Telefonda hiçbir ölçüm yok (performans, jestler, PWA kurulumu).
2. Service worker yok (çevrimdışı açılış yok); eklemek KIRMIZI.
3. AI Preset: onaylı (D28), kodlanıyor. Tüm uygulama kapısı uygulandı (D27); telefonda doğrulanmadı.
4. Preset kalibrasyonu ölçülebilir sınırlara ve 13 referansa göre yapıldı; sahibin kendi kaynak belgeleri (spec §5) hâlâ yok.

## 11. Sahibe açık sorular
Son doğrulama: 2026-10-08

Güncel liste `docs/STATE.md` → "Sahibe sorular". Spec §10'da açık kalanlar: s.1 (preset aileleri onayı), s.6 (TikTok 1080×1920 telefonda), s.10 (AI gerçek süre/maliyet/dağıtık sayaç).
