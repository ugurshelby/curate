# Proje Haritası (INDEX)

Önce buraya bak. Kod değişince bu harita aynı commit'te güncellenir.
Son doğrulama: 2026-10-08

## Belgeler
| Dosya | Ne için |
|---|---|
| `AGENTS.md` | Ajan anayasası (İngilizce): yetki sırası, kırmızı çizgiler, kapsam kilidi, UI kuralları özeti |
| `curate-spec-v1.md` | Sahibin ürün niyeti ve kararları (§4.4, §4.5), açık sorular (§10) |
| `README.md` | Kısa ürün tanıtımı ve komutlar |
| `docs/STATE.md` | Tek durum dosyası: faz, sıradaki adım, sahibe sorular |
| `docs/ROADMAP.md` | Fazlar ve sıra |
| `docs/PRODUCT.md` | Vizyon, hedef kullanıcı, modüller, kapsam |
| `docs/ARCHITECTURE.md` | Render hattı, worker, depolama, PWA, AI proxy, yayın |
| `docs/DECISIONS.md` | Karar kayıtları |
| `docs/PHOTO-KNOWLEDGE.md` | Fotoğrafçılık bilgi tabanı (kaynaklı), preset kalibrasyonu, Otomatik kuralları |
| `docs/procedures.md` | Prosedürler 1–8 ve ortak protokol |
| `docs/reference/curate-reference.md` | Kanonik canlı referans: ölçülmüş durum, güvenlik, kapılar |
| `docs/reports/` | Faz raporları (30 günden eskisi özetlenip silinir) |
| `docs/probe/README.md`, `docs/probe/SCHEMA.md` | Geçici yoklama (Faz Y): ne ölçer, nasıl çalışır, `probe/v1` şeması, silme koşulu |
| `design/CURATE_DESIGN_SYSTEM.md` | Curate tasarım dili (CDS) |
| `design/tokens.curate.json` | Belirteçlerin JSON kopyası (kaynak `app/globals.css`) |
| `design/skills/` | Sahibin eklediği tasarım skill'leri (apple-design, animate, improve-animations, redesign-existing-projects) |
| `.agents/rules/ui-ux-design-hierarchy.md` | UI işinde okunacak kaynakların sırası |
| `logs/YYYY-MM-DD.md` | Oturum günlükleri (yalnız ölçülmüş olgu; 15 gün) |

