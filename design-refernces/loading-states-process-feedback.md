# Loading States & Process Feedback — Tasarım Tekniği

> Bir sayfa yüklenirken, bir dosya işlenirken veya arka planda veri beklenirken ekranda **ne** görünmeli ve bu **nasıl** davranmalı — bu, dekoratif bir detay değil, kullanıcının "bir şeyler ters gidiyor mu?" hissine kapılıp kapılmayacağını belirleyen doğrudan bir UX kararıdır. Bu döküman iki katmandan oluşuyor: (1) sayfa/ekran yüklenirken kullanılan **skeleton screen** tekniği, (2) bir işlem (özellikle dosya yükleme) sürerken uyulması gereken **5 geri bildirim sinyali**. İkisi de aynı kökten geliyor: **belirsizlik = güvensizlik, netlik = güven.**

---

## Bölüm 1 — Skeleton Screen (İskelet Yükleme Ekranı)

### Ne İşe Yarar
Boş bir beyaz sayfa veya tek bir ortalanmış spinner, kullanıcıya "sistem ne yapacağını bilmiyor" hissi verir. Skeleton screen ise **gelecek içeriğin şeklini önceden gösteren** gri/nötr blok placeholder'lardır — sayfa gerçek veriyle dolmadan önce, kullanıcının beynine "burada bir header olacak, burada bir görsel, burada metin blokları olacak" bilgisini verir.

### Before / After Prensibi
- **Before (İskelet durumu):** Gerçek sayfanın layout'unu birebir yansıtan, ama içeriği nötr gri bloklarla (header çubuğu, buton şekilleri, metin satırları, kart alanları) doldurulmuş bir versiyon gösterilir. Renk paleti sayfanın kendi temasından bağımsız, sakin bir gri tonlama olmalı (parlak/dikkat çekici renk kullanılmaz — henüz "gerçek" içerik değil).
- **After (Yüklenmiş durum):** Aynı layout, gerçek veri/görsel/metinle dolar. Geçiş ani bir "flash" değil, yumuşak bir fade/cross-fade ile olmalı — kullanıcı skeleton'dan gerçek içeriğe geçişi bir "sıçrama" olarak değil, "netleşme" olarak algılamalı.

### Kritik Kural: Layout Kimliği Korunmalı
Skeleton'daki her blok, gerçek içerikte hangi elemanın olacağını **boyut ve konum olarak** birebir yansıtmalı. Header'da kaç buton olacaksa skeleton'da da o kadar pill/blok olmalı; hero görselinin oranı neyse skeleton kutusu da aynı oranda olmalı. Aksi halde içerik geldiğinde layout kayar (CLS — Cumulative Layout Shift), bu da "geç gelen sürpriz" hissi yaratır ve tam olarak önlemeye çalıştığımız güvensizlik hissini geri getirir.

