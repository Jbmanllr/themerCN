import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { expect, test } from "@playwright/test"

import { postCategories, posts } from "../lib/mock/blog"

// The marketing and blog screens (#24): every route renders under the site
// layout in both colour modes.
const pages = [
  { path: "/", heading: "Good coffee, slowly." },
  { path: "/features", heading: "A subscription that brews with you" },
  { path: "/pricing", heading: "Pick a pace" },
  { path: "/contact", heading: "Write to the roastery" },
  { path: "/about", heading: "A small roastery that takes its time" },
  { path: "/blog", heading: "Journal" },
  { path: "/blog/category/gear", heading: "Gear" },
  { path: "/blog/a-slower-pour-over", heading: "A slower pour-over" },
]

test("home walks through a slow brew and leads to the shop, plans and journal", async ({
  page,
}) => {
  await page.goto("/")
  const brew = page.getByRole("list", { name: "A four-minute pour-over" })
  await expect(brew.getByRole("listitem")).toHaveCount(6)
  await expect(brew.getByRole("listitem").first()).toContainText("Bloom")

  const main = page.getByRole("main")
  await expect(
    main.getByRole("link", { name: "Night Owl Blend" })
  ).toHaveAttribute("href", "/shop/p/night-owl-blend")
  await expect(
    main.getByRole("link", { name: "Compare plans" })
  ).toHaveAttribute("href", "/pricing")
  await expect(
    main.getByRole("link", { name: "How to dial in espresso" })
  ).toHaveAttribute("href", "/blog/how-to-dial-in-espresso")
})

test("pricing switches the plans between monthly and yearly billing", async ({
  page,
}) => {
  await page.goto("/pricing")
  const nightShift = page.getByRole("article", { name: "Night Shift" })
  await expect(nightShift).toContainText("$32")

  await page.getByRole("button", { name: "Yearly" }).click()
  await expect(nightShift).toContainText("$28")
  await expect(nightShift).toContainText("billed yearly")
})

test("the contact form ends on a confirmation", async ({ page }) => {
  await page.goto("/contact")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true")

  await page.getByLabel("Name").fill("Ada Brennan")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Topic").selectOption("Wholesale")
  await page.getByLabel("Message").fill("Do you roast for cafés?")
  await page.getByRole("button", { name: "Send message" }).click()

  const confirmation = page.getByRole("status")
  await expect(confirmation).toContainText("Message sent")
  await expect(confirmation).toContainText("ada@example.com")
  await expect(page.getByRole("button", { name: "Send message" })).toHaveCount(
    0
  )
})

test("a journal post opens from the index with its author and block body", async ({
  page,
}) => {
  await page.goto("/blog")
  await page
    .getByRole("link", { name: "How to dial in espresso" })
    .first()
    .click()

  await expect(page).toHaveURL(/\/blog\/how-to-dial-in-espresso$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "How to dial in espresso" })
  ).toBeVisible()
  const body = page.getByRole("article", { name: "How to dial in espresso" })
  await expect(body.getByText("Theo Lindqvist")).toBeVisible()
  await expect(
    body.getByRole("heading", { name: "Start from a recipe" })
  ).toBeVisible()
  await expect(
    body.getByRole("listitem").filter({ hasText: "18 g in" })
  ).toBeVisible()
  await expect(body.locator("blockquote")).toContainText("Change one thing")
  await expect(body.locator("pre")).toContainText("ratio = 36 g / 18 g")
  await expect(
    body.getByRole("link", { name: /Night Owl Blend/ })
  ).toHaveAttribute("href", "/shop/p/night-owl-blend")
})

test("a journal category lists only its posts", async ({ page }) => {
  await page.goto("/blog")
  await page
    .getByRole("navigation", { name: "Journal categories" })
    .getByRole("link", { name: "Origins" })
    .click()

  await expect(page).toHaveURL(/\/blog\/category\/origins$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Origins" })
  ).toBeVisible()
  const titles = page.getByRole("main").getByRole("heading", { level: 2 })
  await expect(titles).toHaveText([
    "Three days in Guji",
    "Decaf, without apology",
  ])
})

test("every marketing and journal page is prerendered at build time", () => {
  // Read from the production build the e2e server runs (`next build`).
  const manifest = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../.next/prerender-manifest.json", import.meta.url)
      ),
      "utf8"
    )
  ) as { routes: Record<string, unknown> }
  const expected = [
    "/",
    "/features",
    "/pricing",
    "/about",
    "/contact",
    "/blog",
    ...postCategories.map((c) => `/blog/category/${c.slug}`),
    ...posts.map((p) => `/blog/${p.slug}`),
  ]
  expect(expected.filter((route) => !(route in manifest.routes))).toEqual([])
})

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme })

    for (const { path, heading } of pages) {
      test(`${path} renders its page in the site layout`, async ({ page }) => {
        await page.goto(path)
        await expect(
          page.getByRole("heading", { level: 1, name: heading })
        ).toBeVisible()
        await expect(
          page.getByRole("navigation", { name: "Main" })
        ).toBeVisible()
        await expect(page.locator("html")).toHaveClass(
          colorScheme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/
        )
      })
    }
  })
}
