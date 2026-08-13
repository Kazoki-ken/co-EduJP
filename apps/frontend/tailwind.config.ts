import type { Config } from "tailwindcss";

/* Every colour below reads a CSS variable that holds a bare `R G B` triple.
   The two themes live in app/globals.css: `:root` is light, `.dark` is the
   original dark palette. Writing them as `rgb(var(--x) / <alpha-value>)`
   keeps Tailwind's opacity modifiers (`bg-surface/80`) working. */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ holds class names too (see lib/jlpt.ts). Leaving it out silently
    // purged those colours and rendered blank header bands.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Japanese Traditional Design System ─────────────────────────
        background: rgb("--c-background"),
        surface:    rgb("--c-surface"),
        "surface-2": rgb("--c-surface-2"),
        border:     rgb("--c-border"),

        primary:    rgb("--c-primary"),      // Shu-iro (Vermilion Red)
        "primary-hover": rgb("--c-primary-hover"),
        "primary-glow": "var(--c-primary-glow)",

        accent:     rgb("--c-accent"),       // Yamabuki (Gold)
        "accent-hover": rgb("--c-accent-hover"),
        "accent-glow": "var(--c-accent-glow)",

        success:    rgb("--c-success"),      // Matcha / Bamboo Green
        warning:    rgb("--c-warning"),      // Mikan / Orange
        danger:     rgb("--c-danger"),       // Tsubaki / Camellia Red

        // ── League Palette ───────────────────────────────────
        bronze:     rgb("--c-bronze"),
        silver:     rgb("--c-silver"),
        gold:       rgb("--c-gold"),
        platinum:   rgb("--c-platinum"),
        diamond:    rgb("--c-diamond"),

        // ── Text Scale ───────────────────────────────────────
        "text-primary":   rgb("--c-text-primary"),
        "text-secondary": rgb("--c-text-secondary"),
        "text-muted":     rgb("--c-text-muted"),
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
        glow:        "var(--shadow-glow)",
        "glow-sm":   "var(--shadow-glow-sm)",
        "glow-accent": "var(--shadow-glow-accent)",
        glass:       "var(--shadow-glass)",
      },
      backgroundImage: {
        "space-gradient":   "var(--gradient-space)",
        "primary-gradient": "var(--gradient-primary)",
        "accent-gradient":  "var(--gradient-accent)",
        "card-gradient":    "var(--gradient-card)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float":      "float 3s ease-in-out infinite",
        "slide-in":   "slideIn 0.3s ease-out",
        "fade-in":    "fadeIn 0.4s ease-out",
        // Score popups in the block game: rise and fade, then unmount.
        "float-up":   "floatUp 0.9s ease-out forwards",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "var(--shadow-glow-sm)" },
          "50%":      { boxShadow: "var(--shadow-glow)" },
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
        floatUp: {
          "0%":   { opacity: "0", transform: "translateY(6px) scale(0.9)" },
          "20%":  { opacity: "1", transform: "translateY(0) scale(1.05)" },
          "100%": { opacity: "0", transform: "translateY(-28px) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