### Nerede Kullanılır
- İlk sayfa yükleme (SSR/CSR fark etmeksizin, veri fetch edilirken)
- Route değişimi (Next.js sayfa geçişleri, tab switch)
- Kart/liste bileşenleri (infinite scroll, API'den veri beklenirken)
- Görsel/medya yüklenirken (blur-up tekniğiyle birlikte kullanılabilir — bkz. Progressive Blur Card dökümanı)

### Uygulama Notu (Projeler)
- **Apex F1:** IBM Plex Mono veri blokları için skeleton'da da mono-genişlikte gri bloklar kullanılmalı — font değişince blok genişliği de değişir, bu tutarsızlığa yol açar.
- **Rosso / FinPilot:** Bento grid kartlarında her kart kendi skeleton'unu taşımalı (tüm sayfa tek bir skeleton olarak değil, bileşen-bazlı — böylece bir kart geç gelirken diğerleri zaten gerçek veriyle görünebilir).
- **Dark mode:** Skeleton blokları Surface Lightness modeliyle uyumlu olmalı (`#1E1E1E` civarı ton, `#121212` zeminden hafif ayrışan) — parlak beyaz shimmer efekti dark mode'da göz yorar, ince bir gradient shimmer tercih edilir.

---

## Bölüm 2 — İşlem Sürerken Geri Bildirim: 5 Sinyal

Bir dosya yüklenirken (veya herhangi bir arka plan işlemi sürerken) arayüzün uyması gereken beş davranış kuralı. Her biri bir "kırık" (broken) davranışı bir "güvenli" (safe) davranışla karşılaştırıyor.

### Sinyal 01 — Drag Feedback: "Hiçbir şey tepki vermiyor"
**Sorun:** Bir dosya sürüklenip drop alanının üzerine getirildiğinde alan hiçbir görsel değişiklik göstermezse, kullanıcı bırakıp bırakmayacağından emin olamaz ve tereddüt eder.
**Çözüm — 3 katmanlı tepki:**
1. **Border:** Kesikli çerçeve, dosya alanın üzerine gelir gelmez rengini değiştirir (nötr griden aksan rengine — örn. teal/cyan).
2. **Glow:** Çerçeve içi hafif bir iç-ışıma (radial glow) kazanır — alanın "aktif" olduğunu hissettirir.
3. **Copy:** Metin durum değiştirir: "Drop your file" → "Release to upload", dosya adı ve boyutu (`hero-banner.png — 2.4 MB`) anlık olarak görünür.

**Kural:** *"Users hesitate when nothing moves."* — Hareket yoksa güven de yok. En ufak bir hover/drag durumunda dahi arayüz bunu onaylamalı.

### Sinyal 02 — Honest Progress: "Spinner gerçeği gizler"
**Sorun:** Belirsiz bir spinner (`?` işaretli, "Uploading..." yazan) kullanıcıya hiçbir karar verme bilgisi vermez — ne kadar sürecek, devam mı etsin bilemez.
**Çözüm — Dürüst ilerleme:**
- Yüzde (`77%`) — somut sayısal ilerleme.
- Kalan süre (`4s left`) — beklenti yönetimi.
- Hız (`2.0 MB/s`) — şeffaflık, "sistem çalışıyor" kanıtı.

**Kural:** *"Let them decide — wait, or walk away."* — Belirsizlik kullanıcının kontrolünü elinden alır; sayısal veri kontrolü geri verir. Mümkün olan her yerde spinner yerine ölçülebilir ilerleme tercih edilmeli; gerçekten ölçülemiyorsa (örn. sunucu tarafı işlem süresi belirsizse) en azından "tahmini süre" veya aşama bilgisi (`Analyzing… Compressing… Finalizing…`) verilmeli.

### Sinyal 03 — Inline Retry: "Yüzde doksanda ölüyor"
**Sorun:** Yükleme %90'da bağlantı koptuğunda kullanıcı sıfırdan başlamak zorunda kalırsa, bu hem zaman kaybı hem de güven kaybıdır.
**Çözüm — Kaldığı yerden devam:**
- Hata durumu açıkça gösterilir (`Upload failed — Connection lost`), ama dosya **hafızada tutulur** (`file kept in memory`).
- Tek dokunuşla yeniden deneme (`Retry` butonu, inline — ayrı bir modal/sayfa değil).
- Devam ederken "Resuming from 90%..." mesajı — kullanıcıya sıfırdan başlamadığı açıkça belirtilir.
- Tamamlandığında normal `100% — Upload complete` durumuna döner.

**Kural:** *"Never make them start over."* — Bir hata, ilerlemeyi silmemeli. Retry her zaman kaldığı noktadan devam etmeli, mümkünse otomatik (birkaç saniye içinde) tekrar denenmeli ve sadece gerçekten çözülemezse kullanıcıdan manuel aksiyon istenmeli.

### Sinyal 04 — Upload Preview: "Dosya adı geri bildirim değildir"
**Sorun:** Sadece `IMG_4032.jpg uploaded` gibi bir metin, kullanıcının **doğru dosyayı** yüklediğinden emin olmasını sağlamaz — özellikle görsel/medya dosyalarında.
**Çözüm — Görsel kanıt (Proof):**
- Küçük resim önizlemesi (thumbnail) — gerçek görsel içeriği.
- Dosya tipi rozeti (`JPG`), boyutu (`2.4 MB`), çözünürlük bilgisi (`4032 × 3024`).
- Durum onayı (`Uploaded just now`).
- Aksiyon butonları: `Replace`, `Remove` — kullanıcı yanlış dosyayı fark ederse hemen düzeltebilir.

**Kural:** Görsel/medya içeriklerinde metin-bazlı onay yetersizdir; **thumbnail + type + size + proof** dörtlüsü asgari standart olmalı.

### Sinyal 05 — Independent Queue: "Her dosyanın kendi şeridi var"
**Sorun:** Çoklu dosya yüklemede bir dosya başarısız olduğunda tüm kuyruk durursa, başarılı olan diğer dosyalar da gereksiz yere bekletilmiş olur.
**Çözüm — Bağımsız ilerleme çizgileri:**
- Her dosya kendi progress bar'ına, kendi durumuna (yükleniyor / tamamlandı / başarısız) sahip.
- Genel özet üstte gösterilir (`3 of 5 — 1 failed` → tüm işlem bitince `5 of 5 done`).
- Başarısız olan dosya kendi satırında `Retry` seçeneğiyle işaretlenir; **diğer dosyaların yüklemesini bloklamaz.**

**Kural:** *"One failure never blocks the others."* — Toplu işlemlerde hata izolasyonu şart; tek bir hata tüm kuyruğu durdurmamalı.

---

## Genel İlke: Belirsizlik Yönetimi

Tüm bu sinyaller tek bir üst prensibe bağlanıyor: **kullanıcıya her an "sistem ne durumda, ben ne yapabilirim" sorusunun cevabını ver.**

| Durum | Kötü (Broken) | İyi (Safe) |
|---|---|---|
| Sayfa yükleniyor | Boş ekran / tek spinner | Layout'u yansıtan skeleton bloklar |
| Dosya sürükleniyor | Statik kutu | Border + glow + copy değişimi |
| İşlem sürüyor | Belirsiz spinner | Yüzde + kalan süre + hız |
| Hata oluştu | Sıfırdan başlat | Inline retry, kaldığı yerden devam |
| Yükleme bitti | Sadece dosya adı | Thumbnail + tip + boyut + onay |
| Çoklu işlem | Tek hata hepsini durdurur | Her öğe kendi kuyruğunda ilerler |

---

## Hızlı Uygulama Kontrol Listesi

- [ ] Sayfa/bileşen veri beklerken skeleton, layout'un boyut ve konumunu birebir yansıtıyor mu?
- [ ] Skeleton → gerçek içerik geçişi ani bir sıçrama değil, yumuşak bir fade mi?
- [ ] Herhangi bir drag/hover etkileşimi anlık görsel tepki veriyor mu (border/glow/copy)?
- [ ] Belirsiz spinner yerine, mümkün olan her yerde sayısal ilerleme (%, süre, hız) gösteriliyor mu?
- [ ] Bir hata durumunda kullanıcı kaldığı yerden mi devam ediyor, yoksa sıfırdan mı başlıyor?
- [ ] Medya/görsel yüklemelerinde kullanıcıya gerçek bir önizleme (thumbnail) gösteriliyor mu?
- [ ] Çoklu dosya/işlem senaryosunda bir öğenin hatası diğerlerini bloklamıyor mu?

---

---

## Bölüm 3 — Optimistic UI & Algılanan Hız (2026-08-05)

> Instagram ilham envanteri · **Öncelik:** Yüksek

### Ne işe yarar

Ağ gecikmesi her zaman kaldırılamaz; kullanıcı **anında tepki** görmezse uygulama yavaş hissedilir. Optimistic UI: düşük riskli aksiyonda UI'ı hemen güncelle, API arkada gitsin; hata olursa **geri al + açıkla**.

### Rosso — optimistic İZİNLİ

| Aksiyon | Gerekçe |
|---|---|
| Beğeni / beğeniden kaldır | `LikeButton` — geri al + rate-limit mesajı ✓ |
| Takip toggle (gelecek) | Düşük risk, rollback toast |
| UI-only tercihler (tema, görünüm) | Yerel + arka plan sync |

### Rosso — optimistic YASAK

| Aksiyon | Gerekçe |
|---|---|
| Playlist silme | Geri alınamaz yan etki |
| Şifre / hesap silme | Güvenlik |
| Ödeme / plan değişimi | Finansal tutarlılık |

### Rollback kuralı

```tsx
setLiked(next) // iyimser
const res = await api(...)
if (!res.ok) {
  setLiked(!next) // geri al
  toast('error', 'Kaydedilemedi.')
}
```

Sessiz geri alma **yasak** — kullanıcı "tıklamadım mı?" der.

### Sahte progress yasağı (Rosso felsefesi)

Non-linear %70 animasyonu **ZIP/Journey bekleme** için kullanılmaz — sahte loading felsefeye aykırı. Bunun yerine:

- **Gerçek aşama etiketi:** "Eşleştiriliyor…" · "Kapaklar yazılıyor…"
- **Belirsiz progress bar** (indeterminate) veya worker'dan gelen gerçek %
- Skeleton anında — spinner-only tam sayfa yasak (Bölüm 1)

### Skeleton envanteri (web)

`web/src/app/(dashboard)/**/loading.tsx` — 21 route. Eksik route eklenirken layout kimliği korunmalı (CLS ≈ 0).

---

## Proje Uygulama Notları

- **Rosso (Spotify ZIP işleme):** pgmq worker ile arka planda uzun süren işlemler (analiz, eşleştirme) için Sinyal 02 (Honest Progress) ve Sinyal 05 (Independent Queue) doğrudan uygulanabilir — kullanıcı yükleme sırasında "analiz ediliyor / eşleştiriliyor / tamamlanıyor" aşamalarını görmeli.
- **AI Calorie Tracker (Claude Vision API):** Fotoğraf yüklenip analiz edilirken Sinyal 01 + 02 + 04 birlikte kullanılmalı — drag/seç anında tepki, analiz sırasında ilerleme, sonuçta görsel önizleme.
- **FinPilot:** Banka/hesap senkronizasyonu gibi arka plan işlemlerinde Sinyal 05 mantığı uygulanabilir — birden fazla hesap senkronize edilirken biri başarısız olursa diğerleri etkilenmemeli.
- **Genel:** Tüm skeleton ve progress bileşenleri, 60:30:10 renk kuralına uymalı — accent rengi (teal/cyan gibi) sadece aktif/başarılı durumlarda, hata durumunda ayrı bir uyarı rengi (kırmızı/turuncu tonu) kullanılmalı; skeleton'un kendisi her zaman 30% (yapı) katmanında nötr kalmalı.
