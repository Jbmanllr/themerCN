// Proves the link registry on a FakeDocument: one link per family is shared
// per document and removed with its last holder, host `var(...)` and system
// stacks never reach Google, previews are text subsets, a rejected weight
// retries once at the default weight, theme fonts follow the theme, and
// waitForFont waits for the stylesheet (and its retry) before the face.
import { afterEach, describe, expect, it, vi } from "vitest"
import { FakeDocument } from "./fake-document.test-helper"
import {
  FONT_LINK_ATTRIBUTE,
  acquireFontPreview,
  acquireGoogleFont,
  clearThemeFonts,
  setThemeFonts,
  waitForFont,
} from "./font-links"

function links(doc: FakeDocument) {
  return doc.headChildren("link")
}

function familiesIn(doc: FakeDocument) {
  return links(doc)
    .map((link) => link.getAttribute(FONT_LINK_ATTRIBUTE))
    .sort()
}

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
