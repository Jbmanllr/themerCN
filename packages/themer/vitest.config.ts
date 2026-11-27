import { defineConfig } from "vitest/config"

// Node by default; DOM test files opt in with `// @vitest-environment happy-dom`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // DOM tests render whole editor surfaces, and the first render of a file
    // also loads and transforms everything it mounts. The store-action count
    // test's first <Themer> mount takes about 7 s on a quiet machine and has
    // taken 21 s on a loaded one, where the former 20 s limit failed it and
    // every case after it. A ceiling for a hung test, not a budget.
    testTimeout: 60_000,
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
