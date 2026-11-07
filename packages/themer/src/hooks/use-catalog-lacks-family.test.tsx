// @vitest-environment happy-dom
// The "Custom font" badge's question: does the font catalog lack the
// theme's family? Asked of the bundled list here (no endpoint); the match
// ignores case, so "inter" is the catalog's "Inter".
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useCatalogLacksFamily } from "./use-catalog-lacks-family"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const roots: Root[] = []

/** The hook's answer once its lookup has settled. */
async function lacks(family: string | null) {
  const seen = { current: null as boolean | null, answered: false }
  function Probe() {
    seen.current = useCatalogLacksFamily(undefined, family)
    // Read while rendering: true once this render saw the catalog's answer.
    seen.answered = useQueryClient()
      .getQueryCache()
      .getAll()
      .some((query) => query.state.status === "success")
    return null
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const root = createRoot(document.createElement("div"))
  roots.push(root)
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>
    )
  )
  if (family === null) expect(client.isFetching()).toBe(0)
  else await vi.waitFor(() => expect(seen.answered).toBe(true))
  return seen.current
}

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
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
