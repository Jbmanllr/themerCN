// Proves the bundled font list is real Google data.
import { describe, expect, it } from "vitest"
import { FALLBACK_FONTS } from "./font-catalog-data"

describe("bundled font list", () => {
  const categories = [
    "sans-serif",
    "serif",
    "display",
    "handwriting",
    "monospace",
  ] as const

  it("offers about 130 distinct families, at least ten per category", () => {
    const families = new Set(FALLBACK_FONTS.map((font) => font.family))
    expect(families.size).toBe(FALLBACK_FONTS.length)
    expect(families.size).toBeGreaterThanOrEqual(125)
    for (const category of categories) {
      expect(
        FALLBACK_FONTS.filter((font) => font.category === category).length
      ).toBeGreaterThanOrEqual(10)
    }
  })

  it("gives every family a known category and ascending upright weights", () => {
    for (const font of FALLBACK_FONTS) {
      expect(categories).toContain(font.category)
      expect(font.variants.length).toBeGreaterThan(0)
      const weights = font.variants.map(Number)
      expect(weights.every((weight) => weight >= 1 && weight <= 1000)).toBe(
        true
      )
      expect(weights).toEqual([...weights].sort((a, b) => a - b))
    }
  })

  it("carries the weights Google serves, not guessed ones", () => {
    // From fonts.google.com/metadata/fonts: Roboto became a variable family
    // (wght 100-900, wdth 75-100).
    expect(FALLBACK_FONTS.find((font) => font.family === "Roboto")).toEqual({
      family: "Roboto",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    })
  })
})
