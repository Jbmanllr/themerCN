import { defineConfig } from "vitest/config"

// The root's own tests (the `//#test:repo` task): the repo-wide config checks
// in tests/. Each workspace's tests run from its own `test` task.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
