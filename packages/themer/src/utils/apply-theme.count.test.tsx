// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "enableIframePageLoading": true, "handleDisabledFileLoadingAsSuccess": true } }
// The Theme-apply count test: the counted work of one Theme apply on one
// document, against the Theme apply rows of the Quality register
// (TESTING.md), whose caps are the paths ADR's Theme apply contract. Run it
// with `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx`.
//
// - Row tests drive one apply through the apply-theme interface on the fake
//   document, once per outcome the contract splits, for the Host page apply
//   (applyThemeToElement, as the provider calls it) and the Live frame apply
//   (applyThemeToDocument with its fonts, as the Live view calls it).
// - Font label tests mount one font label on the real document and apply to
//   its <html>, which the label observes.
// - The composition run mounts <Themer> (Workspace) on the Live tab, with one
//   font label, and counts one store edit on the Host page and on the Live
//   frame, each its own unit. The feature-off runs turn the Theme override
//   off, leave the Live tab, and use a Theme without its own shadows.
// - Each counter has a failing seed: one extra unit of its work, which the
//   comparison against the unseeded figure must catch, naming the row.
import * as React from "react"
import { act } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRoot, type Root } from "react-dom/client"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  calledFrom,
  checkCounts,
  countCalls,
  countExport,
  measure,
  registerOf,
  type Counter,
  type Counts,
} from "../../../../tests/counting"
import { RESTORE_STYLE_ID } from "../config/constants"
import { defaultLightStyles, defaultThemeState } from "../config/defaults"
import { configurePresets } from "../config/presets"
import { FontPicker } from "../components/editor/font-picker"
import { Themer } from "../index"
import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import { useThemerUIStore } from "../stores/themer-ui-store"
import type { ThemeEditorState } from "../types"
import type { ThemeStyleProps } from "../types/theme"
import {
  THEMER_OVERRIDES_ATTRIBUTE,
  applyThemeToDocument,
  applyThemeToElement,
  computeThemeProperties,
  removeThemeFromElement,
} from "./apply-theme"
import { FakeDocument, type FakeStyleSheet } from "./fake-document.test-helper"
import { acquireGoogleFont, setThemeFonts } from "./font-links"

