# Minimalism — Rosso Uygulama Rehberi

> **Ne zaman:** Admin paneli (%60 — ana dil) · ayarlar ekranları · form
> akışları · hukuki/yardım sayfaları.
> **Katman:** Admin (birincil) · Dashboard ayarları · Landing (hukuki sayfalar)
> **Tam güç kuralı:** Minimalizm "az öğe" değil, **gereksiz öğe yok** demek.

---

## Özü — 4 karar

1. **Her öğe varlığını gerekçelendirir.** "Güzel duruyor" gerekçe değildir.
2. **Boşluk bir bileşendir.** Ayırmak için çizgi/kutu değil, boşluk kullanılır.
3. **Tipografi tek başına hiyerarşi kurar.** Boyut + ağırlık + renk yeter;
   dekoratif çerçeve gerekmez.
4. **Renk işlevseldir.** Minimalist arayüzde renk = anlam. Dekoratif renk yok.

---

## Somut değerler

| Parametre | Değer |
|---|---|
| Renk sayısı | Zemin + 2 metin tonu + 1 accent (**toplam ≤4**) |
| Kenarlık | Yalnız gerektiğinde; `1px solid` düşük kontrast |
| Yarıçap | `--radius-md` (12px) — yumuşak ama nötr |
| Bölüm arası boşluk | `--space-8` … `--space-12` |
| Öğe arası boşluk | `--space-3` … `--space-4` |
| Gölge | Yok (yalnız modal/popover) |
| Animasyon | 150–200ms, yalnız durum değişimi |

---

## CSS

```css
.minimalSection {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-block: var(--space-10);
  /* Ayrım çizgiyle değil boşlukla — gerekirse tek hairline */
  border-bottom: 1px solid var(--color-border);
}

.minimalHeading {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.minimalMeta {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Buton: tek accent, geri kalan nötr */
.minimalButtonPrimary {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-radius: var(--radius-md);
  padding: 10px 18px;
  font-weight: 600;
}
.minimalButtonGhost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 18px;
}
```

---

## Varyasyonlar

**Hafif (Dashboard ayarlar):** Kartlı ama sade. Bölümler hairline ile ayrılır,
her bölüm başlık + açıklama + kontrol.

**Orta (Admin) — bu stilin evi:** Yoğun ama sakin. Tablolar, metrikler,
minimum süs. Renk yalnız durum bildirir.

**Tam güç (hukuki/yardım sayfaları):**
- Tek kolon, 68ch okuma genişliği
- Yalnız tipografi hiyerarşisi — hiç kutu yok
- Bol dikey boşluk (`--space-12`)
- Tek accent: yalnız linklerde

---

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Boşlukla ayır | Her grubu kutuya al |
| ≤4 renk | Her bölüme farklı renk |
| Tipografiyle hiyerarşi | Dekoratif çerçeve/gölge |
| Renk = anlam | Renk = dekorasyon |
| Öğeyi sil (gerekmiyorsa) | "Boş kalmasın" diye doldur |

---

## Rosso'da uygulama

- **Admin'in ana dili** — `katmanlar/admin-design.md` ile birlikte okunur.
- Minimalizm Rosso'da **soğukluk demek değil**: ürün tarafında (Dashboard
  ayarları) yine `--color-bg-elevated` yüzeyler ve 16px yarıçap kullanılır.
- "Az öğe" ile "eksik durum" karıştırılmaz: loading/empty/error durumları
  minimalist tasarımda da **zorunludur**.
