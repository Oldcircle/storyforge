import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        "src/engine/**",
        "src/utils/**",
        "src/data/**",
        "src/adapters/**",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/pages/**",
        "src/components/**",
        "src/main.tsx",
        "src/App.tsx",
      ],
      // Start low; raise as more tests are added.
      // Currently tested: keyword-matcher, storyboard-parser, defaults, error (all 100%).
      // Untested: prompt-assembler, director, prompt-writer, comfyui, import-st, etc.
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 20,
        statements: 15,
      },
    },
  },
});
