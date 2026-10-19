// The colour picker's Tailwind palette is labelled "Tailwind v4". It held v3
// hex values, so picking red-500 wrote a colour that did not match the app's
// own bg-red-500, and a theme already holding the real v4 value never showed
// as selected. These tests pin the palette to v4's values and the picker's
// list over it.
import * as culori from "culori"
import { describe, expect, it } from "vitest"

import {
  colorFamilies,
  filterTailwindPaletteEntries,
  getTailwindPaletteEntries,
  shades,
  tailwindColors,
} from "./tailwind-palette"

describe("tailwind palette values", () => {
  it("holds v4's red-500 (oklch, #fb2c36), not v3's #ef4444", () => {
    const red500 = tailwindColors.red[500]
    expect(red500).toBe("oklch(63.7% 0.237 25.331)")
    expect(culori.formatHex(culori.parse(red500))).toBe("#fb2c36")
  })

  it("has every shade of every family as a colour the editor can parse", () => {
    for (const family of colorFamilies) {
      for (const shade of shades) {
        const value = tailwindColors[family][shade]
        expect(
          culori.parse(value),
          `${family}-${shade}: ${value}`
        ).not.toBeUndefined()
      }
    }
  })

  it("gets darker with the shade number in every family", () => {
    for (const family of colorFamilies) {
      const lightness = shades.map(
        (shade) => culori.oklch(culori.parse(tailwindColors[family][shade])!)!.l
      )
      for (let index = 1; index < lightness.length; index++) {
        expect(
          lightness[index],
          `${family}: ${shades[index]} against ${shades[index - 1]}`
        ).toBeLessThan(lightness[index - 1]!)
      }
    }
  })
})

describe("palette list", () => {
  it("lists the special colours by their bare name and shades as family-shade", () => {
    const names = getTailwindPaletteEntries().map((entry) => entry.name)
    expect(names).toContain("white")
    expect(names).toContain("transparent")
    expect(names).toContain("red-500")
    expect(names).not.toContain("white-DEFAULT")
  })

  it("filters by every word, over the name, family, shade and value", () => {
    const names = (query: string) =>
      filterTailwindPaletteEntries(query).map((entry) => entry.name)

    expect(names("red 500")).toEqual(["red-500"])
    expect(names("RED-5")).toEqual(["red-50", "red-500"])
    expect(names("zzz")).toEqual([])
    expect(names("   ")).toHaveLength(getTailwindPaletteEntries().length)
  })
})
