# Universal Mobile Design System (v1.0)

## 1. Mobile UX Principles

### Touch-First Interaction & Ergonomics

- DO place primary calls to action (CTAs) in the bottom third of the screen, matching the thumb's natural resting zone.
- DO minimize the distance the user's thumb must travel between sequential controls, such as placing the "Submit" button immediately next to the last form field.
- DON'T place primary actions in the top-right corner of the screen, as this forces the user to awkwardly stretch their thumb.
- DO utilize screen edges for infinite targets, as users can quickly swipe without the danger of overshooting.

### Cognitive Load Minimization

- DO minimize choices when response times are critical to decrease decision time.
- DO use progressive onboarding to hide advanced features initially, introducing them only after the user grasps the core interactions.
- DON'T overwhelm users with multiple dense options; break complex tasks into smaller, sequential steps.

## 2. Layout System (Mobile Specific)

### Mobile Grid Constraints

- DO use a 4-column layout grid for standard mobile viewports (e.g., 375px width).
- DO set layout margins to 16px and column gutters to 16px to ensure content does not touch the screen edges.
- DON'T copy desktop 12-column grids onto mobile screens; the columns become too narrow (around 19px) and destroy hierarchy.

### Spacing & Stacking

- DO strictly adhere to an 8pt baseline grid for all vertical spacing, ensuring all heights and line heights are multiples of 8.
- DO use an approved 8pt scale for margins and padding: 8px, 16px, 24px, 32px, 40px, 48px, 64px.
- DO utilize a 4px increment scale strictly for micro-spacing, such as the distance between an icon and its text label.
- DON'T ignore OS safe areas; prevent clipping by reserving 59px at the top (status bar/notch) and 34px at the bottom (home indicator) on modern iOS devices.

## 3. Typography System (Mobile)

### Scale & Sizing

- DO establish a base body text size of at least 16px (17pt on iOS) for optimal readability.
- DO limit your font hierarchy to 3 primary sizes (Small, Medium, Large) and rely on font weight or color opacity to create hierarchy when space is constrained.
- DON'T use type smaller than 14px for any standard body or label text, and never drop below 11pt for captions.

### Reading Comfort

- DO limit mobile line lengths to 30–50 characters per line.
- DO set line heights to 1.3–1.5 for mobile body copy.
- DO tighten line heights for headings (1.1–1.3) to keep blocks compact.
- DON'T use pure black text (#000000) on a pure white background; soften text contrast slightly to prevent eye strain.

## 4. Color System

### Contrast & Accessibility (WCAG 2.1)

- DO ensure all text maintains a minimum contrast ratio of 4.5:1 against its background (3:1 for large text over 18pt).
- DO ensure UI components and graphical objects maintain a minimum 3:1 contrast ratio against adjacent colors.
- DON'T use color as the sole visual means of conveying information, indicating an action, or prompting a response.

### Dark Mode Ergonomics

