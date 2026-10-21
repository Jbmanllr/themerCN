import { expect, test } from "@playwright/test"

import { hydrated } from "./page"

// The auth screens and the subscriber app (#26). Everything is mock data, so
// the assertions name the fixed values from lib/mock.

test(
  "logging in (fake) opens the dashboard",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/login")
    await hydrated(page)
    await page.getByLabel("Email").fill("ada@example.com")
    await page.getByLabel("Password").fill("whatever")
    await page.getByRole("button", { name: "Log in" }).click()

    await expect(page).toHaveURL("/app")
    await expect(
      page.getByRole("heading", { level: 2, name: "Good evening, Ada" })
    ).toBeVisible()
  }
)

test(
  "signing up (fake) opens the dashboard",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/signup")
    await hydrated(page)
    await page.getByLabel("Name").fill("Ada Brennan")
    await page.getByLabel("Email").fill("ada@example.com")
    await page.getByLabel("Password").fill("whatever")
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page).toHaveURL("/app")
  }
)

test(
  "the dashboard shows this period's metrics and the latest orders",
  { tag: "@playground" },
  async ({ page }) => {
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
  }
)

test(
  "a saved chat thread opens from the sidebar with its messages",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/app")
    await hydrated(page)
    await page.getByRole("link", { name: "Espresso too sour" }).click()

    await expect(page).toHaveURL("/app/chat/espresso-too-sour")
    const log = page.getByRole("log", { name: "Espresso too sour" })
    await expect(log).toContainText("18 g in, 30 g out, 22 s.")
    await expect(log).toContainText("Sour usually means under-extracted.")
    await expect(
      log.getByRole("link", { name: /Night Owl Blend/ })
    ).toBeVisible()
  }
)

test(
  "the Brew Assistant streams the scripted reply that matches",
  { tag: "@playground" },
  async ({ page }) => {
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
  }
)

test(
  "the Brew Assistant falls back when nothing matches",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/app/chat/v60-ratios")
    await hydrated(page)
    const composer = page.getByLabel("Message the Brew Assistant")
    await composer.fill("Tell me a joke")
    await page.getByRole("button", { name: "Send" }).click()

    await expect(page.getByRole("log", { name: "V60 ratios" })).toContainText(
      "I can help with brew ratios"
    )
  }
)

test(
  "the top bar names the current screen and the sidebar marks it",
  { tag: "@playground" },
  async ({ page }) => {
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
  }
)

test(
  "an unknown chat thread is a 404",
  { tag: "@playground" },
  async ({ page }) => {
    const response = await page.goto("/app/chat/no-such-thread")
    expect(response?.status()).toBe(404)
  }
)

test(
  "settings save (fake), confirm, and clear the confirmation on the next change",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/app/settings")
    await hydrated(page)
    await expect(page.getByLabel("Name")).toHaveValue("Ada Brennan")
    await expect(page.getByRole("radio", { name: /Night Shift/ })).toBeChecked()

    await page.getByRole("radio", { name: /Sampler/ }).click()
    await page.getByLabel("Grind").selectOption("Espresso")
    await page.getByRole("switch", { name: "Brew tips" }).click()
    await page.getByRole("button", { name: "Save changes" }).click()

    await expect(page.getByRole("status")).toHaveText("Settings saved.")
    await expect(page.getByText("Settings saved.")).toBeFocused()
    await expect(page.getByRole("radio", { name: /Sampler/ })).toBeChecked()
    await expect(page.getByRole("switch", { name: "Brew tips" })).toBeChecked()

    await page.getByRole("switch", { name: "New origins" }).click()
    await expect(page.getByRole("status")).toHaveText("")
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByRole("status")).toHaveText("Settings saved.")
    await page.getByLabel("Name").fill("Ada B.")
    await expect(page.getByRole("status")).toHaveText("")
  }
)

