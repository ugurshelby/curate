# UX Laws — 25 Davranışsal UX Psikolojisi Prensibi

> Bu döküman, insan biliş ve algısına dayanan 25 UX yasasını/etkisini beş kategoride toplar: **Karar Verme, Dikkat, Hafıza, Motivasyon, Güven.** Bu yasalar **estetik değil davranışsal** kurallardır — hangi stili seçersen seç (brutalist, minimalist, glassmorphic) hepsi geçerlidir; bkz. `universal-design-principles.md` ile aynı "taban katman" mantığı. Tek cümlelik özet: **"İnsanların nasıl düşündüğü, harika ürünlerin nasıl hissettirdiğini belirler."**

---

## Neden Önemli?

Çoğu tasarımcı Figma'yı, auto layout'u, variable'ları, component'leri öğrenir — ama **kullanıcıların neden o şekilde davrandığını** hiç öğrenmez. Araçlar değişir, insan davranışı değişmez. Psikoloji, iyi tasarımcıyı harika tasarımcıdan ayıran şeydir.

---

## Kategori 1 — Karar Verme (Decision Making)

| # | Yasa | Prensip |
|---|---|---|
| 1 | **Hick's Law** | Seçenek arttıkça karar süresi de artar. Çok fazla seçenek kafa karışıklığı yaratır. |
| 2 | **Paradox of Choice** | Çok fazla seçenek memnuniyeti azaltır — daha fazla seçenek her zaman daha iyi değildir. |
| 3 | **Cognitive Load** | Her ekran elemanının bir zihinsel maliyeti vardır. Gereksiz eleman = gereksiz yük. |
| 4 | **Progressive Disclosure** | Karmaşıklığı kademeli aç. Her şeyi ilk anda gösterme. |
| 5 | **Chunking** | Bilgiyi küçük gruplara böl. |

**UX dersi:** Özellik eklemeden önce sürtünmeyi azalt. Bir ekranda çözülmesi gereken tek soru: "Bu seçenek/eleman gerçekten gerekli mi?"

**Gerçek ürün örneği:** Netflix → Progressive Disclosure (kategoriler kademeli açılır, tüm katalog aynı anda gösterilmez).

---

## Kategori 2 — Dikkat (Attention)

| # | Yasa | Prensip |
|---|---|---|
| 6 | **Von Restorff Effect** | İnsanlar farklı görüneni hatırlar. Kontrast dikkat yaratır. |
| 7 | **Visual Hierarchy** | Kullanıcılar önce büyük şeyleri fark eder. |
| 8 | **Serial Position Effect** | İnsanlar bir dizinin başını ve sonunu hatırlar, ortasını unutur. |
| 9 | **Banner Blindness** | İnsanlar reklama benzeyen her şeyi görmezden gelir. |
| 10 | **Fitts's Law** | Büyük ve yakın hedeflere dokunmak daha kolaydır. |

**UX dersi:** Dikkat rastgele oluşmaz, yönlendirilir. Sıralamada en önemli bilgiyi başa veya sona koy (Serial Position Effect); reklam gibi görünen (kutulu, parlak, "SPONSORED"-vari) tasarımlardan kaçın, çünkü göz onları otomatik atlar.

**Gerçek ürün örneği:** Apple → Visual Hierarchy (ürün sayfalarında tek bir dev görsel + tek başlık, rekabet eden ikinci bir odak yok).

---

## Kategori 3 — Hafıza (Memory)

| # | Yasa | Prensip |
|---|---|---|
| 11 | **Miller's Law** | Çalışma belleği sınırlıdır. |
| 12 | **Recognition over Recall** | Seçenekleri göster, hatırlamaya zorlama. |
| 13 | **Jakob's Law** | Kullanıcılar tanıdık kalıpları bekler. |
| 14 | **Mental Models** | Kullanıcının beklediği şekilde tasarla. |
| 15 | **Consistency Principle** | Öngörülebilirlik güven inşa eder. |

**UX dersi:** Kullanıcı çok şey hatırlamak zorunda kalıyorsa, UX zaten başarısız olmuştur. Bir dropdown'da geçmiş seçimleri göstermek (recognition), kullanıcıyı "ne yazmıştım?" diye düşündürmekten (recall) her zaman üstündür.

