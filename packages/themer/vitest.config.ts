import { defineConfig } from "vitest/config"

// Node by default; DOM test files opt in with `// @vitest-environment happy-dom`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // DOM tests render whole editor surfaces; under a parallel run the first
    // render of a file can exceed the 5s default.
    testTimeout: 20_000,
  },
})