test(
  "settings flag an empty name and a malformed email, and focus the first",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/app/settings")
    await hydrated(page)
    await page.getByLabel("Name").fill("")
    await page.getByLabel("Email").fill("ada")
    await page.getByRole("button", { name: "Save changes" }).click()

    for (const { label, error } of [
      { label: "Name", error: "Enter your name." },
      { label: "Email", error: "Enter a valid email address." },
    ]) {
      const input = page.getByLabel(label, { exact: true })
      await expect(input).toHaveAttribute("aria-invalid", "true")
      await expect(input).toHaveAccessibleDescription(error)
      await expect(
        page.getByRole("alert").filter({ hasText: error })
      ).toBeVisible()
    }
    await expect(page.getByLabel("Name")).toBeFocused()
    await expect(page.getByRole("status")).toHaveText("")
  }
)

for (const colorScheme of ["light", "dark"] as const) {
  test(
    `every auth and app page renders in ${colorScheme} mode`,
    { tag: "@playground" },
    async ({ page }) => {
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
    }
  )
}

// Each auth form, submitted empty: every field shows its error, is marked
// invalid with the error as its description, and focus moves to the first.
for (const { path, submit, fields } of [
  {
    path: "/login",
    submit: "Log in",
    fields: [
      { label: "Email", error: "Enter your email address." },
      { label: "Password", error: "Enter your password." },
    ],
  },
  {
    path: "/signup",
    submit: "Create account",
    fields: [
      { label: "Name", error: "Enter your name." },
      { label: "Email", error: "Enter your email address." },
      { label: "Password", error: "Choose a password." },
    ],
  },
]) {
  test(
    `the ${path} form flags every empty field and focuses the first`,
    { tag: "@playground" },
    async ({ page }) => {
      await page.goto(path)
      await hydrated(page)
      await page.getByRole("button", { name: submit }).click()

      await expect(page).toHaveURL(path)
      for (const { label, error } of fields) {
        const input = page.getByLabel(label, { exact: true })
        await expect(input).toHaveAttribute("aria-invalid", "true")
        await expect(input).toHaveAccessibleDescription(error)
        await expect(
          page.getByRole("alert").filter({ hasText: error })
        ).toBeVisible()
      }
      await expect(
        page.getByLabel(fields[0]!.label, { exact: true })
      ).toBeFocused()
    }
  )
}

test(
  "the login form rejects an email address without an @",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/login")
    await hydrated(page)
    await page.getByLabel("Email").fill("ada")
    await page.getByLabel("Password").fill("whatever")
    await page.getByRole("button", { name: "Log in" }).click()

    await expect(page).toHaveURL("/login")
    await expect(page.getByLabel("Email")).toHaveAccessibleDescription(
      "Enter a valid email address."
    )
    await expect(page.getByLabel("Email")).toBeFocused()
  }
)

test(
  "a field's hint is its description until it shows an error",
  { tag: "@playground" },
  async ({ page }) => {
    await page.goto("/signup")
    await hydrated(page)
    const password = page.getByLabel("Password", { exact: true })
    await expect(password).toHaveAccessibleDescription(
      "Any password works here."
    )

    await page.getByRole("button", { name: "Create account" }).click()

    await expect(password).toHaveAccessibleDescription("Choose a password.")
  }
)

test.describe("before hydration", () => {
  // No JavaScript: the server HTML, as a visitor on a slow connection submits
  // it before React attaches its handlers.
  test.use({ javaScriptEnabled: false })

  test(
    "a login submit never puts the credentials in the URL",
    { tag: "@playground" },
    async ({ page }) => {
      await page.goto("/login")
      await page.getByLabel("Email").fill("ada@example.com")
      await page.getByLabel("Password").fill("whatever")
      const submitted = page.waitForRequest(
        (request) =>
          request.isNavigationRequest() && request.frame() === page.mainFrame()
      )
      await page.getByRole("button", { name: "Log in" }).click()

      expect(new URL((await submitted).url()).search).toBe("")
      await page.waitForLoadState()
      expect(new URL(page.url()).search).toBe("")
    }
  )
})
