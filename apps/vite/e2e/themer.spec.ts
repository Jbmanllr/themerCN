import { expect, test, type Page } from "@playwright/test"

// Resolves `var(--primary)` on the page to an rgb() string, whatever colour
// syntax the Themer wrote the token in.
function pagePrimary(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.color = "var(--primary)"
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
}

test("a token edited in the Themer restyles the page and survives a reload", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Vite app" })).toBeVisible()
  expect(await pagePrimary(page)).not.toBe("rgb(255, 0, 0)")

  await page.getByRole("button", { name: "Open Theme Editor" }).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  const primary = page.getByLabel("Primary", { exact: true })
  await primary.fill("#ff0000")

  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")

  await page.reload()
  await expect(page.getByRole("heading", { name: "Vite app" })).toBeVisible()
  expect(await pagePrimary(page)).toBe("rgb(255, 0, 0)")
})
