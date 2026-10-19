import { expect, test, type Page } from "@playwright/test"

import { openLayout, hydrated } from "./themer-ui"

// Push: the Themer sidebar beside the real page, which it shifts aside by
// the sidebar's width (expanded 320px, collapsed 48px). The Playground sets
// no `layout`, so the user switches to Push from the Workspace header.

/** Left edge of the first element matching `selector` outside the Themer UI. */
function hostLeft(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const element = [...document.querySelectorAll(selector)].find(
      (candidate) => !candidate.closest("[data-themer-ui]")
    )
    return element ? Math.round(element.getBoundingClientRect().left) : null
  }, selector)
}

const inset = (page: Page) =>
  page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--themer-inset-left")
  )

// The header's toggle (the sidebar's rail has the same name).
const toggleSidebar = (page: Page) =>
  page.getByTestId("themer-ui").locator('[data-slot="sidebar-trigger"]')

test("Push shifts the page aside and follows the sidebar as it collapses", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await openLayout(page, "Push")

  await expect(page.getByTestId("themer-preview")).toHaveCount(0)
  await expect.poll(() => hostLeft(page, "main")).toBe(320)
  await expect.poll(() => hostLeft(page, "header")).toBe(320)
  expect(await inset(page)).toBe("20rem")

  await toggleSidebar(page).click()
  await expect.poll(() => hostLeft(page, "main")).toBe(48)
  expect(await inset(page)).toBe("3rem")

  await toggleSidebar(page).click()
  await expect.poll(() => hostLeft(page, "main")).toBe(320)
})

test("Push gives the page its place back on close and on a layout switch", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await openLayout(page, "Push")
  await expect.poll(() => hostLeft(page, "main")).toBe(320)

  await page.getByRole("button", { name: "Close Themer" }).click()
  await expect.poll(() => hostLeft(page, "main")).toBe(0)
  expect(await inset(page)).toBe("")

  // The choice is remembered: the Themer reopens in Push.
  await page.getByRole("button", { name: "Open Themer" }).click()
  await expect.poll(() => hostLeft(page, "main")).toBe(320)

  await page.getByRole("button", { name: "Themer layout: Push" }).click()
  await page.getByRole("menuitemradio", { name: "Overlay" }).click()
  await expect.poll(() => hostLeft(page, "main")).toBe(0)
  expect(await inset(page)).toBe("")
})

test("a fixed Host element that opts in follows the sidebar", async ({
  page,
}) => {
  // The /app shell's sidebar is `position: fixed`; it reads
  // --themer-inset-left for its left edge.
  await page.goto("/app")
  await hydrated(page)
  await openLayout(page, "Push")

  await expect
    .poll(() => hostLeft(page, '[data-slot="sidebar-container"]'))
    .toBe(320)

  await toggleSidebar(page).click()
  await expect
    .poll(() => hostLeft(page, '[data-slot="sidebar-container"]'))
    .toBe(48)
})

test("Push shifts a right-to-left page on the left, where the sidebar is", async ({
  page,
}) => {
  await page.goto("/")
  await page.evaluate(() => {
    document.documentElement.dir = "rtl"
  })
  await openLayout(page, "Push")

  await expect.poll(() => hostLeft(page, "main")).toBe(320)
  expect(await inset(page)).toBe("20rem")

  // The Themer UI stays left-to-right in a right-to-left Host.
  const direction = await page
    .getByTestId("themer-ui")
    .evaluate((element) => getComputedStyle(element).direction)
  expect(direction).toBe("ltr")
})
