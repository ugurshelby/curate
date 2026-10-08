# Yoklama raporu şeması `probe/v1`

> Kaynak tip: `lib/probe/schema.ts` (web). Native kopya: `probe-apk/src/probe-schema.ts`, "shared body" işaretinden sonrası birebir aynı olmalı; `tests/probe-schema.test.ts` denetler. Aşağıdaki JSON örneği de aynı testte şemaya karşı doğrulanır.
> Son doğrulama: 2026-10-08.

Tek JSON dosyası. Web ve native aynı biçimi üretir; yalnız `meta.kaynak` (`web` | `native`) ve test kimlikleri farklıdır. Rapor kişisel içerik taşımaz: görüntü yok, seri no / IMEI / konum / hesap yok, web'de `deviceId`/`groupId` yazılmaz.

## TypeScript tipi

```ts
type ProbeStatus = 'var' | 'yok' | 'kabul-edildi-etkisiz' | 'etkili' | 'hata' | 'atlandı';
type ProbeMeasure = number | string | boolean | null | ProbeMeasure[] | { [k: string]: ProbeMeasure };

interface ProbeTest {
  id: string;          // ör. "etki.iso", "native.manuel"
  ad: string;          // Türkçe ad
  durum: ProbeStatus;
  ayrıntı: string;     // Türkçe, tek satır
  ölçüm: ProbeMeasure; // sayılar / küçük sözlük
  süreMs: number;
}

interface ProbeCamera {
  kimlik: string;      // web: sıra no; native: Camera2 kimliği
  yön: 'arka' | 'ön' | 'harici' | 'bilinmiyor';
  etiket: string;
  fiziksel: boolean;   // native: mantıksal kameranın alt kamerası ya da listede olmayan kimlik
  özellikler: { [k: string]: ProbeMeasure };
}

interface ProbeReport {
  schema: 'probe/v1';
  meta: { zaman: string; kaynak: 'web' | 'native'; uygulamaSürümü: string; süreMs: number; notlar: string[] };
  device: {
    üretici: string | null; model: string | null; androidSürümü: string | null;
    ekran: { genişlikPx: number; yükseklikPx: number; dpr: number };
    çekirdek: number | null; ramGb: number | null; gpu: string | null;
    ek: { [k: string]: ProbeMeasure };
  };
  cameras: ProbeCamera[];
  sensors: { [k: string]: ProbeMeasure };
  perf: { [k: string]: ProbeMeasure };
  tests: ProbeTest[];
  summary: {
    sayım: Record<ProbeStatus, number>;
    matris: Record<MatrixKey, { durum: ProbeStatus; ayrıntı: string; kaynak: string | null }>;
  };
}
```

`MatrixKey`: `noktaPozlama`, `evTelafisi`, `manuelIsoPozlama`, `beyazDengesi`, `odak`, `zoom`, `torch`, `braket`, `still4k`, `ultraGenis`, `raw`. Her anahtarın hangi testlerden türediği `MATRIX_SOURCES`'ta; birden çok kaynak varsa en iyi durum (etkili > var > etkisiz > hata > yok > atlandı) gösterilir.

## Durumlar

