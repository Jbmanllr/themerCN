import { expect, test, type Locator, type Page } from "@playwright/test"

import { openOverlay, openToolbar } from "./themer-ui"

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

test.describe("the Toolbar", () => {
  const bar = (page: Page) => page.getByRole("toolbar", { name: "Theme Editor" })
  const panel = (page: Page, id: string) =>
    page.getByTestId(`themer-toolbar-panel-${id}`)

  test("puts the controls in a bar over the real page, whose panel popup stays open while the page is clicked or scrolled", async ({
    page,
  }) => {
    await page.goto("/")
    await openToolbar(page)

    await expect(
      page.locator('[data-themer-ui] [data-slot="sidebar"]')
    ).toHaveCount(0)
    await expect(page.getByTestId("themer-preview")).toHaveCount(0)

    await bar(page).getByRole("button", { name: "Colors" }).click()
    await expect(panel(page, "colors")).toBeVisible()
    const box = await panel(page, "colors").boundingBox()
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(900)

    // Beside the popup, the page takes the wheel and the click.
    await page.mouse.move(120, 700)
    await page.mouse.wheel(0, 800)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
    await page.mouse.click(120, 700)
    await expect(panel(page, "colors")).toBeVisible()

    await bar(page).getByRole("button", { name: "Typography" }).click()
    await expect(panel(page, "typography")).toBeVisible()
    await expect(panel(page, "colors")).toHaveCount(0)

    await page.keyboard.press("Escape")
    await expect(panel(page, "typography")).toHaveCount(0)
  })

  test("layers the colour and font pickers above the panel popup", async ({
    page,
  }) => {
    await page.goto("/")
    await openToolbar(page)

    /** Whether the element is what the browser paints at its own centre. */
    const isOnTop = (locator: Locator) =>
      locator.evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        const hit = document.elementFromPoint(x + width / 2, y + height / 2)
        return hit !== null && element.contains(hit)
      })

    await bar(page).getByRole("button", { name: "Colors" }).click()
    await panel(page, "colors")
      .getByRole("button", { name: /^Primary & Secondary/ })
      .click()
    await panel(page, "colors")
      .getByRole("button", { name: "Open Tailwind colors" })
      .first()
      .click()
    const palette = page.locator('[data-slot="popover-content"]').last()
    await expect(palette).toBeVisible()
    expect(await isOnTop(palette)).toBe(true)
    await page.keyboard.press("Escape")
    await expect(panel(page, "colors")).toBeVisible()

    await bar(page).getByRole("button", { name: "Typography" }).click()
    await panel(page, "typography")
      .getByRole("button", { name: /^Font Families/ })
      .click()
    await panel(page, "typography")
      .getByRole("combobox", { name: "Sans-serif" })
      .click()
    const fonts = page.locator('[data-slot="popover-content"]').last()
    await expect(fonts).toBeVisible()
    expect(await isOnTop(fonts)).toBe(true)
  })
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