// Work that crosses no platform boundary is counted on its module export.
// Each export of the colour helpers parses the colour text it is given.
vi.mock("./color-converter", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("./color-converter")>()
  return Object.fromEntries(
    Object.entries(real).map(([name, value]) => [
      name,
      typeof value === "function" ? passThrough("colour parse", value) : value,
    ])
  )
})
vi.mock("./font-links", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("./font-links")>()
  return {
    ...real,
    setThemeFonts: passThrough("theme font update", real.setThemeFonts),
  }
})
// happy-dom overflows on the real sheet's custom properties (themer.test.tsx).
vi.mock("../generated/themer-css", () => ({
  THEMER_CSS:
    "@scope ([data-themer]) to ([data-themer-host]) { .stand-in { color: red } }",
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const PATH = "Theme apply"

// The outcomes, in the paths ADR's names (its Register rows column).
const ONE_TOKEN = ["one-token edit"] as const
const SHADOW_INPUT = ["shadow-input edit"] as const
const SHEET_COUNT = ["stylesheet-count change"] as const

// Stacks that tell the work apart: the apply-theme module itself, each
// document's caller in the composition, and a font label.
const APPLY_THEME = /\/utils\/apply-theme\.ts/
const HOST_CALLER = /\/components\/themer-provider\.tsx/
const LIVE_CALLER = /\/preview\/live-preview\.tsx/
const FONT_LABEL = /\/components\/editor\/font-picker\.tsx/

/** One document's unit: the document applied to, the caller whose stack
 *  marks its apply (none when the test calls the interface itself), and
 *  whether this document's font labels count. */
type Unit = { doc: Document; caller: RegExp | null; labels: boolean }

const isTag = (node: unknown, tag: string) =>
  String((node as { tagName?: string } | null)?.tagName).toLowerCase() === tag

const isOverrideSheet = (node: unknown) =>
  (node as Element | null)?.getAttribute?.(THEMER_OVERRIDES_ATTRIBUTE) != null

/** A walk over the document's stylesheets: an Array.from of the list its
 *  `styleSheets` returned (happy-dom returns a new list on each read). */
const countCssomWalks = (doc: Document): Counter => ({
  row: "CSSOM walks",
  install(bump) {
    const lists = new WeakSet<object>()
    const own = Object.getOwnPropertyDescriptor(doc, "styleSheets")
    let stored: unknown = own?.value
    const getter = (() => {
      for (let at: object | null = doc; at; at = Object.getPrototypeOf(at)) {
        const found = Object.getOwnPropertyDescriptor(at, "styleSheets")
        if (found) return found.get
      }
      return undefined
    })()
    Object.defineProperty(doc, "styleSheets", {
      configurable: true,
      get() {
        const list = (getter ? getter.call(doc) : stored) as object
        lists.add(list)
        return list
      },
      set(value: unknown) {
        stored = value
      },
    })
    const from = Array.from
    Array.from = function (this: unknown, ...args: unknown[]) {
      if (typeof args[0] === "object" && args[0] && lists.has(args[0])) bump()
      return (from as (...a: unknown[]) => unknown[]).apply(Array, args)
    } as typeof Array.from
    return () => {
      Array.from = from
      if (own)
        Object.defineProperty(doc, "styleSheets", { ...own, value: stored })
      else delete (doc as unknown as Record<string, unknown>).styleSheets
    }
  },
})

/** A write of the shadow override sheet: a new one appended to <head>, or
 *  new text in the one already there. */
const countOverrideSheetWrites = (doc: Document): Counter => ({
  row: "override sheet writes",
  install(bump) {
    const head = doc.head
    const append = head.appendChild
    head.appendChild = function <T extends Node>(this: unknown, node: T): T {
      if (isOverrideSheet(node)) bump()
      return append.call(head, node) as T
    }
    const existing = Array.prototype.find.call(
      head.children,
      isOverrideSheet
    ) as Element | undefined
    let restoreText = () => {}
    if (existing) {
      const own = Object.getOwnPropertyDescriptor(existing, "textContent")
      let inherited: PropertyDescriptor | undefined
      for (
        let at = Object.getPrototypeOf(existing);
        at && !inherited;
        at = Object.getPrototypeOf(at)
      )
        inherited = Object.getOwnPropertyDescriptor(at, "textContent")
      let stored = own?.value as string | undefined
      Object.defineProperty(existing, "textContent", {
        configurable: true,
        get() {
          return own ? stored : inherited?.get?.call(existing)
        },
        set(value: string) {
          bump()
          if (own) stored = value
          else inherited?.set?.call(existing, value)
        },
      })
      restoreText = () => {
        if (own)
          Object.defineProperty(existing, "textContent", {
            ...own,
            value: stored,
          })
        else delete (existing as unknown as Record<string, unknown>).textContent
      }
    }
    return () => {
      restoreText()
      head.appendChild = append
    }
  },
})

// Reading a stack can itself parse: Vitest's source-map support parses a
// module's map (JSON.parse) the first time a stack names it. A call made
// while a stack is read is the check's own work, never the unit's.
let readingStack = false
const stackHas = (pattern: RegExp) => {
  if (readingStack) return false
  readingStack = true
  try {
    return calledFrom(pattern)
  } finally {
    readingStack = false
  }
}

/** The register's Theme apply counters for one document's unit. */
function counters({ doc, caller, labels }: Unit): Counter[] {
  const inUnit = () => !caller || stackHas(caller)
  const inLabel = () => labels && stackHas(FONT_LABEL)
  const root = doc.documentElement
  const classList = root.classList
  return [
    countCalls("property writes", root.style, "setProperty"),
    countCalls("property writes", root.style, "removeProperty"),
    countExport(
      "shadow colour parses",
      "colour parse",
      () => stackHas(APPLY_THEME) && inUnit()
    ),
    countCssomWalks(doc),
    countOverrideSheetWrites(doc),
    countCalls(
      "restore-sheet lookups",
      doc,
      "getElementById",
      (id) => id === RESTORE_STYLE_ID
    ),
    ...(["toggle", "add", "remove"] as const)
      .filter((key) => typeof classList[key] === "function")
      .map((key) => countCalls("class toggles", classList, key)),
    countExport(
      "Live frame font updates",
      "theme font update",
      (target: Document | undefined) => target === doc
    ),
    countCalls("font link appends", doc.head, "appendChild", (node) =>
      isTag(node, "link")
    ),
    countCalls(
      "font label layout reads",
      globalThis,
      "getComputedStyle",
      inLabel
    ),
    countCalls("font label stringifies", JSON, "stringify", inLabel),
    countCalls("font label parses", JSON, "parse", inLabel),
  ]
}

/** Prints a run's counts, labelled, for the first measurement. */
function report(run: string, counts: Counts) {
  console.log(`${PATH} [${run}]: ${JSON.stringify(counts)}`)
}

// --- Themes -----------------------------------------------------------------

type Styles = Partial<ThemeStyleProps>

/** Shadow inputs that differ from the library's: a Theme with own shadows. */
const OWN_SHADOWS: Styles = {
  "shadow-color": "oklch(0.3 0.1 250)",
  "shadow-offset-x": "2px",
}
const DEFAULT_SHADOWS: Styles = {
  "shadow-color": defaultLightStyles["shadow-color"],
  "shadow-offset-x": defaultLightStyles["shadow-offset-x"],
}

function themeWith(styles: Styles): ThemeEditorState {
  return {
    ...defaultThemeState,
    currentMode: "light",
    styles: {
      light: { ...defaultThemeState.styles.light, ...styles },
      dark: { ...defaultThemeState.styles.dark, ...styles },
    },
  }
}

let edits = 0
/** A new value for one colour token, different on every call. */
const nextPrimary = (): Styles => ({ primary: `oklch(0.5 0.1 ${++edits})` })

/** A sheet of the Host's with a variant shadow rule the override mirrors. */
const VARIANT_SHEET: FakeStyleSheet = {
  cssRules: [
    {
      cssText: ".hover\\:shadow-md:hover { --tw-shadow: 0 0 1px red; }",
      selectorText: ".hover\\:shadow-md:hover",
      style: { getPropertyValue: () => "0 0 1px red" },
    },
  ],
}

// --- Row tests on the fake document -----------------------------------------

type Apply = (doc: FakeDocument, theme: ThemeEditorState) => void

/** The Host page's apply, as the provider calls it. */
const applyHost: Apply = (doc, theme) => {
  applyThemeToElement(theme, doc.documentElement as unknown as HTMLElement, {
    updateClass: false,
  })
}
/** The Live frame's apply, as the Live view calls it. */
const applyLive: Apply = (doc, theme) => {
  applyThemeToDocument(doc.asDocument, theme, {
    loadFonts: true,
    updateClass: false,
  })
}

const fakeUnit = (doc: FakeDocument): Unit => ({
  doc: doc.asDocument,
  caller: null,
  labels: false,
})

describe("Theme apply rows", () => {
  const cases = [
    {
      outcome: "a one-token edit",
      outcomes: ONE_TOKEN,
      edit: () => ({ ...OWN_SHADOWS, ...nextPrimary() }),
    },
    {
      outcome: "a one-token edit naming a new Google family",
      outcomes: ONE_TOKEN,
      edit: () => ({ ...OWN_SHADOWS, "font-sans": "Inter, sans-serif" }),
    },
    {
      outcome: "a shadow-input edit with own shadows",
      outcomes: SHADOW_INPUT,
      edit: () => ({ ...OWN_SHADOWS, "shadow-offset-x": "4px" }),
    },
    {
      outcome: "a stylesheet-count change",
      outcomes: SHEET_COUNT,
      edit: () => ({ ...OWN_SHADOWS, ...nextPrimary() }),
      sheetLoaded: true,
    },
  ]
  const documents = [
    { name: "Host page", apply: applyHost },
    { name: "Live frame", apply: applyLive },
  ]

  for (const { name, apply } of documents) {
    for (const { outcome, outcomes, edit, sheetLoaded } of cases) {
      it(`counts ${outcome} on the ${name}`, async () => {
        const doc = new FakeDocument()
        apply(doc, themeWith(OWN_SHADOWS))
        if (sheetLoaded) doc.styleSheets = [...doc.styleSheets, VARIANT_SHEET]

        const counts = await measure(counters(fakeUnit(doc)), () =>
          apply(doc, themeWith(edit()))
        )

        report(`row: ${name}, ${outcome}`, counts)
        checkCounts({ path: PATH, outcomes, counts })
      })
    }
  }
})

// --- Font labels on the real document ---------------------------------------

const cleanups: (() => void)[] = []
const roots: Root[] = []

async function render(node: React.ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(node))
}

/** The work, then the observer callbacks, effects and frame it schedules. */
async function settle(work: () => void) {
  await act(async () => work())
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
}

/** One font label naming a Host variable, resolved against <html>. */
function FontLabel() {
  return (
    <FontPicker
      value="var(--font-heading)"
      onChange={() => {}}
      category="heading"
      label="Heading font"
    />
  )
}

const renderFontLabels = (count = 1) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {Array.from({ length: count }, (_, index) => (
        <FontLabel key={index} />
      ))}
    </QueryClientProvider>
  )

const hostUnit = (): Unit => ({ doc: document, caller: null, labels: true })

/** The Host page's apply to the real <html>, which font labels observe. */
const applyToPage = (styles: Styles) =>
  applyThemeToElement(themeWith(styles), document.documentElement, {
    updateClass: false,
  })

/** A label mounted and settled on a first Theme, so the edit is steady state. */
async function startLabels(count = 1) {
  cleanups.push(() => removeThemeFromElement(document.documentElement))
  await settle(() =>
    applyToPage({ ...OWN_SHADOWS, "font-heading": "Lora, serif" })
  )
  await renderFontLabels(count)
}

let fontEdits = 0
const nextHeadingFont = (): Styles => ({
  ...OWN_SHADOWS,
  "font-heading": `Font${++fontEdits}, serif`,
})

describe("Theme apply font labels", () => {
  it("counts a one-token edit the label shows (its font)", async () => {
    await startLabels()

    const counts = await measure(counters(hostUnit()), () =>
      settle(() => applyToPage(nextHeadingFont()))
    )

    report("font label: a font edit the label shows", counts)
    checkCounts({ path: PATH, outcomes: ONE_TOKEN, counts })
  })

  it("counts a one-token edit the label does not show (a colour)", async () => {
    await startLabels()

    const counts = await measure(counters(hostUnit()), () =>
      settle(() =>
        applyToPage({
          ...OWN_SHADOWS,
          "font-heading": "Lora, serif",
          ...nextPrimary(),
        })
      )
    )

    report("font label: a colour edit", counts)
    checkCounts({ path: PATH, outcomes: ONE_TOKEN, counts })
  })
})

// --- Composition ------------------------------------------------------------

let namespace = 0

beforeAll(() => {
  // The Live frame loads an empty page instead of the network.
  ;(
    window as unknown as {
      happyDOM: {
        settings: {
          fetch: {
            interceptor: {
              beforeAsyncRequest: (context: {
                window: { Response: typeof Response }
              }) => Promise<Response>
            }
          }
        }
      }
    }
  ).happyDOM.settings.fetch.interceptor = {
    beforeAsyncRequest: async ({ window: requester }) =>
      new requester.Response("<!doctype html><html><body></body></html>", {
        headers: { "content-type": "text/html" },
      }),
  }
})

beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true)
  configurePresets({})
  localStorage.clear()
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

