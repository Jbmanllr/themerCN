import { defineConfig } from "vitest/config"

// The root's own tests (the `//#test:repo` task): the repo-wide config checks
// in tests/. Each workspace's tests run from its own `test` task.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The clone's test slots (tests/test-slot.ts, TESTING.md): two runs at
    // a time, each on half the cores.
    globalSetup: ["tests/test-slot.ts"],
    maxWorkers: "50%",
  },
})
