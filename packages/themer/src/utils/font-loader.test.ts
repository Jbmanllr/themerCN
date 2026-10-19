// Proves font-loader on a FakeDocument: names are quoted only where CSS needs
// it, host `var(...)` and system stacks never reach Google, one link per
// family is shared per document and removed with its last holder, previews are
// text subsets, a rejected weight retries once at the default weight, theme
// fonts follow the theme, and waitForFont waits for the stylesheet (and its
// retry) before the face, and the bundled list is real Google data.
import { afterEach, describe, expect, it, vi } from "vitest"
import { FakeDocument } from "./fake-document.test-helper"
import {
  describeFontValue,
  FALLBACK_FONTS,
  FONT_LINK_ATTRIBUTE,
  acquireFontPreview,
  acquireGoogleFont,
  buildFontFamily,
  clearThemeFonts,
  extractFontFamily,
  formatFontFamily,
  getThemeFontFamilies,
  quoteFontFamily,
  setThemeFonts,
  waitForFont,
} from "./font-loader"

function links(doc: FakeDocument) {
  return doc.headChildren("link")
}

function familiesIn(doc: FakeDocument) {
  return links(doc)
    .map((link) => link.getAttribute(FONT_LINK_ATTRIBUTE))
    .sort()
}

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
    expect(formatFontFamily(["Fira Code", "monospace"])).toBe(
      '"Fira Code", monospace'
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

describe("link registry", () => {
  it("shares one link per family and removes it with the last holder", () => {
    const doc = new FakeDocument()
    const first = acquireGoogleFont("Inter", { doc: doc.asDocument })
    const second = acquireGoogleFont("Inter", { doc: doc.asDocument })
    expect(links(doc)).toHaveLength(1)

    first()
    first()
    expect(links(doc)).toHaveLength(1)
    second()
    expect(links(doc)).toHaveLength(0)
  })

  it("keeps documents apart, so an iframe gets its own link", () => {
    const page = new FakeDocument()
    const frame = new FakeDocument()
    acquireGoogleFont("Lora", { doc: page.asDocument })
    acquireGoogleFont("Lora", { doc: frame.asDocument })

    expect(links(page)).toHaveLength(1)
    expect(links(frame)).toHaveLength(1)
  })

  it("never requests var() or system families from Google", () => {
    const doc = new FakeDocument()
    acquireGoogleFont("var(--font-dm-sans)", { doc: doc.asDocument })()
    acquireGoogleFont("sans-serif", { doc: doc.asDocument })
    acquireFontPreview("var(--font-fraunces)", { doc: doc.asDocument })

    expect(links(doc)).toHaveLength(0)
  })

  it("loads previews as a text subset, separately from the full family", () => {
    const doc = new FakeDocument()
    const release = acquireFontPreview("Source Serif 4", {
      doc: doc.asDocument,
    })
    acquireGoogleFont("Source Serif 4", { doc: doc.asDocument })

    const preview = links(doc).find((link) =>
      link.getAttribute("href")?.includes("&text=")
    )
    expect(preview?.getAttribute("href")).toContain(
      `&text=${encodeURIComponent("Source Serif 4")}`
    )
    expect(links(doc)).toHaveLength(2)

    release()
    expect(links(doc)).toHaveLength(1)
  })

  it("retries with the default weight when Google rejects the weights", () => {
    const doc = new FakeDocument()
    acquireGoogleFont("Bebas Neue", {
      doc: doc.asDocument,
      weights: ["400", "700"],
    })
    const [link] = links(doc)
    expect(link?.getAttribute("href")).toContain(":wght@400;700")

    link?.dispatch("error")
    expect(link?.getAttribute("href")).toBe(
      "https://fonts.googleapis.com/css2?family=Bebas%20Neue&display=swap"
    )
  })
})

describe("theme font slot", () => {
  it("releases a replaced family and clears all on demand", () => {
    const doc = new FakeDocument()
    setThemeFonts(doc.asDocument, ["Inter", "Lora"])
    setThemeFonts(doc.asDocument, ["Inter", "Lora"])
    expect(familiesIn(doc)).toEqual(["Inter", "Lora"])

    setThemeFonts(doc.asDocument, ["Inter", "Fira Code"])
    expect(familiesIn(doc)).toEqual(["Fira Code", "Inter"])

    clearThemeFonts(doc.asDocument)
    expect(links(doc)).toHaveLength(0)
  })

  it("keeps a family another holder still uses", () => {
    const doc = new FakeDocument()
    const picker = acquireGoogleFont("Lora", { doc: doc.asDocument })
    setThemeFonts(doc.asDocument, ["Lora"])
    clearThemeFonts(doc.asDocument)

    expect(familiesIn(doc)).toEqual(["Lora"])
    picker()
    expect(links(doc)).toHaveLength(0)
  })
})

describe("waitForFont", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("clears its timeout once the font loads", async () => {
    vi.useFakeTimers()
    const doc = new FakeDocument()
    doc.fonts = {
      check: () => true,
      load: () => Promise.resolve([]),
    }

    await expect(
      waitForFont("Source Serif 4", "400", 3000, doc.asDocument)
    ).resolves.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("gives up after the timeout", async () => {
    vi.useFakeTimers()
    const doc = new FakeDocument()
    doc.fonts = {
      check: () => false,
      load: () => new Promise(() => {}),
    }

    const result = waitForFont("Lora", "400", 50, doc.asDocument)
    await vi.advanceTimersByTimeAsync(50)
    await expect(result).resolves.toBe(false)
  })

  it("waits for the family's stylesheet before it loads the face", async () => {
    vi.useFakeTimers()
    const doc = new FakeDocument()
    const load = vi.fn(() => Promise.resolve([]))
    doc.fonts = { check: () => true, load }
    acquireGoogleFont("Lora", { doc: doc.asDocument })

    const settled = vi.fn()
    const result = waitForFont("Lora", "400", 3000, doc.asDocument)
    void result.then(settled)
    await vi.advanceTimersByTimeAsync(1000)
    expect(load).not.toHaveBeenCalled()
    expect(settled).not.toHaveBeenCalled()

    links(doc)[0]?.dispatch("load")
    await expect(result).resolves.toBe(true)
    expect(load).toHaveBeenCalledWith("400 16px Lora")
  })

  it("waits for the retry when Google rejects the weights", async () => {
    vi.useFakeTimers()
    const doc = new FakeDocument()
    const load = vi.fn(() => Promise.resolve([]))
    doc.fonts = { check: () => false, load }
    acquireGoogleFont("Bebas Neue", {
      doc: doc.asDocument,
      weights: ["400", "700"],
    })
    const [link] = links(doc)

    const result = waitForFont("Bebas Neue", "400", 3000, doc.asDocument)
    link?.dispatch("error")
    await vi.advanceTimersByTimeAsync(1000)
    expect(load).not.toHaveBeenCalled()

    link?.dispatch("error")
    await expect(result).resolves.toBe(false)
    expect(load).toHaveBeenCalledOnce()
  })

  it("gives up when the family's stylesheet never loads", async () => {
    vi.useFakeTimers()
    const doc = new FakeDocument()
    doc.fonts = { check: () => true, load: () => Promise.resolve([]) }
    acquireGoogleFont("Lora", { doc: doc.asDocument })

    const result = waitForFont("Lora", "400", 50, doc.asDocument)
    await vi.advanceTimersByTimeAsync(50)
    await expect(result).resolves.toBe(false)
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
