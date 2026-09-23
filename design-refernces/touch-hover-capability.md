# Touch & Hover Capability — Tasarım Tekniği

> **Kaynak:** Instagram ilham envanteri (2026-08-05) · **Öncelik:** Yüksek  
> **Bağlayıcı katmanlar:** Dashboard · Landing · Auth · Mobil (Expo)  
> **Kod referansı:** `web/src/styles/interaction-capability.css` · `globals.css`

---

## Sorun

`:hover` ile gizlenen veya ortaya çıkan aksiyonlar masaüstünde çalışır; dokunmatikte **yapışık hover** oluşur — ilk dokunuş hover'ı tetikler, tıklama ikinci dokunuşta gelir. Kritik aksiyonların yalnız hover'da görünmesi mobilde **kayıp aksiyon** demektir.

---

## Kurallar (bağlayıcı)

### 1. Hover yalnız gerçek fare cihazında

Dekoratif hover (gölge, scale, arka plan) **asla** ham `:hover` ile yazılmaz:

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    background: var(--color-hover);
    transform: translateY(-2px);
  }
}
```

Dokunmatik hedefleme:

```css
@media (pointer: coarse) {
  .card:active {
    background: var(--color-hover);
  }
}
```

### 2. Birincil aksiyon hover arkasında gizlenmez

| Cihaz | Birincil aksiyon |
|---|---|
| Masaüstü (fine) | Hover ile ortaya çıkabilir **veya** sürekli görünür |
| Dokunmatik (coarse) | **Her zaman görünür**, swipe satır aksiyonu veya ⋯ menüsü |

### 3. Minimum dokunma hedefi: 44×44 CSS px

Görsel ikon 16–20px kalabilir; tıklama alanı `min-width/min-height: 44px` veya `::before` genişletmesi ile büyütülür.

```css
.touchTarget {
  position: relative;
  min-width: 44px;
  min-height: 44px;
}
```

### 4. User-agent sniffing yasak

`navigator.userAgent` ile mobil tespiti **kullanılmaz**. `@media (hover: hover)`, `(pointer: fine|coarse)` yeterli.

---

## Rosso uygulama haritası

| Bileşen | Durum | Not |
|---|---|---|
| `playlists.module.css` — kapak scale | ✓ | `@media (hover: hover)` mevcut |
| `like-button.module.css` | Uygulanacak | 44px hedef var; hover sarmalanacak |
| `genre-dna.module.css` | Uygulanacak | `.tile:hover` transform |
| Landing `marketing.module.css` | FAZ 1–2 | `.feature:hover` sarmalanacak |
| Auth formları | Düşük risk | Input hover dekoratif |

---

## DO / DON'T

| DO | DON'T |
|---|---|
| `@media (hover: hover) and (pointer: fine)` ile dekoratif hover | Ham `:hover { display: block }` ile aksiyon göstermek |
| Mobilde ⋯ / bottom sheet | `overflow-x: hidden` ile taşmayı gizlemek |
| 44px hit area, görsel küçük kalabilir | 16px ikona tıklama alanı vermemek |

---

## Denetim checklist

- [ ] Birincil aksiyon 390px viewport'ta hover olmadan erişilebilir mi?
- [ ] Dekoratif `:hover` capability query içinde mi?
- [ ] Etkileşimli öğe ≥44×44px mi?
- [ ] `prefers-reduced-motion` hover transform'u kapatıyor mu?