/** One store edit: the given tokens in both modes. */
function editTheme(styles: Styles) {
  useEditorStore.getState().setThemeState((prev) => ({
    ...prev,
    styles: {
      light: { ...prev.styles.light, ...styles },
      dark: { ...prev.styles.dark, ...styles },
    },
  }))
}

/** <Themer> open in Workspace on the Live tab, one font label beside it,
 *  and the Live frame loaded and themed. Returns the frame's document. */
async function mountComposition(shadows: Styles): Promise<Document> {
  ;(
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void }
    }
  ).happyDOM.setViewport({ width: 1440, height: 900 })
  await render(<Themer storageNamespace={`theme-apply-count-${++namespace}`} />)
  const trigger = document.querySelector<HTMLElement>(
    '[data-testid="themer-trigger"]'
  )
  if (!trigger) throw new Error("the Themer trigger did not render")
  await act(async () => trigger.click())
  await act(async () => usePreferencesStore.getState().setPreviewTab("live"))
  await renderFontLabels()

  const iframe = await vi.waitFor(() => {
    const found = document.querySelector("iframe")
    if (!found?.contentDocument?.documentElement) throw new Error("no frame")
    return found
  })
  await act(async () => iframe.dispatchEvent(new Event("load")))
  // One saved edit first, so the measured edit is a steady-state one.
  await settle(() => editTheme({ ...shadows, "font-heading": "Lora, serif" }))
  const frameDoc = iframe.contentDocument
  if (!frameDoc?.documentElement.style.getPropertyValue("--primary"))
    throw new Error("the Live frame was not themed")
  return frameDoc
}

