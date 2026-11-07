// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The font-catalog count test: the counted work of one font catalog request
// against the Font catalog request rows of the Quality register (TESTING.md),
// whose caps are the paths ADR's Font catalog request contract. Run it with
// `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx`.
//
// A request is served by the Next Adapter's route (`createFontCatalogRoute`,
// its `enabled` gate, then `fontCatalogResponse`) over a stubbed Google, or
// asked by `useFontSearch` in the browser over a stubbed endpoint `fetch`
// that the route answers, or searched in the browser over the bundled list
// when there is no endpoint.
//
// - Row tests: one request per outcome (uncached, cached, inside the failure
//   back-off, concurrent), on the route and from `useFontSearch`, and the
//   "Custom font" badge's lookup.
// - The composition run: a font picker on the route, whose label asks the
//   badge lookup, then opened and searched. The feature-off runs: the route
//   disabled, which loads no catalog code, and no endpoint, where no request
//   leaves the browser.
// - Each counter has a failing seed: one extra unit of its work, which the
//   comparison against the unseeded figure must catch, naming the row.
//
// Each module load starts a new server process (vi.resetModules), so the
// catalog's memory cache and its code load start empty in every test.
import { AsyncLocalStorage } from "node:async_hooks"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  calledFrom,
  checkCounts,
  checkReach,
  checkSeedCaught,
  countCalls,
  countExport,
  countMethod,
  madeBy,
  measure,
  readingStack,
  type Counter,
  type Counts,
} from "../../../../tests/counting"
import { FontPicker } from "../components/editor/font-picker"
import { useFontSearch } from "../hooks/use-font-search"
import type { FontCategory, FontInfo } from "../types/fonts"
import { FALLBACK_FONTS } from "../utils/font-catalog-data"
import { GOOGLE_FONTS_API_URL, GOOGLE_FONTS_METADATA_URL } from "./google-fonts"

// The picker's font previews and loads are not catalog work, and stay off
// the network.
vi.mock("../utils/font-links", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/font-links")>()),
  acquireGoogleFont: () => () => {},
  acquireFontPreview: () => () => {},
  waitForFont: () => Promise.resolve(true),
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const PATH = "Font catalog request"
const ENDPOINT = "/api/themer/fonts"
const DAY_MS = 24 * 60 * 60 * 1000

// The outcomes, in the paths ADR's names (its Register rows column).
const CACHED = "cached"
const UNCACHED = "uncached"
const BACK_OFF = "back-off"
const CONCURRENT = "concurrent"

// ---- Google, stubbed --------------------------------------------------------

const METADATA_CATEGORY: Record<FontCategory, string> = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  monospace: "Monospace",
  display: "Display",
  handwriting: "Handwriting",
}

// Google's catalog: the bundled families and one only Google serves, so the
// served catalog and the bundled list differ in length.
const GOOGLE_FAMILIES: FontInfo[] = [
  ...FALLBACK_FONTS,
  {
    family: "Only On Google",
    category: "serif",
    variants: ["400"],
    variable: false,
  },
]
// Built once, outside any measured unit: the stub's own stringify is not the
// route's.
const METADATA_BODY = `)]}'\n${JSON.stringify({
  familyMetadataList: GOOGLE_FAMILIES.map((font) => ({
    family: font.family,
    category: METADATA_CATEGORY[font.category],
    fonts: Object.fromEntries(font.variants.map((weight) => [weight, {}])),
    axes: font.variable ? [{ tag: "wght" }] : [],
  })),
})}`
const API_BODY = JSON.stringify({
  kind: "webfonts#webfontList",
  items: GOOGLE_FAMILIES.map((font) => ({
    family: font.family,
    category: font.category,
    variants: font.variants,
  })),
})

const FAMILIES = new Set(GOOGLE_FAMILIES.map((font) => font.family))
// The whole catalog a request can be served from: Google's, or the bundled
// list (no endpoint, or a Google failure).
const CATALOG_LENGTHS = new Set([GOOGLE_FAMILIES.length, FALLBACK_FONTS.length])

