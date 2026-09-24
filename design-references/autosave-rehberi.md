# Autosave UX — 5 Sütun Sistemi

> **Kaynak:** Instagram ilham envanteri (2026-08-05) · **Öncelik:** Orta  
> **Pilot hedef:** `settings/profile-info` · `personal-info-editor.tsx`  
> **Katman:** Dashboard · Ayarlar

---

## Sorun

Her tuşta API veya yalnız "blur'da kaydet" — sunucu spam'ı, sessiz veri kaybı, belirsiz durum.

---

## 5 sütun

| # | Sütun | Kural |
|---|---|---|
| 1 | **Debounced write** | Son input'tan **800–1200ms** sonra tek payload |
| 2 | **Durum pill (FSM)** | `Değişiklik var` → `Kaydediliyor…` → `Kaydedildi` → `Çevrimdışı (bekliyor)` → `Hata` |
| 3 | **Offline kuyruk** | `fetch` hatası / `navigator.onLine === false` → IndexedDB/localStorage; bağlantı gelince FIFO flush |
| 4 | **Çoklu sekme** | `BroadcastChannel` ile dirty/saved senkron; last-write-wins yasak — çakışma modalı |
| 5 | **Çıkış koruması** | Dirty iken `beforeunload` + Next.js router guard |

**Kritik kural:** HTTP 200/201 gelmeden **"Kaydedildi" gösterilmez.**

---

## Rosso pilot: profil editörü

```
[ Display name input ]
[ Bio textarea        ]
[ ● Kaydediliyor…     ]  ← pill, sağ üst veya alan altı
```

- Debounce: 1000ms
- Başarı: toast değil pill → 2sn "Kaydedildi" → gizlenir
- Hata: pill kırmızı + alan altı açıklama
- Offline: web'de düşük öncelik; mobil v2'de `expo-secure-store` yanında taslak

---

## Kapsam dışı (şimdilik)

- Şifre / e-posta değişimi — explicit submit + modal
- Rosso playlist oluşturma/düzenleme kuyruk job'ları — autosave değil
- Sohbet taslağı — ayrı faz

---

## Hook tasarımı (gelecek kod)

```tsx
const { status, markDirty } = useAutosave({
  debounceMs: 1000,
  save: async (payload) => { ... },
  guardNavigation: true,
})
```

Durum: `idle | dirty | saving | saved | offline | error`

---

## Denetim

- [ ] Pill gerçek ağ yanıtını mı yansıtıyor?
- [ ] Dirty iken sayfa kapatmada uyarı var mı?
- [ ] Debounce her tuşta API atmıyor mu?
