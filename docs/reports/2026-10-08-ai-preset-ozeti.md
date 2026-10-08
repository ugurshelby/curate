# Tasarım Özeti — AI Preset ("Işık ve Renk Planı") — 2026-10-08

**Durum: onaylandı (D28) ve uygulandı 2026-10-08.** Sapma: "Bölgeleri göster" katmanı yapılmadı; kırpım dönüşümü planı orijinal koordinatta saklayarak çözüldü; güvenli ölçek planla birlikte saklanır. Görev belgesi §8.3: sahip "tamam" derse kodlanır; itiraz gelmezse bu özetten bir oturum sonra başlanır. Ücretli çağrı yapılmadı (0/6).

## 1. Amaç
Düz preset maske yapamaz: gökyüzünü koyulaştırırken yüzü aydınlatamaz. AI fotoğrafa bakıp **bölgelere özel bir ışık/renk planı** (JSON) döndürür; Curate planı kendi yerel motoruyla uygular.
- AI görseli **üretmez** (güneş uydurma sorunu yok), yalnız sayısal plan verir.
- Ucuz: küçük önizleme gider, yalnız metin döner. Deterministik: aynı plan → aynı sonuç (plan öğede saklanır).

## 2. Akış
1. Düzenle → yeni sekme veya Preset satırında "AI Preset" kartı → stil seç: **Doğal Portre, Altın Saat, Sinematik Gece, Temiz Gündüz** (§8.4'teki kütüphaneyle hizalı; liste `lib/ai/config.ts`'te).
2. Tarayıcı fotoğrafı uzun kenar ≤ 768 px, JPEG ~0,8'e indirir (≈ 60–120 KB) ve kendi proxy'mize gönderir (`POST /api/ai`, görev `P`, aynı PIN çerezi, aynı kota).
3. Proxy görsel anlayabilen bir Vertex modeline **yalnız JSON** isteği gönderir (yanıt şeması ve `responseMimeType: application/json`). Model adı `lib/ai/config.ts`'te. Aday modeller kod aşamasında boş gövdeli POST ile yoklanır (404 değil 400 → model var); anahtar yazdırılmaz. (Bu oturumda `VERTEX_API_KEY` kapsayıcıda olmadığından yoklanmadı.)
4. Sunucu planı doğrular ve sınırlar (§4); istemci tekrar doğrular. Bozuksa: hata mesajı + normal preset'e düşüş.
5. Plan öğenin Düzenle ayarlarında saklanır (`edits[id].aiPlan`), cihaz hafızasına da girer. "Miktar" kaydırıcısı planın tüm değerlerini ölçekler. "Yeniden üret" ücretlidir ve kotadan düşer. "Bölgeleri göster" maskeleri sahnede renksiz (beyaz %30 çizgi/doku) gösterir.
6. Önizleme ve export aynı çizim fonksiyonu: taban (kırp + Düzeltme) → **plan** → preset görünümü. Parite testi zorunlu.

## 3. Plan şeması (taslak)
```json
{
  "version": 1,
  "scene": {
    "type": "portrait | landscape | street | night | interior | food | architecture | other",
    "light": "golden | blue_hour | midday | overcast | night | mixed | indoor",
    "issues": ["underexposed_subject", "bright_sky", "color_cast", "haze", "flat"]
  },
  "global": { "exposure": 0.0, "contrast": 0.0, "temperature": 0.0, "tint": 0.0, "vibrance": 0.0, "shadows": 0.0, "highlights": 0.0 },
  "regions": [
    {
      "label": "sky | subject | skin | background | foreground | highlight",
      "shape": { "type": "linear", "x0": 0.5, "y0": 0.0, "x1": 0.5, "y1": 0.45, "feather": 0.15 },
      "adjust": { "exposure": -0.3, "contrast": 0.05, "saturation": 0.05, "temperature": -0.05, "tint": 0.0, "shadows": 0.0, "highlights": -0.2 }
    },
    {
      "label": "subject",
      "shape": { "type": "radial", "cx": 0.48, "cy": 0.62, "rx": 0.22, "ry": 0.3, "feather": 0.4 },
      "adjust": { "exposure": 0.25, "shadows": 0.15 }
    },
    {
      "label": "foreground",
      "shape": { "type": "polygon", "points": [[0, 0.8], [1, 0.75], [1, 1], [0, 1]], "feather": 0.08 },
      "adjust": { "exposure": 0.1 }
    }
  ]
}
```
- Koordinatlar 0–1, kırpılmış görüntüye göre (kırp değişirse plan kırpım öncesi orijinal karede saklanır ve geometriyle dönüştürülür).
- Şekiller: doğrusal gradyan, radyal/elips gradyan, çokgen (en çok 12 köşe); hepsinde yumuşak kenar (`feather`).
- Bölge sayısı en çok 6.

