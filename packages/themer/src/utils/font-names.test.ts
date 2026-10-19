// Proves the family-name helpers: names are quoted only where CSS needs it,
// and host `var(...)` and system stacks never name a Google family.
import { describe, expect, it } from "vitest"
import {
  buildFontFamily,
  describeFontValue,
  extractFontFamily,
  getThemeFontFamilies,
  quoteFontFamily,
} from "./font-names"

describe("family names", () => {
  it("quotes names CSS cannot take bare and leaves keywords alone", () => {
    expect(quoteFontFamily("Source Serif 4")).toBe('"Source Serif 4"')
    expect(quoteFontFamily("Open Sans")).toBe('"Open Sans"')
    expect(quoteFontFamily("Inter")).toBe("Inter")
    expect(quoteFontFamily("serif")).toBe("serif")
    expect(quoteFontFamily("ui-sans-serif")).toBe("ui-sans-serif")
    expect(quoteFontFamily('"Lora"')).toBe('"Lora"')
    expect(quoteFontFamily("var(--font-dm-sans)")).toBe("var(--font-dm-sans)")
    expect(buildFontFamily("Source Serif 4", "serif")).toBe(
      '"Source Serif 4", ui-serif, serif'
    )
  })

  it("finds no Google family in host stacks or system stacks", () => {
    expect(extractFontFamily("var(--font-dm-sans), sans-serif")).toBeNull()
    expect(extractFontFamily("ui-monospace, monospace")).toBeNull()
    expect(extractFontFamily('"Source Serif 4", ui-serif')).toBe(
      "Source Serif 4"
    )
    expect(
      getThemeFontFamilies(
        {
          "font-sans": "Inter, sans-serif",
          "font-heading": "var(--font-fraunces), serif",
        },
        { "font-sans": "Inter, sans-serif", "font-mono": "Fira Code" }
      )
    ).toEqual(["Inter", "Fira Code"])
  })
})

describe("describeFontValue", () => {
  it("names the first family of a stack", () => {
    expect(describeFontValue('"Source Serif 4", serif')).toEqual({
      kind: "family",
      family: "Source Serif 4",
    })
  })

  it("follows host variables to the family they set", () => {
    const vars: Record<string, string> = {
      "--font-sans": "var(--font-dm-sans), sans-serif",
      "--font-dm-sans": '"DM Sans", "DM Sans Fallback"',
    }
    expect(
      describeFontValue("var(--font-sans)", (name) => vars[name] ?? "")
    ).toEqual({ kind: "variable", variable: "--font-sans", family: "DM Sans" })
    expect(describeFontValue("var(--font-missing)", () => "")).toEqual({
      kind: "variable",
      variable: "--font-missing",
      family: null,
    })
  })

  it("calls a stack of generic names a system font", () => {
    expect(describeFontValue("ui-sans-serif, system-ui, sans-serif")).toEqual({
      kind: "system",
      generic: "ui-sans-serif",
    })
    expect(describeFontValue("")).toEqual({ kind: "empty" })
  })
})

describe("getThemeFontFamilies", () => {
  it("does not request fonts every OS ships from Google", () => {
    expect(
      getThemeFontFamilies({
        "font-sans": "Montserrat, sans-serif",
        "font-serif": "Georgia, serif",
        "font-mono": "Menlo, monospace",
      })
    ).toEqual(["Montserrat"])
  })
})
