/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: scan all source files
  content: [
    './App.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Deep Space palette (mirrors web frontend) ──────────────────────
        background: '#0a0a1a',
        surface:    '#12122a',
        border:     '#1e1e3f',

        // Primary – violet
        primary: {
          DEFAULT: '#6d28d9',
          light:   '#7c3aed',
          dark:    '#5b21b6',
        },

        // Accent – amber / gold (coins)
        accent: {
          DEFAULT: '#f59e0b',
          light:   '#fbbf24',
          dark:    '#d97706',
        },

        // Semantic
        success: '#10b981',
        danger:  '#ef4444',
        info:    '#3b82f6',

        // League tiers
        league: {
          bronze:   '#cd7f32',
          silver:   '#c0c0c0',
          gold:     '#ffd700',
          platinum: '#e5e4e2',
          diamond:  '#b9f2ff',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'System'],
        mono:  ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
