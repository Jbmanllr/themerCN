import { expect, type Page } from "@playwright/test"

// Shared by the Playground specs that drive or wait for the Themer UI.

/** The floating button that opens the Themer UI. */
export const themerTrigger = (page: Page) =>
  page.getByRole("button", { name: "Open Theme Editor" })

/**
 * Opens the Themer UI and switches it to the Overlay layout from the
 * Workspace header's layout switcher.
 */
export async function openOverlay(page: Page) {
  await openLayout(page, "Overlay")
}

/**
 * Opens the Themer UI and switches it to the sidebar Themer layout named
 * `label` from the Workspace header's layout switcher.
 */
export async function openLayout(page: Page, label: string) {
  await switchFromWorkspace(page, label)
  await expect(
    page.getByRole("button", { name: `Themer layout: ${label}` })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Primary & Secondary/ })
  ).toBeVisible()
}

/**
 * Opens the Themer UI and switches it to the Toolbar layout, which has no
 * sidebar: it waits for the bar instead of the switcher and a panel.
 */
export async function openToolbar(page: Page) {
  await switchFromWorkspace(page, "Toolbar")
  await expect(
    page.getByRole("toolbar", { name: "Theme Editor" })
  ).toBeVisible()
}

async function switchFromWorkspace(page: Page, label: string) {
  await themerTrigger(page).click()
  await page.getByRole("button", { name: "Themer layout: Workspace" }).click()
  await page.getByRole("menuitemradio", { name: label }).click()
}

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
