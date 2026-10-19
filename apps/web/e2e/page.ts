import { expect, type Locator, type Page } from "@playwright/test"

// Shared by the Playground specs: hydration, colours and accessible queries.
// The Themer UI's helpers live in themer-ui.ts.

/**
 * Waits until the page has hydrated: the Themer loader mounts its trigger (or,
 * with the panel open, its close button) only after hydration, slowly under
 * parallel load. Every Playground page mounts the Themer, so it is the
 * hydration signal for specs that never use it too. Call it after every navigation that precedes an interaction,
 * so a click or submit never lands on server HTML with no handlers attached.
 */
export async function hydrated(page: Page) {
  await expect(
    page.getByRole("button", { name: /^(Open|Close) Themer$/ }).first()
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
