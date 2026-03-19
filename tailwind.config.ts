import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0c0e16",
          secondary: "#141620",
          tertiary: "#1c1e2e",
          elevated: "#242640",
        },
        text: {
          primary: "#e8eaf0",
          secondary: "#9ba3b8",
          muted: "#5e6580",
        },
        accent: {
          blue: "#4f8cff",
          indigo: "#6c5ce7",
          mint: "#00d2a0",
          amber: "#ffb347",
          rose: "#ff6b81",
        },
        stroke: {
          DEFAULT: "#232840",
          strong: "#333960",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        panel: "0 8px 32px -4px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(79, 140, 255, 0.12)",
        "glow-mint": "0 0 20px rgba(0, 210, 160, 0.10)",
        inner: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