## 4. Doğrulama ve sınırlar (sunucu + istemci, elle yazılmış doğrulayıcı, yeni bağımlılık yok)
| Alan | Sınır | Aşılırsa |
|---|---|---|
| `exposure` (global/bölge) | −0,6 … +0,6 EV | kırpılır |
| `contrast`, `vibrance`, `saturation` | −0,3 … +0,3 | kırpılır |
| `temperature`, `tint` | −0,25 … +0,25 | kırpılır |
| `shadows`, `highlights` | −0,4 … +0,4 | kırpılır |
| koordinatlar | 0 … 1; `feather` 0,02 … 0,6 | kırpılır |
| bölge sayısı / köşe sayısı | ≤ 6 / ≤ 12 | fazlası atılır |
| bilinmeyen alan, yanlış tür, sürüm ≠ 1 | — | plan reddedilir → normal preset + "Plan okunamadı" |
- **Cilt koruma:** `skin` veya `subject` bölgesinde sıcaklık/ton değişimi ±0,08 ile sınırlı; uygulamada cilt tonu aralığındaki piksellerde ton kayması ≤ 10° (test).
- **Ezme/patlatma sınırı:** uygulama sonunda bölge maskesi altındaki piksellerde siyah (≤ 2) ve beyaz (≥ 254) payı kaynağa göre en çok +%0,5 artabilir; aşarsa o bölgenin ayarı orantılı küçültülür.
- **Vinyet değildir:** gradyanlar yalnız plan içindeki yerel ayar maskesidir; kenarları koyulaştıran bağımsız bir efekt eklenmez (AGENTS.md §4, spec E13). Doğrulayıcı "dört kenara simetrik koyulaştırma" desenini (merkezde radyal, dışı negatif pozlama) reddeder.

## 5. Uygulama (yerel motor)
- Maske: her bölge için 0–1 ağırlık haritası (önizleme çözünürlüğünde), gradyan/çokgen + yumuşak kenar; çokgen için tarama satırı doldurma + kutu bulanıklığı.
- Ayar: preset motorundaki aynı ton fonksiyonları (`toneCurve`, WB kazancı, canlılık) bölge başına, ağırlıkla karıştırılarak. Global ayar önce, bölgeler sırayla.
- Hız: 0,5 MP önizlemede 6 bölge için hedef ≤ 60 ms (masaüstü), ağırsa worker'da (Düzeltme ile aynı yol).

## 6. Kota ve maliyet
- Görev `P`, ağırlık config'te (öneri: 1 çağrı = 1 hak; görüntü üretmediği için A–D'den ucuz). Tahmini maliyet ölçülmeden yazılmaz; ilk gerçek çağrılarda (≤ 6) ölçülür ve `lib/ai/config.ts`'e "[doğrulanmadı]" notuyla girer.
- Günlük/aylık sayaç ve PIN akışı aynen (Faz P1).

## 7. Testler (kod aşamasında)
1. Doğrulayıcı: bozuk JSON, eksik alan, aşırı değerler (kırpılır), fazla bölge, bilinmeyen tür, sürüm.
2. Maske matematiği (sentetik görsel): radyal +pozlama merkezi değiştirir, köşeyi değiştirmez; doğrusal gradyan üstten alta azalır; çokgen dışı değişmez.
3. Parite: önizleme ölçeğinde ve export boyutunda aynı fonksiyon; export boyutunda 0 fark.
4. Sınır kırpma ve cilt/ezme koruması.
5. Sahte `fetch` ile uçtan uca akış; plan yoksa/bozuksa normal preset'e düşüş.

## 8. Sahibe sorular
1. Bu tasarımla devam edilsin mi? (Öneri: evet.)
2. Başlangıç stilleri: Doğal Portre, Altın Saat, Sinematik Gece, Temiz Gündüz yeterli mi?
3. Kota ağırlığı: bir AI Preset çağrısı bir "AI ile onar" hakkı kadar mı sayılsın? (Öneri: evet, basit.)
4. Kod aşamasında model yoklaması ve en çok 6 ücretli deneme çağrısı yapılabilir mi? (Öneri: evet, her biri log'a.)