/** One edit, counted on the Host page and on the Live frame, each a unit. */
async function measureBoth(frameDoc: Document, edit: () => void) {
  let live: Counts = {}
  const host = await measure(
    counters({ doc: document, caller: HOST_CALLER, labels: true }),
    async () => {
      live = await measure(
        counters({ doc: frameDoc, caller: LIVE_CALLER, labels: false }),
        () => settle(edit)
      )
    }
  )
  return { host, live }
}

describe("Theme apply composition", () => {
  const runs = [
    { name: "default features", shadows: OWN_SHADOWS },
    { name: "Theme override off", shadows: OWN_SHADOWS, overrideOff: true },
    { name: "Workspace off the Live tab", shadows: OWN_SHADOWS, liveOff: true },
    { name: "a Theme without its own shadows", shadows: DEFAULT_SHADOWS },
  ]

  for (const { name, shadows, overrideOff, liveOff } of runs) {
    it(`reports every row on the Host page and the Live frame, ${name}`, async () => {
      const frameDoc = await mountComposition(shadows)
      if (overrideOff)
        await act(async () =>
          usePreferencesStore.getState().setThemeOverrideEnabled(false)
        )
      if (liveOff)
        await act(async () =>
          usePreferencesStore.getState().setPreviewTab("cards")
        )

      const { host, live } = await measureBoth(frameDoc, () =>
        editTheme({ ...shadows, ...nextPrimary() })
      )

      report(`composition: ${name}, Host page`, host)
      report(`composition: ${name}, Live frame`, live)
      checkCounts({ path: PATH, outcomes: ONE_TOKEN, counts: host })
      checkCounts({ path: PATH, outcomes: ONE_TOKEN, counts: live })
      if (overrideOff || liveOff) {
        const removed = overrideOff ? { ...host, ...live } : live
        expect(Object.values(removed).every((count) => count === 0)).toBe(true)
      }
    })
  }
})

