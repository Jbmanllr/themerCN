import { expect, test } from "@playwright/test"

import { openOverlay } from "./themer-ui"

// The Playground sets no `layout`, so it opens the Workspace; the user
// switches to Overlay from the Themer UI's header.

test("the Overlay floats the sidebar over the real page, which stays usable", async ({
  page,
}) => {
  await page.goto("/")
  await openOverlay(page)

  await expect(page.getByTestId("themer-preview")).toHaveCount(0)

  // Right of the 320px sidebar, the page takes the wheel and the click.
  await page.mouse.move(900, 500)
  await page.mouse.wheel(0, 800)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Pricing", exact: true })
    .click()
  await expect(page).toHaveURL(/\/pricing$/)
  await expect(page.getByRole("button", { name: "Close theme editor" })).toBeVisible()
})

test("the user's layout survives a reload", async ({ page }) => {
  await page.goto("/")
  await openOverlay(page)

  await page.reload()
  await page.getByRole("button", { name: "Open Theme Editor" }).click()

  await expect(
    page.getByRole("button", { name: "Themer layout: Overlay" })
  ).toBeVisible()
  await expect(page.getByTestId("themer-preview")).toHaveCount(0)
})

test("the inspector works on the real page beside the Overlay, never on the Themer UI", async ({
  page,
}) => {
  await page.goto("/")
  await openOverlay(page)
  await page.getByRole("tab", { name: "Typography" }).click()
  await page.getByRole("button", { name: "Inspector" }).click()
  const card = page.getByTestId("themer-inspector-overlay")

  await page.getByRole("button", { name: "Close theme editor" }).hover()
  await expect(card).toHaveCount(0)

  const link = page
    .getByRole("banner")
    .getByRole("link", { name: "Design system" })
  await link.hover()
  await expect(card).toContainText("text-primary")

  // The click pins the card and opens the colour control; the link does not
  // navigate.
  await link.click()
  await expect(card).toContainText("Pinned")
  await expect(page.getByRole("tab", { name: "Colors" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
  await expect(page).toHaveURL(/\/$/)

  await page.keyboard.press("Escape")
  await expect(card).toHaveCount(0)

  await page.getByRole("button", { name: "Inspector" }).click()
  await link.click()
  await expect(page).toHaveURL(/\/design-system$/)
})
