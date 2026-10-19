import { expect, test, type Page } from "@playwright/test"

// The Themer's isolation promise, in a real browser: mounting it leaves the
// Host page's own CSS alone, `@keyframes` included, while its own UI and its
// portalled popups still follow the Theme being edited.

// Conflicting Host CSS, served in the page's <head> before the Themer's
// <style> lands after it: layered and unlayered element rules on the
// properties Preflight resets, and `@keyframes` named like the Themer's
// (tw-animate-css's `enter`, Tailwind's `spin` and `pulse`) with distinct
// values. Each animation is paused halfway through, so its keyframes show up
// in the computed style. The fixture's root sets the inherited values the
// Theme would otherwise reach (mounting applies the Preset's `--font-sans`
// to the page, which is the Themer's job, not a leak).
const HOST_CSS = `
#host { font-family: Georgia, serif; color: rgb(70, 80, 90); }
@layer host {
  #host button {
    color: rgb(10, 20, 30);
    background-color: rgb(200, 210, 220);
    border: 2px solid rgb(40, 50, 60);
    border-radius: 3px;
    padding: 7px 11px;
    font: italic 600 15px/1.7 serif;
  }
  #host ul { list-style: square; margin: 9px; padding-left: 13px; }
}
#host h2 { font-size: 19px; font-weight: 300; letter-spacing: 2px; margin: 5px 0; }
#host p { margin: 3px 0 8px; line-height: 2.1; }
#host img { display: inline; vertical-align: middle; }
@keyframes spin { from { opacity: 0.2; } to { opacity: 0.6; } }
@keyframes pulse { from { color: rgb(0, 0, 100); } to { color: rgb(0, 0, 200); } }
@keyframes enter { from { translate: 0 10px; } to { translate: 0 30px; } }
#host .spin { animation: spin 100s linear -50s paused; }
#host .pulse { animation: pulse 100s linear -50s paused; }
#host .enter { animation: enter 100s linear -50s paused; }
`

const HOST_HTML = `
<div id="host" style="position: fixed; top: 0; left: 0; width: 320px; z-index: -1">
  <h2>Host heading</h2>
  <p>Host paragraph</p>
  <button type="button">Host button</button>
  <ul><li>Host item</li></ul>
  <img alt="" width="8" height="8" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
  <div class="spin">spin</div>
  <div class="pulse">pulse</div>
  <div class="enter">enter</div>
</div>
`

/** Every Host element's computed style, custom properties aside. */
function hostStyles(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready
    const styles: Record<string, Record<string, string>> = {}
    document.querySelectorAll("#host *").forEach((element) => {
      const computed = getComputedStyle(element)
      const own: Record<string, string> = {}
      // `@property` registrations stay global (README, known leaks), so the
      // registered `--tw-*` values are left out.
      for (const property of Array.from(computed))
        if (!property.startsWith("--"))
          own[property] = computed.getPropertyValue(property)
      const name = element.tagName.toLowerCase()
      styles[element.className ? `${name}.${element.className}` : name] = own
    })
    return styles
  })
}

test("mounting the Themer leaves the Host's computed styles and animations unchanged", async ({
  page,
}) => {
  await page.route(
    (url) => url.pathname === "/",
    async (route) => {
      const response = await route.fetch()
      const body = (await response.text())
        .replace("</head>", `<style>${HOST_CSS}</style></head>`)
        .replace("<body>", `<body>${HOST_HTML}`)
      await route.fulfill({ response, body })
    }
  )
  // Hold every script until the Host page has been measured: before it, only
  // the HTML, the Host's stylesheets and the inline head script have run.
  let releaseScripts = () => {}
  const scriptsHeld = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  await page.route(/\.js$/, async (route) => {
    await scriptsHeld
    await route.continue()
  })

  await page.goto("/", { waitUntil: "commit" })
  await page.waitForFunction(
    () =>
      document.getElementById("host") !== null &&
      Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
      ).every((link) => link.sheet !== null)
  )
  const before = await hostStyles(page)
  expect(Object.keys(before)).toHaveLength(9)
  expect(before["div.spin"]?.["opacity"]).toBe("0.4")
  expect(before["div.spin"]?.["animation-name"]).toBe("spin")

  releaseScripts()
  await expect(page.locator("style[data-themer-style]")).toHaveCount(1)
  await expect(page.locator("[data-themer]")).toHaveCount(1)
  await expect(
    page.getByRole("button", { name: "Open Themer" })
  ).toBeVisible()

  expect(await hostStyles(page)).toEqual(before)
})

test("a Themer control and a portalled popup restyle after a token edit", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Open Themer" }).click()
  const control = page.getByRole("button", { name: "Switch to dark mode" })
  await expect(control).toBeVisible()
  expect(
    await control.evaluate((element) => getComputedStyle(element).color)
  ).not.toBe("rgb(255, 0, 0)")

  await page.getByRole("button", { name: /^Base/ }).click()
  await page.getByLabel("Foreground", { exact: true }).fill("#ff0000")
  await page.getByLabel("Popover", { exact: true }).fill("#00ff00")

  // The Toolbar control, in the Themer's scope, reads the edited
  // `--foreground`.
  await expect
    .poll(() => control.evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(255, 0, 0)")

  // The popup renders in the Themer's portal container, outside the sidebar,
  // and reads the edited `--popover`.
  await page.getByRole("combobox", { name: "Theme preset" }).click()
  const popup = page.locator(
    "[data-themer-portals] [data-slot='popover-content']"
  )
  await expect(popup).toBeVisible()
  expect(
    await popup.evaluate((element) => getComputedStyle(element).backgroundColor)
  ).toBe("rgb(0, 255, 0)")
})
