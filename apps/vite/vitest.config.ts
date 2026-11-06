import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config"

// vite.config.ts mirrors the README's Vite recipe, so the coverage settings
// of `test:coverage` (`pnpm coverage`, the project coverage ratchet) live
// here: every source file counts, whether a test loads it or not.
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["**/*.test.{ts,tsx}"],
        reporter: ["text-summary", "json-summary"],
      },
    },
  })
)
