# Yol Haritası (ROADMAP)

Kaynak: sahibin 2026-10-08 görev belgesi. Sıra değişmez; bir faz bitmeden sonrakine geçilmez (KIRMIZI noktalar hariç: soru `docs/STATE.md`'ye yazılır, diğer işe geçilir). Durum: `docs/STATE.md`.

## Tamamlananlar (git log ile doğrulandı)
M1 mobil yerleşim · M2 render hattı ve önizleme/export paritesi · S Story/TikTok/platform export · D1 Düzenle (Preset, Kırp, Büyüt) · D1b türetilmiş fotoğraf · AI1 "AI ile onar" (Vertex proxy, Upstash kota) · C renk belirteçleri (iOS mavisi) · P1 AI için 4 haneli PIN · H1 sağlamlık düzeltmeleri.

## Fazlar

| Faz | Hedef | Kabul |
|---|---|---|
| 0 Tanışma | Durumu oku, çelişkileri listele | `docs/STATE.md` var |
| 1 Anayasa | AGENTS.md, `docs/` sistemi, reference, spec açık soruları | Sonraki ajan belgelerden projeyi anlar; kapılar yeşil |
| 2 Tasarım dili | CDS v3, `tokens.curate.json`, kural-kontrol testi | `tests/ui-rules.test.ts` geçer |
| 3 Arayüz | Her ekranı denetle, ana sayfadan başlayarak yeniden tasarla | Prosedür 2 üç genişlikte geçer; önce/sonra ihlal sayısı raporda |
| 4 Erişim/gizlilik | A: tüm uygulama kapısı (KIRMIZI, önce plan). B: cihazda kalıcılık. C: PWA sağlığı | A sahip onayından sonra; B/C testli |
| 5 Özellikler | 8.1 performans tabanı → 8.2 D2 Düzeltme → 8.4 bilgi tabanı + preset kütüphanesi + Akıllı Otomatik → 8.3 AI Preset (önce özet) → 8.5 platform cilası → 8.6 AI onarım cilası | Her biri testli, parite korunur |
| 6 İdame | Rutin kontrol, hata ayıklama | Prosedür 8 |

## Bütçeler (Faz 5)
Preset değişimi ≤ 100 ms; sürükleme karesi ≤ 33 ms (Redmi sınıfı), masaüstü ≤ 16 ms; etkileşimde 50 ms üstü ana thread görevi yok (export hariç, ilerlemeyle); canvas ≤ 16 MP. Ücretli AI çağrısı: faz başına ≤ 6, toplam ≤ 30.
