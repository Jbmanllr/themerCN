import { expect, test, type Page } from "@playwright/test"

import { settle, themerTrigger } from "./themer-ui"

// Baselines are Linux renders from the pinned mcr.microsoft.com/playwright
// image (`pnpm e2e:update-snapshots`, which CI's e2e job also runs in).
// Elsewhere fonts and anti-aliasing differ, so the comparison is skipped
// rather than failing on rendering noise.
test.skip(
  process.platform !== "linux",
  "visual baselines are Linux-only: run `pnpm e2e:visual` (Docker) instead"
)

// Every screen waits for its own content, then settles (the Themer UI and
// web fonts), so nothing shifts mid-capture.

const heading = (page: Page, name: string, level = 1) =>
  page.getByRole("heading", { level, name, exact: true })

const screens: {
  name: string
  show: (page: Page) => Promise<void>
  // The Themer UI is fixed to the viewport, so its screen is the viewport only.
  fullPage?: false
}[] = [
  {
    name: "home",
    show: async (page) => {
      await page.goto("/")
      await expect(heading(page, "Good coffee, slowly.")).toBeVisible()
    },
  },
  {
    name: "pricing",
    show: async (page) => {
      await page.goto("/pricing")
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    },
  },
  {
    name: "product",
    show: async (page) => {
      await page.goto("/shop/p/night-owl-blend")
      await expect(heading(page, "Night Owl Blend")).toBeVisible()
    },
  },
  {
    // The cart lives in memory, so it is filled in-app: a page.goto would
    // empty it.
    name: "cart",
    show: async (page) => {
      await page.goto("/shop/p/night-owl-blend")
      await expect(heading(page, "Night Owl Blend")).toBeVisible()
      await expect(themerTrigger(page)).toBeVisible({ timeout: 15_000 })
      await page.getByRole("button", { name: "Add to cart" }).click()
      await page.getByRole("link", { name: "Cart, 1 item" }).click()
      await expect(page).toHaveURL(/\/cart$/)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(heading(page, "Your cart is empty")).toHaveCount(0)
    },
  },
  {
    name: "app-dashboard",
    show: async (page) => {
      await page.goto("/app")
      await expect(heading(page, "Good evening, Ada", 2)).toBeVisible()
    },
  },
  {
    // Saved messages are server-rendered, so the load is the final state.
    name: "chat-thread",
    show: async (page) => {
      await page.goto("/app/chat/espresso-too-sour")
      await expect(
        page.getByRole("log", { name: "Espresso too sour" })
      ).toContainText("Sour usually means under-extracted.")
    },
  },
  {
    // Token values are read client-side after hydration.
    name: "design-system-tokens",
    show: async (page) => {
      await page.goto("/design-system/tokens")
      await expect(
        page.getByRole("row", { name: /^--background\s+\S/ }).first()
      ).toBeVisible()
    },
  },
  {
    name: "login",
    show: async (page) => {
      await page.goto("/login")
      await expect(heading(page, "Welcome back")).toBeVisible()
    },
  },
  {
    name: "not-found",
    show: async (page) => {
      await page.goto("/this-page-does-not-exist")
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    },
  },
  {
    name: "themer-open",
    fullPage: false,
    show: async (page) => {
      await page.goto("/")
      await expect(heading(page, "Good coffee, slowly.")).toBeVisible()
      await themerTrigger(page).click()
      await expect(
        page.getByRole("button", { name: /^Primary & Secondary/ })
      ).toBeVisible()
    },
  },
]

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme })

    for (const screen of screens) {
      test(`${screen.name} matches its baseline`, async ({ page }) => {
        await screen.show(page)
        await settle(page)
        await expect(page).toHaveScreenshot(
          `${screen.name}-${colorScheme}.png`,
          {
            animations: "disabled",
            fullPage: screen.fullPage ?? true,
          }
        )
      })
    }
  })
}
