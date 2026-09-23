# Dark Mode First — Rosso Uygulama Rehberi

> **Ne zaman:** Her yerde. Rosso **dark-first** bir üründür; açık tema bir
> varyant değil, henüz yok.
> **Katman:** Hepsi — Recap&Journey (%30) ve Mobil (%30) en kritik.
> **Tam güç kuralı:** Karanlık "siyah" demek değil. Bu dosya farkı anlatır.

---

## Özü — 4 karar

1. **Saf siyah YASAK.** `#000` OLED'de pil tasarrufu sağlar ama gözü yorar,
   kenarları "yüzer" gösterir. Rosso `#0A0A0B` kullanır — charcoal.
2. **Saf beyaz YASAK.** `#FFF` karanlık zeminde parlar (halation). Kırık beyaz
   `#F4F4F5`.
3. **Derinlik ışıkla kurulur, gölgeyle değil.** Karanlıkta gölge görünmez;
   yükselen yüzey **daha AÇIK** olur.
4. **Doygun renkler karanlıkta bağırır.** Açık temadaki accent'i olduğu gibi
   taşıma — doygunluğu düşür, parlaklığı ayarla.

---

## Somut değerler (Rosso kanonik ölçeği)

| Katman | Token | Değer | Kullanım |
|---|---|---|---|
| En alt | `--bg-sunken` | `#060607` | Track list zebra, girinti |
| Zemin | `--bg-base` | `#0A0A0B` | Sayfa zemini |
| Yüzey 1 | `--surface-1` | `#141416` | Kartlar |
| Yüzey 2 | `--surface-2` | `#1C1C20` | Popover, yükseltilmiş kart |

| Metin | Token | Değer | Kontrast (bg) |
|---|---|---|---|
| Birincil | `--text-primary` | `#F4F4F5` | ~17:1 |
| İkincil | `--text-secondary` | `#A1A1AA` | ~7:1 |
| Üçüncül | `--text-tertiary` | `#71717A` | ~4.6:1 |

**Kural:** Hiyerarşi için **ton düşürülür, gri yapılmaz.** `--text-tertiary`
gövde metninde kullanılmaz — yalnız gerçekten ikincil bilgide.

---

## CSS

```css
:root {
  --bg-sunken:  #060607;
  --bg-base:    #0A0A0B;
  --surface-1:  #141416;
  --surface-2:  #1C1C20;
  --text-primary:   #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-tertiary:  #71717A;
}

/* Derinlik = daha açık yüzey (karanlıkta gölge işe yaramaz) */
.elevated {
  background: var(--surface-1);
  border: 1px solid rgba(255, 255, 255, 0.08);   /* hairline: ışık kenarı */
}
.elevatedMore {
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);    /* gölge YARDIMCI, tek başına değil */
}

/* Görsel üstü metin — halation'ı önlemek için scrim ŞART */
.onImage {
  background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.8) 100%);
}
```

---

## Varyasyonlar

**Hafif (Admin):** Mavi-tonlu soğuk charcoal. Daha yüksek kontrast (yorgun
gözle okunur), süs yok, glass yok.

**Orta (Dashboard) — Rosso varsayılanı:** Yukarıdaki ölçek. Nötr Hi-Fi
karanlığı, amber accent sıcaklık katar.

**Tam güç (Recap/Journey, mobil OLED):**
- Zemin `--bg-base` veya daha koyu; görseller tam ekran, renk onlardan gelir
- Metin görsel üstünde → **her zaman** scrim
- Glow ve accent parlaması burada serbest (sinematik his)
- Mobilde OLED: gerçek siyaha yakın ama `#000` değil

---

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `#0A0A0B` charcoal | `#000000` saf siyah |
| `#F4F4F5` kırık beyaz | `#FFFFFF` saf beyaz |
| Yükselen yüzeyi açıklaştır | Karanlıkta gölgeyle derinlik kurmaya çalış |
| Hairline ışık kenarı ekle | Kenarlıksız yüzeyleri üst üste koy |
| Accent doygunluğunu düşür | Açık tema rengini aynen taşı |
| Görsel üstüne scrim | Çıplak metni fotoğrafa bas |

---

## Rosso'da uygulama

- Bu ölçek `rosso-kimligi/rosso-design-system.md` §2'de kanoniktir — palet
  temaları bu hiyerarşiyi **korumak zorunda**.
- Kullanıcı teması değişse de (`palette-v2` vb.) ilke aynı: zemin < yüzey1 <
  yüzey2 parlaklık sırası bozulmaz.
- **Kontrast ölçümü:** tema değiştiğinde AA yeniden ölçülür. Green Butter
  dersi: elevated yüzey değişince accent AA'dan düşebiliyor
  (`rosso-kimligi/palet-denetimi-2026-07-20.md`).
- Mobilde OLED pil avantajı için zemin koyu tutulur ama `#000` kullanılmaz.
