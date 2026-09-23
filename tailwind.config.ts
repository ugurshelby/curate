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
          50: "#18181b",
          100: "#121215",
          200: "#0d0d10",
          DEFAULT: "#09090b",
        },
        accent: {
          DEFAULT: "#ffffff",
          subtle: "#e4e4e7",
          muted: "#71717a",
        },
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
        mono: ["SF Mono", "Menlo", "Monaco", "Courier New", "monospace"],
      },
      boxShadow: {
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.6)",
        "glass-sm": "inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 4px 16px rgba(0, 0, 0, 0.4)",
        "glass-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 24px rgba(255, 255, 255, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
        xl: "20px",
        "2xl": "32px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin 8s linear infinite",
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
      },
    },
  },
  plugins: [],
};

export default config;