| Durum | Anlamı |
|---|---|
| `var` | API/özellik mevcut ve çalıştı (ölçülebilir etki beklenmeyen testler) |
| `yok` | Tarayıcı/cihaz bu yeteneği bildirmiyor |
| `kabul-edildi-etkisiz` | İstek kabul edildi (hata yok) ama görüntüde eşiği ve 3× sahne gürültüsünü aşan fark ölçülmedi |
| `etkili` | Fark ölçüldü |
| `hata` | İstek ya da adım hata verdi (mesaj `ayrıntı`'da) |
| `atlandı` | Önceki adım (izin, kamera) olmadığı için çalışmadı |

Etki eşikleri (`EFFECT_MIN`, Kotlin'de aynı sabitler): parlaklık 8 (0–255), renk oranı (B/G, R/G) 0,06, göreli keskinlik 0,2, kare farkı 8.

## JSON örneği (kısaltılmış)

```json
{
  "schema": "probe/v1",
  "meta": { "zaman": "2026-10-08T10:00:00.000Z", "kaynak": "web", "uygulamaSürümü": "curate-probe-web 1.0.0", "süreMs": 64210, "notlar": ["Web üreticiyi okuyamaz (device.üretici null); model UA-CH ile gelir."] },
  "device": {
    "üretici": null, "model": "örnek-model", "androidSürümü": "14.0.0",
    "ekran": { "genişlikPx": 1080, "yükseklikPx": 2400, "dpr": 2.75 },
    "çekirdek": 8, "ramGb": 8, "gpu": "örnek GPU",
    "ek": { "webgl2": true }
  },
  "cameras": [
    { "kimlik": "0", "yön": "arka", "etiket": "camera2 0, facing back", "fiziksel": false, "özellikler": { "capabilities": { "zoom": { "min": 1, "max": 10 } } } }
  ],
  "sensors": { "deviceMotionHz": 60 },
  "perf": { "takePhotoMs": 820 },
  "tests": [
    { "id": "etki.exposureCompensation", "ad": "EV telafisi", "durum": "etkili", "ayrıntı": "parlaklık farkı 41.2 (eşik 8, gürültü 0.6)", "ölçüm": { "fark": 41.2 }, "süreMs": 2510 },
    { "id": "etki.iso", "ad": "Manuel ISO", "durum": "kabul-edildi-etkisiz", "ayrıntı": "parlaklık farkı 1.1 (eşik 8, gürültü 0.6)", "ölçüm": { "fark": 1.1 }, "süreMs": 2490 },
    { "id": "web.raw", "ad": "RAW / DNG", "durum": "yok", "ayrıntı": "tarayıcıda RAW/DNG yakalama API’si yok", "ölçüm": null, "süreMs": 0 }
  ],
  "summary": {
    "sayım": { "var": 0, "yok": 1, "kabul-edildi-etkisiz": 1, "etkili": 1, "hata": 0, "atlandı": 0 },
    "matris": {
      "noktaPozlama": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "evTelafisi": { "durum": "etkili", "ayrıntı": "parlaklık farkı 41.2 (eşik 8, gürültü 0.6)", "kaynak": "etki.exposureCompensation" },
      "manuelIsoPozlama": { "durum": "kabul-edildi-etkisiz", "ayrıntı": "parlaklık farkı 1.1 (eşik 8, gürültü 0.6)", "kaynak": "etki.iso" },
      "beyazDengesi": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "odak": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "zoom": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "torch": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "braket": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "still4k": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "ultraGenis": { "durum": "atlandı", "ayrıntı": "Bu kaynakta ölçülmedi", "kaynak": null },
      "raw": { "durum": "yok", "ayrıntı": "tarayıcıda RAW/DNG yakalama API’si yok", "kaynak": "web.raw" }
    }
  }
}
```

## Test kimlikleri

- **Web** (`lib/probe/run-web.ts`): `ortam.*` (UA-CH, WebGL, WebGPU, OffscreenCanvas, WebCodecs, WASM SIMD/threads, depolama, PWA, Wake Lock, Web Share, ImageCapture, MediaStreamTrackProcessor), `sensor.*`, `kamera.*` (izin, liste, ultraGenis), `cozunurluk.*` (4096×3072 … 1280×720, getPhotoCapabilities, takePhoto, takePhotoMax, grabFrame, still4k), `etki.*` (exposureCompensation, exposureTime, iso, colorTemperature, focusDistance, zoom, torch, pointsOfInterest), `perf.*` (onizlemeDonma, histogramDöngüsü, braket), `dolgu.*` (onKamera, isikSensoru), `web.raw`.
- **Native** (`probe-apk/src/run-native.ts` + Kotlin): `native.cihaz`, `native.kameraListesi`, `native.donanimSeviyesi`, `native.yetenek.manuelSensor`, `native.yetenek.raw`, `native.ultraGenis`, `native.zoom`, `native.torch`, `native.still4k`, `native.uzantilar`, `native.sensor.*`, `native.izin`, `native.oturum`, `native.otomatik`, `native.manuel`, `native.braket`, `native.braketBurst`, `native.noktaPozlama`, `native.beyazDengesi`, `native.odak`, `native.raw`, `native.ureticiKisiti`.
