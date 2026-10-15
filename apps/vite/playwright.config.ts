import { defineConfig, devices } from "@playwright/test"

// Override with VITE_E2E_PORT so parallel runs (other worktrees, other
// agents) don't share, or silently reuse, one server.
const port = Number(process.env.VITE_E2E_PORT ?? 4173)

// The smoke test runs against a production build with the Themer on
// (VITE_THEMER=1), written to dist-e2e so `dist` stays the off build.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // 1440px wide: below 1280px the Themer opens as a mobile drawer.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: `vite build --outDir dist-e2e && vite preview --outDir dist-e2e --port ${port} --strictPort`,
    env: { VITE_THEMER: "1" },
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
