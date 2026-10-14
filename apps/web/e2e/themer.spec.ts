import { expect, test, type Page } from "@playwright/test"

import { nightjarPreset } from "../lib/brand/nightjar"

// Resolves a colour on the page to sRGB `rgb(r, g, b)`, through a probe
// element and a canvas pixel, so values compare whatever syntax the Themer
// or the CSS build wrote them in (the build may lower oklch() to lab()).
function resolveColor(page: Page, color: string) {
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

const pagePrimary = (page: Page) => resolveColor(page, "var(--primary)")
const home = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Good coffee, slowly." })

test("the page starts on Nightjar, and the Themer applying it changes nothing", async ({
  page,
}) => {
  await page.goto("/")
  await expect(home(page)).toBeVisible()
  const nightjarPrimary = await resolveColor(
    page,
    nightjarPreset.styles.light.primary
  )
  expect(await pagePrimary(page)).toBe(nightjarPrimary)

  await page.getByRole("button", { name: "Open Theme Editor" }).click()
  await expect(
    page.getByRole("button", { name: /^Primary & Secondary/ })
  ).toBeVisible()
  expect(await pagePrimary(page)).toBe(nightjarPrimary)
})

test("a token edited in the Themer restyles the page and survives a reload", async ({
  page,
}) => {
  await page.goto("/")
  await expect(home(page)).toBeVisible()
  expect(await pagePrimary(page)).not.toBe("rgb(255, 0, 0)")

  await page.getByRole("button", { name: "Open Theme Editor" }).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  await page.getByLabel("Primary", { exact: true }).fill("#ff0000")

  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")

  await page.reload()
  await expect(home(page)).toBeVisible()
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