let googleFails = false
const isGoogle = (url: string) =>
  url.startsWith(GOOGLE_FONTS_METADATA_URL) ||
  url.startsWith(GOOGLE_FONTS_API_URL)
const google = (url: string) => {
  if (googleFails) return new Response("unavailable", { status: 503 })
  return url.startsWith(GOOGLE_FONTS_API_URL)
    ? new Response(API_BODY, {
        headers: { "content-type": "application/json" },
      })
    : new Response(METADATA_BODY)
}

// ---- The server, in its own async context -----------------------------------

// Which request the work belongs to: the measured server request, or an
// unmeasured one that runs alongside it (the concurrent outcome). Browser
// work runs outside both.
type Context = "server" | "alongside"
const requestContext = new AsyncLocalStorage<Context>()
const onServer = () => requestContext.getStore() !== undefined
const notAlongside = () => requestContext.getStore() !== "alongside"

type Route = { GET: (request: Request) => Promise<Response> }
let route: Route
let googleFontsApiKey: string | undefined

/** A new server process: an empty module registry, so the next import of
 *  the catalog code loads it, and the load counts. */
function newProcess() {
  vi.resetModules()
  vi.doMock("./font-catalog", async (importOriginal) => {
    const { passThrough } = await import("../../../../tests/counting")
    passThrough("catalog code load", () => undefined)()
    return importOriginal()
  })
}

async function loadRoute(enabled: boolean) {
  const { createFontCatalogRoute } = await import("../next/server")
  route = createFontCatalogRoute({ enabled, googleFontsApiKey })
}

/** One request to the route, as the measured request or alongside it. */
const serve = (query: string, context: Context = "server") =>
  requestContext.run(context, () =>
    route.GET(
      new Request(`http://localhost${ENDPOINT}?q=${query}&limit=50&offset=0`)
    )
  )

// How the endpoint answers: through the route, or as a Host route that fails
// with a 5xx, or not at all (a network error).
let endpointAnswer: "route" | "5xx" | "network error" = "route"

// The browser's fetch: the endpoint is answered by the route, Google by its
// stub. Nothing else is fetched.
async function stubFetch(input: RequestInfo | URL): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input)
  if (isGoogle(url)) return google(url)
  if (url.startsWith(ENDPOINT) && endpointAnswer === "5xx")
    return new Response("unavailable", { status: 503 })
  if (url.startsWith(ENDPOINT) && endpointAnswer === "network error")
    throw new TypeError("Failed to fetch")
  if (url.startsWith(ENDPOINT))
    return requestContext.run("server", () =>
      route.GET(new Request(`http://localhost${url}`))
    )
  throw new Error(`unexpected fetch: ${url}`)
}

// ---- Counters ---------------------------------------------------------------

const urlOf = (input: unknown) =>
  input instanceof Request ? input.url : String(input)
const isEndpoint = (input: unknown) => urlOf(input).startsWith(ENDPOINT)
// The badge's lookup is the label's useFontSearch: limit 50, where the
// picker's own search asks 15 a page.
const isBadgeLookup = (input: unknown) =>
  isEndpoint(input) &&
  new URL(urlOf(input), "http://localhost").searchParams.get("limit") === "50"

const isFamily = (self: unknown) =>
  (typeof self === "string" || self instanceof String) &&
  FAMILIES.has(String(self))
// A family lower-cased by the badge's label (FontValueLabel) over the loaded
// fonts, not by the one-name helpers it calls once per render
// (describeFontValue, isLocalFontFamily).
const badgeLowerCase = (self: unknown) =>
  isFamily(self) &&
  !onServer() &&
  calledFrom(/\bFontValueLabel\b/) &&
  !madeBy(/utils\/font-names/)
