import { defineConfig } from "vitest/config"

// Node by default; DOM test files opt in with `// @vitest-environment happy-dom`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // DOM tests render whole editor surfaces; under a parallel run the first
    // render of a file can exceed the 5s default.
    testTimeout: 20_000,
    // The clone's test slots (tests/test-slot.ts, TESTING.md): two runs at
    // a time, each on half the cores.
    globalSetup: ["../../tests/test-slot.ts"],
    maxWorkers: "50%",
    // `test:coverage` (`pnpm coverage`, the project coverage ratchet): every
    // source file counts, whether a test loads it or not.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "src/generated/**"],
      reporter: ["text-summary", "json-summary"],
    },
  },
})
