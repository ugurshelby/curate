# Denetim ve Plan — 2026-10-07: arka plan akışları + "AI ile onar" için 4 haneli PIN

**Bu tur:** yalnız tespit ve plan. Kod değişmedi. Plan sonraki bir oturumda uygulanacak.
**Yöntem:** kod okuma (`lib/`, `app/api/ai`, `components/studio/`), kalite kapılarının çalıştırılması, Vercel API'den ortam değişkeni **adlarının** okunması (değer okunmadı, `decrypt` kullanılmadı). Tarayıcı ve telefon kullanılmadı: aşağıdaki görsel ve etkileşim etkileri **doğrulanmadı** (AGENTS.md §2).
**PIN değeri:** sahip sohbette verdi. Bu dökümana, loglara, commit'lere veya başka bir dosyaya **yazılmadı**. Uygulama oturumunda da yazılmaz (bkz. §6).

## 0. Ölçülen başlangıç durumu

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | çıkış 0 |
| `npm run lint` | çıkış 0 |
| `npm test` | 13 dosya, 127 test geçti |
| `npm run build` | çıkış 0 (`/` 30.7 kB, ilk yük 168 kB; `/api/ai` dinamik) |
| `npm run check:secrets` | 76 dosya (19 istemci), **0 gerçek değer arandı** (bu kapsayıcıda `.env` yok), 0 bulgu |
| Vercel `curate` ortam değişkenleri (yalnız adlar) | `VERTEX_API_KEY` (Production, Preview), `CURATE_AI_PASSWORD` (Production, Preview), `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` (Production + Preview). Hepsi `sensitive`: değer panelden geri okunamaz. |

## 1. "AI ile onar" neden anahtar istiyor (kök neden)

- Uygulama Vertex anahtarını **hiç istemez**. Anahtar zaten sunucuda (`VERTEX_API_KEY`, Vercel). İstenen şey ikinci sır, yani `CURATE_AI_PASSWORD`. `AiRepairSheet.tsx` "AI şifresi" adımı bunu ister, `lib/ai/server.ts` `gate()` her istekte `x-curate-password` başlığıyla karşılaştırır.
- Şifre cihaz başına `localStorage`'da tutulur (`lib/ai/client.ts` `curate.ai.password`). Bilgisayarda bir kez girilmiş olması telefonda işe yaramaz.
- Değer `sensitive` olduğu için sahip onu Vercel panelinden geri okuyamaz. Uzun bir değer telefonda elle de yazılamaz. Sonuç: sahibin telefonda AI'ya erişimi yok.
- Sunucunun anahtarla ilgili bir sorunu yok. Sorun yalnız erişim sırrının biçiminde ve cihaz başına saklanmasında.

## 2. Bulgular (şiddet sırasıyla)

Durum etiketleri: [kod] = kod okumayla tespit, tarayıcıda/telefonda doğrulanmadı. [ölçüldü] = komut veya API çıktısı.

### 2.1 AI proxy'si ve erişim

