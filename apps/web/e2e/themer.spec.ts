import { expect, test, type Page } from "@playwright/test"

import { nightjarPreset } from "../lib/brand/nightjar"
import { hydrated, resolveColor } from "./page"
import { themerTrigger } from "./themer-ui"

const pagePrimary = (page: Page) => resolveColor(page, "var(--primary)")
const home = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Good coffee, slowly." })

test("the page starts on Nightjar, and the Themer applying it changes nothing", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await expect(home(page)).toBeVisible()
  const nightjarPrimary = await resolveColor(
    page,
    nightjarPreset.styles.light.primary
  )
  expect(await pagePrimary(page)).toBe(nightjarPrimary)

  await themerTrigger(page).click()
  await expect(
    page.getByRole("button", { name: /^Primary & Secondary/ })
  ).toBeVisible()
  expect(await pagePrimary(page)).toBe(nightjarPrimary)
})

test("a token edited in the Themer restyles the page and survives a reload", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await expect(home(page)).toBeVisible()
  expect(await pagePrimary(page)).not.toBe("rgb(255, 0, 0)")

  await themerTrigger(page).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  await page.getByLabel("Primary", { exact: true }).fill("#ff0000")

  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")

  await page.reload()
  await expect(home(page)).toBeVisible()
  expect(await pagePrimary(page)).toBe("rgb(255, 0, 0)")
})

test("a reload paints the saved Theme in the mode next-themes restores, whatever mode it was saved in", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await expect(home(page)).toBeVisible()
  await themerTrigger(page).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  const primary = page.getByLabel("Primary", { exact: true })

  // Dark primary blue, then light primary red: the Theme is saved in light.
  await page.getByRole("button", { name: "Switch to dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await primary.fill("#0000ff")
  await expect.poll(() => pagePrimary(page)).toBe("rgb(0, 0, 255)")
  await page.getByRole("button", { name: "Switch to light mode" }).click()
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
  await primary.fill("#ff0000")
  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")

  // next-themes restores dark on the next load (switched in another tab).
  await page.evaluate(() => localStorage.setItem("theme", "dark"))

  // The first paint: only the inline scripts run (the head script, then
  // next-themes' class script), no bundle and so no Themer.
  await page.route("**/*.js", (route) => route.abort())
  await page.reload()

  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  expect(await pagePrimary(page)).toBe("rgb(0, 0, 255)")

  await page.evaluate(() => {
    document.documentElement.classList.replace("dark", "light")
  })
  expect(await pagePrimary(page)).toBe("rgb(255, 0, 0)")
})

test("the font picker reads the Playground's font catalog route", async ({
  request,
}) => {
  const response = await request.get("/api/themer/fonts?q=jetbrains&limit=5")
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body).toMatchObject({ offset: 0, limit: 5 })
  expect(body.fonts.map((f: { family: string }) => f.family)).toContain(
    "JetBrains Mono"
  )
})
