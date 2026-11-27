// Proves the export formatters keep a colour's transparency: a translucent
// colour exported as hsl, rgb, hex or oklch parses back with the same alpha,
// and an opaque one gets no alpha part.
import * as culori from "culori"
import { afterEach, describe, expect, it, vi } from "vitest"

import { colorFormatter } from "./color-converter"

const FORMATS = ["hsl", "rgb", "hex", "oklch"] as const

function alphaOf(color: string): number {
  return culori.parse(color)?.alpha ?? 1
}

describe("colorFormatter", () => {
  it.each(FORMATS)("keeps alpha in every export format (%s)", (format) => {
    const exported = colorFormatter("rgb(255 0 0 / 0.5)", format)
    expect(alphaOf(exported)).toBeCloseTo(0.5, 2)
  })

  it.each(FORMATS)("adds no alpha to an opaque colour (%s)", (format) => {
    const exported = colorFormatter("#ff0000", format)
    expect(culori.parse(exported)?.alpha).toBeUndefined()
  })
})

describe("a colour culori cannot parse", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // A Theme may hold any CSS colour (`var(--brand)`, `color-mix(…)`): the
  // value is exported as written, and the warning is for the developer.
  it("is returned as written, with a warning in development only", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    expect(colorFormatter("var(--brand)", "hex")).toBe("var(--brand)")
    expect(warn).toHaveBeenCalledTimes(1)

    vi.stubEnv("NODE_ENV", "production")
    expect(colorFormatter("var(--brand)", "hex")).toBe("var(--brand)")
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