// --- Failing seeds ----------------------------------------------------------

/** The comparison of a seeded run with the unseeded figure fails on `row`. */
function expectCaught(row: string, unseeded: Counts, seeded: Counts) {
  expect(() =>
    checkCounts({
      path: PATH,
      outcomes: ONE_TOKEN,
      counts: seeded,
      register: registerOf(PATH, unseeded),
    })
  ).toThrow(`${PATH}: ${row} (`)
}

describe("Theme apply failing seeds", () => {
  /** A one-token edit on the Live frame, then the same with the seed. */
  async function expectSeedCaught(
    row: string,
    seeded: (doc: FakeDocument, theme: ThemeEditorState) => void
  ) {
    const doc = new FakeDocument()
    applyLive(doc, themeWith(OWN_SHADOWS))
    const plain = await measure(counters(fakeUnit(doc)), () =>
      applyLive(doc, themeWith({ ...OWN_SHADOWS, ...nextPrimary() }))
    )
    const withSeed = await measure(counters(fakeUnit(doc)), () =>
      seeded(doc, themeWith({ ...OWN_SHADOWS, ...nextPrimary() }))
    )
    expectCaught(row, plain, withSeed)
  }

  const after =
    (extra: (doc: FakeDocument, theme: ThemeEditorState) => void) =>
    (doc: FakeDocument, theme: ThemeEditorState) => {
      applyLive(doc, theme)
      extra(doc, theme)
    }

  it("catches an extra property write", () =>
    expectSeedCaught(
      "property writes",
      after((doc) => doc.documentElement.style.setProperty("--seed", "1"))
    ))

  it("catches a second property step that parses the shadow colour", () =>
    expectSeedCaught(
      "shadow colour parses",
      after((_doc, theme) => computeThemeProperties(theme))
    ))

  it("catches a CSSOM walk on an apply whose stylesheet count changed", () =>
    expectSeedCaught("CSSOM walks", (doc, theme) => {
      doc.styleSheets = [...doc.styleSheets, VARIANT_SHEET]
      applyLive(doc, theme)
    }))

  it("catches a second override sheet write", () =>
    expectSeedCaught(
      "override sheet writes",
      after((doc) => {
        const sheet = doc.head.children.find(isOverrideSheet)
        if (!sheet) throw new Error("no override sheet")
        sheet.textContent = `${sheet.textContent}\n`
      })
    ))

  it("catches a second restore-sheet lookup", () =>
    expectSeedCaught(
      "restore-sheet lookups",
      after((doc) => doc.getElementById(RESTORE_STYLE_ID))
    ))

  it("catches a class toggle", () =>
    expectSeedCaught("class toggles", (doc, theme) => {
      applyThemeToDocument(doc.asDocument, theme, { loadFonts: true })
    }))

  it("catches a second Theme font update", () =>
    expectSeedCaught(
      "Live frame font updates",
      after((doc) => setThemeFonts(doc.asDocument, []))
    ))

  it("catches a font link append", () =>
    expectSeedCaught(
      "font link appends",
      after((doc) => acquireGoogleFont("Seed Sans", { doc: doc.asDocument }))
    ))

  /** A font edit the label shows, then the same with a second label. */
  async function expectLabelSeedCaught(row: string) {
    await startLabels()
    const plain = await measure(counters(hostUnit()), () =>
      settle(() => applyToPage(nextHeadingFont()))
    )
    await renderFontLabels()
    const withSeed = await measure(counters(hostUnit()), () =>
      settle(() => applyToPage(nextHeadingFont()))
    )
    expectCaught(row, plain, withSeed)
  }

  it("catches a second font label's layout read", () =>
    expectLabelSeedCaught("font label layout reads"))

  it("catches a second font label's stringify", () =>
    expectLabelSeedCaught("font label stringifies"))

  it("catches a second font label's parse", () =>
    expectLabelSeedCaught("font label parses"))
})
