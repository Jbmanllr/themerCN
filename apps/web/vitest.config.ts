import { defineConfig } from "vitest/config"

// Unit tests only; the Playwright specs in e2e/ run through `pnpm e2e`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
})
