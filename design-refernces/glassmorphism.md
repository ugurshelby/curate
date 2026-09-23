# Glassmorphism — Rosso Uygulama Rehberi

> **Ne zaman:** Yükseltilmiş yüzeyler (modal, popover, sticky nav) · görsel
> üstündeki veri panelleri (Recap/Journey) · aktif durum vurguları.
> **Katman:** Dashboard (%20) · Recap&Journey (%20) · Mobil (**ölçülü**) ·
> Admin (**YASAK** — okunabilirlik önceliği)
> **Tam güç kuralı:** Efendim "burası glassmorphism olsun" derse bu dosya
> stilin tamamını verir. Sulandırma.

---

## Özü — 4 karar

1. **Cam bir YÜZEY değil, bir KATMANDIR.** Arkasında bir şey olmalı — düz
   zemin üstünde cam anlamsızdır, sadece gri bir kutu olur.
2. **Blur + saydamlık + ince kenarlık** üçü birlikte olur. Biri eksikse cam
   hissi çöker.
3. **Kenarlık ışığı taşır.** Camı camlaştıran, üst kenardaki 1px açık çizgidir
   (rim light).
4. **Seyrek kullanılır.** Her yüzey camsa hiçbiri yükselmiş görünmez.

---

## Somut değerler

| Parametre | Hafif | Orta (Rosso varsayılan) | Tam güç |
|---|---|---|---|
| `backdrop-filter: blur()` | 8px | **14px** | 24px |
| `saturate()` | — | 1.2 | 1.4 |
| Dolgu (`background`) | `rgba(255,255,255,0.03)` | **`rgba(255,255,255,0.04)`** | `rgba(255,255,255,0.08)` |
| Kenarlık | `rgba(255,255,255,0.06)` | **`rgba(255,255,255,0.08)`** | `rgba(255,255,255,0.16)` |
| Rim light (üst) | — | `inset 0 1px 0 rgba(255,255,255,0.10)` | `inset 0 1px 0 rgba(255,255,255,0.20)` |
| Gölge | — | `0 4px 20px rgba(0,0,0,0.2)` | `0 12px 40px rgba(0,0,0,0.4)` |
| Yarıçap | `--radius-md` | `--radius-lg` | `--radius-xl` |

**Kritik:** `backdrop-filter` **pahalıdır**. Aynı ekranda 3'ten fazla cam
yüzey kullanma; mobilde liste öğelerinde **asla**.

---

## CSS (Rosso token'larıyla)

```css
/* Rosso kanonik cam — design-system §5 "Liquid Glass" */
.glass {
  background: var(--glass-fill);              /* rgba(255,255,255,0.04) */
  border: 1px solid var(--glass-border);      /* rgba(255,255,255,0.08) */
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),  /* rim light — camı camlaştıran */
    0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Accent-tinted cam — vurgulu panel (tek kullanım, 60-30-10 §10) */
.glassAccent {
  background: color-mix(in srgb, var(--color-bg-elevated) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 22%, rgba(255,255,255,0.18));
  backdrop-filter: blur(24px) saturate(1.4);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-accent) 14%, transparent),
    0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Fallback — backdrop-filter desteklenmiyorsa cam DEĞİL, opak yüzey */
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: var(--color-bg-elevated); }
}
```

---

## Üstten ışık (inner shadow) — cam ikonlar ve küçük yüzeyler

> Kaynak: Efendim'in derlediği glass-icon çalışması (2026-07-20). Dört ayrı
> ikon tarifi (çiçek, grafik, takvim, kamera) aynı tek deseni tekrarlıyordu:
> **renkli gradyan zemin + üstten beyaz iç gölge.**

Rim light (`inset 0 1px 0`) camın *kenarını* aydınlatır. Bu desen ise ışığı
yüzeyin **içine** yayar — küçük, kalın cam nesnelerde (ikon, rozet, buton)
"kalınlık" hissi verir. Büyük panellerde kullanma; orada rim light yeter.

```css
/* Cam ikon — gradyan zemin + üstten yayılan iç ışık */
.glassIcon {
  background: linear-gradient(160deg, var(--icon-from), var(--icon-to));
  border-radius: var(--radius-lg);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  box-shadow:
    inset 0 4px 4px rgba(255, 255, 255, 0.30),  /* üstten iç ışık */
    inset 0 1px 0 rgba(255, 255, 255, 0.20),    /* kenar rim light */
    0 4px 20px rgba(0, 0, 0, 0.25);
}
```

**Neden `Y:4, blur:4`:** ışık yukarıdan gelir; gölge aşağı kayar ve dar
kalır. Blur büyürse ışık yayılıp yüzeyi sisli gösterir, cam değil buzlu cam
olur.

