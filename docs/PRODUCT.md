# Ürün (PRODUCT)

Son doğrulama: 2026-10-20 (Modüller ve "Ne": kod okuma, Faz R sonrası)

## Ne
Curate, tarayıcıda çalışan ve telefona web uygulaması olarak kurulan bir fotoğraf stüdyosudur. Sahibi fotoğrafçı değildir; beklentisi en az çaba ve teknik bilgiyle doğal, temiz, profesyonel görünen sonuçtur.

- Herhangi bir fotoğrafı al; AI ile onar, iyileştir, büyüt.
- İstersen çerçeve ekle.
- Instagram ve TikTok için dump/kolaj (Carousel, Story) Faz R ile kaldırıldı (D37, 2026-10-16).
- İçinde iyi presetler olsun; düzenleme panelleri rahat olsun.

## İlkeler
1. Akıllı otomatik özellikler önce gelir. Her şey tek tuşla eklenir ve çıkar.
2. İnce ayar yalnız isteyene ve TEK kaydırıcıyla. Curve, kanal, HSL gibi uzman arayüzü yok.
3. Önizleme = export. Ekranda görülen, indirilen dosyayla aynıdır.
4. Hız: önizleme ve sürükleme akıcı; kasma, donma yok.
5. Fotoğraf cihazda kalır. Tek istisna: Düzenle'deki AI özellikleri, yalnız kullanıcı dokunuşuyla, tek fotoğraf, kendi proxy'miz üzerinden.
6. Fotoğrafçılık bilgisini (araçlar, presetler, mobil kamera kusurları) ajan bilir, ürüne işler ve günceller (`docs/PHOTO-KNOWLEDGE.md`).

## Hedef kullanıcı
Yalnız sahip (Uğur). Başka kullanıcı, hesap, paylaşım yok.

## Platform hedefleri
| Hedef | Değer | Durum |
|---|---|---|
| Ana cihaz | Android telefon, Chrome, 390×844 referans (360 ve 430 da ölçülür) | Emülasyonda ölçülüyor; telefonda doğrulanmadı |
| Kurulum | Ana ekrana eklenen web uygulaması (PWA) | Bkz. `docs/ARCHITECTURE.md` §PWA |
| Masaüstü | İkincil; içerik ortalı ve sınırlı genişlikte | |
| Yayın | Vercel, `main` her push'ta | |

## Modüller
| Modül | Ne yapar | Çıktı |
|---|---|---|
| Düzenle | Tek fotoğraf: AI onarım direktifi (serbest metin ya da 5 hazır direktif); model yalnız ışık/renk planı döner, cihazda uygulanır; yanıt yoksa yerel plan | Fotoğrafın kendi çözünürlüğü |
| Büyüt (Upscale) | Yerel 2×/4× Lanczos-3 büyütme, önce/sonra ayırıcı | Kaynak × çarpan (uzun kenar ≤ 8192, ≤ 16 MP) |
| Çerçeve | Polaroid (3 çeşit), mat (renk seçimli), gradyan (akıllı + 3 hazır), tarih damgası; birden çok fotoğrafa toplu | 10 standart oran (4:5, 1:1, 9:16, 3:4, 2:3, 5:4, 4:3, 3:2, 16:9, 1.91:1), kısa kenar 1080 ya da 4K (2160); varsayılan 1080×1350; toplu ise zip |

## Kapsam dışı
Panorama, AI ile içerik üretme (inpainting/outpainting), hesaplar, bulut senkronu, sunucuda fotoğraf saklama, manuel renk arayüzü, kamera/çekim asistanı, ışık sızıntısı ve eklenen estetik vinyet. Tam liste: `AGENTS.md` §4.
