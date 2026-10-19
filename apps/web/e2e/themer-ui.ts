import { expect, type Locator, type Page } from "@playwright/test"

// Shared by the Playground specs: hydration, the Themer UI, colours and
// accessible queries.

/**
 * Waits until the page has hydrated: the Themer loader mounts its trigger (or,
 * with the panel open, its close button) only after hydration, slowly under
 * parallel load. Call it after every navigation that precedes an interaction,
 * so a click or submit never lands on server HTML with no handlers attached.
 */
export async function hydrated(page: Page) {
  await expect(
    page.getByRole("button", { name: /^(Open|Close) theme editor$/i }).first()
  ).toBeVisible({ timeout: 15_000 })
}

/**
 * Resolves a colour on the page to sRGB `rgb(r, g, b)`, through a probe
 * element and a canvas pixel, so values compare whatever syntax the Themer
 * or the CSS build wrote them in (the build may lower oklch() to lab()).
 */
export function resolveColor(page: Page, color: string) {
  return page.evaluate((value) => {
    const probe = document.createElement("div")
    probe.style.color = value
    document.body.append(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")!
    context.fillStyle = computed
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }, color)
}

/**
 * The definition a description list gives for the term whose text matches
 * `term`: the `dd` that follows that `dt`.
 */
export const definitionOf = (scope: Page | Locator, term: RegExp) =>
  scope
    .getByRole("term")
    .filter({ hasText: term })
    .locator("xpath=following-sibling::dd[1]")

/** The header's cart link, whose accessible name carries the item count. */
export const cartLink = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: /^Cart, \d+ items?$/ })

/** The floating button that opens the Themer UI. */
export const themerTrigger = (page: Page) =>
  page.getByRole("button", { name: "Open Theme Editor" })

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
  page.getByRole("toolbar", { name: "Theme Editor" })

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
