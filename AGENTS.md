# Curate Studio — Agent Standartları ve UI/UX Otorite Hiyerarşisi

Bu repo'da çalışan tüm yapay zeka ajanları (Antigravity agents), herhangi bir UI/UX, animasyon veya frontend işine başlamadan önce aşağıdaki otorite hiyerarşisini incelemek ve tavizsiz uygulamakla yükümlüdür.

## Otorite Hiyerarşisi (Zorunlu Sıralama)

1. **Temel Otorite (Primary Authority):** [`skills/apple-design`](skills/apple-design/SKILL.md)
   - WWDC Designing Fluid Interfaces prensipleri: Kesintiye uğratılabilirlik (Interruptibility), 1:1 doğrudan dokunmatik takip, fırlatma momentum projeksiyonu, yay fiziği (critically damped `damping 1.0`, `response 0.3–0.4`), yarı saydam malzemeler (`backdrop-filter: blur()`), optik tipografi, sıfır gecikme (pointerdown geri bildirimi).
2. **Kullanıcı Ergonomisi & Kolay Arayüz:** [`skills/minimalist-ui`](skills/minimalist-ui/SKILL.md)
   - Premium Utilitarian Minimalism: Zahmetsiz tek tık ergonomisi, slider karmaşasını kaldırma, katmanlı ifşa (progressive disclosure), OLED stüdyo kontrastı, sessiz editoryal zarafet.
3. **Animasyon ve Hareket Zanaatı:**
   - [`skills/animate`](skills/animate/SKILL.md): Katı inşa dizisi, transform & opacity GPU animasyonları, asla `scale(0)` yok, UI süreleri <300ms, güçlü cubic-bezier (`cubic-bezier(0.23, 1, 0.32, 1)`).
   - [`skills/animation-vocabulary`](skills/animation-vocabulary/SKILL.md): Terminoloji (pop-in, stagger, rubber-banding, origin-aware).
   - [`skills/review-animations`](skills/review-animations/SKILL.md): Emil Kowalski zanaat çıtası; tavizsiz standartlar, eskalasyon tetikleyicileri.
4. **UI Kütüphanesi Seçimi:** [`skills/pick-ui-library`](skills/pick-ui-library/SKILL.md)
   - Bileşen ihtiyaçlarında standart kütüphaneler (`base-ui`, `motion`, `sonner`, `cmdk`, `number-flow`).
5. **Proje Tasarım Referansları (`design-references/`):**
   - `premium-design-philosophy.md`, `dark-mode-first.md`, `glassmorphism.md`, `liquid-glass-visual-identity-guidelines.md`, `60-30-10-renk-kurali.md`, `ux-laws-reference.md`, `touch-hover-capability.md`, `loading-states-process-feedback.md`, `autosave-rehberi.md`, `bento-grid.md`.

## Frontend Direktifleri Kuralı
Plan veya spec dökümanlarında (örn. `curate-preset-spec.md`) yer alan temel kullanıcı tercihleri (hangi presetler, hangi değerler, hangi mantık) birebir korunur; frontend tasarım, animasyon ve arayüz direktifleri ise yukarıdaki Apple Design hiyerarşisi temel alınarak üstün bir zanaatla uygulanır.
