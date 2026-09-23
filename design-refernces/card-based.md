# Card-Based UI — Rosso Uygulama Rehberi

> **Ne zaman:** Liste satırları · profil kartları · playlist kartları · sohbet
> balonları · metrik kartları.
> **Katman:** Dashboard (%30) · Mobil (%50 — ana dil) · Admin (%30)
> **Tam güç kuralı:** Kart bir *kutu* değil, **tek bir düşünce birimi**.

---

## Özü — 4 karar

1. **Bir kart = bir fikir.** İçine ikinci konu girerse bölünmeli.
2. **Kart dokunulabilir bir nesnedir.** Tıklanabilir alan kartın TAMAMI olmalı,
   içindeki küçük bir link değil (Fitts yasası).
3. **Hiyerarşi tipografi ve boşlukla kurulur** — dekoratif kenarlıkla değil.
4. **Kart içinde kart YASAK.** İki seviye iç içe = AI slop sinyali.

---

## Somut değerler

| Parametre | Değer |
|---|---|
| Yarıçap | `--radius-lg` (16px) · Admin'de `--radius-md` (12px) |
| İç padding | `--space-5` (20px) · kompakt listede `--space-3` |
| Kenarlık | `1px solid var(--color-border)` |
| Zemin | `var(--color-bg-elevated)` |
| Liste satırı min yükseklik | 56px (mobilde 64px) |
| Kart içi dikey boşluk | `--space-3` |
| Dokunma hedefi | **min 44×44pt** (mobil) |

**MD3 varyantları — Rosso karşılığı:**
- *Elevated*: gölgeli, yüksek ayrışma → modal, öne çıkan kart
- *Filled*: `--color-bg-elevated` zemin → varsayılan
- *Outlined*: yalnız kenarlık → ikincil/pasif kart

---

## CSS

```css
.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  transition: transform 200ms ease-out, border-color 200ms ease-out;
}

/* Tüm kart tıklanabilir — Fitts yasası */
.cardInteractive { cursor: pointer; }
.cardInteractive:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
}
.cardInteractive:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Liste satırı — Index yoğunluk modu */
.listRow {
  display: grid;
  grid-template-columns: auto 48px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: reduce) {
  .card, .cardInteractive:hover { transition: none; transform: none; }
}
```

**Karmaşık kart (içinde ikincil buton):** HTML iç içe interaktif öğeye izin
vermez. Kart `<a>`, buton **kardeş element** olarak `position: absolute` ile
görsel olarak içeride durur — ekran okuyucu ikisini ayrı okur.

---

## Varyasyonlar

**Hafif (Admin tablo satırı):** Kenarlık yok, yalnız hairline ayraç, sıkı
padding (`--space-2`), yarıçap yok. Kart hissi minimum, yoğunluk maksimum.

**Orta (Dashboard playlist/track kartı):** Yukarıdaki `.card`. Hover'da
yükselme + kenarlık accent'e yaklaşma.

**Tam güç (mobil profil kartı, keşif kartı):**
- Büyük kapak görseli (kartın %60'ı)
- Görsel üstüne gradient scrim + metin
- Yarıçap `--radius-xl`, gölge belirgin
- Swipe/tap etkileşimi, basılınca `scale(0.98)` (dokunsal geri bildirim)

---

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Tüm kartı tıklanabilir yap | Kart içinde küçük "Aç" linki |
| Boşlukla hiyerarşi kur | Kart içine kart koy |
| `min-width: 0` (grid/flex child) | Taşan başlıkları görmezden gel |
| Karmaşık kartta kardeş element | `<a>` içine `<button>` iç içe |
| Liste satırında 56px min | 32px sıkışık satır |
| `transform`/`opacity` animate et | `height`/`top` animate et |

---

## Rosso'da uygulama

- **Token:** `--color-bg-elevated` zemin, `--color-border` kenarlık,
  `--radius-lg` yarıçap.
- **Katman farkları:** Dashboard 16px yarıçap · Admin 12px + sıkı padding ·
  Mobil 16px + büyük dokunma hedefi.
- **Kart içinde kart yasağı** Rosso'nun kalıcı kuralı — hiyerarşi gerekiyorsa
  boşluk ve tipografi kullan.
- Liste kolleksiyonları `<ul>/<li>` ile işaretlenir (ekran okuyucu toplam sayıyı
  ve konumu duyurur).
