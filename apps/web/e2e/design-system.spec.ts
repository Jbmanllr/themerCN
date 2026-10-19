import { expect, test, type Page } from "@playwright/test"

import { nightjarPreset } from "../lib/brand/nightjar"
import { uiComponents } from "../lib/design-system"
import { hydrated, resolveColor } from "./page"

const panel = (page: Page, mode: "Light" | "Dark") =>
  page.getByRole("region", { name: mode, exact: true })

test("the index links to every packages/ui component, and so does the nav", async ({
  page,
}) => {
  await page.goto("/design-system")
  await expect(
    page.getByRole("heading", { level: 1, name: "Design system" })
  ).toBeVisible()

  const main = page.getByRole("main")
  const nav = page.getByRole("navigation", { name: "Design system" })
  for (const component of uiComponents) {
    const href = `/design-system/${component.slug}`
    await expect(
      main.getByRole("link", { name: component.name, exact: true })
    ).toHaveAttribute("href", href)
    await expect(
      nav.getByRole("link", { name: component.name, exact: true })
    ).toHaveAttribute("href", href)
  }
  await expect(main.getByRole("link", { name: "Tokens" })).toHaveAttribute(
    "href",
    "/design-system/tokens"
  )
})

test("every component page shows the same specimen in light and dark", async ({
  page,
}) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))

  for (const component of uiComponents) {
    await page.goto(`/design-system/${component.slug}`)
    await expect(
      page.getByRole("heading", { level: 1, name: component.name })
    ).toBeVisible()

    const light = panel(page, "Light")
    const dark = panel(page, "Dark")
    await expect(light).toBeVisible()
    await expect(dark).toBeVisible()
    // Both halves render the same states.
    const states = await light.getByRole("figure").count()
    expect(states, component.slug).toBeGreaterThan(0)
    await expect(dark.getByRole("figure")).toHaveCount(states)
  }
  expect(errors).toEqual([])
})

test("an unknown component is a 404", async ({ page }) => {
  const response = await page.goto("/design-system/not-a-component")
  expect(response?.status()).toBe(404)
})

for (const pageMode of ["light", "dark"] as const) {
  test(`with the page in ${pageMode} mode, each half keeps its own mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: pageMode })
    await page.goto("/design-system/button")
    await expect(panel(page, "Light")).toBeVisible()

    for (const mode of ["light", "dark"] as const) {
      const half = panel(page, mode === "light" ? "Light" : "Dark")
      const background = await half.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      )
      expect(await resolveColor(page, background)).toBe(
        await resolveColor(page, nightjarPreset.styles[mode].background)
      )
      // `dark:` utilities follow the half, not the page: the outline
      // button is `bg-background`, and `dark:bg-transparent` in dark.
      const outline = half.getByRole("button", { name: "Outline" }).first()
      const outlineBackground = await outline.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      )
      if (mode === "light") {
        expect(await resolveColor(page, outlineBackground)).toBe(
          await resolveColor(page, background)
        )
      } else {
        expect(outlineBackground).toBe("rgba(0, 0, 0, 0)")
      }
    }
  })
}

test("the tokens page shows every token in both modes", async ({ page }) => {
  await page.goto("/design-system/tokens")
  await expect(
    page.getByRole("heading", { level: 1, name: "Tokens" })
  ).toBeVisible()

  for (const heading of [
    "Colours",
    "Radius",
    "Fonts",
    "Tracking",
    "Shadows",
    "Spacing",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading })
    ).toBeVisible()
  }

  const colours = page.getByRole("table", { name: "Colours" })
  for (const mode of ["light", "dark"] as const) {
    for (const [key, value] of Object.entries(nightjarPreset.styles[mode])) {
      if (!value.startsWith("oklch")) continue
      const row = colours.getByRole("row", { name: new RegExp(`^--${key} `) })
      const swatch = row.locator(`[data-mode="${mode}"] [data-swatch]`)
      const shown = await swatch.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      )
      expect(await resolveColor(page, shown), `${mode} --${key}`).toBe(
        await resolveColor(page, value)
      )
    }
  }
})

test("token values follow a Theme edit on <html>", async ({ page }) => {
  await page.goto("/design-system/tokens")
  await hydrated(page)
  const radius = page
    .getByRole("table", { name: "Radius" })
    .getByRole("row", { name: /^--radius / })
    .locator('[data-mode="light"]')
  await expect(radius).toHaveText("0.75rem")

  await page.evaluate(() =>
    document.documentElement.style.setProperty("--radius", "1.25rem")
  )
  await expect(radius).toHaveText("1.25rem")
})