| # | Şiddet | Sorun | Kanıt | Durum |
|---|---|---|---|---|
| A1 | Yüksek (sahip sorunu) | Telefonda AI kullanılamıyor: erişim sırrı uzun, cihaz başına saklanıyor, panelden geri okunamıyor (§1). | `components/studio/AiRepairSheet.tsx` "password" adımı; `lib/ai/client.ts:18`; Vercel env listesi | [ölçüldü + kod] |
| A2 | Yüksek (PIN'e geçince kritik) | Yanlış şifre sınırı **yalnız IP başına** (günde 10). Genel sayaç bilerek yok (`config.ts` yorumu). 4 haneli PIN'de yalnız 10.000 olasılık var. IP değiştiren biri (mobil ağ, IPv6 /64, proxy havuzu) sınırsız deneme yapar. Mevcut tasarım PIN'i taşıyamaz. | `lib/ai/server.ts:139`, `lib/ai/config.ts` `AI_WRONG_PASSWORD_LIMIT` | [kod] |
| A3 | Orta | **Ücretli sonuç sessizce kaybolabilir ve sayfa kilitlenir.** `run()` `onResult()`'u beklemeden döner. `finally` `running`'i null yapar ama `step` "running" kalır. `handleAiResult` görseli açamazsa (`loadImage` hatası) sayfa açık kalır, gövdesi boş olur ve kapatma düğmesi görünmez (yalnız `step !== "running"` iken gösteriliyor). Para harcanmış olur, sonuç görünmez. | `AiRepairSheet.tsx:130`, `:172`; `EditStudio.tsx:454–479` (`catch { URL.revokeObjectURL }`) | [kod] |
| A4 | Orta | Sayaç (Upstash) hata verirse `gate()`/`remaining()` istisna fırlatır ve rota 500 döner. İstemci 500'ü "Süre aşıldı. Tekrar dene." olarak gösterir. Model çağrılmadığı için güvenli tarafta kalıyor ama mesaj yanlış. | `lib/ai/server.ts` (try/catch yok), `lib/ai/client.ts:65` | [kod] |
| A5 | Düşük | Kota önce okunup sonra artırılıyor (atomik değil). Eşzamanlı N istek sınırı N−1 kadar aşabilir. `INCR` dönüşü zaten var, kullanılmıyor. | `lib/ai/server.ts:238–244`, `quota.ts` `incr` | [kod] |
| A6 | Düşük | Sır düz metin olarak `localStorage`'da duruyor ve her istekte başlıkta gidiyor. Olası bir XSS sırrı okur. PIN'e geçince bu iki kat önemli (PIN başka yerde de kullanılıyor olabilir). | `lib/ai/client.ts:20–35` | [kod] |
| A7 | Düşük | `check:secrets` 8 karakterden kısa değerleri taramıyor. 4 haneli PIN değerle taranamaz (taransa da paket içinde rastgele 4 rakam eşleşir). Bu kapsayıcıda `.env` olmadığından tarama 0 değerle koştu. | `scripts/check-bundle-secrets.mjs:33`; §0 | [ölçüldü] |
| A8 | Bilgi | Vercel'de değer değişikliği yeniden dağıtım (redeploy) olmadan etkin olmaz. Sır Preview ortamında da tanımlı. Preview URL'lerinin koruma (Deployment Protection) durumu doğrulanmadı. | Vercel env listesi | [ölçüldü / doğrulanmadı] |

### 2.2 İstemci arka plan işleri (AI dışı)

| # | Şiddet | Sorun | Kanıt | Durum |
|---|---|---|---|---|
| B1 | Orta | `WorkerBridge`: `worker.onerror` yalnız uyarı yazıyor. Bekleyen görevler hiç sonuçlanmıyor, görev başına zaman aşımı da yok. Tek çağıran Upscale export'u. Büyük görselde worker bellek yüzünden düşerse export sonsuza kadar "işleniyor"da kalır. | `lib/core/worker-bridge.ts:59`; `UpscaleStudio.tsx:131` | [kod] |
| B2 | Orta | Upscale kaynağı yüklerken `img.onload = res` var, `onerror` yok. Görsel açılamazsa söz (promise) hiç bitmez. | `components/studio/UpscaleStudio.tsx:122` | [kod] |
| B3 | Düşük | `createStudioItem` içinde `onerror` yok. Çözülemeyen dosya (ör. Android Chrome'da HEIC) kütüphanede sahte 1080×1350 boyutla mesajsız kalır. Kayıt `onload`'dan önce silinirse üretilen proxy URL'si serbest bırakılmaz (`resetAll`'a kadar sızar). | `lib/core/state-machine.ts:443–459` | [kod] |
| B4 | Düşük | `replaceItem` eski kaydın `edits[id]` girdisini silmiyor (`removeFromState` siliyor). Zararsız ama tutarsız. | `lib/core/state-machine.ts:292` | [kod] |
| B5 | Düşük | EXIF temizleyici segment uzunluğunda sınır kontrolü yapmıyor. Bozuk JPEG'de `RangeError` → export başarısız. Bugün yalnız tuval çıktısı geldiği için pratikte erişilemiyor. Zip yolunda temizlik iki kez çalışıyor (gereksiz). | `lib/export/exif-sanitizer.ts:31`, `:43`; `QuickExportSheet.tsx:94` + `zip-packager.ts` | [kod] |
| B6 | Düşük | Güvenlik başlığı yok (`frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`). Çerez tabanlı AI erişimine geçilince ücretli eylemin başka sitede çerçeve içine alınması (clickjacking) engellenmeli. | `next.config.mjs` | [kod] |

## 3. Önerilen çözüm: PIN ile cihaz eşleme

**Öneri (B):** PIN yalnız **bir kez, yeni cihazda** girilir. Sunucu doğru PIN'e karşılık o cihaza imzalı, `HttpOnly` bir çerez verir. Sonraki her AI isteği bu çerezle doğrulanır, PIN bir daha gönderilmez. Vertex anahtarı sunucuda kalır, kullanıcı hiçbir anahtar görmez.

### 3.1 Akış

1. **Sayfa açılışı:** `GET /api/ai`. Geçerli çerez varsa 200 ve kalan hak döner, sayfa doğrudan görev listesine geçer. Çerez yoksa yeni kod `pin_required` (401) döner. Bu istek sayaç artırmaz, para harcamaz.
2. **PIN girişi:** `PUT /api/ai` gövde `{ "pin": "dddd" }`. Ayrı rota dosyası açılmaz, tek sunucu dosyası kuralı korunur (AGENTS.md §2). Doğruysa yanıt `Set-Cookie: curate_ai=v1.<issuedAt>.<hmac>; HttpOnly; Secure; SameSite=Strict; Path=/api/ai; Max-Age=<süre>` içerir.
3. **Görev:** `POST /api/ai` yalnız geçerli çerezle çalışır, akışın kalanı aynı kalır. `x-curate-password` başlığı kaldırılır.
4. **Bu cihazı unut:** `DELETE /api/ai` çerezi siler (sahip sorusu S2).

### 3.2 İmza anahtarı (sahibin yeni sır üretmesi gerekmez)

- İmza anahtarı = `HMAC-SHA256(VERTEX_API_KEY, "curate-device-v1:" + PIN)`. Sunucuda türetilir, hiçbir yerde saklanmaz.
- Sonuç 1: PIN değişince tüm eşlenmiş cihazların çerezi geçersiz olur. Kaybolan telefon için iptal yolu budur.
- Sonuç 2: Vertex anahtarı değişince de geçersiz olur (kabul edilebilir, tek PIN girişi).
- Doğrulama `timingSafeEqual` ile yapılır. Çerezde PIN veya anahtar bulunmaz.

### 3.3 Kaba kuvvete karşı sınırlar (A2'nin çözümü)

Yalnız PIN girişi (`PUT`) sayılır. Eşlenmiş cihazın çerez yolu bu sayaçlara hiç dokunmaz, yani kilit sahibin telefonunu etkilemez.

| Sayaç | Önerilen sınır | Aşılınca |
|---|---|---|
| IP başına, gün | 5 yanlış | o IP'den PIN girişi o gün kapalı |
| Genel, gün | 10 yanlış | yeni cihaz eşleme o gün kapalı ("PIN girişi bugün kapalı.") |
| Genel, ay | 30 yanlış | yeni cihaz eşleme o ay kapalı |

- **Matematik:** genel ay sınırı yılda en çok 360 deneme demek. 10.000 olasılıkta yıllık tahmin şansı ≈ %3,6. Tutturan biri bile kotayla sınırlı kalır (günde 20, ayda 150 çağrı).
- **Kilit işlemi atomik olmalı:** önce `INCR` (genel gün/ay ve IP), sonra karşılaştırma. Doğruysa üç sayaç `DECR` ile geri alınır. Böylece paralel tahminler sınırı aşamaz. `quota.ts`'e `decr` eklenir.
- **Bedel:** bir saldırgan yeni cihaz eşlemeyi bir gün/ay kapatabilir. Eşlenmiş cihazlar çalışmaya devam eder. Sahip PIN'i değiştirirse sayaç anahtarı yenilenir ve sıfırdan başlar. Anahtar etiketi §3.2'deki imza anahtarından türetilir, PIN'in kendisinden veya düz özetinden türetilmez (4 hane özetten geri çözülebilir) (sahip sorusu S3).
- **CSRF:** `SameSite=Strict` çerez + `PUT`/`POST`'ta özel başlık (`x-curate-task`, PIN için `content-type: application/json`) ön kontrol (preflight) gerektirir. Ek savunma: `Sec-Fetch-Site` varsa `same-origin` değilse 403.

### 3.4 Arayüz

- PIN adımı: tek giriş, `type="password"`, `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={4}`, `autoComplete="off"`. 4. hanede otomatik gönderim yapılır. Etiket: "AI parolası (4 hane) — bu cihaz hatırlanır". "AI şifresi" ve "anahtar" sözcükleri kalkar.
- Eski `localStorage` anahtarı (`curate.ai.password`) ilk açılışta silinir.
- Yeni hata kodları ve metinleri (`lib/ai/config.ts` `AI_ERRORS`): `pin_required`, `pin_locked_day`, `pin_locked_month`, `service_error` ("Sunucu sayacına ulaşılamadı.").
- 390×844'te sayfa iç kaydırma olmadan sığmalı. Hedefler ≥ 44 px, metin ≥ 12 px olmalı (Prosedür 2).

### 3.5 Neden diğer seçenekler değil

- **A — yalnız Vercel'deki değeri PIN yapmak:** kod gerekmez, bugünkü arayüz 4 rakamı kabul eder. Ama A2 yüzünden 10.000 olasılık yalnız IP başına sınırla korunur, ayrıca A3/A6 kalır. **B'nin sayaçları gelmeden önerilmez.** Sahip geçici olarak isterse riski kabul ederek seçebilir (sahip sorusu S6).
- **C — tüm uygulamayı PIN arkasına almak:** uygulamanın geri kalanı istemci taraflı, sır yok, kod ve referans görseller zaten herkese açık repoda. Kilit koruma sağlamaz, her açılışta sürtünme ekler, ayrıca middleware gerekir (yeni sunucu özelliği, AGENTS.md §2). Önerilmez (sahip sorusu S1).

## 4. Kapsam

### 4.1 Faz P1 — PIN ile cihaz eşleme (bu planın uygulanacak kısmı)

| Dosya | Değişiklik |
|---|---|
| `lib/ai/config.ts` | PIN uzunluğu (4), üç sınır, çerez adı ve ömrü, yeni hata kodları. `AI_HEADER_PASSWORD` kalkar. |
| `lib/ai/server.ts` | `readAiConfig`: PIN `^\d{4}$` değilse `not_configured`. Çerez imzala/doğrula, `handleAiUnlock` (PUT), `handleAiForget` (DELETE), çerezle `gate`. Kota atomik (`INCR` dönüşüyle, aşımda geri al: A5). Sayaç hatasında `service_error` (A4). |
| `lib/ai/quota.ts` | `decr`. Anahtarlar: `pinFailIp`, `pinFailDay`, `pinFailMonth`. |
| `app/api/ai/route.ts` | `PUT`, `DELETE` dışa aktarımları. |
| `lib/ai/client.ts` | Şifre saklama kodu kalkar, eski anahtar temizlenir. `unlockAi(pin)`, `forgetAiDevice()`. |
| `components/studio/AiRepairSheet.tsx` | PIN adımı (§3.4). A3 düzeltmesi: `onResult` `Promise<boolean>` döner ve beklenir. Başarısızsa "Sonuç açılamadı" gösterilir ve `step` "pick" olur. |
| `components/studio/EditStudio.tsx` | `handleAiResult` başarı/başarısızlık döner (A3). |
| `next.config.mjs` | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` + `Referrer-Policy: same-origin` (B6, yalnız başlık; CSP'nin geri kalanı kapsam dışı). |
| `scripts/check-bundle-secrets.mjs` | Kısa değerlerin değerle taranmadığını açıkça raporla (A7). `CURATE_AI_PASSWORD` adının istemci paketinde olmadığı kontrolü zaten var, korunur. |
| `tests/ai-server.test.ts`, `tests/ai-client-flow.test.ts` | §5'teki vakalar. Testlerde PIN olarak gerçek değerle ilgisi olmayan sahte değer kullanılır. |
| Dokümanlar | `curate-spec-v1.md` §4.5 E12 "Erişim" cümlesi. `docs/reference/curate-reference.md` §4 Auth satırı, §5, §13 (Last verified). `README.md` AI satırı. `.env.example` yorum satırı (değer boş). `docs/procedures.md` Prosedür 2 notu (PIN adımı ölçümü). `logs/YYYY-MM-DD.md`. |

Ortam değişkeni **adı değişmez** (`CURATE_AI_PASSWORD`), yalnız değeri 4 haneli PIN olur. Yeni değişken yoktur. Dağıtım adımı §6'da.

### 4.2 Faz P1 dışında (ayrı faz önerisi: H1 — sağlamlık)

B1 (worker hata/zaman aşımı → bekleyenleri reddet, ana thread yedeğine düş), B2, B3 (hata mesajı + proxy URL sızıntısı), B4, B5 (sınır kontrolü, çift temizlik). P1'e katılmaz, PR'ı büyütmez.

### 4.3 Yapılmayacaklar

Hesap sistemi, veritabanı, ikinci sunucu rotası, tüm uygulamayı kilitlemek (S1 kararı gelmeden), üçüncü taraf auth/SDK, PIN'in herhangi bir dosyada, testte, logda veya commit'te yer alması.

## 5. Kabul kriterleri

**Testler (sahte fetch + `MemoryCounterStore`):**
1. Doğru PIN → 200 + `Set-Cookie` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/ai`, `Max-Age`).
2. Çerezsiz `POST` → 401 `pin_required`, Vertex `fetch` 0 kez.
3. Kurcalanmış çerez, süresi geçmiş çerez veya başka PIN'le imzalanmış çerez → 401.
4. PIN değişince eski çerez → 401.
5. IP başına 5 yanlış → 6. denemede kilit; doğru PIN de reddedilir (o IP).
6. Farklı IP'lerden genel 10 yanlış/gün → kilit. Ay sınırı 30 aynı şekilde.
7. Kilit varken geçerli çerezle `POST` çalışır (sahip etkilenmez).
8. Paralel 20 yanlış `PUT` → sayılan deneme sınırı aşmaz.
9. Doğru PIN sayaçları geri alır.
10. Sayaç fırlatırsa → `service_error`, Vertex çağrısı yok.
11. Kota eşzamanlı isteklerde aşılmaz (A5).
12. PIN `^\d{4}$` değilse → `not_configured`.
13. Eski `x-curate-password` başlığı tek başına erişim sağlamaz.
14. İstemci: görsel açılamazsa sayfa "pick"e döner ve hata gösterir (A3).

