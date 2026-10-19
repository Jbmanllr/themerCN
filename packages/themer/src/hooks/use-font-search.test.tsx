// @vitest-environment happy-dom
// The font picker's catalogue: the bundled list, searched in the browser,
// when the Host gives no endpoint; otherwise the Host's endpoint, through the
// documented contract `GET ?q=&category=&limit=&offset=`
// → `{ fonts, total, offset, limit, hasMore }`.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PaginatedFontsResponse } from "../types/fonts"
import { useFontSearch } from "./use-font-search"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

type Search = ReturnType<typeof useFontSearch>

let root: Root | null = null

async function search(params: Parameters<typeof useFontSearch>[0]) {
  const seen: { current: Search | null } = { current: null }
  function Probe() {
    seen.current = useFontSearch(params)
    return null
  }
  root = createRoot(document.createElement("div"))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>
    )
  )
  await vi.waitFor(() => expect(seen.current?.isSuccess).toBe(true))
  return seen.current!.data!.pages
}

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  vi.unstubAllGlobals()
})

describe("useFontSearch", () => {
  it("searches the bundled list without any request when no endpoint is set", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const [page] = await search({ query: "playfair", category: "serif" })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(page?.fonts.map((font) => font.family)).toEqual(["Playfair Display"])
    expect(page).toMatchObject({ total: 1, offset: 0, hasMore: false })
  })

  it("pages through the bundled list", async () => {
    vi.stubGlobal("fetch", vi.fn())

    const [page] = await search({ query: "", limit: 10 })

    expect(page?.fonts).toHaveLength(10)
    expect(page?.hasMore).toBe(true)
    expect(page?.total).toBeGreaterThan(10)
  })

  it("queries the Host's endpoint with the documented parameters", async () => {
    const body: PaginatedFontsResponse = {
      fonts: [
        {
          family: "Host Font",
          category: "serif",
          variants: ["400"],
          variable: false,
        },
      ],
      total: 1,
      offset: 0,
      limit: 15,
      hasMore: false,
    }
    const fetchSpy = vi.fn(async (_url: string) => Response.json(body))
    vi.stubGlobal("fetch", fetchSpy)

    const [page] = await search({
      endpoint: "/fonts",
      query: "host",
      category: "serif",
      limit: 15,
    })

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]), "http://host")
    expect(url.pathname).toBe("/fonts")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "host",
      category: "serif",
      limit: "15",
      offset: "0",
    })
    expect(page).toEqual(body)
  })
})
