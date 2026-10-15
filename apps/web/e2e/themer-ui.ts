import { expect, type Page } from "@playwright/test"

// Shared by the Playground specs that drive or wait for the Themer UI.

/** The floating button that opens the Themer UI. */
export const themerTrigger = (page: Page) =>
  page.getByRole("button", { name: "Open Theme Editor" })

/**
 * Waits for the Themer UI (its trigger, or the open panel's close button:
 * the Themer loads lazily after hydration, slowly under parallel load) and
 * for web fonts, then parks the mouse, so nothing shifts or hovers while a
 * page is checked.
 */
export async function settle(page: Page) {
  await expect(
    page.getByRole("button", { name: /^(Open|Close) theme editor$/i }).first()
  ).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
}