⚠ **Figma karşılığı yoktur.** Kaynak belgedeki `Refraction: 82`, `Depth: 52`,
`Dispersion: 50` değerleri **Figma'nın kendi cam panelinin** ayarlarıdır —
CSS'te karşılıkları **yok**. Tarayıcıda elimizdeki tek araç
`backdrop-filter`. Bu yüzden o değerler bu dosyaya alınmadı; alınsaydı
uygulanamayan bir tarif olurdu.

**Gradyan çiftleri (kaynak belgeden, referans olarak):**
mor→lacivert `#815BB1 → #160BEE` · yeşil `#8BF763 → #2CAD55` ·
mavi `#3CAFFD → #142BB5` · mercan `#FFA78F → #F23E3C`

⚠ Bunlar **Rosso paleti değildir.** Kullanılacaksa `rosso-kimligi/renk-paleti.md`
token'larından türetilmeli — hardcoded hex yasağı burada da geçerli.

---

## ⚠ Çift gölge tekniği — NEUMORPHISM SINIRI

Kaynak belge "gerçekçi glassmorphism" başlığı altında şu tekniği öneriyordu:

```
Drop Shadow A:  X: 8,   Y: 8,   Blur: 10, siyah %25
Drop Shadow B:  X: -31, Y: -31, Blur: 43, BEYAZ %100
```

**Bu glassmorphism değil, neumorphism'dir.** Karşılıklı köşelerden gelen
koyu + beyaz gölge çifti, neumorphism'in tanımlayıcı imzasıdır.

🚫 **Rosso'da neumorphism YASAK** — bkz. `stiller/neumorphism.md`.
Gerekçe: kontrast ölümü (WCAG AA geçmez), yüzeyler tıklanabilir görünmez,
koyu temada tamamen çöker. Rosso koyu tema-öncelikli bir üründür.

**Sınır çizgisi** — cam yüzeyde dış gölge kullanırken:

| ✅ İzin verilen | 🚫 Yasak |
|---|---|
| Tek yönlü gölge (aşağı): `0 4px 20px rgba(0,0,0,0.2)` | Karşılıklı çift gölge (biri koyu biri beyaz) |
| İç ışık `inset` olarak, ≤%30 beyaz | Dışa taşan beyaz gölge |
| Ofset ≤ 12px | Ofset 30px+ (kabartma etkisi) |

Cam **yüzer**, kabarmaz. Derinlik gölgeyle değil, **blur + arkadaki
görselin sızmasıyla** kurulur.

---

## Varyasyonlar

**Hafif (Dashboard nav, sticky header):**
blur 8px, dolgu %3, rim light yok. Varlığını hissettirir, dikkat çekmez.

**Orta (modal, popover, kart üstü panel) — Rosso varsayılanı:**
Yukarıdaki `.glass`. Rosso'nun "Liquid Glass" kimliği budur.

**Tam güç (Recap/Journey'de görsel üstü veri paneli):**
- blur 24px + saturate 1.4
- Dolgu %8, kenarlık %16, güçlü rim light
- `--color-accent` sızıntısı (accent-tinted)
- **Arkada zengin bir görsel olmalı** — camın parlaması için renk gerekir
- Panel içindeki metin **her zaman** birincil renkte (cam kontrastı düşürür)

---

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Camı zengin/görsel zemin üstüne koy | Düz renk üstüne cam koy (gri kutu olur) |
| Rim light ekle | Yalnız blur + saydamlık (yassı görünür) |
| Ekranda 1-3 cam yüzey | Her kartı cam yap |
| `@supports` fallback ver | Desteklenmeyen tarayıcıda şeffaf bırak |
| Cam üstü metni birincil renkte yaz | İkincil gri metin (kontrast çöker) |
| Mobilde sabit yüzeylerde kullan | Mobil liste öğelerinde kullan (fps ölür) |

---

## Rosso'da uygulama

- **Kanonik token'lar:** `--glass-fill`, `--glass-border` — design-system §2'de
  tanımlı, doğrudan kullan.
- **Katman kuralları:**
  - Dashboard: modal, popover, sticky nav, aktif sekme pill
  - Recap&Journey: görsel üstü veri panelleri (**tam güç** burada uygundur)
  - Landing: yalnız sticky nav
  - Mobil: yalnız tab bar + header, **liste içinde asla**
  - Admin: **kullanılmaz** — bulanıklık operasyonel okunabilirliği düşürür
- **Kontrast uyarısı:** cam arkası değişkendir. Metin kontrastını **en kötü
  senaryoya** (en açık arka plan) göre ölç, ortalamaya göre değil.
- 60-30-10: accent-tinted cam bir ekranda **tek** panelde kullanılır.
