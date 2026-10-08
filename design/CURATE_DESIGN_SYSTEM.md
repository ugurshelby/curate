# Curate Tasarım Sistemi (CDS) v3

> **Tarih:** 2026-10-08 · **Son doğrulama:** 2026-10-08
> **Dayanak:** `design/skills/apple-design/SKILL.md` §1–17 (ilkeler). Curate bu temelin üstünde küçük, gerekçeli sapmalarla kendi dilini kurar. §18 (Rosso) ve açık tema dosyaları (`DESIGN.md`, `theme.css`, `variables.css`, `tokens.json`) Curate'in değildir.
> **Kaynak sırası:** renk ve yarıçap değerleri `app/globals.css` `:root` (tek kaynak) → `tailwind.config.ts` yalnız bağlar → `design/tokens.curate.json` kopyadır (`tests/color-tokens.test.ts` eşitliği denetler). Canvas/export içerik renkleri `lib/ui/colors.ts`.
> **Denetim:** `tests/color-tokens.test.ts`, `tests/ui-rules.test.ts`, `scripts/audit-ui.mjs` (Prosedür 2).

## 0. Kimlik
Tek kişilik, mobil öncelikli (390×844) bir fotoğraf stüdyosu. **Fotoğraf tek kahramandır.** Arayüz OLED siyah zemin üstünde yükseltilmiş nötr yüzeyler ve tek vurgudan (iOS mavisi) oluşur. Kullanıcı fotoğrafçı değildir: arayüz sonucu ve eylemi söyler, motoru anlatmaz.

