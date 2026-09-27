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
      colors: {
        background: "#000000",
        surface: {
          base: "#000000",
          elevated: "#0f0f11",
          overlay: "#18181b",
          subtle: "#27272a",
          border: "rgba(255, 255, 255, 0.08)",
          "border-hover": "rgba(255, 255, 255, 0.16)",
          "border-active": "rgba(245, 166, 35, 0.35)",
        },
        accent: {
          DEFAULT: "#f5f5f7",
          warm: "#f5f5f7",
          amber: "#f5a623",
          "amber-muted": "rgba(245, 166, 35, 0.12)",
        },
        content: {
          primary: "#f5f5f7",
          secondary: "#a1a1aa",
          muted: "#71717a",
          disabled: "#3f3f46",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "18px",
        sheet: "28px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        rim: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.5)",
        "glow-amber": "0 0 20px rgba(245, 166, 35, 0.25)",
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
