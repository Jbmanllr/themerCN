import { expect, type Page } from "@playwright/test"

import { hydrated } from "./page"

// The Themer UI's helpers, shared by the Themer specs. Hydration, colours and
// accessible queries live in page.ts.

/** The floating button that opens the Themer UI. */
export const themerTrigger = (page: Page) =>
  page.getByRole("button", { name: "Open Themer" })

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

/** The Toolbar layout's bar. */
export const themerToolbar = (page: Page) =>
  page.getByRole("region", { name: "Themer toolbar" })

/** The Toolbar's popup for the panel group `id` (colors, typography, other). */
export const toolbarPanel = (page: Page, id: string) =>
  page.getByTestId(`themer-toolbar-panel-${id}`)

/**
 * Opens the Themer UI and switches it to the Toolbar layout, which has no
 * sidebar: it waits for the bar instead of the switcher and a panel.
 */
export async function openToolbar(page: Page) {
  await switchFromWorkspace(page, "Toolbar")
  await expect(themerToolbar(page)).toBeVisible()
}

/**
 * Opens the Toolbar and the popup of its panel group `label` ("Colors",
 * "Typography", "Other"), and returns the popup once it shows.
 */
export async function openToolbarPanel(page: Page, label: string) {
  await openToolbar(page)
  await themerToolbar(page).getByRole("button", { name: label }).click()
  const popup = toolbarPanel(page, label.toLowerCase())
  await expect(popup).toBeVisible()
  return popup
}

async function switchFromWorkspace(page: Page, label: string) {
  await themerTrigger(page).click()
  await page.getByRole("button", { name: "Themer layout: Workspace" }).click()
  await page.getByRole("menuitemradio", { name: label }).click()
}

/**
 * Waits for hydration (and so the Themer UI) and for web fonts, then parks
 * the mouse, so nothing shifts or hovers while a page is checked.
 */
export async function settle(page: Page) {
  await hydrated(page)
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
}
