import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#09090e",      // Rich dark navy-slate
          secondary: "#12131c",    // Cards/Panels
          tertiary: "#191b28",     // Inputs/inner containers
          elevated: "#222638",     // Popups/Hover states
        },
        text: {
          primary: "#e2e8f0",      // slightly softer white
          secondary: "#94a3b8",    // slate-400
          muted: "#64748b",        // slate-500
        },
        accent: {
          blue: "#6366f1",         // Indigo/Blue
          mint: "#10b981",         // Emerald
          amber: "#f59e0b",        // Amber
          rose: "#f43f5e",         // Rose
        },
        stroke: {
          DEFAULT: "#1e2233",      // Softer borders
          strong: "#2d354a",       // Hover borders
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "8px",       // 按钮、badge
        xl: "12px",      // 输入框、卡片
        "2xl": "16px",   // Panel、模态框
      },
      boxShadow: {
        panel: "0 16px 40px -8px rgba(0, 0, 0, 0.5)",
        glow: "0 0 24px rgba(94, 138, 255, 0.08)",  // 微弱的蓝光
      },
    },
  },
  plugins: [],
} satisfies Config;
