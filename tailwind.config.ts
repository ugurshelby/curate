import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Renkler yalnız app/globals.css'teki belirteçlerden gelir (tek kaynak); burada değer yok.
      colors: {
        base: "rgb(var(--base) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
        },
        separator: "rgb(var(--separator) / <alpha-value>)",
        ink: {
          1: "rgb(var(--ink-1) / <alpha-value>)",
          2: "rgb(var(--ink-2) / <alpha-value>)",
          3: "rgb(var(--ink-3) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          fill: "rgb(var(--accent-fill) / <alpha-value>)",
        },
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        disabled: {
          DEFAULT: "rgb(var(--disabled-surface) / <alpha-value>)",
          ink: "rgb(var(--disabled-ink) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "18px",
        sheet: "28px",
      },
      // Yazı yığını app/globals.css --font-sans'ta (CDS §2). Arayüzde monospace yok: mono ailesi tanımlı değil.
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      // Tip ölçeği (CDS §2): boyut, satır yüksekliği, harf aralığı birlikte; en küçük 12px
      fontSize: {
        display: ["28px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        title: ["20px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        headline: ["17px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.45", letterSpacing: "-0.005em" }],
        subhead: ["14px", { lineHeight: "1.4" }],
        footnote: ["13px", { lineHeight: "1.4" }],
        caption: ["12px", { lineHeight: "1.35", letterSpacing: "0.01em", fontWeight: "500" }],
      },
      boxShadow: {
        glass: "inset 0 1px 0 rgb(var(--ink-1) / 0.12), 0 8px 32px rgb(var(--base) / 0.5)",
      },
      backdropBlur: {
        xs: "2px",
        xl: "20px",
        "2xl": "32px",
      },
      transitionTimingFunction: {
        "ios-spring": "cubic-bezier(0.32, 0.72, 0, 1)",
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        sheet: "380ms",
      },
      animation: {
        "fade-in": "fadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "sheet-slide-up": "sheetSlideUp 380ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sheetSlideUp: {
          "0%": { transform: "translate3d(0, 100%, 0)" },
          "100%": { transform: "translate3d(0, 0, 0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
