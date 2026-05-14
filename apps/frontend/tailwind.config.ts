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
        // ── Deep Space Design System ─────────────────────────
        background: "#0a0a1a",
        surface:    "#0f0f2a",
        "surface-2": "#14143a",
        border:     "#1e1e4a",

        primary:    "#6d28d9",   // violet
        "primary-hover": "#7c3aed",
        "primary-glow": "rgba(109,40,217,0.35)",

        accent:     "#f59e0b",   // amber/gold — coins
        "accent-hover": "#fbbf24",
        "accent-glow": "rgba(245,158,11,0.3)",

        success:    "#10b981",
        warning:    "#f59e0b",
        danger:     "#ef4444",

        // ── League Palette ───────────────────────────────────
        bronze:     "#cd7f32",
        silver:     "#c0c0c0",
        gold:       "#ffd700",
        platinum:   "#e5e4e2",
        diamond:    "#b9f2ff",

        // ── Text Scale ───────────────────────────────────────
        "text-primary":   "#f0f0ff",
        "text-secondary": "#a0a0c0",
        "text-muted":     "#5a5a8a",
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
        glow:        "0 0 20px rgba(109,40,217,0.4)",
        "glow-sm":   "0 0 10px rgba(109,40,217,0.3)",
        "glow-accent": "0 0 20px rgba(245,158,11,0.4)",
        glass:       "0 8px 32px rgba(0,0,8,0.5)",
      },
      backgroundImage: {
        "space-gradient":
          "radial-gradient(ellipse at top, #1a0a3a 0%, #0a0a1a 60%)",
        "primary-gradient":
          "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(15,15,42,0.9) 0%, rgba(20,20,58,0.6) 100%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float":      "float 3s ease-in-out infinite",
        "slide-in":   "slideIn 0.3s ease-out",
        "fade-in":    "fadeIn 0.4s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(109,40,217,0.3)" },
          "50%":      { boxShadow: "0 0 25px rgba(109,40,217,0.7)" },
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
