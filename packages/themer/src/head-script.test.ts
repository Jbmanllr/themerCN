// @vitest-environment happy-dom

// `themercn/head-script` gives a Host app the pre-paint restore as a string
// it can inline in its HTML (a Vite `transformIndexHtml`, the Next Adapter).
// These checks fail if the string reads another namespace's saved Theme than
// the one the Host's <Themer> writes, or if it carries the `data-themer`
// marker the Vite smoke app greps for to prove nothing of the Themer shipped.
// What the script does with a saved edit is covered in
// utils/theme-script.test.ts.
import { beforeEach, expect, it } from "vitest"

import { COLOR_MODE_RECORD, EDITOR_STATE_VERSION } from "./config/constants"
import { getThemerHeadScript } from "./head-script"

function save(namespace: string, primary: string) {
  localStorage.setItem(
    `${namespace}:editor`,
    JSON.stringify({
      state: {
        themeState: { currentMode: "light", styles: { light: { primary } } },
      },
      version: EDITOR_STATE_VERSION,
    })
  )
}

const primary = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim()

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = ""
})

it("restores the Theme saved under the Host's storage namespace", () => {
  save("themercn", "#111111")
  save("shop", "#222222")

  new Function(getThemerHeadScript({ storageNamespace: "shop" }))()

  expect(primary()).toBe("#222222")
})

it("restores the default namespace's Theme when given none", () => {
  save("themercn", "#111111")

  new Function(getThemerHeadScript())()

  expect(primary()).toBe("#111111")
})

const colourModeRecord = () =>
  (window as unknown as Record<string, Record<string, string | null>>)[
    COLOR_MODE_RECORD
  ]

it("records the saved colour mode it read, under its storage key", () => {
  localStorage.setItem("shop:color-mode", "dark")

  new Function(getThemerHeadScript({ storageNamespace: "shop" }))()

  expect(colourModeRecord()?.["shop:color-mode"]).toBe("dark")
})

it("records nothing saved as null, with no write to <html>", () => {
  const before = document.documentElement.outerHTML

  new Function(getThemerHeadScript({ storageNamespace: "empty" }))()

  expect(colourModeRecord()).toHaveProperty(["empty:color-mode"], null)
  expect(document.documentElement.outerHTML).toBe(before)
})

it("does not carry the data-themer marker", () => {
  expect(getThemerHeadScript()).not.toContain("data-themer")
})
