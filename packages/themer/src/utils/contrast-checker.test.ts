// Proves the WCAG levels the contrast checker reports: AAA 7, AA 4.5 and AA
// Large 3 for normal text (AA Large fails there), large text rated on its own
// 3 and 4.5 thresholds, no level the criteria do not define, the sidebar pairs
// carrying their group, and a pair with a missing token skipped.
import { describe, expect, it } from "vitest"

import { checkThemeContrast, checkWCAGCompliance } from "./contrast-checker"

describe("checkThemeContrast", () => {
  const styles = {
    foreground: "#000000",
    background: "#ffffff",
    sidebar: "#ffffff",
    "sidebar-foreground": "#777777",
    "sidebar-accent": "#ffffff",
    "sidebar-accent-foreground": "#ffffff",
  }

  it("rates the sidebar accent pair with the sidebar group", () => {
    const results = checkThemeContrast(styles)
    const accent = results.find((result) => result.bg === "sidebar-accent")
    expect(accent).toMatchObject({
      fg: "sidebar-accent-foreground",
      group: "Sidebar",
      level: "Fail",
      passes: false,
    })
    expect(accent?.ratio).toBeCloseTo(1)
  })

  it("skips pairs with a missing token and keeps the token names", () => {
    const results = checkThemeContrast(styles)
    expect(results.map((result) => `${result.fg}/${result.bg}`)).toEqual([
      "foreground/background",
      "sidebar-foreground/sidebar",
      "sidebar-accent-foreground/sidebar-accent",
    ])
    expect(results[0]).toMatchObject({ level: "AAA", passes: true })
    expect(results[0]?.group).toBeUndefined()
  })
})

describe("checkWCAGCompliance levels", () => {
  it("keeps AAA 7, AA 4.5 and AA Large 3, with AA Large failing normal text", () => {
    expect(checkWCAGCompliance("#000", "#fff").level).toBe("AAA")
    // #767676 on white is ~4.54:1.
    expect(checkWCAGCompliance("#767676", "#fff")).toMatchObject({
      level: "AA",
      passes: true,
    })
    // #949494 on white is ~3.03:1.
    expect(checkWCAGCompliance("#949494", "#fff")).toMatchObject({
      level: "AA Large",
      passes: false,
    })
    expect(checkWCAGCompliance("#eeeeee", "#fff").level).toBe("Fail")
  })

  // WCAG 1.4.3 has no "A" level: large text needs 3:1 for AA and 4.5:1 for AAA,
  // and the labels for text below those ratios must not claim a level.
  it("rates large text against its own 3 and 4.5 thresholds", () => {
    // #949494 on white is ~3.03:1: too little for normal text, AA for large.
    expect(checkWCAGCompliance("#949494", "#fff", true)).toMatchObject({
      level: "AA",
      passes: true,
    })
    // #767676 on white is ~4.54:1: AA for normal text, AAA for large.
    expect(checkWCAGCompliance("#767676", "#fff", true)).toMatchObject({
      level: "AAA",
      passes: true,
    })
    expect(checkWCAGCompliance("#bbbbbb", "#fff", true)).toMatchObject({
      level: "Fail",
      passes: false,
    })
  })

  it("never reports a level the WCAG criteria do not have", () => {
    const levels = new Set<string>()
    for (const grey of ["#000", "#595959", "#767676", "#949494", "#eee"]) {
      for (const large of [false, true]) {
        levels.add(checkWCAGCompliance(grey, "#fff", large).level)
      }
    }
    expect([...levels].sort()).toEqual(["AA", "AA Large", "AAA", "Fail"].sort())
    expect(levels.has("A")).toBe(false)
  })
})
