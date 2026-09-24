# 60:30:10 Renk Kuralı — Samurai Jack Referansı & Çoklu Proje Uygulaması

> Tarih: 2026-07-10 (güncelleme: proje-agnostik katman eklendi) · Otorite: `rosso-design-system.md` §2.1 · `tokens/colour-palettes.md`
> Görseller: Samurai Jack kareleri (Efendim referansı) — animasyon olsa da **kompozisyon ve renk dağılımı** için pedagojik örnek.
> **Kapsam:** Bu döküman artık iki katmandan oluşuyor — (1) evrensel kural + genel yöntem (her projede kullanılabilir), (2) Rosso'ya özel token eşlemesi (referans uygulama olarak korunuyor). Yeni bir projeye uygularken §8-10'daki proje-agnostik bölümlerden başla, sonra kendi token setini aynı mantıkla eşle.

---

## 1. Kural ne diyor?

| Oran | Rol | UI karşılığı |
|---|---|---|
| **%60** | Baskın zemin — atmosfer, dinlenme alanı | `--color-bg`, sayfa canvas, boş alan |
| **%30** | İkincil katman — yapı, derinlik, destek | Kartlar (`--color-bg-elevated`), border, ikincil metin blokları, nav zemini |
| **%10** | Vurgu — tek odak kanalı | Birincil CTA, aktif nav, tek kritik metrik, aktif durum — `--color-accent` |

**Çekirdek ders:** Az renkle çok hiyerarşi. Vurgu **seyrek** kullanıldığında güçlü olur; her yere accent koyunca premium hissi kaybolur.

---

## 2. Samurai Jack örnekleri — ne öğretiyor?

Her kare aynı kuralı farklı paletle kanıtlıyor. Pie chart'lar oranı görselleştiriyor.

### Örnek A — Sıcak manzara (kırmızı-turuncu + sarı güneş + siyah silüet)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Kırmızı-turuncu zemin | Çöl / kayalık — atmosfer |
| 30% | Sarı disk | İkincil odak, derinlik |
| 10% | Siyah silüet | Jack + at — **asıl kahraman** |

**Ders:** Vurgu rengi “parlak” olmak zorunda değil; **en yüksek kontrast** olan öğe 10%'u alır.

### Örnek B — Kış (gri gökyüzü + beyaz kar + siyah figür)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Orta gri | Gökyüzü, sis |
| 30% | Açık gri / beyaz | Kar, ağaç gövdeleri |
| 10% | Siyah | Karakter ve ince dallar |

**Ders:** Monokrom palet bile 60:30:10 ile çalışır — Rosso'nun charcoal zemin + elevated kart mantığı.

### Örnek C — Aku (gri zemin + siyah gövde + kırmızı gözler)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Açık gri | Arka plan |
| 30% | Siyah | Karakter kütlesi |
| 10% | Kırmızı | Yalnızca gözler |

**Ders:** **10% tek detay** tüm kareyi taşır. UI'da: bir amber buton, bir aktif sekme — onlarca badge değil.

### Örnek D — Çatlak çöl (terrakota + kahve gölge + beyaz cübbe)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Terrakota | Güneşli zemin |
| 30% | Koyu kahve | Gölge bandı |
| 10% | Beyaz | Jack'in cübbesi |

**Ders:** Kahraman bazen **en açık** ton olur (10% accent = kontrast, her zaman “marka rengi” değil).

### Örnek E — Endüstriyel duman (okra duman + lacivert gökyüzü + siyah silüet)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Okra / hardal duman | Baskın sıcak kütle |
| 30% | Koyu lacivert | Gökyüzü |
| 10% | Siyah | Bacalar, platform |

**Ders:** Sıcak-soğuk ikili 60+30 içinde kalır; accent yine nadir ve keskin.

### Örnek F — Kanyon (bordo gölge + açık kaya + beyaz cübbe)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Koyu bordo | Derin gölge, uçurum |
| 30% | Açık bordo / kahve | Kaya yüzeyi |
| 10% | Beyaz | Karakter |

**Ders:** Aynı hue ailesinde 60+30 = derinlik; 10% farklı hue veya parlaklık = odak.

### Örnek G — Aku silüet (siyah + bej gökyüzü + beyaz göz)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Siyah | Dominant figür |
| 30% | Bej / ochre | Gökyüzü |
| 10% | Beyaz | Göz vurgusu |

**Ders:** 60% bazen **koyu kütle** olabilir — dark-first Rosso'da sayfa zemini + sidebar birlikte 60 bandında.

### Örnek H — Alacakaranlık uçurum (koyu mor kayalar + teal-gri gökyüzü + siyah Jack)

| Oran | Renk | Karede ne |
|---|---|---|
| 60% | Koyu mor-gri | Kayalık kütlesi |
| 30% | Soluk teal-gri | Gökyüzü |
| 10% | Siyah | Tırmanan figür |

**Ders:** Düşük doygunluk = premium / laboratuvar hissi; Rosso amber accent bu sakin zemin üzerinde “tek sıcak nokta”.

---

## 3. Animasyondan UI'ya çeviri

