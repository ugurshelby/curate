# Design System Kurulum Rehberi — Sıfırdan İnşa ve Mevcut Projeye Entegrasyon

> Bir dizayn sistemi; ürünün tutarlılığını (consistency), tasarım/geliştirme sürecinin verimliliğini (efficiency) ve projenin ölçeklenebilirliğini (scalability) sağlamak için ölçüm, boşluk, tipografi ve renk kurallarının standartlaştırılmasıdır. Bu döküman iki senaryoyu birden kapsar: **(A) sıfırdan başlayan projeler** (Apex, Rosso, FinPilot gibi tüm greenfield projeler) ve **(B) oturmamış/mevcut bir projeye sonradan sistem oturtma** (retrofitting). İkisi teknik olarak değil, **yaklaşım** olarak farklıdır.

---

## Bölüm A — Sıfırdan Proje: 5 Adımlık Pratik İnşa Süreci

Yeni bir projede sistemi en baştan kurmak en kolay senaryodur; kurallar en başta netleşince ileride oluşacak tasarım/teknik borç engellenir.

### Adım 1 — Temelleri Tanımla (Define Your Foundations)
Aşağıdakileri en başta netleştir:
- **Color Palette** — birincil, ikincil, nötr ve durum (error/success) renkleri.
- **Typography** — font ailesi, ağırlıklar, ölçek.
- **Spacing** — boşluk birimi ve skalası.
- **Border Radius** — köşe yuvarlaklığı kuralı (örn. Apex'te sıfır radius, EVEREST'te yumuşak radius).
- **Shadows** — gölge kullanımı (veya Apex gibi projelerde tamamen yasak, tonal elevation'la değiştirilir).

Bu beşi netleştirmeden hiçbir bileşen üretimine geçilmemeli — her bileşen bu temellerin *uygulaması* olmalı, kendi kuralını icat etmemeli.

### Adım 2 — Design Token Oluştur (Create Design Tokens)
Token'lar, tutarlılık için **yeniden kullanılabilir** referans değerlerdir. Ham değer yerine (`#007AFF`, `16px`) semantik isim kullanılır:
- `Primary-Color` (renk)
- `Spacing-16` (boşluk)
- `Heading-Lg` (tipografi)

**Kural:** Bir bileşende asla ham hex/px değeri hardcode edilmez; her zaman token referans edilir. Bu, tema değişikliği (dark mode, marka varyasyonu) geldiğinde tek noktadan güncelleme sağlar.

### Adım 3 — Yeniden Kullanılabilir Bileşenleri İnşa Et (Build Reusable Components)
Temel bileşen seti (essentials): **Buttons, Inputs, Cards, Navigation.**
Bu dörtlü, her ürünün iskelet omurgasıdır — diğer her bileşen (modal, dropdown, form grubu) bunların kombinasyonuyla kurulur. Önce bunları sağlamlaştır, sonra türetilmiş bileşenlere geç.

### Adım 4 — Varyant ve Durum Ekle (Add Variants & States)
Her bileşen en az şu dört durumu tanımlamalı:
- **Default** — dinlenme hali
- **Hover** — imleç/dokunma öncesi geri bildirim
- **Disabled** — etkileşime kapalı hal
- **Error** — hata/geçersiz durum

Örnek: bir buton `Default` halde outline (kontur), `Hover` halde dolu (solid) renge geçebilir — durum değişimi görsel olarak da anlamlı bir fark yaratmalı, sadece opacity değişimi yeterli değildir.

### Adım 5 — Her Şeyi Dokümante Et (Document Everything)
> **"A design system is a shared language."**

Dokümantasyon olmayan bir dizayn sistemi, sadece bir Figma dosyasıdır — bir *sistem* değildir. Dokümantasyon, tasarımcı ile geliştirici arasında (ve Claude Code gibi AI ajanlarıyla) ortak bir dil kurar. Hangi token'ın ne zaman kullanılacağı, hangi bileşenin hangi varyantı ne için var olduğu yazılı olmalı.

---

## Bölüm B — Derinlemesine Teknik Standartlar (Sıfırdan Kurulumda)

5 adımlık pratik çerçeveyi aşağıdaki matematiksel/teknik standartlarla doldur.

### 1. Boşluk Sistemi (Spatial System)
- Göz kararı boşluklar yerine **matematiksel bir sistem** kur.
- Tarayıcının varsayılan font boyutu olan **16px**'i temel al.
- **8pt doğrusal ölçek** benimse (8, 16, 24, 32, 40...).
- İkonlar veya dar metin blokları gibi hassas hizalamalarda **4pt'lik yarım adımlar** kullan.

### 2. Boyutlandırma Stratejisi
İki yaklaşımdan birini standartlaştır:
- **Element Öncelikli (Element First):** Butonlar, form alanları gibi öngörülebilir içeriğe sahip katı bileşenlerin yükseklik/genişliği doğrudan 8pt grid'e kilitlenir.
- **İçerik Öncelikli (Content First):** Veri tabloları gibi içeriği öngörülemeyen alanlarda, bileşenin boyutunu içindeki veri + çevresindeki **katı iç boşluklar (strict padding)** belirler.

> Hangi bileşenin hangi stratejiyi kullandığı dökümante edilmeli — ikisini karıştırmak tutarsız bir grid hissi yaratır.

### 3. Tipografik Ölçek ve Hiyerarşi
- Rastgele font boyutları yerine **modüler oranlar** kullan (1.125 veya 1.333 gibi bir çarpan).
- Elde edilen değerleri grid sistemine uyması için en yakın **4px veya 8px**'e yuvarla.
- **Line-height, font boyutuyla ters orantılı** olmalı:
  - Küçük metin → geniş satır yüksekliği (~1.5)
  - Büyük başlık → dar satır yüksekliği (~1.1)

### 4. Renk Sistemini Matematikselleştir
- Statik hex kodları yerine **OKLCh veya HCT** gibi modern, algoritmik renk uzayları kullan — bu, bir ana rengi biliyorken tüm tonal skalayı (50-900 gibi) tutarlı algısal aralıklarla türetmeni sağlar.
- Renkleri "mavi", "kırmızı" diye değil, **semantik role** göre isimlendir: `primary`, `surface`, `error`, `onPrimary`.
- Bu isimlendirme, tema/marka değiştiğinde (örn. Obsession'da 10 farklı marka paleti) token isimlerinin sabit kalmasını, sadece değerlerin değişmesini sağlar.

### 5. Yapay Zeka (Agentic) Altyapısını İlk Günden Kur
- Sistemi sadece Figma'da bırakma. Proje kök dizininde bir **`design.md`** veya **`CLAUDE.md`** dosyası oluştur; renk, grid ve tipografi kurallarını Claude Code / Cursor gibi AI ajanları için dökümante et.
- **UXPin Merge, shadcn/ui** gibi araçlarla tasarımı doğrudan kod bileşenlerine (React/Tailwind) bağlayarak tasarım-geliştirme uçurumunu sıfırla.
- Bu adım, mevcut CLAUDE.md seed/tree şablon sistemine doğrudan entegre olur — yeni bir proje başlarken design token'ları en baştan seed dosyasına yazmak, Claude Code'un ilk günden doğru grid/renk/tipografi kararları vermesini sağlar.

---

## Bölüm C — Mevcut Bir Projeye Sonradan Sistem Oturtma (Retrofitting)

Oturmamış bir projeyi yeni bir dizayn sistemine uydurmak, **teknik değil, takım yönetimi/iletişim meselesidir.** Sıfırdan kurmaktan çok daha zordur.

### 1. Paydaşları İkna Et ve İşbirliği Kur
- İşletmeler için öncelik "mükemmel bir boşluk sistemi" değil, **kullanıcıya değer sunmaktır.**
- PM'lere/yöneticilere: sistemin geliştirme hızını nasıl artıracağını ve teknik borcu nasıl azaltacağını anlat.
- Mühendislere: artık daha net gereksinimlerle çalışacaklarını göster.

### 2. Küçükten Başla (Big Bang'den Kaçın)
- Tüm projeyi bir gecede geçirmeye çalışmak korkutucu ve risklidir.
- **Sadece butonlar** gibi çok basit, temel bir bileşeni dönüştürerek başla.
- Ardından form alanları gibi kardeş bileşenlere doğru adım adım ilerle — takımın ivme ve anlayış kazanması sağlanır.

### 3. Uygulayıcıları (Mühendisleri) Yetkilendir
- Bir dizayn sisteminin kurallarını yukarıdan dikte etmeye çalışmak "kedileri gütmek" gibidir.
- Sistemi hayatta tutmak için, onu kodda uygulayacak mühendisleri yetkilendir; sistemin **bekçileri** onlar olsun.

### 4. Değeri Ölç ve Göster
- Küçük bir bölümü (örn. ikon iş akışı) sisteme oturttuktan sonra dur, **"öncesi ve sonrası" metriklerini** çıkar.
- Ekip üyeleriyle kısa röportajlar yaparak kazanılan zamanı belgele.
- Bu verileri, projenin geri kalanını sisteme geçirmek için paydaşlara sun.

### 5. İvmeyi Koru, Arafta Kalma
- Geçişi tamamlamak için net bir vizyonun ve bitiş tarihin olsun.
- Projenin yarısı yeni sisteme uyup diğer yarısı eski düzende kalırsa, bu **"araf (limbo)"** durumu kullanıcı için değer yaratmayı eskisinden daha karmaşık hale getirir.

---

## Özet Tablo: Hangi Senaryoda Ne Öncelikli?

| | Sıfırdan Proje | Mevcut Projeye Retrofit |
|---|---|---|
| **En büyük risk** | Kuralları en baştan netleştirmemek | Yarım kalmış geçiş (araf durumu) |
| **Başlangıç noktası** | Foundations (renk/tipografi/spacing) | En basit bileşen (buton) |
| **Ana zorluk** | Matematiksel/teknik disiplin | İnsan/takım iletişimi ve diplomasi |
| **Başarı ölçütü** | Token tutarlılığı, dökümantasyon eksiksizliği | Ölçülebilir "öncesi/sonrası" metrikleri |
| **Kilit araç** | `design.md`/`CLAUDE.md` + token sistemi | Paydaş sunumu + küçük zafer örnekleri |

---

## Hızlı Uygulama Kontrol Listesi

- [ ] Renk, tipografi, spacing, border-radius, shadow kuralları en baştan yazılı mı?
- [ ] Her renk/boşluk/font boyutu bir **semantik token** olarak mı tanımlı (hardcode değil)?
- [ ] Buton/Input/Card/Navigation dörtlüsü sağlam ve tutarlı mı?
- [ ] Her bileşenin Default/Hover/Disabled/Error durumları tanımlı mı?
- [ ] Boşluk sistemi 8pt (+ 4pt yarım adım) grid'e mi oturuyor?
- [ ] Tipografi modüler bir orana mı dayanıyor, yoksa rastgele mi seçilmiş?
- [ ] Renkler OKLCh/HCT gibi algoritmik bir uzayda mı türetiliyor, yoksa göz kararı mı seçiliyor?
- [ ] Proje kökünde bir `design.md`/`CLAUDE.md` var mı — AI ajanı bu kuralları biliyor mu?
- [ ] (Retrofit ise) geçiş küçük bir bileşenle mi başladı, yoksa "big bang" mi denendi?
- [ ] (Retrofit ise) ölçülebilir bir "öncesi/sonrası" metriği var mı?

---

### Kapanış İlkesi
Yeni projelerde sistemi **matematiksel kurallar + kod/AI entegrasyonu** ile dikte etmek en iyi yoldur. Mevcut projelerde ise **diplomasi, küçük zaferler ve ekibi yetkilendirme** sistemin kalıcı şekilde yerleşmesini sağlar. Her iki durumda da nihai hedef aynı: *"A design system is a shared language."*