İlkeler (apple-design §16'dan): saygı (arayüz görüntünün önüne geçmez), açıklık (tek ana eylem), derinlik (yükseltme ile hiyerarşi), tutarlılık (aynı kontrol aynı yerde), geri alınabilirlik (onay yalnız geri dönüşsüz eylemde).

### Apple'dan sapmalar (gerekçeli)
| Sapma | Apple | Curate | Gerekçe |
|---|---|---|---|
| S1 Zemin | Koyu modda sistem zemini `#000`, gruplu içerikte `#1C1C1E` | Her ekranda `#000` | OLED, fotoğrafın en iyi göründüğü zemin; sahip kararı |
| S2 Vurgu kullanımı | Mavi bağlantı ve kontrollerde serbest | Yalnız seçili öğe, kaydırıcı, ana eylem, odak halkası | Fotoğrafla yarışmasın; sahip kararı (D08) |
| S3 Dolgu mavisi | `#0A84FF` dolgu | Dolgu `#0071E3` | Beyaz yazı `#0A84FF` üstünde 3,65:1, `#0071E3` üstünde 4,70:1 |
| S4 Yazı tipi | SF Pro | iOS/macOS'ta SF, diğerlerinde self-host Inter | Sahibin telefonu Android, SF yok |
| S5 En küçük yazı | 11 pt (Caption 2) | 12 px | Sahip kararı (Faz M1), telefonda okunurluk |
| S6 Kart malzemesi | Gruplu liste, düz yüzey | Opak yüzey 1 + üstte %6 beyaz ışıltı + üst kenar ışık çizgisi | Siyah zeminde kartlar düz blok gibi görünüyordu (sahip gözlemi) |

## 1. Renk (değişmez; sahip kararı D08)
| Rol | Değişken | Tailwind | Değer |
|---|---|---|---|
| Zemin | `--base` | `bg-base` | `#000000` |
| Yüzey 1 (kart, panel, sayfa) | `--surface-1` | `bg-surface` | `#1C1C1E` |
| Yüzey 2 (çip, giriş, ikincil düğme) | `--surface-2` | `bg-surface-2` | `#2C2C2E` |
| Ayırıcı (tek ince çizgi) | `--separator` | `border-separator` | `#38383A` |
| Yazı 1 / 2 / 3 | `--ink-1/2/3` | `text-ink-1/2/3` | `#FFFFFF` / `#AEAEB2` / `#8E8E93` |
| Vurgu (çizgi, ikon, kaydırıcı, odak, koyu zeminde yazı) | `--accent` | `text-accent` | `#0A84FF` |
| Vurgu dolgusu (ana düğme, seçili segment) | `--accent-fill` | `bg-accent-fill` | `#0071E3` |
| Vurgu üstü yazı | `--on-accent` | `text-on-accent` | `#FFFFFF` |
| Hata / silme | `--danger` | `text-danger` | `#FF453A` |
| Başarı | `--success` | `text-success` | `#30D158` |
| Devre dışı | `--disabled-surface`, `--disabled-ink` | `bg-disabled`, `text-disabled-ink` | `#2C2C2E`, `#636366` |

Kurallar: fotoğraf üstündeki her şey renksiz (beyaz/siyah + alfa; kırp çerçevesi, tutamaklar, Story bantları, platform katmanları). Yeşil yalnız başarı, kırmızı yalnız hata/silme; platform renkleri (TikTok kırmızısı vb.) yok. Kodda hex/rgb sabiti yok.

### Kontrast (WCAG 2.1; yazı ≥ 4,5, büyük yazı ve bileşen ≥ 3; ölçüm 2026-10-08)
| Ön plan | Zemin / yüzey 1 / yüzey 2 / kart üstü `#2A2A2C` / çip `#2E2E30` | Kullanım |
|---|---|---|
| Yazı 1 `#FFF` | 21,00 / 17,01 / 13,94 / 14,32 / 13,55 | her yerde |
| Yazı 2 `#AEAEB2` | 9,50 / 7,69 / 6,30 / 6,48 / 6,13 | her yerde |
| Yazı 3 `#8E8E93` | 6,44 / 5,22 / **4,27** / **4,39** / **4,16** | yalnız zemin ve düz yüzey 1 üstünde; kartta, çipte, yüzey 2'de yazı 3 yok |
| Vurgu `#0A84FF` | 5,76 / 4,66 / 3,82 / 3,93 / 3,72 | yazı olarak yalnız zemin ve yüzey 1; diğerlerinde yalnız ikon/çizgi |
| Beyaz / vurgu dolgusu `#0071E3` | 4,70 | ana düğme |
| Hata / başarı | zemin 6,16 / 10,39 · yüzey 1 4,99 / 8,42 | |
| Ayırıcı / zemin | 1,79 | süs çizgisi; kontrolü çizgi değil dolgu ve etiket tanıtır |

## 2. Tipografi (apple-design §15)
- **Yığın:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", var(--font-inter), system-ui, sans-serif`. Apple cihazlarda SF, Android ve masaüstünde **Inter** (değişken, latin + latin-ext: ğ ş ı İ), `next/font/google` ile build sırasında indirilir ve aynı alan adından sunulur: çalışma anında dış istek yok (S4).
- **Ölçek** (`tailwind.config.ts` `fontSize`):

| Sınıf | Boyut | Ağırlık | Harf aralığı | Satır | Kullanım |
|---|---|---|---|---|---|
| `text-display` | 28 px | 600 | −0,02em | 1,15 | Sayfa başlığı (ana sayfa) |
| `text-title` | 20 px | 600 | −0,02em | 1,2 | Kart başlığı, sayfa başlığı |
| `text-headline` | 17 px | 600 | −0,01em | 1,3 | Modül başlığı, bölüm başlığı |
| `text-body` | 15 px | 400 | −0,005em | 1,45 | Gövde, düğme metni |
| `text-subhead` | 14 px | 500 | 0 | 1,4 | Kart alt başlığı, liste |
| `text-footnote` | 13 px | 400 | 0 | 1,4 | Yardımcı metin |
| `text-caption` | 12 px | 500 | +0,01em | 1,35 | Rozet, etiket, not |

- Alt sınır **12 px**; gövde satır yüksekliği 1,4–1,5; büyük başlıkta negatif harf aralığı. Hiyerarşi boyut + ağırlık + satır birlikte.
- **Monospace arayüzde yok.** Sayılar `num-metric` (`tabular-nums`) ile hizalanır, yazı tipi değişmez. İstisna: fotoğrafın parçası olan analog tarih damgası (export içeriği, arayüz değil).
- Cam yüzey üstünde yazı en az 500 ağırlık ve yazı 1 (vibrancy, §12).

## 3. Boşluk ve yarıçap
- 4 px ızgarası: 4, 8, 12, 16, 20, 24, 32, 40.
- Yarıçap: `rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 18 · `rounded-sheet` 28 · `rounded-full` (hap). İç yarıçap = dış − dolgu. Kart 20 (`rounded-[20px]`), düğme 12, çip ve rozet hap.

## 4. Malzeme ve derinlik (apple-design §12)
Üç kademe: **zemin `#000` → yüzey 1 `#1C1C1E` → yüzey 2 `#2C2C2E`**. Gölge yerine ton ve ışık çizgisi.

| Sınıf | Ne | Tanım |
|---|---|---|
| `.material-card` | Kart (opak) | yüzey 1 + `linear-gradient(beyaz %6 → %2 → 0)` ışıltı + 1 px ayırıcı kenar + üst kenarda `inset 0 1px 0` beyaz %12 ışık çizgisi |
| `.material-chip` | Rozet, etiket (opak) | beyaz %8 dolgu + beyaz %10 kenar, hap |
| `.glass-panel` | Cam: header, alt panel, alt çubuk | yüzey 1 %72 + `blur(20px)` + ayırıcı kenar + üst ışık çizgisi |

- **Ekranda en çok 3 cam (bulanık/yarı saydam) yüzey.** Opak kart ve çipler bu sayıya girmez. Cam üstüne cam konmaz. Fotoğraf sahnesi cam altında bulanıklaştırılmaz.
- Modal sayfa: zemin karartma (siyah %70) + aşağıdan gelen sayfa (`rounded-sheet` üst köşeler).
- `prefers-reduced-transparency: reduce` → cam opak yüzey 1, blur yok. `prefers-contrast: more` → opak yüzey + yazı 2 renginde kenar.

## 5. Hareket (apple-design §1–11, §14; `animate` skill)
- **Sıklık kapısı:** preset değiştirme, sekme, araç seçimi anlıktır (animasyon yok). Hareket yalnız sayfa/menü açılışı, modül geçişi ve basma geri bildiriminde.
- **Basma:** `pointerdown` anında `scale(0.98)` (küçük düğmede `.press-sm` 0,96), 160 ms, `--ease-spring` `cubic-bezier(0.32, 0.72, 0, 1)`. Bırakmayı beklemez.
- **Modül geçişi:** View Transitions API varsa paylaşılan öğe geçişi: ana sayfa kartının başlığı modül header başlığına dönüşür (`view-transition-name: module-title`), kök 220 ms çapraz geçiş. API yoksa anlık geçiş (zarif geri dönüş). `prefers-reduced-motion` → yalnız 160 ms opaklık.
- **Sayfa (sheet):** aşağıdan `translateY`, 380 ms `--ease-drawer`; geldiği yoldan gider.
- **Sürükleme/yakınlaştırma:** 1:1 doğrudan manipülasyon, sınırda lastik bant (rubber-band), bırakınca 240 ms `--ease-out` ile yerine.
- Yalnız `transform` ve `opacity`; `transition: all`, `ease-in`, `scale(0)` yok. Yeni hareket kütüphanesi yok (CSS + Web Animations).

## 6. Mobil yerleşim sözleşmesi (KRİTİK, değişmez)
> **Fotoğraf hiçbir zaman header'ın, düzenleme panelinin ya da filmstrip'in altında kalmaz.** Ölçüt: `stage.top ≥ header.bottom` ve `stage.bottom ≤ bottomStack.top`.

- Üç bölgeli dikey flex sütun: header (≤ 56 px + güvenli alan) / sahne (`flex: 1 1 0; min-height: 0`, panel açıkken ≥ 34dvh) / alt yığın (panel + çubuk, ≤ 40dvh, içerik kendi içinde kayar). Hiçbir bölge görselin üstüne `absolute` bindirilmez.
- Kök `100dvh` (yalnız `100vh` yasak). Görsel sahnede CSS ile sığar (`.stage-fit`, `cq` birimleri). Tahminî telafi hileleri (`scale(0.88)`, sabit `padding-bottom`) yasak.
- Header tek satır; 390 px'e sığar, yatay taşma 0. Panel kapalıyken yalnız filmstrip (≤ 96 px).
- Preset seçici: tek satır yatay kaydırmalı kartlar. İkincil araçlar kapalı "Araçlar" satırında.
- Dokunma hedefi ≥ 44×44 px (simge küçük olabilir, alan 44). Güvenli alan `env(safe-area-inset-*, 0px)`; sayfa `viewport-fit=cover`. `:hover` yalnız `(hover: hover) and (pointer: fine)`.
- **Geniş ekran:** içerik ortalı ve sınırlı: ana sayfa `max-w-[1040px]`, modül kromu `min(42rem, 100% − 24px)`. Ana sayfa ızgarası 1 sütun (< 640), 2 sütun (≥ 640), 3 sütun (≥ 1024).
- **Doğrulama (her UI değişikliğinde):** Prosedür 2, 360×740 / 390×844 / 430×932, panel açık: örtüşme yok, yatay kaydırma yok, 44 px altı hedef yok, 12 px altı yazı yok, ≤ 3 cam, kontrast eşikleri. Yatay 844×390 elle. Tarayıcı yoksa "doğrulanmadı".

## 7. Bilgi yoğunluğu ve metin
- Kart yüzünde **sonuç ve eylem**, motor değil. Yasak ifadeler (kart yüzü, başlık, rozet, düğme): Lanczos, konvolüsyon, convolution, EXIF, GPS, LUT, `.cube`, hero renk eşitleme yüzdesi, "Client-Side", "Sanitized", "Engine", proxy, piksel matematiği. Teknik ayrıntı yalnız "Gelişmiş" alanında veya bilgi balonunda. Liste `tests/ui-rules.test.ts`'te.
- Altbilgi yok; yerine tek güven rozeti: **"Yerel ve gizli işleme"** (dokununca açıklama: fotoğraflar cihazda işlenir; tek istisna "AI ile onar").
- Tüm arayüz metni Türkçe, sade, kısa; tek dosya `lib/i18n/tr.ts`. Kart alt başlığı en çok ~60 karakter.
- Etiket/rozet: `.material-chip`, `text-caption`, yatay 10 px dolgu; boyut yerine ne yaptığını söyler ("Instagram · TikTok", "2–6 fotoğraf").

## 8. Eylem odağı
- Ana sayfada **tek** "Fotoğraf ekle" yolu: büyük bırakma yüzeyi (dokun = dosya seçici, sürükle = bırak). Üst çubukta ikinci bir "Fotoğraf Yükle" yok.
- Bırakma yüzeyi form kutusu değil, davet eden yüzeydir: sürüklerken büyür (`scale(1.01)`), kenarı vurguya döner, metni "Bırak" olur.
- Bir ekranda tek vurgu dolgulu düğme (ana eylem). Kart içinde mavi düğme başlığı ezmez.

## 9. Bileşen envanteri
Her bileşenin durumları: **normal / basılı / odak / devre dışı / yükleniyor**. Odak her yerde 2 px vurgu halkası (`:focus-visible`, 2 px boşluk). Devre dışı: yüzey `#2C2C2E` + yazı `#636366`, opaklık düşürme yok. Basılı: §5.

| Bileşen | Tanım | Durumlar |
|---|---|---|
| Ana düğme | `bg-accent-fill text-on-accent`, h-11/12, `rounded-md`, `text-body` 600 | basılı: dolgu %80 + `press`; yükleniyor: etiket "Hazırlanıyor…", devre dışı |
| İkincil düğme | `bg-surface-2 text-ink-1`, h-11 | basılı: ayırıcı tonu |
| Yıkıcı düğme | `text-danger`, zemin `danger/10`; onay gerektirir | |
| Çip / filtre | `.material-chip` veya `bg-surface-2`, seçili: `bg-accent-fill` | aria-pressed |
| Segment | `role=radiogroup`/`tablist`, kap `bg-surface-2`, seçili dolgu vurgu | en çok 3–4 seçenek |
| Kaydırıcı | yerel `input[type=range]`, `accent-accent`, h-11 dokunma, tek değer göstergesi, "Sıfırla" ve çift dokunma ile varsayılan | sürüklerken önizleme yarı çözünürlük |
| Sekme çubuğu | 2–3 eşit sekme (segment görünümü) | |
| Alt sayfa | `rounded-sheet` üst, zemin karartma, kapat düğmesi 44 px, iç kaydırma `overscroll-contain` | |
| Kart | `.material-card`, `rounded-[20px]`, `p-4/5`; simge + başlık + alt başlık + rozet | basılı: `scale(0.98)`; hover (yalnız fare): kenar yazı 3 tonu |
| Rozet | `.material-chip text-caption` | |
| Bildirim (toast) | yüzey 1, ayırıcı kenar, üst ortada, 4 sn, `role=status` | |
| Boş durum | simge (devre dışı tonu) + tek cümle + tek eylem | |
| Hata durumu | `text-danger` cümle + çözüm eylemi; `role=alert` | |
| İlerleme | ince çubuk (vurgu dolgusu) + "x/y" | |
| Önce/sonra | basılı tut → orijinal; rozet "Orijinal" (siyah %70 zemin, beyaz yazı) | |

## 10. Erişilebilirlik
Kontrast tablosu §1; hedef 44 px; görünür odak halkası; `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` desteklenir; simge düğmelerde `aria-label`; tüm metin Türkçe ve `lang="tr"`.

## 11. Skill istisnaları
`redesign-existing-projects` "saf siyah kullanma" ve "Inter kullanma" der: Curate'te saf siyah bilinçli kimliktir (S1); Inter yalnız SF'nin bulunmadığı cihazlarda yedek olarak (S4). `animate` skill'inin atıf yaptığı repoda olmayan skill'ler yok sayılır.

## 12. Kalibrasyon seti
`public/reference-images/` (13 görsel). Parlak sahne (`gun-batimi-gunese-dokunan-eleman`, `gol-evi`) üstünde cam okunurluğu; koyu sahne (`ic-mekan-bar`, `sehir-isiklari-otoyol`) üstünde beyaz katmanlar; mimari/portre (`tabela`, `kovboy`) üstünde kırp çerçevesi.
