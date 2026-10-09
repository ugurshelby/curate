# Curate — Prosedürler

Tekrarlanan işlerin tarifi. Her prosedür: tetikleyici, kapsam, adımlar, değiştirebileceklerin, yalnız raporlayacakların, güncellenecek belgeler, çıktı. Tetikleyici tablosu `AGENTS.md` §10'da.
Son doğrulama: 2026-10-08

---

## Ortak protokol (her prosedürün sonu, bu sırayla)
1. **Belgeler:** etkilenen bölümleri güncelle (`docs/reference/curate-reference.md`, `docs/ARCHITECTURE.md`; "Son doğrulama" satırı). Davranış değiştiyse veya hata kapandıysa `curate-spec-v1.md` (yalnız olgu kısmı) ve `README.md`. Durum için `docs/STATE.md`, harita için `docs/INDEX.md`.
2. **Log:** ölçülmüş olguları `logs/YYYY-MM-DD.md`'ye yaz (komut, çıktı, sayı, boyut). Niyet yok.
3. **Kapılar:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run check:secrets` (0 bulgu). Arayüz değiştiyse Prosedür 2.
4. **Commit ve push:** doğrudan `main`. Başka dal yok, force push yok.
5. **Plan temizliği:** son adımı biten plan/görev dosyası log'dan sonra silinir.
6. **Rapor:** Türkçe, kısa: ölçülen sonuçlar, değişiklikler, tarayıcı durumu, sahibe sorular, en sonda "Sana düşenler (adım adım)".

---

## 1. Export paritesi
- **Tetikleyici:** "export kontrolü", "önizleme export eşleşiyor mu" / "check export parity".
- **Kapsam:** Carousel, Düzenle, Story, Çerçeve, Büyüt önizleme ↔ export.
- **Adımlar:**
  1. Önizleme ve export'un aynı çizim fonksiyonunu aynı parametre şemasıyla çağırdığını doğrula (`docs/ARCHITECTURE.md` §2).
  2. `npm test` (parite testleri: `tests/carousel-parity.test.ts`, `tests/export-plan.test.ts`, `tests/story-layout.test.ts`, `tests/edit-geometry.test.ts`).
  3. Boyutlar: Instagram 1080×1350, TikTok 1080×1920, Story 1080×1920, Çerçeve seçilen oran (varsayılan 1080×1350; 4K'da kısa kenar 2160, 16:9 → 3840×2160), Düzenle kırpımın kendi boyutu (≤ 4096), Büyüt 2×/4× (≤ 8192, ≤ 16 MP).
  4. Sığdır zemini `EXPORT_COLORS.fitBackground` (`lib/ui/colors.ts`).
  5. Uzantı ve MIME eşleşir (`.jpg` ↔ `image/jpeg`, `.png` ↔ `image/png`); 8 MB üstünde kalite basamağı yalnız platform hedeflerinde.
- **Değiştirebilir:** pariteyi sağlamak için var olan önizleme/export fonksiyonlarında hata düzeltme.
- **Yalnız raporla:** mimari ayrışma, algoritma yeniden tasarımı.
- **Belgeler:** reference §2–3, ARCHITECTURE §2, log.

## 2. Mobil ve viewport denetimi
- **Tetikleyici:** "mobil denetim turu", "arayüzü denetle" / "mobile audit".
- **Kapsam:** CDS ve AGENTS.md §5 kuralları; 360×740, 390×844, 430×932 (ve elle 844×390).
- **Adımlar:**
  1. Otomatik: sunucu yalnız TEST değerleriyle: `VERTEX_API_KEY=<herhangi test metni> CURATE_AI_PASSWORD=<test 4 hane> npx next start -p 3101` (build sonrası), sonra `AUDIT_PIN=<aynı test 4 hane> CHROME=<chromium yolu> node scripts/audit-ui.mjs`. Gerçek PIN asla kullanılmaz. Betik önce çerezsiz bağlamda kilit ekranını (360/390/430) ve bir yanlış PIN'i ölçer, sonra `scripts/lib/unlock.mjs` ile kapıyı açar. Bulut kapsayıcıda yol: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Betik `/api/ai`'yi taklit eder (ücretli çağrı yok), PIN adımını da ölçer.
  2. Şart: `overlap` false, `hScroll` false; `offscreen`, `smallTargets` (44 px altı), `tinyText` (12 px altı) boş; görünür cam yüzey ≤ 3; metin kontrastı ≥ 4,5 (büyük yazı ≥ 3).
  3. Filmstrip ve panel alt yığın bütçesine (≤ 40dvh) sığar; sahne ≥ 34dvh.
  4. Güvenli alan (`env(safe-area-inset-*)`), kök yükseklik `dvh`.
  5. Metin: Türkçe, jargonsuz, monospace yok (`tests/ui-rules.test.ts`).
  - Elle ölçüm betiği (tarayıcı konsolu): `[data-stage]` = fotoğraf kutusu, `header` = üst çubuk, `[data-bottom-stack]` = panel + çubuk.
  ```js
  const R = e => e.getBoundingClientRect();
  const stage = R(document.querySelector('[data-stage]')), hd = R(document.querySelector('header'));
  const bottomTop = R(document.querySelector('[data-bottom-stack]')).top;
  const visible = e => { const r = R(e); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const interactive = [...document.querySelectorAll('button, [role="button"], [role="radio"], [role="slider"], input[type="range"]')].filter(visible);
  ({ overlap: stage.top < hd.bottom || stage.bottom > bottomTop,
     hScroll: document.documentElement.scrollWidth > innerWidth,
     smallTargets: interactive.filter(e => { const r = R(e); return r.width < 44 || r.height < 44; }).map(e => e.getAttribute('aria-label') || e.innerText.trim()),
     tinyText: [...document.querySelectorAll('body *')].filter(e => !e.children.length && e.textContent.trim() && visible(e) && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.textContent.trim().slice(0, 20)),
     glass: [...document.querySelectorAll('.glass-panel')].filter(visible).length });
  ```
  - AI sayfası: PIN girişi `#ai-pin`, sayfa `[data-ai-sheet]` (iç kaydırma olmadan sığar); kontrol sayfası `[data-review-header]`, `[data-review-stage]`, `[data-review-bar]`. Ölçmeden önce animasyonları bitir (`document.getAnimations().forEach(a => a.finish())`). Yatay kaydırıcı içindeki öğeler (preset satırı, filmstrip) `offscreen` dışında tutulur.
  - Ekran görüntüsü: `node scripts/capture-screens.mjs <etiket>` → `screenshots/<etiket>/` (git izlemez).
  - Akıllı gradyan (D33): `AUDIT_PIN=<test PIN> node scripts/check-gradient.mjs` (aynı test değerli sunucu) Çerçeve 9:16 / 4:5 / 16:9 ve Story'yi sentetik fotoğrafla dışa aktarır, boyutu ve kenar piksellerini yazar; ekran görüntüleri `screenshots/gradient/` (git izlemez). Yoklama sayfası için `scripts/probe-fake-camera.mjs`.
- **Değiştirebilir:** CSS sınıfları, yerleşim dolgusu, duyarlı sarmalayıcılar.
- **Yalnız raporla:** tarayıcı yoksa her görsel madde "doğrulanmadı".
- **Belgeler:** reference §6, log.

## 3. Performans ve bellek
- **Tetikleyici:** "performans denetimi", "bellek kontrolü" / "performance audit".
- **Bütçe:** preset değişimi ≤ 100 ms; sürükleme karesi ≤ 33 ms (Redmi sınıfı), masaüstü ≤ 16 ms; etkileşimde 50 ms üstü ana thread görevi yok (export hariç); canvas ≤ 16 MP.
- **Adımlar:**
  1. `?perf=1` ile önizleme çizim süresi, kare süresi ve uzun görev sayısı (`PerfHud`).
  2. Her `URL.createObjectURL` için `revokeUrl`/`URL.revokeObjectURL` yolu var mı.
  3. Build çıktısındaki parça boyutları.
  4. Telefonda ölçülemeyen her şey "telefonda ölçülmedi".
- **Değiştirebilir:** içe aktarma yolları, URL serbest bırakma, testli mikro iyileştirmeler.
- **Yalnız raporla:** worker/WebGL gibi mimari kaymalar (sarı; plan göster).
- **Belgeler:** reference §2, ARCHITECTURE §2–3, log.

## 4. Gizlilik ve repo hijyeni
- **Tetikleyici:** "gizlilik taraması", "repo hijyen kontrolü" / "privacy scan".
- **Adımlar:**
  1. Repo görünürlüğü (GitHub).
  2. İzlenen dosyalarda sır şekilli dize taraması (yalnız dosya yolu raporla). Build sonrası `npm run check:secrets` (`.env` değerlerini bellekte okur, yazdırmaz): 0 bulgu.
  3. `.gitignore`: `.env*`, `.vercel`, build çıktıları, `screenshots/`, dump'lar.
  4. EXIF/GPS temizliği (`lib/export/exif-sanitizer.ts`).
  5. Kişisel görünen izlenen dosyalar (yalnız liste; 13 referans görsel sahip kararıyla kalır).
  6. 4 haneli PIN değerle taranamaz. Sahip değeri oturumda verdiyse staged diff ve geçmişte ara, yalnız sayıyı raporla; komutu hiçbir dosyaya yazma. PIN istemci kodunda, testte, logda, belgede, commit mesajında asla yer almaz; testler sahte PIN kullanır.
- **Değiştirebilir:** `.gitignore`, `.env.example` (yalnız ad), EXIF kenar durumları.
- **Yalnız raporla:** izlenen kişisel fotoğraflar (sahip söylemeden silinmez).
- **Belgeler:** reference §4–5, log.

## 5. Doküman tazeliği
- **Tetikleyici:** "doküman taraması", "bayat dokümanları temizle" / "docs sweep".
- **Adımlar:**
  1. Belgelenen hataları koda karşı kontrol et; kapananları commit referansıyla kapat.
  2. README ve `docs/*` özelliklerini koda karşı kontrol et.
  3. Bayat plan dosyalarını sil; 30 günden eski raporları özetleyip sil; 15 günden eski logları sil.
  4. Spec'teki ürün kararlarına ve sahip sorularına dokunma; yalnız olgu düzelt.
- **Belgeler:** dokunulan her belge, log.

## 6. Canlıda görülen hata
- **Tetikleyici:** "şu hatayı düzelt: …", "canlıda şunu gördüm: …" / "fix bug: …".
- **Adımlar:** önce yeniden üret (test veya betikle) → kök neden → en küçük düzeltme → saf mantıksa gerileme testi → kapılar.
- **Yalnız raporla:** ürün kararı gerektiren yan etkiler.
- **Belgeler:** spec (hata orada kayıtlıysa), reference, log.

## 7. `main`'e push öncesi kontrol
- **Tetikleyici:** "main'e push öncesi kontrol", "yayın öncesi kontrol" / "pre-push check".
- **Adımlar:** dal `main` ve çalışma ağacı temiz → `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build` → `npm run check:secrets` → arayüz değiştiyse Prosedür 2 → diff özeti → kalan riskler ve tarayıcıda denenmeyenler.
- **Değiştirebilir:** hiçbir şey (yalnız denetim).
- **Çıktı:** push et / etme önerisi.

## 8. Rutin oturum
- **Tetikleyici:** "rutin kontrol", "bakım oturumu" / "routine check".
- **Sıra:** `docs/STATE.md` oku → çalışma ağacı temiz mi → `git log` → açık sorular → Prosedür 4 → Prosedür 1 → Prosedür 2 → Prosedür 5 → bağımlılık güvenlik uyarıları (`npm audit --omit=dev`) → güvenli olanı düzelt, kalanı raporla → kapılar.
