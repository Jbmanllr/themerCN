import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config"

// vite.config.ts mirrors the README's Vite recipe, so the coverage settings
// of `test:coverage` (`pnpm coverage`, the project coverage ratchet) live
// here: every source file counts, whether a test loads it or not.
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      // The clone's test slots (tests/test-slot.ts, TESTING.md): two runs at
      // a time, each on half the cores.
      globalSetup: ["../../tests/test-slot.ts"],
      maxWorkers: "50%",
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["**/*.test.{ts,tsx}"],
        reporter: ["text-summary", "json-summary"],
      },
    },
  })
)