// A family lower-cased by a request: the route, or useFontSearch's query
// over the bundled list in the browser (the picker's rows and its label are
// not requests). Per request only: a catalog's names, built once per load
// (prepareFontCatalog), and the request's own query (normalizeFontQuery,
// which a family-named query such as the badge's passes) are not counted.
const familyLowerCase = (self: unknown) =>
  isFamily(self) &&
  notAlongside() &&
  (onServer() || calledFrom(/hooks\/use-font-search/)) &&
  !madeBy(/\b(?:prepareFontCatalog|normalizeFontQuery)\b/)
// A pass over the whole served catalog (FontInfo entries, as many as the
// catalog has); a page of it is not one.
const isWholeCatalog = (self: unknown) => {
  if (!Array.isArray(self) || !CATALOG_LENGTHS.has(self.length)) return false
  const first = self[0] as Partial<FontInfo> | undefined
  return (
    typeof first?.family === "string" && typeof first.variable === "boolean"
  )
}
const PASSES = [
  "filter",
  "map",
  "forEach",
  "some",
  "every",
  "find",
  "findIndex",
  "reduceRight",
  "reduce",
  "flatMap",
] as const

// happy-dom's Headers copies itself through JSON.stringify and JSON.parse;
// undici's, which Next serves with, does not. That copy is the test
// environment's work, not the route's. Formatting a stack parses source
// maps: the tooling's work, not the route's either.
const byHappyDomHeaders = () => madeBy(/happy-dom\/lib\/fetch\/Headers\.js/)
const routeJson = () => !readingStack() && onServer() && !byHappyDomHeaders()

const counters = (): Counter[] => [
  countCalls("client round trips", globalThis, "fetch", (input) =>
    isEndpoint(input)
  ),
  countCalls("Google downloads", globalThis, "fetch", (input) =>
    isGoogle(urlOf(input))
  ),
  countCalls("catalog parses", JSON, "parse", routeJson),
  countExport("catalog code loads", "catalog code load"),
  countMethod("family lower-cases", String.prototype, "toLowerCase", (self) =>
    familyLowerCase(self)
  ),
  ...PASSES.map((key) =>
    countMethod(
      "whole-catalog passes",
      Array.prototype,
      key,
      (self: unknown) => notAlongside() && isWholeCatalog(self)
    )
  ),
  countCalls(
    "response stringifies",
    JSON,
    "stringify",
    () => requestContext.getStore() === "server" && routeJson()
  ),
  countCalls("badge requests", globalThis, "fetch", (input) =>
    isBadgeLookup(input)
  ),
  countMethod("badge lower-cases", String.prototype, "toLowerCase", (self) =>
    badgeLowerCase(self)
  ),
]

// ---- Checking and reporting -------------------------------------------------

/**
 * Checks one run. `outcome` is the run's outcome for every split row;
 * `perRow` names another for a row that has no figure for it (a concurrent
 * request downloads once, so its parse is the uncached one).
 */
function check(
  outcome: string,
  counts: Counts,
  perRow: Record<string, string> = {}
) {
  checkCounts({ path: PATH, outcomes: [outcome], perRow, counts })
}

// Not a register row: every browser fetch, which no endpoint must remove.
const ANY_FETCH = "browser fetches"

/** A feature-off unit's counts, and how many fetches it made at all. */
async function measureOff(unit: () => Promise<unknown>) {
  const { [ANY_FETCH]: fetches = 0, ...counts } = await measure(
    [
      ...counters(),
      countCalls(ANY_FETCH, globalThis, "fetch", () => !onServer()),
    ],
    unit
  )
  return { counts, fetches }
}

/** Prints a run's counts, labelled, for the first measurement. */
function report(run: string, counts: Counts) {
  console.log(`${PATH} [${run}]: ${JSON.stringify(counts)}`)
}

// ---- The browser ------------------------------------------------------------

const roots: Root[] = []