| Samurai Jack tekniği | Rosso karşılığı | Yapma |
|---|---|---|
| Tek silüet odak | Sayfada **bir** birincil CTA / bir hero metrik | 3+ amber buton aynı viewport'ta |
| Seyrek sıcak renk | `--color-accent` yalnızca aksiyon + aktif durum | Accent border her kartta |
| 60% sakin zemin | `--color-bg` + geniş negatif boşluk (Canvas modu) | Her pikseli kartla doldurma |
| 30% yapı katmanı | Bento kartları, nav, liste satırları | Kart içi kart içi kart |
| 10% kontrast sıçraması | Amber buton, aktif nav, tek uyarı | PLANLANAN badge, eyebrow, tag üçlüsü |
| Squint testi | Bulanık bakınca tek mesaj okunur | Başlık + badge + CTA hepsi bağırıyor |

---

## 4. Rosso token eşlemesi (palette-v1 default)

| 60:30:10 | Token | Örnek kullanım |
|---|---|---|
| **60%** | `--color-bg`, `--color-bg-sunken` | Sayfa zemini, recap boş alan, taste hero arka planı |
| **30%** | `--color-bg-elevated`, `--color-border`, `--color-text-primary/secondary`, `--color-nav-bg` | Kartlar, sidebar, track list, metin blokları |
| **10%** | `--color-accent`, `--color-accent-subtle` (çok seyrek) | “Müziğini taşı”, aktif bottom-nav, tek progress vurgusu |

**Kapak görselleri (cover art):** İçerik — 30% katmanında yaşar; accent bütçesinden **sayılmaz**. Ama bir ekranda 12 renkli kapak + 6 amber badge = kural ihlali.

**Çoklu palet seçici (settings):** 18 accent rengi stats.fm anti-örneği; 60:30:10 için **tek varsayılan amber + isteğe bağlı gelişmiş** (spec dışı yapısal madde).

---

## 5. Sayfa bazlı denetim listesi (iyileştirme)

Squint testi + 60:30:10 birlikte uygulanır.