**Kapılar:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` sıfır hata. `npm run check:secrets` 0 bulgu.

**Tarayıcı (`/api/ai` sayfa içinde taklit, ücretli çağrı yok):** 390×844'te PIN adımı. Sayısal klavye özniteliği. 4. hanede gönderim. Yeniden açılışta doğrudan görev listesi. Prosedür 2 360/390/430'da geçer. Ölçülmeyen her şey "doğrulanmadı" diye yazılır.

**Telefon (sahip):** PIN bir kez girilir, sayfa kapanıp açılınca PIN sorulmaz, bir gerçek görev (B, en ucuz) çalışır.

## 6. PIN'in sızdırılmaması ve dağıtım

- PIN yalnız Vercel `CURATE_AI_PASSWORD` (Production) değerinde durur, `NEXT_PUBLIC_` önekiyle asla. Karşılaştırma yalnız sunucuda yapılır, istemci paketinde PIN veya PIN kontrolü bulunmaz.
- Değeri sahip Vercel panelinden girer (önerilen). Alternatif: sahip uygulama oturumunda değeri sohbette tekrar verir, ajan Vercel aracıyla yazar. Değer hiçbir dosyaya, komut çıktısına, loga, test verisine veya commit mesajına girmez. Ardından **redeploy** gerekir.
- Commit öncesi ajan, sahibin verdiği değeri `git diff --cached` ve `git log -p` çıktısında arar ve 0 eşleşme bekler. Komut değeri içerdiği için dökümana veya loga yazılmaz, yalnız sonuç sayısı yazılır.
- Yerel deneme `.env` ile yapılır (`.gitignore`'da), PIN için sahte değer kullanılır.

## 7. Sahip soruları (karar verilmedi)

| # | Soru | Öneri |
|---|---|---|
| S1 | PIN yalnız "AI ile onar" için mi, tüm uygulama için mi? | Yalnız AI (§3.5 C) |
| S2 | Cihaz ne kadar hatırlansın? "Bu cihazı unut" düğmesi olsun mu? | 365 gün; düğme sayfanın altında küçük bağlantı |
| S3 | Yanlış PIN sınırları (IP 5/gün, genel 10/gün, 30/ay) ve "saldırgan yeni cihaz eşlemeyi bir süre kapatabilir" bedeli kabul mü? | Kabul |
| S4 | Preview ortamında AI açık kalsın mı? | Preview'da `AI_ENABLED=false` |
| S5 | PIN değerini Vercel'e kim girecek: sahip panelden mi, ajan araçla mı? | Sahip panelden |
| S6 | P1 gelene kadar geçici olarak A seçeneği (yalnız değeri PIN yapmak) istenir mi? | Hayır; P1 bekler |

## 8. Uygulama durumu (2026-10-07, aynı gün)

Sahip S1–S6'da önerileri kabul etti: yalnız AI kilitli, cihaz 365 gün ve "Bu cihazı unut", sınırlar 5/10/30, Preview'da AI kapalı. S5 için sahip PIN'i Vercel'e ajanın yazmasına izin verdi. Geçici çözüm (A) yok.

| # | Durum | Ne yapıldı |
|---|---|---|
| A1 | Düzeltildi | 4 haneli PIN ile cihaz eşleme (§3). PIN 4. hanede kendiliğinden gönderilir, sayısal klavye açılır, cihaz 365 gün hatırlanır. |
| A2 | Düzeltildi | Yanlış PIN: IP 5/gün, genel 10/gün, 30/ay; atomik ayırma. Eşli cihaz kilitten etkilenmez. |
| A3 | Düzeltildi | `onResult` bekleniyor; açılamayan sonuçta "Sonuç açılamadı." gösterilir ve görev listesine dönülür (kapat düğmesi görünür). |
| A4 | Düzeltildi | Sayaç hatası → `service_error` (503), model çağrılmaz. Çöken fonksiyonun 500'ü istemcide "Sunucu hatası" (artık "Süre aşıldı" değil). |
| A5 | Düzeltildi | Kota `INCR` dönüşüyle ayrılır, aşan ayırma geri alınır. |
| A6 | Düzeltildi | PIN tarayıcıda saklanmaz; eski `curate.ai.password` anahtarı sayfa açılınca silinir; erişim HttpOnly çerez. |
| A7 | Düzeltildi (rapor) | `check:secrets` kısa değerleri "değerle taranmadı" diye sayar; Prosedür 4'e PIN arama adımı eklendi. |
| A8 | Yapıldı | Preview'da `AI_ENABLED=false`; Production PIN Vercel'e yazıldı, yeniden dağıtıldı (değer yazdırılmadı). |
| B1 | Düzeltildi | Worker `error`/`messageerror` → bekleyen görevler reddedilir, worker kapanır, sonraki görevler ana thread'de. |
| B2 | Düzeltildi | Upscale kaynak yüklemesinde `onerror`; export sayfası hata gösterir. |
| B3 | Düzeltildi | Açılamayan dosya kütüphaneden çıkarılır, mesaj: `"<ad>" açılamadı; bu dosya biçimi desteklenmiyor.` Silinmiş kaydın proxy URL'si serbest bırakılır. |
| B4 | Düzeltildi | `replaceItem` eski kaydın Düzenle ayarını siler. |
| B5 | Düzeltildi | EXIF temizleyicide sınır kontrolü; zip yolunda ikinci temizlik kaldırıldı. |
| B6 | Düzeltildi | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy: same-origin`, `nosniff`. |

**Planda olmayan, testin yakaladığı hata:** `MemoryCounterStore.incr` okuma ile yazma arasında `await` içerdiği için atomik değildi; paralel 20 yanlış PIN'in 20'si de değerlendirildi (beklenen 5). Okuma senkron yapıldı. Redis `INCR` zaten atomikti; hata yalnız bellek yedeğindeydi.

**Plandan sapma:** "Bu cihazı unut" yalnız cihaz eşliyken (kalan hak okunduysa) görünür.
