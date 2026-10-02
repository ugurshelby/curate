# Curate Design System (CDS) v2.0.0

> **Tarih:** 2026-10-02 · **Konum:** `design/CURATE_DESIGN_SYSTEM.md`
> **Otorite:** Curate arayüzünde tek tasarım otoritesi (AGENTS.md §1). Ürün kararlarını (özellik, öncelik) değiştirmez.
> **Son doğrulama:** 2026-10-02 (mobil ölçümler bölüm 6'da).

## 0. Kimlik ve Dayanaklar

Curate **tek kişilik, kişisel bir araçtır; birincil kullanım mobildir** (sahip kararı, 2026-10-02). Referans cihaz: 390×844 (Redmi Note 12 Pro 5G sınıfı, Chrome Android). Masaüstü ikincildir ve mobil düzenin genişlemiş hâlidir.

Kimlik: **OLED siyah zemin + tek amber vurgu.** Apple'ın *kurallarını* (yay fiziği, anlık geri bildirim, tipografi, cam malzeme, sadelik) bu paleti koruyarak uyarlarız; Apple'ın *renklerini* almayız.

Bu dosyanın dayandığı gerçek dosyalar:

| Dosya | Rol |
|---|---|
| `design/skills/apple-design/SKILL.md` **§1–17** | Davranış, hareket, malzeme, tipografi, ilkeler. Burada anılan her kural buradan gelir. |
| `design/skills/animate/SKILL.md`, `RECIPES.md` | Yeni hareket yazarken karar sırası, easing/süre tabloları, hazır tarifler. |
| `design/skills/improve-animations/` | Yalnız sahip isterse: hareket denetimi ve plan üretimi (kodu değiştirmez). |
| `design/skills/redesign-existing-projects/SKILL.md` | Yalnız denetim merceği. Bölüm 10'daki istisnalara bakın. |
| `design/tokens.curate.json` | Token referansı (koda import edilmez). Kod doğruluk kaynağı: `tailwind.config.ts`, `app/globals.css`. |

**Curate'e ait OLMAYANLAR:** `apple-design/SKILL.md` §18 (Rosso marka bölümü: mor vurgu, "Rosso projesi"), `apple-design/DESIGN.md`, `theme.css`, `variables.css`, `tokens.json` (açık tema, Apple Blue `#0071e3`, Frost/Carbon paleti, 980px hap buton). Bunlar Curate'e uygulanmaz. Yalnız şu fikirler alınır: tipografide boyuta bağlı tracking, gölge yerine ince kenar çizgisi, tek kromatik vurgu.

---

## 1. Felsefe (apple-design §16'dan Curate'e)

1. **Fotoğraf tek kahramandır** (Deference). Arayüz görüntünün önüne geçmez, onu kapatmaz.
2. **Sadelik ≠ minimalizm.** Varsayılan akışta yalnız preset seçimi görünür; ince ayar ve araçlar bir seviye aşağıda (progressive disclosure). Zorunlu slider yoktur (spec §3.1).
3. **Kullanıcı hâkimiyeti.** Her işlem geri alınabilir veya zararsızdır; onay penceresi yalnız geri döndürülemez eylemde (örn. "Seriyi temizle").
4. **Tutarlılık.** Aynı görünen kontrol aynı yerde, aynı davranışla durur.
5. **Zanaat.** Hiçbir değer rastgele değildir; her boşluk/süre/yarıçap token'dan gelir.

---

## 2. Renk (60:30:10) — DEĞİŞMEZ

| Oran | Token | Değer | Kullanım |
|---|---|---|---|
| %60 | `surface-base` | `#000000` | Zemin, canvas, ana viewport |
| %30 | `surface-elevated` / `surface-overlay` | `#0f0f11` / `#18181b` | Kartlar, paneller, sheet |
| %10 | `accent-amber` / `accent-warm` | `#f5a623` / `#f5f5f7` | Aktif seçim, birincil eylem, durum |

Metin: primary `#f5f5f7`, secondary `#a1a1aa`, muted `#71717a`, disabled `#3f3f46`. Mikro sınır: `rgba(255,255,255,0.08)`.

Kurallar:
- **Tek kromatik vurgu: amber.** Yalnız yıkıcı eylem (sil/temizle) için kırmızı-pembe (`rose`) istisnadır. Başka renkli durum rengi (yeşil "aktif", TikTok kırmızısı vb.) eklenmez; aktif durum amber ile gösterilir.
- Apple "ışık yakalayan 1px kenar" kuralı: cam yüzeylerde `inset 0 1px 0 rgba(255,255,255,0.12)`.
- Gölge yerine kenar çizgisi ve yüzey tonu tercih edilir (derinlik hiyerarşisi).

---

## 3. Tipografi (apple-design §15)

- Aile: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif`. Android'de fiilen `system-ui`/Inter çözülür; özel font eklenmez.
- Monospace yalnız sayısal veride (`tabular-nums`: yüzde, boyut, sıra numarası). Etiket ve başlıkta kullanılmaz.
- **Tracking boyuta bağlıdır, tek değer yok:**

| Rol | Boyut | Ağırlık | Tracking | Satır yüksekliği |
|---|---|---|---|---|
| Display | 24–32px | 600 | `-0.03em` | 1.1 |
| Title | 16–18px | 500–600 | `-0.02em` | 1.25 |
| Body / etiket | 13–15px | 400–500 | `-0.01em` | 1.4 |
| Caption | **11–12px** | 500 | `+0.01em` | 1.3 |

- **Alt sınır 11px.** Okunması gereken hiçbir metin 11px'in altına inmez (rozet numaraları dâhil). Cam yüzey üstünde metin `text-secondary` değil `text-primary` ve en az 500 ağırlık (apple-design §12 "vibrancy").
- Boşluklar `rem`/`em` veya 4px ızgarasında (4, 8, 12, 16, 20, 24, 40).

---

## 4. Yarıçap

`radius-sm` 8 · `radius-md` 12 · `radius-lg` 18 · `radius-sheet` 28 · `radius-full` 9999 (hap/durum). İç yarıçap = dış yarıçap − dolgu.

---

## 5. Malzeme: Liquid Glass (apple-design §12)

- Dolgu `rgba(15,15,17,0.72)`, `backdrop-filter: blur(20px)`, 1px `rgba(255,255,255,0.08)` kenar, üstte rim light.
- **Ekranda aynı anda en çok 3 cam yüzey.** Cam üstüne cam konmaz (okunabilirlik çöker). Sayım mobil düzenleme modunda yapılır: header + panel + filmstrip = 3; fotoğraf üstündeki küçük kontroller (Fit/Fill) cam değil, düz `bg-black/60` + kenar kullanır.
- Büyük yüzey daha kalın okunur (daha güçlü blur + daha derin kenar); küçük çip daha hafif.
- Fotoğraf sahnesi (stage) cam altında **bulanıklaştırılmaz**; cam yalnız kromun kendisindedir.
- Erişilebilirlik (apple-design §14):
  - `@media (prefers-reduced-transparency: reduce)` → cam yüzey opak `#18181b`, blur yok.
  - `@media (prefers-contrast: more)` → opak yüzey + `rgba(255,255,255,0.32)` kenar.

---

## 6. Mobil Yerleşim Sözleşmesi (KRİTİK)

> **DEĞİŞMEZ KURAL: Fotoğraf hiçbir zaman header'ın, düzenleme panelinin ya da filmstrip'in altında/arkasında kalmaz.**
> Ölçülebilir hâli: `stage.top ≥ header.bottom` ve `stage.bottom ≤ bottomStack.top` (piksel olarak, her durumda).

### 6.1 Yapı: örtüşme yok, akış var

Üç bölgeli dikey **flex sütunu** kurulur; hiçbir bölge `position:absolute` ile görselin üstüne bindirilmez:

```
┌──────────────┐ header      (sabit yükseklik, tek satır)
│              │
│    STAGE     │ flex: 1 1 0; min-height: 0   ← görsel yalnız burada, kalan alana sığar
│              │
├──────────────┤ bottomStack (filmstrip + panel; yüksekliği sınırlı)
└──────────────┘
```

- Kök yükseklik `100dvh` (asla `100vh`: Android Chrome adres çubuğu `vh`'yi şişirir, alt bölge ekran dışına taşar).
- Görsel, stage içinde **CSS ile** sığdırılır (`aspect-ratio: 4/5; max-width:100%; max-height:100%`). `scale(0.88)`, `-translate-y-2` ve sabit `padding-bottom: …+280px` gibi **tahminî telafi hileleri yasaktır**; düzen gerçek yüksekliği kendisi paylaşır.
- Stage'in alt/üst boşluğu panelin gerçek ölçüsünden gelir, sabit sayıdan değil.

### 6.2 Bütçe (390×844 referansı)

| Bölge | Kural |
|---|---|
| Header | Tek satır, **en çok 56px** + `safe-area-inset-top`. Satır kırmaz. Başlık alt yazısı (`1080 × 1350 px`) 640px altında gizlenir. İkincil kontroller (IG/TikTok önizleme, Temizle) taşma/overflow menüsüne gider. İçerik 390px'e sığmalıdır (yatay taşma 0). |
| Bottom stack (panel açık) | **En çok `40dvh`** (844'te ≈ 338px), filmstrip dâhil. İçerik bu sınırda **kendi içinde kaydırılır** (`overflow-y:auto; overscroll-behavior:contain`). Panel yüksekliği içeriğe göre büyümez. |
| Stage (panel açık) | **En az `34dvh`** (844'te ≈ 287px) yükseklik garantisi. Sınır sağlanamıyorsa panel küçülür, stage değil. |
| Panel kapalı | Yalnız filmstrip (≤ 96px). Stage kalan her şeyi alır. |

### 6.3 Panel içeriği (mobil)

- **Preset seçici: tek satır, yatay kaydırmalı kartlar** (snap, kart ≈ 112×72). Dikey 2 sütunlu ızgara mobilde kullanılmaz (7 kart 4 satır = ≈270px harcar).
- Yoğunluk slider'ı, preset seçildiğinde preset satırının hemen altında görünür (katmanlı ifşa; zorunlu değil).
- İkincil araçlar (`.cube` LUT, Hero Harmonize) varsayılan olarak **kapalı bir "Araçlar" satırının** altındadır.
- İsteğe bağlı iki durak (detent): *peek* (preset satırı) ve *açık* (≤ 40dvh). Geçiş yay fiziğiyle (bölüm 7); sürükleme tutamağı varsa bırakma hızı yaya aktarılır (apple-design §5–6).
- Filmstrip düzenleme modunda küçülmez/gizlenmez ama bottom stack bütçesine dâhildir.

### 6.4 Dokunma, güvenli alan, hover

- Her etkileşimli öğe **en az 44×44px** dokunma alanı (görsel ikon küçük olabilir; hit-area 44px). Alt sınır istisnası yoktur: kapatma, önizleme geçişi, Fit/Fill, araç düğmeleri dâhil.
- Güvenli alan: `env(safe-area-inset-*, 0px)` (yedek değer 0; `34px` yedeği yanlış boşluk üretir). Sayfa `viewport-fit=cover` ile açılır.
- `:hover` yalnız `@media (hover: hover) and (pointer: fine)` içinde; dokunmatikte `:active` ile `scale(0.97)`.
- Filmstrip sıralaması şu an HTML5 `draggable` kullanıyor; dokunmatikte güvenilirliği cihazda doğrulanmadı (denetim raporu §1). Dokunmatik sürükleme Pointer Events + `setPointerCapture` ile tasarlanır (apple-design §2).

### 6.5 Doğrulama (her UI değişikliğinde)

390×844, 360×740, 430×932 ve yatay 844×390'da, düzenleme paneli açık ve preset seçili hâlde: (a) stage ile header/bottom stack kesişmez, (b) `document.documentElement.scrollWidth ≤ innerWidth`, (c) 44px altı etkileşimli öğe yok, (d) 11px altı metin yok. Tarayıcı yoksa bu maddeler "doğrulanmadı" olarak işaretlenir. Betik: `docs/procedures.md` Prosedür 2.

---

## 7. Hareket (apple-design §1–11, 14; animate skill)

Önce `animate/SKILL.md` Adım 1: sıklık kapısı. Preset değiştirme, araç seçimi, klavye/hızlı eylem: **animasyon yok** (anlık). Yalnız sheet, menü ve rastlantısal geçişler hareket eder.

1. **Anlık geri bildirim:** basma anında (`pointerdown`/`:active`) `scale(0.97)`, 100–160ms. Bırakmayı beklemez.
2. **Yay > süre.** Dokunulan/sürüklenen her şey yay kullanır. Varsayılan: sönüm `1.0`, tepki `0.3–0.4s` (sıçrama yok). Sıçrama (`≈0.8`) yalnız hareketle (fırlatma) gelen etkileşimlerde (sheet bırakma). Elde yay kütüphanesi yoksa CSS karşılığı: `cubic-bezier(0.32,0.72,0,1)` (sheet, ≤ 380ms) ve `cubic-bezier(0.23,1,0.32,1)` (diğer UI, ≤ 250ms). `ease-in`, `scale(0)`, `transition: all` yasak.
3. **Yalnız `transform` ve `opacity`.** `width/height/top/left/padding` animasyonu yok. Sheet açılışı `translateY`, düzen değişimi (stage küçülmesi) gerekiyorsa tek geçişte ve süre ≤ 300ms.
4. **Kesintiye uğrayabilirlik:** hiçbir geçiş girişi kilitlemez; yeni hedef mevcut değerden başlar (yay) — hızlı tetiklenenlerde keyframe değil transition.
5. **Simetri:** sheet geldiği yoldan gider (aşağıdan gelen aşağı kapanır). Menü/popover tetikleyiciden açılır (`transform-origin` = tetikleyici).
6. **Bozulmayan kare:** canlı önizleme sürüklemesi (slider) sırasında arayüz her karede 1:1 yanıt verir; ağır işlem giriş yolunu bloke etmez (bkz. bölüm 8).
7. **Azaltılmış hareket:** `prefers-reduced-motion: reduce` → kaydırma/yay yerine ≤ 200ms opacity geçişi; sıçrama kaldırılır.
8. Yeni hareket kütüphanesi (örn. `motion`) bağımlılık olarak yalnız sahip onayıyla eklenir (AGENTS.md §3); önce CSS/WAAPI.

---

## 8. Performans, tasarımın parçasıdır

- **Canlı önizleme ve export aynı çizim fonksiyonunu, aynı parametre şemasıyla** çağırır; önizleme yalnız ölçek farkıyla (hedef 1080×1350 veya `devicePixelRatio`'ya uygun daha küçük) çalışır. Önizleme tam çözünürlüklü orijinali işlemez.
- Slider sürüklemesi `requestAnimationFrame` ile birleştirilir (kare başına en çok bir yeniden çizim); önceki çizim bitmeden yenisi kuyruğa girmez.
- Ana thread'de kare başına bütçe ≈ 8–12ms. Daha ağır piksel işi worker/GPU'ya gider. Seçenekler ve öneri: `docs/reports/2026-10-02-audit.md` §2.

---

## 9. Uygulama Eşlemesi

| Tasarım | Tailwind | CSS değişkeni / sınıf |
|---|---|---|
| Zemin | `bg-surface-base` | `--surface-base` |
| Panel | `bg-surface-elevated` | `--surface-elevated` |
| Sheet/popover | `bg-surface-overlay` | `--surface-overlay` |
| Mikro sınır | `border-border-subtle` | `--border-subtle` |
| Amber | `text-accent-amber`, `bg-accent-amber` | `--accent-amber` |
| Cam | `glass-panel` | `.glass-panel` |
| Dokunma hedefi | `touch-target` | `.touch-target` |
| Sahne alanı (mevcut) | — | `.canvas-viewport` (sabit padding'e dayanıyor; bölüm 6'ya göre yeniden yazılmalı, bkz. denetim raporu) |

## 10. Kullanılan Skill'lerdeki İstisnalar

- `redesign-existing-projects` "saf `#000000` yerine kırık siyah" ve "Inter kullanma" der. **Curate için geçersizdir:** OLED siyah ve sistem/Inter yığını bilinçli kimliktir. Geçerli kalan: `100vh` yerine `100dvh`, sayı için `tabular-nums`, tek vurgu rengi, tutarlı gri ailesi.
- `animate` skill'i `review-animations`, `find-animation-opportunities`, `pick-ui-library` adlı skill'lere atıf yapar; **bunlar repoda yoktur.** Atıf görülürse yok sayılır; bileşen ihtiyacı için yeni paket eklemeden önce sahip onayı alınır.

## 11. Kalibrasyon Seti

Test fotoğrafları `public/reference-images/` altındadır (eski `design/reference-images/` yolu yoktur). Parlak sahne (`gun-batimi-gunese-dokunan-eleman`, `gol-evi`) üstünde cam/kontrol okunabilirliği; koyu sahne (`ic-mekan-bar`, `sehir-isiklari-otoyol`) üstünde amber vurgu; mimari/portre (`tabela`, `kovboy`) üstünde çerçeve şeffaflığı bu karelerle denenir. Bu bölümdeki okunabilirlik iddiaları 2026-10-02'de yeniden ölçülmedi.