// The Themer's own QueryClient options (components/themer.tsx).
const queryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: DAY_MS,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: DAY_MS,
      },
    },
  })

async function mount(node: ReactNode, client = queryClient()) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    )
  )
  return { container, root, client }
}

/** Waits until the client has no request in flight. */
async function settled(client: QueryClient) {
  await vi.waitFor(() => expect(client.isFetching()).toBe(0), {
    timeout: 5_000,
  })
  // react-query notifies its observers on a timer: the renders it schedules
  // run inside the unit.
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
}

type Search = ReturnType<typeof useFontSearch>

/** A useFontSearch caller, re-rendered with each query. */
function searcher(endpoint: string | undefined) {
  const client = queryClient()
  const seen: { current: Search | null } = { current: null }
  function Probe({ query }: { query: string }) {
    seen.current = useFontSearch({ endpoint, query, limit: 15 })
    return null
  }
  let root: Root | null = null
  return {
    async search(query: string) {
      if (!root) root = (await mount(<Probe query={query} />, client)).root
      else {
        const mounted = root
        await act(async () =>
          mounted.render(
            <QueryClientProvider client={client}>
              <Probe query={query} />
            </QueryClientProvider>
          )
        )
      }
      await vi.waitFor(() => expect(seen.current?.isSuccess).toBe(true))
      await settled(client)
    },
  }
}

/** A closed font picker whose label shows `value`; its badge lookup runs. */
async function mountPicker(value: string, endpoint: string | undefined) {
  const mounted = await mount(
    <FontPicker
      value={value}
      onChange={() => {}}
      category="sans"
      label="Sans-serif"
      fontCatalogEndpoint={endpoint}
    />
  )
  await settled(mounted.client)
  return mounted
}

async function openPicker({
  container,
  client,
}: Awaited<ReturnType<typeof mountPicker>>) {
  const trigger =
    container.querySelector<HTMLButtonElement>('[role="combobox"]')
  if (!trigger) throw new Error("no picker trigger")
  await act(async () => trigger.click())
  await vi.waitFor(() =>
    expect(document.querySelector("[cmdk-item]")).not.toBeNull()
  )
  await settled(client)
}

