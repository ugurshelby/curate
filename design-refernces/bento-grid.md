# Bento Grid — Rosso Uygulama Rehberi

> **Ne zaman:** Dashboard ana ızgara · taste blokları · landing özellik bölümü ·
> mobil ana sayfa istatistikleri.
> **Katman:** Dashboard (%50 ağırlık) · Landing (%20) · Mobil (%20)
> **Tam güç kuralı:** Bu dosya bento'yu *tam gücüyle* uygulatmak için yazıldı.
> "Fazla bento olmuş" diye sulandırma — dozu Efendim seçer, sen tam uygula.

---

## Özü — stili stil yapan 4 karar

1. **Boyut = önem.** Bento'da hiyerarşi konumla değil **alanla** kurulur.
   Büyük kutu "buraya bak" der. (Göz büyük öğede 2,6× daha uzun kalır.)
2. **Asimetri zorunlu.** Eşit kutular ızgarayı tabloya çevirir — bento ölür.
3. **Her kutu tek bir fikir.** İçine ikinci bir konu girerse bölünmeli.
4. **Boşluk kutunun parçası.** Kutular birbirine yapışmaz; aralık (gutter)
   ritmi kurar.

---

## Somut değerler

| Parametre | Değer |
|---|---|
| Izgara | 12 kolon CSS Grid (Flexbox **değil** — iki boyutlu span gerekli) |
| Gutter | `--space-4` (16px) mobil · `--space-6` (24px) masaüstü |
| Kutu yarıçapı | `--radius-lg` (16px) |
| Hero kutu | 6–8 kolon span, 2 satır |
| Orta kutu | 4 kolon span, 1–2 satır |
| Küçük kutu | 3 kolon span, 1 satır |
| Min kutu yüksekliği | 120px (altında içerik sıkışır) |
| Kutu iç padding | `--space-5` (20px) · küçük kutularda `--space-4` |

**Mobil davranışı:** 12 kolon → tek kolon. Ama **sıra önemlidir** — hero kutu
her zaman ilk. `order` ile mobilde yeniden dizilebilir.

---

## CSS / Tailwind (Rosso token'larıyla)

```css
.bentoGrid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
  grid-auto-rows: minmax(120px, auto);
}

.bentoCell {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;          /* taşma koruması — grid child'da şart */
}

/* Asimetrik dağılım — 3 eşit kart YASAK */
.cellHero    { grid-column: span 7; grid-row: span 2; }
.cellMedium  { grid-column: span 5; }
.cellSmall   { grid-column: span 4; }
.cellWide    { grid-column: span 12; }

@media (max-width: 767.98px) {
  .bentoGrid { grid-template-columns: 1fr; gap: var(--space-4); }
  .bentoGrid > * { grid-column: span 1 !important; grid-row: auto !important; }
}
```

---

## Varyasyonlar — hafiften tam güce

**Hafif (Landing özellik bölümü):**
Düşük kontrastlı kenarlık, geniş gutter, 3-4 kutu. Izgara hissettirir ama
bağırmaz.

**Orta (Dashboard varsayılan):**
Yukarıdaki değerler. Hero + 2 orta + 2-3 küçük. Kutular `--color-bg-elevated`.

**Tam güç (veri-yoğun taste/istatistik ekranı):**
- 8-12 kutu, güçlü boyut kontrastı (hero 8 kolon, küçükler 3)
- Her kutuda farklı veri görselleştirmesi (sayı / bar / sparkline / liste)
- Hero kutuda `--color-accent` vurgusu, diğerleri nötr
- Kutu içinde ikincil bento (nested grid) — **yalnız hero kutuda**, tek seviye
- Hover'da hafif `translateY(-2px)` + kenarlık accent'e yaklaşır

---

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Boyutla önem belirt | Hepsini eşit yap |
| Hero'yu sol üste koy (F-pattern) | Hero'yu ortaya/sağa gizle |
| Her kutuya tek fikir | Kutuya 3 farklı metrik doldur |
| `min-width: 0` ver | Taşan içeriği görmezden gel |
| Mobilde sırayı yeniden düşün | Masaüstü sırasını olduğu gibi bırak |
| Gutter'ı tutarlı tut | Her kutuda farklı aralık |

---

## Rosso'da uygulama

- **Token:** zemin `--color-bg-elevated`, kenarlık `--color-border`,
  yarıçap `--radius-lg`, boşluk `--space-*` (8pt katları).
- **Katman:** Dashboard'ın ana düzen dili. Recap/Journey'de bento **yalnız**
  Journey yıl bloklarında; story-deck kartlarında kullanılmaz (orada tam
  viewport tek kompozisyon var).
- **3 eşit kart yasağı** Rosso'nun kalıcı kuralıdır — design-system §4.
- **Yoğunluk modu:** Canvas modunda 4-6 kutu, Index modunda 8-12.
- Admin'de bento kullanılır ama daha sıkı: gutter `--space-3`, yarıçap
  `--radius-md`.
