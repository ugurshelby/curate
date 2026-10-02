---
name: ui-ux-design-hierarchy
description: Curate Studio UI/UX ve frontend tasarım otorite sırası. UI, stil, hareket veya yerleşim içeren her işte, kod yazmadan önce okunur.
---

# Curate Studio — UI/UX Otorite Sırası

Curate tek kişilik, **mobil öncelikli** (390×844) kişisel bir araçtır. Kimlik: OLED siyah + amber vurgu. Bu dosya yalnızca **repoda gerçekten var olan** kaynakları sıralar. Ürün kararlarını (özellik, öncelik) değiştirmez; onlar `curate-spec-v1.md` ve `AGENTS.md`'dedir.

## 1. Öncelik sırası (çelişkide üstteki kazanır)

1. `AGENTS.md` (kapsam kilidi, doğrulama kuralı) ve `curate-spec-v1.md` (ürün niyeti).
2. `design/CURATE_DESIGN_SYSTEM.md` — token'lar, mobil yerleşim sözleşmesi (§6), hareket, malzeme. **Renk, yarıçap ve yerleşim için son söz.**
3. `design/skills/apple-design/SKILL.md` **§1–17** — davranış ve hareket fiziği (tepki, yay, kesintiye uğrayabilirlik, momentum, malzeme, tipografi, ilkeler). CDS'nin sustuğu yerde geçerlidir.
4. `design/skills/animate/SKILL.md` (+ `RECIPES.md`) — yeni hareket yazarken: sıklık kapısı → amaç → araç → özellik → easing/süre.
5. Yalnız denetim/planlama için, sahip isterse:
   - `design/skills/improve-animations/` (okur, plan yazar, kodu değiştirmez).
   - `design/skills/redesign-existing-projects/SKILL.md` (denetim merceği; CDS §10'daki istisnalar geçerli: saf siyah ve Inter kuralı Curate için uygulanmaz).

## 2. Curate'e ait OLMAYAN dosyalar

- `design/skills/apple-design/SKILL.md` **§18** (Rosso marka bölümü) — Rosso'ya özeldir, mor vurgu tanımlar. Kullanılmaz.
- `design/skills/apple-design/DESIGN.md`, `theme.css`, `variables.css`, `tokens.json` — açık tema, Apple Blue, Frost/Carbon paleti, 980px hap buton. Palet ve bileşen ölçüsü olarak kullanılmaz. Yalnız fikir olarak: boyuta bağlı tracking, gölge yerine hairline, tek kromatik vurgu.

## 3. Repoda olmayan, anılmayacak yollar

`skills/minimalist-ui`, `skills/animation-vocabulary`, `skills/review-animations`, `skills/pick-ui-library`, `skills/find-animation-opportunities`, `design-references/`, `.agents/skills/apple-design` — **yoktur**. Başka bir dosya bunlara atıf yapıyorsa (ör. `animate` skill'i) yok sayılır. `base-ui`, `motion`, `sonner`, `cmdk`, `number-flow` paketleri kurulu değildir; yeni bağımlılık yalnız sahip onayıyla, pikseli cihazdan çıkarmayan paketlerle eklenir.

## 4. Kod yazmadan önce zorunlu adımlar

1. Değişiklik düzen/panel/stage'e dokunuyorsa `design/CURATE_DESIGN_SYSTEM.md` §6'yı oku ve şu ölçülebilir kuralı koru: **görsel header'ın, panelin ya da filmstrip'in altında/arkasında kalmaz** (`stage.top ≥ header.bottom`, `stage.bottom ≤ bottomStack.top`).
2. Hareket ekliyorsan önce `animate/SKILL.md` Adım 1 (sıklık kapısı). Sık yapılan eylemde animasyon yazma.
3. Etkileşimli her öğe ≥ 44×44px; hiçbir okunan metin 11px altında değil; yeni renk ekleme (tek vurgu: amber).
4. Bitirince 390×844'te ölçüm yap (CDS §6.5). Tarayıcı yoksa "doğrulanmadı" yaz; koddan çıkarım yapma (AGENTS.md §2).

## 5. Ürün tercihleri

Hangi preset'lerin, hangi değerlerin, hangi akışın olacağı spec'teki gibi korunur. Bu dosya yalnızca arayüzün **nasıl** yapılacağını yönetir; basit, jenerik bir MVP değil, ama kapsam kilidinin (AGENTS.md §3) dışına da çıkılmaz.