| Sayfa | 60% olmalı | 30% olmalı | 10% olmalı | Bilinen risk |
|---|---|---|---|---|
| `/` landing | Hero boşluk, koyu zemin | Feature kartları, önizleme çerçevesi | **Tek** primary CTA (hero veya band — ikisi değil) | CTA tekrarı, IdentityMarquee renk gürültüsü |
| `/dashboard` | Zemin, grafik arka planı | Metrik kartları, listeler | Tek hero metrik veya tek aksiyon | Çoklu eşit kart, accent badge |
| `/taste` | Uzun scroll zemin | Bento bölümler, grafikler | Persona başlığı veya tek CTA | Her bölümde eyebrow |
| `/playlists` | Liste zemin | Satırlar, kapak thumb | Aktif sıralama / birincil “oluştur” | Platform rengi her satırda bağıran |
| `/pricing` | Sayfa zemin | Plan kartları | Featured plan CTA | Üst üste “ücretsiz” vurguları |
| `/recap` | Story kart zemin | İstatistik blokları | “Paylaş” tek aksiyon | Wrapped tarzı neon (Rosso'da yok) |

---

## 6. Karar özeti

1. **Accent = para birimi.** Harcandıkça değer kaybeder.
2. **Koyu zemin 60%** Rosso kimliğinin omurgası; Samurai Jack'in karanlık kareleri bunu doğrular.
3. **10% her zaman “en önemli tek şey”.** İkinci bir “birincil” aksiyon eklenecekse ilki secondary'ye düşürülür.
4. **Referans ilhamı, kopya değil.** Jack'in kırmızı çölü Rosso amber değil; **oran disiplini** alınır.

---

## 7. Proje-Agnostik Uygulama Katmanı

60:30:10, Rosso'ya özgü bir kural değil — her projede aynı üç rol geçerli, değişen sadece hangi token'ın hangi role atandığı. Aşağıdaki tablo mevcut proje portföyüne (bkz. bellek: Apex, FinPilot, Obsession, EVEREST, The Origin) genel kuralın nasıl uygulanacağını gösterir. Yeni bir proje başlarken bu satırlardan birine benzer bir satır kendi token'larınla doldur.

| Proje | 60% (zemin) | 30% (yapı) | 10% (vurgu) | Not |
|---|---|---|---|---|
| **Apex (F1 editorial)** | Matte charcoal zemin (`--bg`) | Kart/tonal elevation katmanları, IBM Plex Mono veri blokları | Apex Red — *sadece* transient accent (aktif durum, tek CTA) | Zero shadow kuralıyla birebir uyumlu; kırmızı asla zemin veya kart rengi olamaz |
| **FinPilot** | Navy/steel blue (light) veya charcoal/warm grey (dark) canvas | Bento grid kartları, spending/portfolio widget'ları | Gradient chat FAB, tek "cash flip" vurgusu | 10% burada **tek bir interaktif eleman** (FAB) olarak somutlaşıyor — dashboard'da ikinci bir eşit-güçte vurgu olmamalı |
| **Obsession (10 marka editorial)** | Her markanın kendi "sessiz" zemin tonu (örn. Ferrari'de off-black, Rolls-Royce'da ivory) | Layout/tipografi katmanı — marka-özel grid | Markanın imza rengi (Ferrari kırmızısı, Bugatti mavisi vb.) — **tek noktada** | 10 marka = 10 farklı 60:30:10 seti; oran sabit kalır, paletler değişir |
| **EVEREST** | Cryogenic zemin (koyu, soğuk nötr) | Glassmorphism kartlar, board grid'i | Glacial accent `#7EC8D8` — sadece aktif/hover durumunda | Accent'in "buz parıltısı" hissi vermesi için **çok seyrek** kullanılması şart |
| **The Origin** | Faz-bazlı dinamik zemin rengi (13 faz × kendi tonu) | Journal entry kartları, sembol (○◐●✦✺) katmanı | Faz geçiş anındaki tek vurgu — asla kalıcı bir "buton rengi" değil | Burada 10% bile *ritüel* — sürekli/tekrarlayan bir UI vurgusu değil, ana kırılma noktası |
| **Mercedes-Benz/Maybach/AMG portfolio** | Sinematik koyu zemin (near-black) | 3D scroll sahneleri, video katmanları | Marka kromu/metalik vurgu (tek logo ışıltısı, tek CTA) | Cinematic projelerde 10% genellikle *ışık*, renk değil — parlaklık kontrastı da "accent" sayılır |

---

## 8. Yeni Bir Projede 60:30:10'u Kurma Metodu (Adım Adım)

Herhangi bir yeni palet/proje için:

1. **Zemini belirle (60%).** Projenin "dinlenme" rengi ne? Genelde en nötr, en az doygun ton. Bu, sayfanın %60'ını (gerçek piksel değil, *algısal ağırlık*) kaplayacak zemin/canvas rengi.
2. **Yapı katmanını seç (30%).** Kartlar, nav, ikincil metin blokları — zeminden ayrışan ama vurgu olmayan bir ton. Genelde zeminle aynı hue ailesinden, farklı tonal değerde (koyuluk/açıklık farkı) bir renk.
3. **Vurguyu tek bir role ata (10%).** Markanın "imza" rengi burada devreye girer — ama **sadece bir eylem/durum** için: birincil CTA, aktif nav, tek kritik metrik. Vurgu rengi ikinci bir yerde tekrarlanıyorsa, o ikinci kullanım secondary'ye düşürülmeli.
4. **Squint testini uygula.** Ekranı bulanıklaştır (gözünü kıs veya tasarım aracında blur filtresi uygula). Tek bir şey öne çıkmalı — o da 10% vurgu. Birden fazla eleman öne çıkıyorsa oran bozulmuştur.
5. **Kapak görseli / kullanıcı içeriği istisnasını unutma.** Fotoğraf, kapak sanatı, kullanıcı avatarı gibi "içerik renkleri" 30% (yapı) katmanında yaşar ve accent bütçesinden sayılmaz — ama bir ekranda çok sayıda renkli içerik + çok sayıda accent rozeti varsa, bu yine de kural ihlalidir (bkz. §4, kapak görselleri notu).
6. **Token'ları isimlendir.** Her projede aynı üçlü isimlendirme mantığını kullan: `--color-bg` / `--color-bg-elevated` / `--color-accent` (+ gerekiyorsa `-subtle`, `-sunken` varyantları). Bu, CLAUDE.md seed/tree şablonlarına doğrudan aktarılabilir bir standart oluşturur.

---

## 9. Hızlı Referans Kartı (Proje Fark Etmeksizin)

- **Vurgu = para birimi.** Ne kadar çok harcarsan o kadar değersizleşir.
- **Bir ekranda bir "en önemli şey" olur.** İkinci bir "birincil" varsa, biri yanlış.
- **Zemin sıkıcı olmalı.** 60%'ın işi dikkat çekmek değil, dinlendirmek.
- **Yapı katmanı görünür ama sessiz olur.** Kartlar/nav fark edilir, ama göz orada durmaz.
- **Referans ilhamdır, kopya değildir.** Samurai Jack'in çölü senin markanın rengi değil — oran disiplini alınır, palet alınmaz.
- **Monokrom projelerde bile kural geçerli.** 10% "renk" olmak zorunda değil; en yüksek kontrast/parlaklık noktası da vurgu sayılır (bkz. §2 Örnek B, Örnek H).

---

## 10. İlişkili dosyalar

| Dosya | Rol |
|---|---|
| `rosso-design-system.md` §2.1 | Kanonik 60-30-10 + token listesi |
| `tokens/colour-palettes.md` §BÖLÜM 1B | Palet başına oran rehberi |
| `styles/Minimalism Design System_…md` §5 | Squint testi, surface lightness |
| `references/ui-referans-ekran-spec.md` §0.1 | Referans ilham ilkesi |
| `superpowers/reports/ui-metin-envanteri.md` | Metin gürültüsü ↔ renk gürültüsü paraleli |

---

*Görsel arşiv: oturum `assets/` — Samurai Jack 60:30:10 kareleri (8 örnek).*
