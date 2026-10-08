# Yoklama (Probe): telefonun kamera ve donanım tavanı

> Son doğrulama: 2026-10-08. Faz Y (Yoklama). Hedef cihaz: Redmi Note 12 Pro 5G.
> **Bu fazın amacı karar vermek, özellik yazmak değil.** İki araç da geçicidir.
> **Silme koşulu: yol haritası kararı verildiğinde** `app/probe/`, `lib/probe/`, `probe-apk/`, `docs/probe/`, `scripts/probe-fake-camera.mjs`, `tests/probe-schema.test.ts`, `vitest.config.ts`, `lib/i18n/tr.ts` içindeki `trProbe`, `scripts/audit-ui.mjs` içindeki "Yoklama" bloğu ve kök `tsconfig.json`/`.eslintrc.json`/`.gitignore`'daki `probe-apk` satırları silinir; `docs/INDEX.md`, `docs/STATE.md`, spec §8/§10 ve reference satırları güncellenir.

## Ne ölçer

| Araç | Yer | Ne gösterir |
|---|---|---|
| Web yoklaması | `/probe` (Curate içinde; ana sayfadan linklenmez, `noindex`, tüm uygulama PIN kapısının arkasında) | Tarayıcının (Chrome Android) kameradan ve donanımdan verebildiği: `getCapabilities` dökümü, gerçek çözünürlük/fps, ImageCapture, her kontrolün görüntüde **gerçekten** etkili olup olmadığı, analiz/braket hızı, ekran dolgu ışığı |
| Native APK | `probe-apk/` (Expo + yerel Kotlin modülü) | Üçüncü taraf bir Android uygulamasının Camera2'den alabildiği: donanım seviyesi, yetenekler (MANUAL_SENSOR, RAW, BURST…), ISO/pozlama aralıkları, gizli kameralar, manuel ISO/pozlama, RAW/DNG, EV ve burst braket hızı, AE bölgesi, AWB, manuel odak, sensör hızları |

İkisi de aynı `probe/v1` JSON'unu üretir (`docs/probe/SCHEMA.md`). Hiçbiri ağa veri göndermez, görüntü kaydetmez (kareler 160 px'e küçültülüp yalnız sayıya çevrilir), ücretli çağrı yapmaz. Native uygulamanın manifestinde `INTERNET` izni kaldırılmıştır (`app.json` → `blockedPermissions`); yalnız `CAMERA` ve `HIGH_SAMPLING_RATE_SENSORS` istenir.

## Sonuç nasıl okunur

- **Etkili**: ayar görüntüde ölçülebilir fark yarattı (eşik ve 3× sahne gürültüsü aşıldı). Bu özellik üzerine kurulabilir.
- **Etkisiz** (`kabul-edildi-etkisiz`): API isteği kabul etti ama görüntü değişmedi. "Var gibi görünen ama çalışmayan" kontrol; bunun üzerine özellik kurulmaz.
- **Yok**: yetenek bildirilmiyor. **Hata**: istek hata verdi (mesaj ayrıntıda). **Atlandı**: önceki adım (izin) olmadı.
- "Ne mümkün" matrisi her satırda web ya da native'ten en iyi sonucu gösterir: nokta pozlama, EV telafisi, manuel ISO/pozlama, beyaz dengesi, odak, zoom, torch, braket, 4K fotoğraf, ultra geniş, RAW.
- Sahneye bağlı testler (nokta pozlama, torch, dolgu ışığı) aydınlık ve karanlık bölgesi olan sabit bir sahne ister; düz bir duvarda "etkisiz" çıkabilir.
- Native `native.ureticiKisiti` satırı "üretici üçüncü taraf uygulamaya manuel/RAW veriyor mu, vermiyorsa hangi adımda kesiliyor" sorusunun cevabıdır.

## Çalıştırma

### Web
Telefonda Curate adresine `/probe` ekle (PIN sorulursa her zamanki PIN) → "Testi başlat" → kamera (ve sorulursa hareket) izni → bitince "Dışa aktar" bölümünden Paylaş / İndir / Kopyala. Dosya adı `curate-probe-web-YYYYMMDD-HHMM.json`.

Bilgisayarda akış testi (sahte kamera, gerçek kontrolleri taklit etmez):

```bash
AUDIT_PIN=<test 4 hane> node scripts/probe-fake-camera.mjs
```

(sunucu `http://localhost:3101`, yalnız test değerleriyle: `VERTEX_API_KEY=<test> CURATE_AI_PASSWORD=<test 4 hane> npx next start -p 3101`; gerçek PIN asla. `SHOTS=screenshots/probe` ekran görüntüsü, `OUT=<dosya>` JSON yazar. Başlangıç ekranı Prosedür 2'de de ölçülür: `scripts/audit-ui.mjs` → "Yoklama".)

### Native APK (EAS, sahip yapar)
1. expo.dev'de ücretsiz hesap; `npm install -g eas-cli`; `eas login`.
2. `cd probe-apk`, `npm install`, `eas init` (projectId burada oluşur, `app.json`'a yazılır; gizli değildir).
3. `eas build -p android --profile preview` → APK bağlantısı/QR. İmza anahtarını EAS saklar.
4. Telefonda kur, "Curate Probe"u aç, "Testi başlat", kamera iznini ver, "Dışa aktar": Paylaş (Android paylaşım sayfası), İndirilenlere kaydet (klasör seçici), Kopyala. Dosya adı `curate-probe-native-YYYYMMDD-HHMM.json`.

Ajanın yapabildiği doğrulama: `npx tsc --noEmit`, `npx expo-doctor`, `npx expo prebuild --platform android` (`probe-apk/` içinde). Android SDK olmayan makinede Kotlin derlemesi yapılamaz; ilk EAS build bunun ilk gerçek denetimidir.

## Yapı

- `lib/probe/schema.ts`: tip, `decideEffect`, `buildSummary`, `validateProbeReport`, `probeFileName` (saf, Vitest).
- `lib/probe/frame-stats.ts`: 160 px kareden parlaklık, R/G, B/G, Laplace keskinliği, çeyrek parlaklıkları, histogram özeti; `kelvinToRgb` (dolgu ışığı rengi sabit renk değil, sıcaklıktan hesaplanır).
- `lib/probe/run-web.ts`: yedi adım (ortam, sensörler, kameralar, çözünürlük/fps, etki, performans, dolgu). Her kontrol min/orta/max uygulanır, 600 ms beklenir, `getSettings` geri okunur, kare ölçülür; sonunda ayar eski hâline döner (hata olsa da).
- `app/probe/page.tsx`, `app/probe/ProbeScreen.tsx`: arayüz; metinler `lib/i18n/tr.ts` → `trProbe`. Ölçüm ayrıntı satırları (rapor verisi) `lib/probe/run-web.ts`'te Türkçe üretilir.
- `probe-apk/modules/curate-probe/android/.../{CurateProbeModule,CameraInfo,CaptureProbe}.kt`: Camera2 ölçümü. Her API çağrısının yanında dayandığı Android belge sayfası yorum olarak durur.
- `probe-apk/` kök kapıların (tsc, ESLint, Vitest, `next build`) dışındadır: `tsconfig.json` `exclude`, `.eslintrc.json` `ignorePatterns`, `vitest.config.ts` `exclude`.
