import { parse } from "culori"
import { expect, it } from "vitest"

import { nightjarPreset } from "../../lib/brand/nightjar"
import { isColourToken, renderModeScopeCss } from "./mode-scope"

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

// Pins the colour-token rule against the Nightjar Preset's keys: a key counts
// as a colour exactly when its value is a colour, so a token added to the
// Preset that the rule misclassifies fails here.
it.each(["light", "dark"] as const)(
  "classifies every Nightjar %s token by whether its value is a colour",
  (mode) => {
    const tokens = Object.entries(nightjarPreset.styles[mode])
    const misclassified = tokens
      .filter(([key, value]) => isColourToken(key) !== Boolean(parse(value)))
      .map(([key]) => key)

    expect(tokens.length).toBeGreaterThan(0)
    expect(misclassified).toEqual([])
  }
)