**Gerçek ürün örneği:** (Bu kategori için doğrudan örnek verilmemiş, ama `universal-design-principles.md` İlke 4 — Tutarlılık = Erişilebilirlik — Consistency Principle'ın doğrudan UI karşılığıdır.)

---

## Kategori 4 — Motivasyon (Motivation)

| # | Yasa | Prensip |
|---|---|---|
| 16 | **Goal Gradient Effect** | Görünür ilerleme eylemi hızlandırır. |
| 17 | **Zeigarnik Effect** | İnsanlar bitmemiş görevleri hatırlar. |
| 18 | **Endowed Progress** | Baştan verilen küçük bir avans tamamlama oranını artırır. |
| 19 | **Dopamine Rewards** | Küçük kutlamalar tekrar kullanımı teşvik eder. |
| 20 | **Peak-End Rule** | İnsanlar deneyimin doruk noktasını ve bitişini hatırlar. |

**UX dersi:** İlerleme gerçek hissettirdiğinde insanlar daha hızlı tamamlar. Bir ilerleme çubuğunu %0'dan değil %10'dan başlatmak (Endowed Progress) bile tamamlama oranını ölçülebilir şekilde artırır.

**Gerçek ürün örneği:** Spotify → Goal Gradient (Wrapped/yıl-sonu ilerleme göstergeleri); Duolingo → Endowed Progress (streak ve seviye barları asla sıfırdan başlamaz hissi verir).

---

## Kategori 5 — Güven (Trust)

| # | Yasa | Prensip |
|---|---|---|
| 21 | **Social Proof** | İnsanlar insanlara güvenir. |
| 22 | **Loss Aversion** | Kayıp, kazançtan daha güçlü hissettirir. |
| 23 | **Commitment & Consistency** | Küçük taahhütler daha büyük eylemlere yol açar. |
| 24 | **Reciprocity** | Önce değer ver. |
| 25 | **Scarcity** | Sınırlı erişilebilirlik aciliyet yaratır. |

**UX dersi:** **Psikolojiyi etik kullan. Güven birikir.** Bu kategori en kolay istismar edilebilen kategoridir (sahte "sadece 2 kaldı!" mesajları, sahte sosyal kanıt sayaçları) — bu tekniklerin gerçek/doğrulanabilir veriye dayanması, manipülasyona dönüşmemesi şart. Bu ilke `Product Design Research Report for Rosso`'daki "manipülatif dönüşüm taktiklerinin reddi" prensibiyle birebir örtüşüyor.

**Gerçek ürün örneği:** Amazon → Social Proof (yorum sayısı, "en çok satan" rozeti); Airbnb → Loss Aversion ("Bu tarihte sadece 1 oda kaldı" gibi gerçek stok verisine dayalı uyarılar).

---

## Quick Cheat Sheet

| Kategori | İçerdiği yasalar |
|---|---|
| 01 — Karar (Decision) | Hick's Law · Paradox of Choice · Cognitive Load · Progressive Disclosure · Chunking |
| 02 — Dikkat (Attention) | Von Restorff · Visual Hierarchy · Serial Position · Banner Blindness · Fitts's Law |
| 03 — Hafıza (Memory) | Miller's Law · Recognition over Recall · Jakob's Law · Mental Models · Consistency |
| 04 — Motivasyon (Motivation) | Goal Gradient · Zeigarnik · Endowed Progress · Dopamine Rewards · Peak-End Rule |
| 05 — Güven (Trust) | Social Proof · Loss Aversion · Commitment & Consistency · Reciprocity · Scarcity |

**Her yeni UX projesinden önce bu tabloyu tekrar gözden geçir.**

---

## Ek: Law of Proximity (Gestalt — Dikkat kategorisine ek)

25'lik listede yer almasa da, önceki sürümden korunan bir Gestalt prensibi: **birbirine yakın duran şeyler ilişkili algılanır; boşluk neyin neyle ilgili olduğunu anlatır.** Bu, `universal-design-principles.md`'deki negative space ilkesinin bilimsel kökenidir ve Visual Hierarchy ile aynı ailede çalışır — sıralama listesine dahil edilmedi ama Dikkat kategorisinin doğal bir parçası olarak kullanılmaya devam eder.

---

## Diğer Dökümanlarla İlişki

- **Hick's Law, Fitts's Law, Jakob's Law, Miller's Law, Von Restorff Effect, Peak-End Rule** zaten `universal-design-principles.md`'de (İlke 2 — Bilişsel Yük) ve `60-30-10-renk-kurali.md`'de (vurgu mantığı) dolaylı olarak geçiyordu; bu döküman onları 25'lik tam çerçeveye oturtuyor.
- **Trust kategorisi** (Social Proof, Scarcity, Reciprocity), Rosso'nun "manipülatif dönüşüm taktiklerini reddet" ilkesiyle doğrudan gerilim/denge halinde — bu teknikler kullanılabilir ama **yalnızca gerçek veriye dayalı ve etik çerçevede**.
- **Motivasyon kategorisi** (Goal Gradient, Zeigarnik, Endowed Progress), `design-techniques/loading-states-process-feedback.md`'deki "Honest Progress" sinyaliyle tamamlayıcı: ilerleme hem **dürüst** hem de **motive edici** olmalı — biri diğerini geçersiz kılmaz.
- **Recognition over Recall**, form/input tasarımında (`design.md/web-design.md`, `design.md/mobile-design.md`) otomatik-doldurma ve öneri listesi kurallarının davranışsal gerekçesidir.

## Hızlı Uygulama Kontrol Listesi

- [ ] Kritik bir karar noktasında seçenek sayısı gereğinden fazla mı? (Hick's / Paradox of Choice)
- [ ] Ekrandaki her eleman gerçekten gerekli mi, yoksa bilişsel yük mü ekliyor? (Cognitive Load)
- [ ] Karmaşık bir özellik ilk anda mı gösteriliyor, yoksa kademeli mi açılıyor? (Progressive Disclosure)
- [ ] En önemli bilgi bir listenin başında veya sonunda mı? (Serial Position Effect)
- [ ] Önemli bir UI elemanı yanlışlıkla "reklam gibi" mi görünüyor? (Banner Blindness)
- [ ] Kullanıcıdan bir şeyi hatırlaması mı isteniyor, yoksa seçenek olarak mı sunuluyor? (Recognition over Recall)
- [ ] İlerleme göstergesi gerçek veriye mi dayanıyor, yoksa sahte mi? (Goal Gradient / Endowed Progress — dürüstlük şartı)
- [ ] Güven/aciliyet teknikleri (Social Proof, Scarcity) gerçek veriye mi dayanıyor, yoksa manipülatif mi?
