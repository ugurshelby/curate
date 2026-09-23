# Web Application Design System (v1.0)

## 1. Web UX Principles

### Information Density & Cognitive Load

- DO break complex tasks into smaller, sequential steps to decrease cognitive load.
- DO minimize decision time by reducing choices when response times are critical (Hick's Law).
- DO use progressive onboarding to introduce complex features gradually rather than dropping users into fully-featured dashboards at once.
- DON'T overwhelm users with overly busy interfaces; explicitly highlight recommended options or primary paths.

### Mouse & Keyboard-First Interaction

- DO utilize screen edges for infinite targets, as mouse cursors are automatically stopped at the edge, allowing for rapid targeting without overshooting (e.g., top-edge navigation bars or bottom-edge taskbars).
- DO implement command palettes to support keyboard-first navigation for power users seeking to bypass deep menus.

### Navigation Hierarchy

- DO align navigation patterns with your information architecture. Use Sidebar Navigation for feature-rich SaaS apps requiring frequent context switching.
- DO utilize Mega Menus for web apps with large content libraries or complex category hierarchies to reveal relationships without deep clicks.

## 2. Layout System (Web Specific)

### 12-Column Grid & Breakpoints

- DO default to a 12-column grid system for desktop interfaces. This allows flexible subdivisions into 1, 2, 3, 4, or 6 columns.
- DO use CSS Flexbox and CSS Grid to manage fluid responsiveness across breakpoints without relying strictly on rigid media queries.

### Container Width Constraints

- DO limit the maximum width of the main content container to 1200px–1440px on large desktop monitors. Centered content on ultra-wide screens (1920px) without a max-width creates disconnected layouts and unreadable line lengths.
- DON'T force users to scan edge-to-edge on large desktop viewports.

### Spacing System

- DO establish an 8pt baseline grid for all vertical and horizontal spacing. Use a strict scale of multiples: 4, 8, 16, 24, 32, 40, 48, 64.
- DO use the Gestalt principle of proximity: apply smaller spacing values (e.g., 4px-8px) for closely related elements, and larger values (e.g., 48px) to separate distinct sections on desktop screens.

## 3. Typography System (Web)

### Reading Comfort & Line Length

- DO optimize line length to 50–75 characters per line for body text. Use max-width: 66ch in CSS as the optimal target to reduce eye strain and tracking fatigue on wide screens.
- DO set line heights to 1.5–1.7 for readable body text.
- DO tighten line heights for large headings (1.1–1.3) to keep title blocks compact.

### Scalable Hierarchy

- DO use a consistent modular scale (e.g., a 1.25 Major Third ratio) to generate proportional heading sizes mathematically.
- DO limit your font palette to maximum two families: one for functional UI/body text and an optional contrasting font for display/marketing headers.
- DO consider utilizing the system font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI') for dashboards to ensure zero loading time and native OS familiarity.

## 4. Color System

### Semantic Colors & Accessibility

- DO separate functional semantic colors from brand colors. Universally rely on Green for success, Yellow/Orange for warnings, Red for errors/destructive actions, and Blue for informational alerts.
- DO ensure all normal text maintains a strict WCAG minimum contrast ratio of 4.5:1 against its background. Large text (18pt regular or 14pt bold) requires a 3:1 ratio.
- DO maintain a 3:1 contrast ratio for non-text UI components (e.g., input borders, icons) and state changes against adjacent colors.

### Dark Mode Strategy

- DO build dark mode backgrounds using deep chromatic neutrals (e.g., #0f0f0f to #1a1a1a). Pure black (#000000) causes harsh halation against light text.
- DO adjust accent colors for dark mode by shifting lightness upward and saturation downward. Reusing bright light-mode accents on dark backgrounds causes visual vibration.
- DO implement theming using semantic design tokens (e.g., --color-surface-base, --color-text-primary) rather than hardcoding hex values.

## 5. UI Components (Web Standard)

### Forms & Inputs

- DO place error messages immediately next to the fields causing them, utilizing both color and iconography for scannability.
- DO use inline validation, but only after the user completes inputting data into the field.
- DON'T use tooltips to report critical form errors, as alert icons are easily missed and users may not realize they need to hover.

### Tables vs. Cards

- DO use lists or data tables for homogenous data that users need to sort, scan, or compare (e.g., analytics, user directories).
- DO use cards exclusively for heterogeneous content or browsing scenarios. A card must represent exactly one concept with one primary action.
- DO keep summary text inside cards under 100 characters.

### Dashboard Components

- DO group complex, related datasets using Tabs to prevent users from navigating to entirely new pages, retaining context.
- DO keep stat cards simple: display the metric, a label, and a trend indicator. If a stat card requires a tooltip to be understood, it has failed.

## 6. Interaction Design

### Hover & Focus States

- DO provide hover states using low-emphasis animated fades (e.g., overlay opacities at 4%-12%) to acknowledge interactivity without distracting from content.
- DO design high-visibility Focus states for keyboard navigation. Do not rely on default browser outlines if they fail to meet the 3:1 contrast requirement against your app's background.

### Loading & System Status

- DO use skeleton screens populated with content placeholders for full-page loads under 10 seconds. This builds the user's mental model of the layout instantly.
- DO use explicit progress bars for system processes taking longer than 10 seconds.
- DO use spinners or wait animations strictly for localized modules or buttons, not full-page loads.

## 7. Web UX Anti-Patterns (What NOT To Do)

- DON'T rely on hover for critical tasks: Do not bury crucial actions or error descriptions entirely behind hover states. Keyboard users and touch-screen devices will be blocked.
- DON'T use "Frame-Display" skeleton screens: Never show a blank screen with just a header and footer while loading. This looks like a broken app; always mimic the content structure.
- DON'T hide primary navigation on desktop: Do not force desktop users to open a Hamburger menu for primary navigation when there is plenty of horizontal screen real estate.
- DON'T use color as the sole visual cue: Never communicate a success, warning, or error state with color alone. Always pair it with text, an icon, or a border pattern for accessibility.
- DON'T create jagged grids: Do not allow varying title lengths or text excerpts to break card heights. Truncate text systematically or enforce fixed aspect ratios to maintain a clean layout.
