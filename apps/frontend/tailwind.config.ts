import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Japanese Traditional Design System ─────────────────────────
        background: "#161514",     // Sumi Black / Charcoal
        surface:    "#1f1d1c",     // Warm Dark Ash
        "surface-2": "#2a2725",    // Lighter Charcoal
        border:     "#3a3532",     // Warm Stone Border

        primary:    "#e83929",     // Shu-iro (Vermilion Red)
        "primary-hover": "#f05a4f",
        "primary-glow": "rgba(232,57,41,0.35)",

        accent:     "#f2a900",     // Yamabuki (Gold)
        "accent-hover": "#ffc107",
        "accent-glow": "rgba(242,169,0,0.3)",

        success:    "#2d7a47",     // Matcha / Bamboo Green
        warning:    "#e67e22",     // Mikan / Orange
        danger:     "#c0392b",     // Tsubaki / Camellia Red

        // ── League Palette ───────────────────────────────────
        bronze:     "#cd7f32",
        silver:     "#c0c0c0",
        gold:       "#ffd700",
        platinum:   "#e5e4e2",
        diamond:    "#b9f2ff",

        // ── Text Scale ───────────────────────────────────────
        "text-primary":   "#faf9f6",   // Washi paper white
        "text-secondary": "#b3aba2",   // Golden sand grey
        "text-muted":     "#736c64",   // Stone grey
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        glow:        "0 0 20px rgba(232,57,41,0.4)",
        "glow-sm":   "0 0 10px rgba(232,57,41,0.3)",
        "glow-accent": "0 0 20px rgba(242,169,0,0.4)",
        glass:       "0 8px 32px rgba(0,0,8,0.5)",
      },
      backgroundImage: {
        "space-gradient":
          "radial-gradient(ellipse at top, #3c1e1e 0%, #161514 60%)",
        "primary-gradient":
          "linear-gradient(135deg, #e83929 0%, #b82216 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #f2a900 0%, #c48200 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(31,29,28,0.9) 0%, rgba(42,39,37,0.6) 100%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float":      "float 3s ease-in-out infinite",
        "slide-in":   "slideIn 0.3s ease-out",
        "fade-in":    "fadeIn 0.4s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(232,57,41,0.3)" },
          "50%":      { boxShadow: "0 0 25px rgba(232,57,41,0.7)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
