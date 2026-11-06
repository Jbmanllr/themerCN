import { defineConfig } from "vitest/config"

// Unit tests only; the Playwright specs in e2e/ run through `pnpm e2e`.
export default defineConfig({
  // Next's tsconfig preserves JSX for Next's own compiler; Vite must compile
  // it, or the .tsx files no test loads can't be read for coverage.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // `test:coverage` (`pnpm coverage`, the project coverage ratchet): every
    // source file counts, whether a test loads it or not.
    coverage: {
      provider: "v8",
      include: ["{app,components,hooks,lib}/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
      reporter: ["text-summary", "json-summary"],
    },
  },
})