## Kod
| Yol | Ne yapar |
|---|---|
| `app/page.tsx` | Ana sayfa (hub): tek "Fotoğraf ekle" yüzeyi, modül kartları, güven rozeti; modül geçişi (View Transitions) |
| `app/layout.tsx` | Kök düzen, metadata, viewport, `lang="tr"` |
| `app/globals.css` | Renk ve yarıçap belirteçleri (tek kaynak), yardımcı sınıflar |
| `app/api/ai/route.ts` | Tek sunucu rotası: AI proxy (GET/PUT/POST/DELETE) |
| `components/studio/StudioShell.tsx` | Ortak modül iskeleti: header / sahne / alt yığın |
| `components/studio/CarouselStudio.tsx` | Carousel modülü |
| `components/studio/StoryStudio.tsx` | Story modülü |
| `components/studio/FrameStudio.tsx` | Çerçeve modülü (boyut çipleri, 4K) |
| `components/studio/UpscaleStudio.tsx` | Büyüt modülü |
| `components/studio/EditStudio.tsx` | Düzenle modülü (Preset, Kırp, Düzeltme; AI ile onar) |
| `components/studio/AiRepairSheet.tsx`, `AiReviewScreen.tsx` | AI görev sayfası (PIN adımı dahil) ve önce/sonra kontrol sayfası |
| `components/studio/AiPresetSheet.tsx` | AI Preset stil sayfası (D28) |
| `components/studio/QuickExportSheet.tsx` | Export sayfası |
| `components/studio/PresetStrip.tsx` | Yatay preset kartları (Carousel + Düzenle) |
| `components/studio/Filmstrip.tsx` | Filmstrip ve sürükleyerek sıralama |
| `components/studio/AddMenu.tsx`, `ReferencePicker.tsx` | "+" menüsü ve referans görsel seçici |
| `components/studio/usePanPinch.ts` | Ortak sürükle/yakınlaştır jesti (Story, Düzenle Kırp) |
| `components/studio/Switch.tsx` | Aç/kapa anahtarı (44 px) |
| `components/studio/DeviceSync.tsx` | Cihaz eşitleyicisini başlatır (layout); `useDeviceStorage` ana sayfa anahtarı için |
| `components/studio/NoticeToast.tsx`, `PerfHud.tsx`, `ResettableSlider.tsx`, `InstagramOverlay.tsx`, `TikTokOverlay.tsx` | Bildirim, `?perf=1` ölçüm, kaydırıcı, platform katmanları |
| `lib/index.ts` | Ortak dışa aktarım |
| `lib/core/` | `types`, `state-machine` (store), `use-studio`, `worker-bridge`, `reference-images`, `prefs` (localStorage tercihler), `library-cache` (IndexedDB fotoğraf hafızası), `device-sync` (store ↔ cihaz eşitleyici) |
| `lib/engine/` | `carousel-render` (önizleme=export), `corrections` (Düzeltme: 6 satır + Otomatik, parçalı), `presets` (kütüphane v2, 16 preset), `scene` (Akıllı Otomatik), `frame-render` (Çerçeve, önizleme=export), `ai-plan` (AI Preset planı: doğrulayıcı, maskeler, uygulama), `harmonize`, `edit-geometry`, `story-layout`, `upscale-lanczos`, `upscale-slider`, `adaptive-gradient`, `proxy` |
| `lib/export/` | `platform-specs` (hedefler ve Çerçeve boyutları `FRAME_SIZES` veri olarak), `export-plan` (kalite basamağı, dosya adı), `exif-sanitizer`, `zip-packager` |
| `middleware.ts`, `lib/access/` | Tüm uygulama PIN kapısı (D27): `session` (imza, karar, Edge+Node), `client` (kilit ekranı isteği); ekran `app/kilit/page.tsx` |
| `lib/ai/` | `config` (model/istem/₺ tek yer), `server`, `quota`, `client`, `diff-check` |
| `app/probe/`, `lib/probe/` | Geçici donanım yoklaması `/probe` (Faz Y): `schema` (probe/v1, karar ve özet), `frame-stats`, `run-web` (7 adım), `export`; metin `lib/i18n/tr.ts` → `trProbe` |
| `probe-apk/` | Ayrı Expo paketi "Curate Probe" (Faz Y): `App.tsx`, `src/run-native.ts`, `src/probe-schema.ts` (web kopyası), yerel Kotlin modülü `modules/curate-probe`; kök kapıların dışında |
| `lib/ui/colors.ts` | Export/canvas içerik renkleri ve tarih damgası yazı tipi (arayüz paleti değil) |
| `lib/i18n/tr.ts` | Tüm arayüz metni (Türkçe); jargon yalnız `gelismis` altında |
| `lib/workers/image-processor.worker.ts` | Worker (Büyüt export'u) |
| `public/` | `manifest.json`, `icon.svg`, PNG simgeler (`icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`), `reference-images/` (13 görsel) |
| `tests/` | Vitest testleri (parite, export planı, geometri, AI sunucu/istemci, renk belirteçleri, `ui-rules` tasarım kuralları, `access` kapı, sağlamlık…) |
| `scripts/` | `audit-ui.mjs` (Prosedür 2), `capture-screens.mjs` (390 ekran görüntüsü), `check-bundle-secrets.mjs`, `make-icons.mjs` (PWA simgeleri), `probe-fake-camera.mjs` (yoklama akışı, sahte kamera), `lib/unlock.mjs` (denetimde kapıyı test PIN'iyle açar) |

## Komutlar
| Komut | Ne |
|---|---|
| `npm ci` | Bağımlılıklar |
| `npm run dev` | Geliştirme sunucusu |
| `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build` | Kalite kapıları |
| `npm run check:secrets` | Build sonrası sır taraması (0 bulgu şart) |
| `VERTEX_API_KEY=<test> CURATE_AI_PASSWORD=<test 4 hane> npx next start -p 3101` + `AUDIT_PIN=<test 4 hane> CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/audit-ui.mjs` | Prosedür 2 (bulut kapsayıcıda yol; gerçek PIN asla) |
| `AUDIT_PIN=<test 4 hane> node scripts/capture-screens.mjs <etiket>` | `screenshots/<etiket>/` (git izlemez) |
