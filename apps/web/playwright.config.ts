import { defineConfig, devices } from "@playwright/test"

// Override with WEB_E2E_PORT so parallel runs (other worktrees, other
// agents) don't share, or silently reuse, one server.
const port = Number(process.env.WEB_E2E_PORT ?? 3100)

// 1440px wide: below 1280px the Themer opens as a mobile drawer.
const desktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
}

// Runs against the production build (`turbo e2e` builds first): the Themer is
// on in production too. Run `pnpm build` before `pnpm e2e` locally.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A test that passes only on its retry fails a CI run: flakes are fixed or
  // quarantined (`tag: "@quarantine"`, see the README), not retried away.
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // Every failed attempt and every retry keeps its trace.
    trace: "retain-on-failure-and-retries",
  },
  // Visual baselines are produced only in the pinned Playwright image
  // (`pnpm e2e:update-snapshots`); a run never writes missing ones. The
  // visual project runs only when named (`--project=visual`: the `visual`
  // task and the Docker wrapper), never in a plain `pnpm e2e`.
  updateSnapshots: "none",
  projects: [
    {
      name: "chromium",
      testIgnore: ["visual.spec.ts", "a11y.spec.ts"],
      use: desktop,
    },
    {
      name: "visual",
      testMatch: "visual.spec.ts",
      use: desktop,
      default: false,
    },
    { name: "a11y", testMatch: "a11y.spec.ts", use: desktop },
  ],
  webServer: {
    command: `next start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
