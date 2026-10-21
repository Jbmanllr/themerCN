import { expect, test } from "@playwright/test"

import { cartLink, definitionOf, hydrated } from "./page"

test(
  "a visitor browses to a product and adds it to the cart",
  { tag: "@smoke" },
  async ({ page }) => {
    await page.goto("/shop")
    await hydrated(page)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Beans, gear and a standing order"
    )
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 0 items")

    await page.getByRole("link", { name: "All beans" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Beans" })
    ).toBeVisible()
    await page.getByRole("link", { name: "Night Owl Blend" }).click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Night Owl Blend" })
    ).toBeVisible()
    await page.getByRole("radio", { name: "Filter" }).check()
    await page.getByRole("radio", { name: "1kg" }).check()
    await page.getByRole("button", { name: "Increase quantity" }).click()
    await page.getByRole("button", { name: "Add to cart" }).click()

    await expect(cartLink(page)).toHaveAccessibleName("Cart, 2 items")
    await expect(page.getByText("Added 2 to your cart.")).toBeVisible()
  }
)

test("the cart edits quantities, removes lines and checks out", async ({
  page,
}) => {
  await page.goto("/shop/p/ethiopia-guji")
  await hydrated(page)
  await page.getByRole("button", { name: "Add to cart" }).click()
  // The cart is in memory: move around with links, not page loads.
  await page.getByRole("link", { name: "Shop", exact: true }).first().click()
  await page.getByRole("link", { name: "Hand grinder" }).click()
  await page.getByRole("button", { name: "Add to cart" }).click()
  await expect(cartLink(page)).toHaveAccessibleName("Cart, 2 items")

  await page.getByRole("link", { name: /^Cart, 2 items/ }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your cart")
  const guji = page.getByRole("listitem").filter({ hasText: "Ethiopia Guji" })
  await guji
    .getByRole("button", { name: "Increase quantity of Ethiopia Guji" })
    .click()
  await expect(cartLink(page)).toHaveAccessibleName("Cart, 3 items")
  await expect(definitionOf(page, /^Subtotal\b/)).toHaveText("$131.00")

  await page
    .getByRole("listitem")
    .filter({ hasText: "Hand grinder" })
    .getByRole("button", { name: "Remove Hand grinder" })
    .click()
  await expect(cartLink(page)).toHaveAccessibleName("Cart, 2 items")
  await expect(definitionOf(page, /^Subtotal\b/)).toHaveText("$42.00")

  await page.getByRole("link", { name: "Check out" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Full name").fill("Ada Lovelace")
  await page.getByLabel("Address").fill("12 Owl Lane")
  await page.getByLabel("City").fill("Portland")
  await page.getByLabel("Postcode").fill("97201")
  await page.getByRole("radio", { name: /^Express/ }).check()
  await expect(definitionOf(page, /^Total$/)).toHaveText("$54.00")
  await page.getByRole("button", { name: "Place order" }).click()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thanks, Ada. Your coffee is on its way."
  )
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  await expect(page.getByText("Order NJ-1042")).toBeVisible()
  await expect(cartLink(page)).toHaveAccessibleName("Cart, 0 items")
})

test("checkout flags every missing field and focuses the first", async ({
  page,
}) => {
  await page.goto("/shop/p/ethiopia-guji")
  await hydrated(page)
  await page.getByRole("button", { name: "Add to cart" }).click()
  // The cart is in memory: reach checkout through links, not a page load.
  await page.getByRole("link", { name: /^Cart, 1 item/ }).click()
  await page.getByRole("link", { name: "Check out" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout")
  await page.getByRole("button", { name: "Place order" }).click()

  for (const { label, error } of [
    { label: "Email", error: "Enter your email address." },
    { label: "Full name", error: "Enter your full name." },
    { label: "Address", error: "Enter your street address." },
    { label: "City", error: "Enter your city." },
    { label: "Postcode", error: "Enter your postcode." },
  ]) {
    const input = page.getByLabel(label, { exact: true })
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(error)
    await expect(
      page.getByRole("alert").filter({ hasText: error })
    ).toBeVisible()
  }
  await expect(page.getByLabel("Email")).toBeFocused()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout")
})

test("an empty cart points back to the shop", async ({ page }) => {
  await page.goto("/cart")
  await expect(
    page.getByRole("heading", { name: "Your cart is empty" })
  ).toBeVisible()
  await page.goto("/checkout")
  await expect(
    page.getByRole("heading", { name: "Your cart is empty" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Browse the shop" })
  ).toBeVisible()
})

test("unknown categories and products are 404s", async ({ page }) => {
  for (const path of ["/shop/teapots", "/shop/p/teapot"]) {
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(404)
  }
})

for (const colorScheme of ["light", "dark"] as const) {
  test(`every shop screen renders in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))

    for (const path of [
      "/shop",
      "/shop/beans",
      "/shop/gear",
      "/shop/subscriptions",
      "/shop/p/night-owl-blend",
      "/cart",
      "/checkout",
    ]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible()
      await expect(page.locator("html"), path).toHaveClass(
        colorScheme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/
      )
    }
    expect(errors).toEqual([])
  })
}

test.describe("before hydration", () => {
  // No JavaScript: the server HTML, as a visitor on a slow connection submits
  // it before React attaches its handlers.
  test.use({ javaScriptEnabled: false })

  test("an add-to-cart submit never puts the options in the URL", async ({
    page,
  }) => {
    await page.goto("/shop/p/night-owl-blend")
    const submitted = page.waitForRequest(
      (request) =>
        request.isNavigationRequest() && request.frame() === page.mainFrame()
    )
    await page.getByRole("button", { name: "Add to cart" }).click()

    expect(new URL((await submitted).url()).search).toBe("")
  })
})
