import { expect, test, type Page } from "@playwright/test"

// Reads `var(--primary)` as the computed colour string. Chrome serialises
// hex and rgb() values as rgb(), so the hex the test types compares as
// rgb(255, 0, 0); oklch() or lab() values keep their own syntax and are only
// compared for inequality here.
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

  await page.getByRole("button", { name: "Open Themer" }).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  const primary = page.getByLabel("Primary", { exact: true })
  await primary.fill("#ff0000")

  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")

  await page.reload()
  await expect(page.getByRole("heading", { name: "Vite app" })).toBeVisible()
  expect(await pagePrimary(page)).toBe("rgb(255, 0, 0)")
})

test("the mode the Themer switched to is the first paint of a reload, with the saved Theme", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Open Themer" }).click()
  await page.getByRole("button", { name: /^Primary & Secondary/ }).click()
  const primary = page.getByLabel("Primary", { exact: true })

  await primary.fill("#ff0000")
  await expect.poll(() => pagePrimary(page)).toBe("rgb(255, 0, 0)")
  await page.getByRole("button", { name: "Switch to dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await primary.fill("#0000ff")
  await expect.poll(() => pagePrimary(page)).toBe("rgb(0, 0, 255)")

  // The first paint: only the inline head script runs, no bundle and so no
  // Themer.
  await page.route("**/*.js", (route) => route.abort())
  await page.reload()

  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  expect(await pagePrimary(page)).toBe("rgb(0, 0, 255)")

  await page.evaluate(() => document.documentElement.classList.remove("dark"))
  expect(await pagePrimary(page)).toBe("rgb(255, 0, 0)")
})
