import { expect, it } from "vitest"

import { renderModeScopeCss } from "./mode-scope"

const preset = {
  light: {
    background: "white",
    primary: "navy",
    radius: "1rem",
    "font-sans": "Inter",
    "shadow-color": "black",
  },
  dark: {
    background: "black",
    primary: "gold",
    radius: "1rem",
    "font-sans": "Inter",
    "shadow-color": "black",
  },
}

it("pins each half's colours when the page is in the other mode", () => {
  expect(renderModeScopeCss(preset)).toBe(
    [
      '[data-mode="light"] { color-scheme: light; }',
      '[data-mode="dark"] { color-scheme: dark; }',
      '.dark [data-mode="light"] {',
      "  --background: white;",
      "  --primary: navy;",
      "}",
      ':root:not(.dark) [data-mode="dark"] {',
      "  --background: black;",
      "  --primary: gold;",
      "}",
      "",
    ].join("\n")
  )
})