/** Types into the open picker's search and waits out its 300 ms debounce. */
async function typeQuery(client: QueryClient, query: string) {
  const input = document.querySelector<HTMLInputElement>("[cmdk-input]")
  if (!input) throw new Error("no picker search")
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set
  await act(async () => {
    setValue?.call(input, query)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(() => new Promise((resolve) => setTimeout(resolve, 350)))
  await settled(client)
}

// ---- Setup ------------------------------------------------------------------

beforeEach(async () => {
  newProcess()
  googleFails = false
  endpointAnswer = "route"
  googleFontsApiKey = undefined
  vi.stubGlobal("fetch", stubFetch)
  vi.spyOn(console, "warn").mockImplementation(() => undefined)
  await loadRoute(true)
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  document.body.innerHTML = ""
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---- Row tests --------------------------------------------------------------

describe("Font catalog request rows, on the route", () => {
  it("counts an uncached request", async () => {
    const counts = await measure(counters(), () => serve("sans"))
    report(`route: ${UNCACHED}`, counts)
    check(UNCACHED, counts)
  })

  it("counts an uncached request with a Google Fonts key", async () => {
    googleFontsApiKey = "key"
    await loadRoute(true)
    const counts = await measure(counters(), () => serve("sans"))
    report(`route, keyed: ${UNCACHED}`, counts)
    check(UNCACHED, counts)
  })

  it("counts an uncached request whose download fails", async () => {
    googleFails = true
    const counts = await measure(counters(), () => serve("sans"))
    report(`route, failed download: ${UNCACHED}`, counts)
    check(UNCACHED, counts)
  })

  it("counts a cached request", async () => {
    await serve("sans")
    const counts = await measure(counters(), () => serve("serif"))
    report(`route: ${CACHED}`, counts)
    check(CACHED, counts)
  })

  it("counts a request inside the back-off after a failed download", async () => {
    googleFails = true
    await serve("sans")
    googleFails = false
    const counts = await measure(counters(), () => serve("serif"))
    report(`route: ${BACK_OFF}`, counts)
    check(BACK_OFF, counts)
  })

  it("counts a request that arrives while another's download is in flight", async () => {
    const counts = await measure(counters(), async () => {
      const first = serve("sans", "alongside")
      const second = serve("serif")
      await Promise.all([first, second])
    })
    report(`route: ${CONCURRENT} (catalog parses: ${UNCACHED})`, counts)
    check(CONCURRENT, counts, { "catalog parses": UNCACHED })
  })
})

describe("Font catalog request rows, from useFontSearch", () => {
  it("counts an uncached search", async () => {
    const browser = searcher(ENDPOINT)
    const counts = await measure(counters(), () => browser.search("sans"))
    report(`useFontSearch: ${UNCACHED}`, counts)
    check(UNCACHED, counts)
  })

  it("counts a repeated search, cached in the browser", async () => {
    const browser = searcher(ENDPOINT)
    await browser.search("sans")
    await browser.search("serif")
    const counts = await measure(counters(), () => browser.search("sans"))
    report(`useFontSearch, repeated: ${CACHED}`, counts)
    check(CACHED, counts)
  })

  it("counts the Custom font badge's lookup", async () => {
    const counts = await measure(counters(), () =>
      mountPicker("Inter, sans-serif", ENDPOINT)
    )
    report(`badge lookup: ${UNCACHED}`, counts)
    check(UNCACHED, counts)
  })
})

// ---- Composition and feature-off runs ---------------------------------------

describe("Font catalog request composition", () => {
  it("reports every row while a picker on the route looks up its badge, opens and searches", async () => {
    let picker: Awaited<ReturnType<typeof mountPicker>> | undefined
    const badge = await measure(counters(), async () => {
      picker = await mountPicker("Inter, sans-serif", ENDPOINT)
    })
    report(`composition: badge lookup, ${UNCACHED}`, badge)
    check(UNCACHED, badge)

    const opened = await measure(counters(), () => openPicker(picker!))
    report(`composition: open, ${CACHED}`, opened)
    check(CACHED, opened)

    const searched = await measure(counters(), () =>
      typeQuery(picker!.client, "ro")
    )
    report(`composition: search, ${CACHED}`, searched)
    check(CACHED, searched)
  })

  // Nothing downloads in the feature-off runs: they name the outcome whose
  // figures are 0 (cached).
  it("reports every row with the route disabled", async () => {
    await loadRoute(false)
    const served = await measure(counters(), async () => {
      const response = await serve("sans")
      expect(response.status).toBe(404)
    })
    report(`route disabled: route, ${CACHED}`, served)
    check(CACHED, served)

    const picker = await measure(counters(), () =>
      mountPicker("Inter, sans-serif", ENDPOINT)
    )
    report(`route disabled: picker badge lookup, ${CACHED}`, picker)
    check(CACHED, picker)
    // A disabled route answers before loading any catalog code.
    expect(
      [served, picker].map((counts) => counts["catalog code loads"])
    ).toEqual([0, 0])
    // Its 404 is final: the badge lookup asks once, with no retry.
    expect(picker["badge requests"]).toBe(1)
  })

  // A failure that a second try can fix is retried once, then given up.
  it.each(["5xx", "network error"] as const)(
    "reports every row when the endpoint fails with a %s",
    async (failure) => {
      endpointAnswer = failure
      const counts = await measure(counters(), () =>
        mountPicker("Inter, sans-serif", ENDPOINT)
      )
      report(`endpoint ${failure}: picker badge lookup, ${CACHED}`, counts)
      check(CACHED, counts)
      expect(counts["badge requests"]).toBe(2)
    }
  )

  it("reports every row with no endpoint", async () => {
    let picker: Awaited<ReturnType<typeof mountPicker>> | undefined
    const badge = await measureOff(async () => {
      picker = await mountPicker("Inter, sans-serif", undefined)
    })
    report(`no endpoint: badge lookup, ${CACHED}`, badge.counts)
    check(CACHED, badge.counts)

    const opened = await measureOff(() => openPicker(picker!))
    report(`no endpoint: open, ${CACHED}`, opened.counts)
    check(CACHED, opened.counts)

    const searched = await measureOff(() => typeQuery(picker!.client, "ro"))
    report(`no endpoint: search, ${CACHED}`, searched.counts)
    check(CACHED, searched.counts)

    // Without an endpoint no request leaves the browser.
    const runs = [badge, opened, searched]
    expect(runs.map(({ counts }) => counts["client round trips"])).toEqual([
      0, 0, 0,
    ])
    expect(runs.map(({ fetches }) => fetches)).toEqual([0, 0, 0])
  })
})

// ---- Failing seeds ----------------------------------------------------------

describe("Font catalog request failing seeds", () => {
  /** The unseeded figure, then the same unit with the seed: the comparison
   *  must fail and name the seeded row. */
  async function expectSeedCaught(
    row: string,
    unit: () => Promise<unknown>,
    seed: () => unknown
  ) {
    const unseeded = await measure(counters(), unit)
    for (const root of roots.splice(0)) await act(async () => root.unmount())
    newProcess()
    await loadRoute(true)

    const seeded = await measure(counters(), async () => {
      await unit()
      await seed()
    })

    checkSeedCaught({ path: PATH, row, unseeded, seeded })
  }

  const onTheRoute = (row: string, seed: () => unknown) =>
    expectSeedCaught(
      row,
      () => serve("sans"),
      () => requestContext.run("server", seed)
    )
  const fromTheBadge = (row: string, seed: () => unknown) =>
    expectSeedCaught(
      row,
      () => mountPicker("Inter, sans-serif", ENDPOINT),
      seed
    )

  it("catches a second client round trip", () =>
    fromTheBadge("client round trips", () => fetch(`${ENDPOINT}?q=seed`)))

  it("catches a second Google download", () =>
    onTheRoute("Google downloads", () => fetch(GOOGLE_FONTS_METADATA_URL)))

  it("catches a second catalog parse", () =>
    onTheRoute("catalog parses", () => JSON.parse("{}")))

  it("catches a second catalog code load", () =>
    onTheRoute("catalog code loads", async () => {
      newProcess()
      await import("./font-catalog")
    }))

  it("catches one more family lower-case", () =>
    onTheRoute("family lower-cases", () => "Inter".toLowerCase()))

  it("catches a second whole-catalog pass", () =>
    onTheRoute("whole-catalog passes", () =>
      GOOGLE_FAMILIES.map((font) => font.family)
    ))

  it("catches a second response stringify", () =>
    onTheRoute("response stringifies", () => JSON.stringify({ fonts: [] })))

  it("catches a second badge request", () =>
    fromTheBadge("badge requests", () =>
      fetch(`${ENDPOINT}?q=Inter&limit=50&offset=0`)
    ))

  it("catches one more badge lower-case", () =>
    // A function named as the label: the counter reads the label's name on
    // the stack.
    fromTheBadge("badge lower-cases", function FontValueLabel() {
      return "Inter".toLowerCase()
    }))
})

// Last: every unseeded run above has been compared with the register. The
// badge rows' counters key on the label's request (limit 50) and its name
// (FontValueLabel), the stringify and parse counters skip happy-dom's
// Headers: their figures are above 0, so this proves those keys still see
// the real code's work.
describe("Font catalog request reach", () => {
  it("reaches every register figure in its unseeded runs", () => {
    checkReach({ path: PATH })
  })
})
