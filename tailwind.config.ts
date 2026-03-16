import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f1117",
          secondary: "#171923",
          tertiary: "#202432"
        },
        text: {
          primary: "#f4f4f5",
          secondary: "#c4c7d0",
          muted: "#8f95a3"
        },
        accent: {
          blue: "#5ea4ff",
          mint: "#5de4c7",
          amber: "#f2b96f",
          rose: "#ff7a90"
        },
        stroke: {
          DEFAULT: "#2a3040",
          strong: "#3b4457"
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', "monospace"]
      },
      boxShadow: {
        panel: "0 20px 60px rgba(2, 6, 23, 0.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
