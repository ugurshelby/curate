# Plan — Tüm uygulama için PIN kapısı (Faz 4-A) — 2026-10-08

**Durum: KIRMIZI, sahip onayı bekliyor. Kod yazılmadı.** PIN değeri hiçbir yerde yazılı değil ve değiştirilmeyecek.

## 1. İstek
Uygulamaya sahibin dışında kimse giremesin. PIN sabit kalır (ortam değişkeni `CURATE_AI_PASSWORD`, 4 hane, yalnız sahip bilir).

## 2. Bugünkü durum (ölçüldü, kod okuma)
- Sayfa ve tüm modüller PIN'siz açılır. Yalnız `/api/ai` (ücretli AI) PIN ile kilitli: `PUT /api/ai` doğru PIN'e imzalı `curate_ai` çerezi verir (HttpOnly, Secure, SameSite=Strict, **Path=/api/ai**, 365 gün; imza anahtarı `HMAC(VERTEX_API_KEY, PIN)`).
- Yanlış PIN sınırları: IP başına günde 5, genel günde 10, ayda 30 (Upstash'te atomik).
- Middleware yok; uygulamanın geri kalanında sunucu kodu yok.

## 3. Önerilen tasarım
1. **Sunucu tarafı kapı:** `middleware.ts` (Next middleware, Edge runtime). Her sayfa isteğinde `curate_session` çerezini doğrular; yoksa veya geçersizse `/kilit` sayfasına yönlendirir (`?next=` ile).
2. **PIN = mevcut `CURATE_AI_PASSWORD`.** Yeni sır yok, sahip aynı 4 haneyi kullanır.
3. **Çerez:** `curate_session=v1.<issuedAt>.<hmac>`; HttpOnly, Secure, **SameSite=Lax**, **Path=/**, ömür **365 gün, kayan** (çerez 30 günden eskiyse her açılışta yenilenir; uygulama düzenli açıldıkça hiç sona ermez). İmza anahtarı bugünkü gibi `VERTEX_API_KEY` + PIN'den türetilir: PIN değişirse tüm çerezler geçersiz olur (kaybolan telefonun iptal yolu).
4. **Tek PIN, tek çerez:** `/api/ai` aynı `curate_session` çerezini kabul eder; eski `curate_ai` çerezi geçiş süresince (bir sürüm) de kabul edilir, sonra kaldırılır. İki ayrı şifre kalmaz.
5. **Yanlış PIN sınırı:** bugünkü sayaçlar aynen (IP 5/gün, genel 10/gün, 30/ay), aynı Upstash anahtarlarıyla. Kilit yalnız yeni cihaz eşlemeyi kapatır; çerezi olan cihaz etkilenmez.
6. **Kapı dışı kalan yollar:** `/kilit`, `PUT /api/ai` (PIN girişi), `/manifest.json`, `/icon*.png`, `/icon.svg`, `/apple-touch-icon.png`, `/favicon.ico`, `/_next/static/*`, `/_next/image`. Böylece PWA kurulumu (manifest + simgeler) kapı önünde de çalışır. Referans görseller (`/reference-images/*`) kapı arkasında kalır.
7. **Edge uyumu:** middleware'de `node:crypto` yok; HMAC doğrulaması Web Crypto (`crypto.subtle`) ile. Sunucu tarafı (`lib/ai/server.ts`) aynı biçimi Node'da üretir; ortak biçim testle sabitlenir.
8. **PIN ekranı (`/kilit`):** tasarım diline uygun, Türkçe, tek büyük sayısal giriş (4 kutu görünümü, `inputMode="numeric"`, `autocomplete="one-time-code"` değil `off`), 4. hanede kendiliğinden gönderim, hata metni ("PIN yanlış.", "Bugün çok deneme oldu; yarın tekrar dene."). PIN tarayıcıda saklanmaz.

## 4. Kilitlenme riski ve önlemi
- **Sahibin tek kurtarma yolu Vercel'de ortam değişkenini değiştirmek** (yeni PIN → yeniden dağıtım). Bu yüzden:
  - Doğru PIN'li çerez 365 gün ve kayan: sahip normal kullanımda bir daha PIN görmez.
  - Genel sayaç (10/gün, 30/ay) yalnız **yeni** cihaz eşlemesini kapatır. Bir yabancı bunu tetiklerse sahip eşli telefonunda çalışmaya devam eder; yeni cihazı ertesi gün (ay sınırında ay sonunda) eşler.
  - Kötü durum: sahibin telefonu sıfırlanır/çerez silinir **ve** aynı ay genel kilit dolmuştur → sahip ay sonuna kadar giremez ya da Vercel'de PIN'i değiştirir (sayaç anahtarı PIN'den türediği için sıfırlanır). Bu risk kabul edilmezse seçenek: genel ay sınırını kaldırıp yalnız gün sınırı (10/gün, yılda en çok 3.650 deneme = 10.000 PIN'in %36'sı; zayıf) ya da sahibin elle eklediği uzun bir kurtarma kodu (yeni ortam değişkeni, isteğe bağlı). **Öneri: bugünkü sınırlar + kayan çerez.**
- Middleware hata verirse (Upstash'e ulaşılamıyor vb.): çerez doğrulaması sayaç gerektirmez (yalnız imza), yani eşli cihaz Upstash olmadan da girer. Yalnız PIN girişi sayaca bağlıdır; sayaç yoksa PIN girişi "Sunucu sayacına ulaşılamadı" der (güvenli taraf).

## 5. Yüklü PWA'da davranış
- Ana ekrandan açılış tarayıcıyla aynı çerez kavanozunu kullanır (Android Chrome WebAPK). Eşli tarayıcıdan kurulan uygulama PIN sormaz. SameSite=Lax üst düzey gezinmede gönderilir.
- PIN ekranı da standalone modda açılır; manifest ve simgeler kapı dışında olduğu için "Ana ekrana ekle" kapı önünde de çalışır.

## 6. Çevrimdışı
Service worker yok; uygulama zaten ağ olmadan açılmaz. Kapı ek bir çevrimdışı sorun getirmez. İleride service worker eklenirse (ayrı KIRMIZI plan) önbellekteki sayfa kapıyı atlayabilir; o planda ele alınır.

## 7. Riskler
| Risk | Önlem |
|---|---|
| Yanlış middleware eşleşmesi PWA'yı veya statik dosyaları kilitler | `matcher` testleri + Prosedür 2'ye kapı adımı + canlıda curl kontrolü |
| Edge/Node HMAC biçim farkı → herkes dışarıda | Ortak test vektörü (aynı girdi → aynı imza) |
| Preview dağıtımları | Preview'da `AI_ENABLED=false`; kapı Preview'da da aynı PIN'i ister (PIN Production ve Preview'da tanımlı) |
| Kaba kuvvet (10.000 olasılık) | Bugünkü üç sayaç; yılda en çok 360 deneme (%3,6) |
| Saat kayması | `issuedAt` yalnız ömür için; 5 dk tolerans |

## 8. Geri alma
Tek commit: `middleware.ts` ve `/kilit` kaldırılır → uygulama yine açık, `/api/ai` kendi çerez kontrolüyle çalışmaya devam eder. Ortam değişkeni değişikliği gerekmez.

## 9. Testler (onaydan sonra)
Sahte istekle: çerezsiz sayfa → `/kilit` yönlendirmesi; geçerli çerez → geçer; kurcalanmış/süresi geçmiş/başka PIN'le imzalı çerez → yönlendirme; PIN değişince eski çerez geçersiz; manifest, simge, `_next/static` kapı dışı; yanlış PIN sınırları; `/api/ai` aynı çerezi kabul eder; Edge (Web Crypto) ve Node imzaları aynı. Tarayıcıda: 360/390/430 PIN ekranı (Prosedür 2). Telefonda: **sahip** (kurulu uygulama, yeniden başlatma).

## 10. Sahibe sorular
1. Bu planı onaylıyor musun? (Öneri: evet.)
2. Çerez 365 gün ve kayan olsun mu? (Öneri: evet.)
3. Genel ay sınırı (30/ay) kalsın mı? Kalırsa kötü durumda bir ay yeni cihaz eşleyemezsin ya da PIN'i Vercel'de değiştirmen gerekir. (Öneri: kalsın.)
4. Referans görseller de kapının arkasında olsun mu? (Öneri: evet; zaten GitHub'da açık olsalar da uygulama adresinden sunulmasınlar.)
