// @vitest-environment happy-dom
// The "Custom font" badge's question: does the font catalog lack the
// theme's family? Asked of the bundled list here (no endpoint); the match
// ignores case, so "inter" is the catalog's "Inter".
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useCatalogLacksFamily } from "./use-catalog-lacks-family"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

/** The hook's answer once its lookup has settled. */
async function lacks(family: string | null) {
  const seen: { current: boolean | null } = { current: null }
  function Probe() {
    seen.current = useCatalogLacksFamily(undefined, family)
    return null
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  root = createRoot(document.createElement("div"))
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>
    )
  )
  await vi.waitFor(() => expect(client.isFetching()).toBe(0))
  // react-query notifies its observers on a timer.
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
  return seen.current
}

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
})

describe("useCatalogLacksFamily", () => {
  it("finds a catalog family whatever its case", async () => {
    expect(await lacks("Inter")).toBe(false)
    expect(await lacks("inter")).toBe(false)
    expect(await lacks("INTER")).toBe(false)
  })

  it("reports a family the catalog does not name", async () => {
    expect(await lacks("Not A Catalog Font")).toBe(true)
  })

  it("asks nothing and reports nothing without a family", async () => {
    expect(await lacks(null)).toBe(false)
  })
})
