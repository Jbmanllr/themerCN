import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { uiComponents } from "../lib/design-system"
import { postCategories, posts } from "../lib/mock/blog"
import { categories, products } from "../lib/mock/catalog"
import { chatThreads } from "../lib/mock/chat"
import {
  openLayout,
  openToolbarPanel,
  settle,
  themerTrigger,
} from "./themer-ui"

// Every Playground route, read from the same data the pages are generated
// from, so a new product, post or ui component is checked without edits here.
const routes = [
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  ...postCategories.map((category) => `/blog/category/${category.slug}`),
  ...posts.map((post) => `/blog/${post.slug}`),
  "/shop",
  ...categories.map((category) => `/shop/${category.slug}`),
  ...products.map((product) => `/shop/p/${product.slug}`),
  "/cart",
  "/checkout",
  "/login",
  "/signup",
  "/app",
  "/app/chat",
  ...chatThreads.map((thread) => `/app/chat/${thread.id}`),
  "/app/settings",
  "/design-system",
  "/design-system/tokens",
  ...uiComponents.map((component) => `/design-system/${component.slug}`),
  "/this-page-does-not-exist",
]

// WCAG 2.0–2.2 A and AA rules (colour contrast included). Only serious and
// critical violations fail; minor and moderate ones are left to review.
async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((node) => node.target.join(" ")),
    }))
}

// Under parallel load the heavier design-system pages can take a while,
// hence the longer wait.
async function settlePage(page: Page) {
  await expect(page.locator("main#main")).toBeVisible({ timeout: 15_000 })
  await settle(page)
}

test.describe.configure({ mode: "parallel", timeout: 60_000 })

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme })

    for (const route of routes) {
      test(`${route} has no serious or critical axe violations`, async ({
        page,
      }) => {
        await page.goto(route)
        await settlePage(page)
        expect(await blockingViolations(page)).toEqual([])
      })
    }
  })
}

test("the open Themer UI has no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("/")
  await settlePage(page)
  await themerTrigger(page).click()
  await expect(
    page.getByRole("button", { name: /^Primary & Secondary/ })
  ).toBeVisible()
  expect(await blockingViolations(page)).toEqual([])
})

test("the open Overlay has no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("/")
  await settlePage(page)
  await openLayout(page, "Overlay")
  expect(await blockingViolations(page)).toEqual([])
})

test("the open Push has no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("/")
  await settlePage(page)
  await openLayout(page, "Push")
  expect(await blockingViolations(page)).toEqual([])
})

test("the open Toolbar and its panel popup have no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("/")
  await settlePage(page)
  const colors = await openToolbarPanel(page, "Colors")
  await expect(
    colors.getByRole("button", { name: /^Primary & Secondary/ })
  ).toBeVisible()
  expect(await blockingViolations(page)).toEqual([])
})

// WCAG 2.1.4: no single-letter shortcut. Speech input dictating a "d" must not
// flip the colour mode; the Themer's mode control is the way to switch.
test("pressing d changes nothing", async ({ page }) => {
  await page.goto("/")
  await settlePage(page)
  const html = page.locator("html")
  const before = await html.getAttribute("class")

  await page.keyboard.press("d")
  // Give a listener a frame to commit a change before asserting none came.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )

  expect(await html.getAttribute("class")).toBe(before)
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull()
})