- DO use deep chromatic neutrals (e.g., #0f0f0f to #1a1a1a) for dark mode backgrounds rather than pure black (#000000) to prevent harsh halation against light text.
- DO desaturate and lighten accent colors in dark mode (e.g., shift a bright blue to a lighter, muted blue) to prevent visual vibration and aggressive contrast.
- DO define text tiers: near-white (#f5f5f5) for primary text, medium gray (#a3a3a3) for secondary text, and dark gray (#6b6b6b) for disabled elements.

### Semantic Colors

- DO utilize universally understood semantic colors: Green for success/completion, Red for danger/errors, and Yellow/Orange for warnings.

## 5. Mobile UI Components

### Navigation

- DO use a Bottom Navigation Bar for primary app destinations, keeping core features within thumb reach.
- DO use a Hamburger Menu (off-canvas navigation) exclusively for secondary, non-critical links to save screen space.
- DON'T hide primary navigation inside a hamburger menu if your app has only a few core sections.

### Navigation Patterns — the 8 mobile menu layouts

Reference catalogue (added 2026-07-20). Each row states what the pattern is,
and **where it fits in Rosso** — the second column is the binding part.

| Pattern | What it is | Rosso'da yeri |
|---|---|---|
| **Tab Bar** | Bottom-fixed bar, 3–5 primary destinations | ✅ **Ana navigasyon.** Ana Sayfa · Keşif · Recap · Zevkin · Mesajlar. Thumb-reach kuralı gereği birincil yol budur. |
| **Sheet** | Bottom sheet, slides up as modal | ✅ **İkincil eylemler.** Filtre, paylaş, "…" menüsü. Yeni sayfaya gitmeden bağlam koruyan iş. |
| **Three Dots** | Overflow menu, top-right of card/header | ✅ **Kart içi eylemler.** Şarkı/çalma listesi kartlarında; ikiden fazla eylem varsa şart (bkz. Cards anti-pattern). |
| **Side Menu (Drawer)** | Off-canvas, slides from edge | ⚠ **Yalnız ikincil linkler.** Ayarlar, yardım, çıkış. Birincil bölüm ASLA buraya gizlenmez. |
| **FAB** | Floating button, expands to sub-actions | ⚠ **Tek baskın eylem varsa.** Rosso'da bugün yok; "çalma listesi oluştur" gibi tek net eylem doğarsa değerlendirilir. |
| **Grid** | Icon grid, equal boxes | 🚫 Uygulama menüsü olarak **kullanma** — 3 eşit kart yasağı (design-system). İçerik ızgarası (albüm kapakları) ayrı konudur, o serbest. |
| **Rectangular** | Vertical strip/block menu on an edge | 🚫 Mobilde **kullanma.** Masaüstü sidebar'ın mobile zorlanmış hâli; thumb-reach'i bozar. |
| **Rudder** | Center-emphasised "+" in the tab bar | 🚫 **Kullanma.** Instagram/TikTok imzası — Rosso "içerik üretme" değil "hatırlama" ürünü; merkezî artı yanlış vaat verir. |

- DO pick exactly ONE primary pattern (Tab Bar) and treat the rest as secondary.
- DO keep the Tab Bar to 5 items max; a 6th item means the information
  architecture is wrong, not that the bar needs to grow.
- DON'T stack patterns that compete for the same job (Tab Bar + Rudder,
  or Drawer + Tab Bar both holding primary destinations).

### Inputs & Forms

- DO format data automatically (e.g., phone numbers or dates) so users do not have to guess formatting requirements.
- DO use inline validation that provides immediate feedback, but only after the user completes the field.
- DON'T use tooltips to report form errors, as hover states are not possible on mobile and the alert icons are too easily missed.

### Cards

- DO constrain cards to represent exactly one concept with one primary action.
- DO limit summary text inside cards to under 100 characters (max two short sentences).
- DON'T use card layouts to display homogenous data that requires sorting or comparison; use lists or tables instead.

### States (Loading, Empty, Error)

- DO use animated skeleton screens that mimic the final page layout for full-page loads under 10 seconds.
- DO use explicit progress bars (not spinners) if a system process takes longer than 10 seconds.
- DO fade disabled elements to 38% opacity and remove their elevation.

## 6. Interaction Design

### Tap Targets

- DO ensure all interactive elements maintain a minimum touch target size of 44x44px to prevent tap errors.
- DO provide adequate padding between distinct targets to prevent accidental overshooting.

### Feedback Systems

- DO provide immediate, high-emphasis visual feedback (such as a ripple or overlay) when a user presses an interactive component.
- DO use subtle haptic feedback for destructive actions or success confirmations.
- DO dismiss hover-style overlays using low-emphasis animated fades to acknowledge state changes naturally.

## 7. Mobile UX Anti-Patterns (What NOT To Do)

- DON'T rely on hover interactions. Hover states do not exist on touch devices. Do not hide critical actions, labels, or error messages behind a hover interaction.
- DON'T use "Frame-Display" skeleton screens. Do not show a blank screen with just a header and footer while loading. Always use content placeholders so the user understands the layout structure.
- DON'T scatter actions inside cards. Do not place interactive icons randomly in all four corners of a card. Group secondary actions predictably at the bottom and use an overflow menu if more than two actions are needed.
- DON'T use "Sneaking" or deceptive patterns. Do not use trickery to make users opt into actions they did not intend, and do not make destructive actions visually identical to primary actions.
- DON'T mix multiple variations of contrast. Keep designs limited to 3 contrast variations; if everything is contrasted, nothing stands out.
