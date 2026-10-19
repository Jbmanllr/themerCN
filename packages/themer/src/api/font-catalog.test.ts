import { afterEach, describe, expect, it, vi } from "vitest"

import { FALLBACK_FONTS } from "../utils/font-catalog-data"
import { fontCatalogResponse, resetFontCatalogCache } from "./font-catalog"

// The font picker must stay usable offline and when Google misbehaves: the
// key is optional local configuration, never a reason for the editor to break.

const url = (query: string) =>
  new URL(`http://localhost/dev/themer/google-fonts?${query}`)

const googleCatalog = {
  kind: "webfonts#webfontList",
  items: [
    {
      kind: "webfonts#webfont",
      family: "Only On Google",
      category: "serif",
      variants: ["regular"],
      subsets: ["latin"],
      version: "v1",
      lastModified: "2026-01-01",
      files: {},
    },
  ],
}

const googleMetadata = {
  familyMetadataList: [
    {
      family: "Public Catalog Sans",
      category: "Sans Serif",
      fonts: { "400": {}, "400i": {}, "700": {} },
      axes: [],
    },
  ],
}

afterEach(() => {
  resetFontCatalogCache()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("fontCatalogResponse", () => {
  it("uses the public catalog without a key, sending no key", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(`)]}'\n${JSON.stringify(googleMetadata)}`)
      )
    vi.stubGlobal("fetch", fetch)

    const body = await (
      await fontCatalogResponse(url("q=public"), undefined)
    ).json()

    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "https://fonts.google.com/metadata/fonts"
    )
    expect(body.fonts).toEqual([
      {
        family: "Public Catalog Sans",
        category: "sans-serif",
        variants: ["400", "700"],
        variable: false,
      },
    ])

    // Held in memory: a second request does not fetch again.
    await fontCatalogResponse(url("q=public"), undefined)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("shares one public catalog download between requests that arrive together", async () => {
    const fetch = vi.fn(
      async () => new Response(`)]}'\n${JSON.stringify(googleMetadata)}`)
    )
    vi.stubGlobal("fetch", fetch)

    const [first, second] = await Promise.all([
      fontCatalogResponse(url("q=public"), undefined),
      fontCatalogResponse(url("q=public"), undefined),
    ])

    expect(fetch).toHaveBeenCalledTimes(1)
    expect((await second.json()).fonts).toEqual((await first.json()).fonts)
  })

  it("serves the bundled catalog offline without a key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")))
    vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const body = await (
      await fontCatalogResponse(url("q=inter&category=all"), undefined)
    ).json()

    expect(body.fonts.map((font: { family: string }) => font.family)).toContain(
      "Inter"
    )
    expect(body.total).toBeLessThan(FALLBACK_FONTS.length)
  })

  it("uses Google's catalog when the key works, sending the key only to Google", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(googleCatalog))
    vi.stubGlobal("fetch", fetch)

    const body = await (
      await fontCatalogResponse(url("category=serif"), "secret key")
    ).json()

    expect(String(fetch.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/www\.googleapis\.com\/.*key=secret%20key/u
    )
    expect(body.fonts).toEqual([
      expect.objectContaining({ family: "Only On Google", category: "serif" }),
    ])
    expect(JSON.stringify(body)).not.toContain("secret")
  })

  it("falls back to the bundled catalog when Google fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("quota", { status: 429 }))
    )
    vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const response = await fontCatalogResponse(url("q=inter"), "key")

    expect(response.status).toBe(200)
    expect(
      (await response.json()).fonts.map(
        (font: { family: string }) => font.family
      )
    ).toContain("Inter")
  })
})
