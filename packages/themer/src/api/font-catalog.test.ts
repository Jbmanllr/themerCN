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
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const familiesOf = async (response: Response) =>
  ((await response.json()).fonts as { family: string }[]).map(
    (font) => font.family
  )

// What Google answers for each mode, as the fetch stub returns it.
const googleAnswer = (key: string | undefined) =>
  key
    ? Response.json(googleCatalog)
    : new Response(`)]}'\n${JSON.stringify(googleMetadata)}`)
const googleFamily = (key: string | undefined) =>
  key ? "Only On Google" : "Public Catalog Sans"

// A Google that never answers: like the real fetch, it rejects only when
// its request is aborted.
const hangingFetch = () =>
  vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason)
        )
      })
  )

const DAY_MS = 24 * 60 * 60 * 1000

describe.each([
  ["without a key", undefined],
  ["with a key", "key"],
])("fontCatalogResponse resilience %s", (_mode, key) => {
  it("gives up on a hanging Google after 5 seconds and serves the bundled list", async () => {
    vi.useFakeTimers()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    vi.stubGlobal("fetch", hangingFetch())

    let settled = false
    const pending = fontCatalogResponse(url("q=inter"), key).finally(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(4_999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    const response = await pending
    expect(response.status).toBe(200)
    expect(await familiesOf(response)).toContain("Inter")
  })

  it("holds Google's catalog in memory for a day", async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () => googleAnswer(key))
    vi.stubGlobal("fetch", fetch)

    await fontCatalogResponse(url(""), key)
    await vi.advanceTimersByTimeAsync(DAY_MS - 1_000)
    const cached = await fontCatalogResponse(url(""), key)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await familiesOf(cached)).toEqual([googleFamily(key)])

    await vi.advanceTimersByTimeAsync(2_000)
    await fontCatalogResponse(url(""), key)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("serves the bundled list for 60 seconds after a failure without calling Google", async () => {
    vi.useFakeTimers()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const fetch = vi.fn().mockRejectedValue(new TypeError("offline"))
    vi.stubGlobal("fetch", fetch)

    await fontCatalogResponse(url("q=inter"), key)
    expect(fetch).toHaveBeenCalledTimes(1)

    fetch.mockImplementation(async () => googleAnswer(key))
    await vi.advanceTimersByTimeAsync(59_000)
    const backedOff = await fontCatalogResponse(url("q=inter"), key)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await familiesOf(backedOff)).toContain("Inter")

    await vi.advanceTimersByTimeAsync(1_000)
    const retried = await fontCatalogResponse(url(""), key)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(await familiesOf(retried)).toEqual([googleFamily(key)])
  })
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
