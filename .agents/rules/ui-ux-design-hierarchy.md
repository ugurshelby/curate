---
name: ui-ux-design-hierarchy
description: Curate UI/UX ve frontend tasarım otorite sırası. UI, stil, hareket veya yerleşim içeren her işte, kod yazmadan önce okunur.
---

# Curate — UI/UX Otorite Sırası

Curate tek kişilik, mobil öncelikli (390×844) kişisel bir araçtır. Kimlik: OLED siyah + yükseltilmiş nötr yüzeyler + tek vurgu iOS mavisi. Bu dosya yalnız repoda gerçekten var olan kaynakları sıralar; ürün kararlarını değiştirmez (onlar `curate-spec-v1.md` ve `AGENTS.md`'de).

## 1. Öncelik sırası (çelişkide üstteki kazanır)
1. `AGENTS.md` (kapsam kilidi, UI kuralları özeti §5, doğrulama) ve `curate-spec-v1.md` (ürün niyeti).
2. `design/skills/apple-design/SKILL.md` **§1–17**: ilkeler (tepki, yay fiziği, kesintiye uğrayabilirlik, malzeme, tipografi, erişilebilirlik). Sahip kararı 2026-10-08 (D21).
3. `design/CURATE_DESIGN_SYSTEM.md` (CDS v3): bu ilkelerin üstüne kurulmuş Curate dili. Belirteç, yerleşim sözleşmesi (§6), bileşen ve durumlar için son söz. Apple'dan her sapma CDS'te gerekçe ve kontrast değeriyle yazılıdır.
4. `design/skills/animate/SKILL.md` (+ `RECIPES.md`): yeni hareket yazarken sıklık kapısı → amaç → araç → özellik → eğri/süre.
5. Yalnız denetim/planlama için: `design/skills/improve-animations/`, `design/skills/redesign-existing-projects/SKILL.md` (CDS'teki istisnalar geçerli: saf siyah zemin bilinçli kimliktir).

## 2. Curate'e ait OLMAYAN dosyalar
- `apple-design/SKILL.md` **§18** (Rosso): mor vurgu, başka proje. Kullanılmaz.
- `apple-design/DESIGN.md`, `theme.css`, `variables.css`, `tokens.json`: açık tema ve başka palet. Palet/bileşen ölçüsü olarak kullanılmaz; yalnız fikir: boyuta bağlı harf aralığı, gölge yerine ince çizgi, tek kromatik vurgu.

## 3. Repoda olmayan, anılmayacak yollar
`skills/minimalist-ui`, `skills/animation-vocabulary`, `skills/review-animations`, `skills/pick-ui-library`, `skills/find-animation-opportunities`, `design-references/`, `.agents/skills/apple-design` yoktur. Skill dosyalarındaki bu atıflar sahip onayıyla silindi (2026-10-08); yenisi görülürse yok sayılır. `motion`, `sonner`, `cmdk`, `base-ui` kurulu değildir; yeni bağımlılık yalnız sahip onayıyla.

## 4. Kod yazmadan önce
1. Yerleşime dokunuyorsan CDS §6: görsel header'ın, panelin veya filmstrip'in altında kalmaz (`stage.top ≥ header.bottom`, `stage.bottom ≤ bottomStack.top`); panel ≤ 40dvh, sahne ≥ 34dvh.
2. Hareket ekliyorsan önce `animate/SKILL.md` Adım 1 (sıklık kapısı); sık eylemde animasyon yok.
3. Etkileşimli öğe ≥ 44×44 px; okunan metin ≥ 12 px; arayüzde monospace yok; renk yalnız `app/globals.css` belirteçlerinden (canvas içeriği `lib/ui/colors.ts`); metin `lib/i18n/tr.ts`'ten.
4. Bitirince Prosedür 2 (360/390/430). Tarayıcı yoksa "doğrulanmadı".
