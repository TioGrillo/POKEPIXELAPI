/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        accent: {
          DEFAULT: "rgb(var(--accent))",
          light: "rgb(var(--accent-light))",
          dark: "rgb(var(--accent-dark))",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgb(var(--accent)/0.2)" },
          "100%": { boxShadow: "0 0 20px rgb(var(--accent)/0.4)" },
        },
      },
    },
  },
  plugins: [],
};
