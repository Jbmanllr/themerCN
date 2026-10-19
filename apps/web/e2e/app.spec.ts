import { expect, test } from "@playwright/test"

import { hydrated } from "./themer-ui"

// The auth screens and the subscriber app (#26). Everything is mock data, so
// the assertions name the fixed values from lib/mock.

test("logging in (fake) opens the dashboard", async ({ page }) => {
  await page.goto("/login")
  await hydrated(page)
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password").fill("whatever")
  await page.getByRole("button", { name: "Log in" }).click()

  await expect(page).toHaveURL("/app")
  await expect(
    page.getByRole("heading", { level: 2, name: "Good evening, Ada" })
  ).toBeVisible()
})

test("signing up (fake) opens the dashboard", async ({ page }) => {
  await page.goto("/signup")
  await hydrated(page)
  await page.getByLabel("Name").fill("Ada Brennan")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password").fill("whatever")
  await page.getByRole("button", { name: "Create account" }).click()

  await expect(page).toHaveURL("/app")
})

test("the dashboard shows this period's metrics and the latest orders", async ({
  page,
}) => {
  await page.goto("/app")

  const revenue = page.getByRole("group", { name: "Revenue" })
  await expect(revenue).toContainText("$4,210")
  await expect(revenue).toContainText("+8.1%")
  await expect(page.getByRole("group", { name: "Orders" })).toContainText(
    "-2.2%"
  )

  const orders = page.getByRole("table", { name: "Latest orders" })
  await expect(orders.getByRole("row")).toHaveCount(9)
  const first = orders.getByRole("row").nth(1)
  await expect(first).toContainText("NJ-1048")
  await expect(first).toContainText("Ada Brennan")
  await expect(first).toContainText("Paid")
  await expect(first).toContainText("$32.00")
})

test("a saved chat thread opens from the sidebar with its messages", async ({
  page,
}) => {
  await page.goto("/app")
  await hydrated(page)
  await page.getByRole("link", { name: "Espresso too sour" }).click()

  await expect(page).toHaveURL("/app/chat/espresso-too-sour")
  const log = page.getByRole("log", { name: "Espresso too sour" })
  await expect(log).toContainText("18 g in, 30 g out, 22 s.")
  await expect(log).toContainText("Sour usually means under-extracted.")
  await expect(log.getByRole("link", { name: /Night Owl Blend/ })).toBeVisible()
})

test("the Brew Assistant streams the scripted reply that matches", async ({
  page,
}) => {
  await page.goto("/app/chat")
  await hydrated(page)
  const log = page.getByRole("log", { name: "New chat" })
  const composer = page.getByLabel("Message the Brew Assistant")
  await composer.fill("What ratio should I use for my V60?")
  await composer.press("Enter")

  await expect(log).toContainText("What ratio should I use for my V60?")
  await expect(composer).toHaveValue("")
  // Block one, then block two: the reply arrives in order.
  await expect(log).toContainText("1:16 is a friendly start")
  await expect(log).toContainText("bloom 45 g")
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled()
  await composer.fill("thanks")
  await expect(page.getByRole("button", { name: "Send" })).toBeEnabled()
})

test("the Brew Assistant falls back when nothing matches", async ({ page }) => {
  await page.goto("/app/chat/v60-ratios")
  await hydrated(page)
  const composer = page.getByLabel("Message the Brew Assistant")
  await composer.fill("Tell me a joke")
  await page.getByRole("button", { name: "Send" }).click()

  await expect(page.getByRole("log", { name: "V60 ratios" })).toContainText(
    "I can help with brew ratios"
  )
})

test("the top bar names the current screen and the sidebar marks it", async ({
  page,
}) => {
  const sections = ["Dashboard", "Brew Assistant", "Settings"]
  for (const [path, title, active] of <[string, string, string[]][]>[
    ["/app", "Dashboard", ["Dashboard"]],
    ["/app/chat", "Brew Assistant", ["Brew Assistant"]],
    [
      "/app/chat/espresso-too-sour",
      "Brew Assistant",
      ["Brew Assistant", "Espresso too sour"],
    ],
    ["/app/settings", "Settings", ["Settings"]],
  ]) {
    await page.goto(path)
    await hydrated(page)
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true })
    ).toBeVisible()
    for (const name of [...sections, "Espresso too sour"]) {
      const link = page.getByRole("link", { name, exact: true })
      if (active.includes(name)) {
        await expect(link).toHaveAttribute("data-active")
      } else {
        await expect(link).not.toHaveAttribute("data-active")
      }
    }
  }
})

test("an unknown chat thread is a 404", async ({ page }) => {
  const response = await page.goto("/app/chat/no-such-thread")
  expect(response?.status()).toBe(404)
})

test("settings save (fake) and confirm what changed", async ({ page }) => {
  await page.goto("/app/settings")
  await hydrated(page)
  await expect(page.getByLabel("Name")).toHaveValue("Ada Brennan")
  await expect(page.getByRole("radio", { name: /Night Shift/ })).toBeChecked()

  await page.getByRole("radio", { name: /Sampler/ }).click()
  await page.getByLabel("Grind").selectOption("Espresso")
  await page.getByRole("switch", { name: "Brew tips" }).click()
  await page.getByRole("button", { name: "Save changes" }).click()

  await expect(page.getByRole("status")).toHaveText("Settings saved.")
  await expect(page.getByRole("radio", { name: /Sampler/ })).toBeChecked()
})

test("settings ask for a name instead of saving an empty one", async ({
  page,
}) => {
  await page.goto("/app/settings")
  await hydrated(page)
  await page.getByLabel("Name").fill("")
  await page.getByRole("button", { name: "Save changes" }).click()

  await expect(page.getByText("Enter your name.")).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("")
})

for (const colorScheme of ["light", "dark"] as const) {
  test(`every auth and app page renders in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    for (const [path, heading] of <[string, string][]>[
      ["/login", "Welcome back"],
      ["/signup", "Start brewing with us"],
      ["/app", "Good evening, Ada"],
      ["/app/chat", "New chat"],
      ["/app/chat/espresso-too-sour", "Espresso too sour"],
      ["/app/settings", "Your account"],
    ]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: heading })).toBeVisible()
      if (colorScheme === "dark") {
        await expect(page.locator("html")).toHaveClass(/\bdark\b/)
      } else {
        await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
      }
    }
  })
}

test("the login form asks for the missing fields instead of submitting", async ({
  page,
}) => {
  await page.goto("/login")
  await hydrated(page)
  await page.getByRole("button", { name: "Log in" }).click()

  await expect(page).toHaveURL("/login")
  await expect(page.getByText("Enter your email address.")).toBeVisible()
})
