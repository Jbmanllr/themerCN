// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The page-load count test: the counted work of one page load, or one
// `storageNamespace` switch, against the Page load rows of the Quality
// register (TESTING.md), whose caps are the paths ADR's Page load contract.
// Run it with
// `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`.
//
// One load runs the stages a Next Host page runs, in order: the server
// render of <ThemerHeadScript>, its inline script run against the saved
// entries, the hydration and post-hydration renders of <ThemerHeadScript>,
// then the <Themer> mount. Each stage's rows count only in that stage (the
// head script's reads are not hydration's), so a load reports every row.
//
// - Row tests: one load per outcome (nothing saved, a saved Theme at the
//   current version, an entry at another version), and a namespace switch.
// - The composition run: a Host <Themer> with its Presets and default Preset,
//   a saved Theme with four Google families and a saved mode that differs
//   from the Theme's, then a switch to an empty namespace; then a load with
//   the Theme override off, which writes no restore sheet, no font link and
//   no first apply.
// - Each counter has a failing seed: one extra unit of its work, which the
//   comparison against the unseeded figure must catch, naming the row.
//
// Frame chunk imports need a real browser's Live frame: the merge-gate
// Playwright count (apps/web/e2e) measures that row, so it is left out here.
import { act } from "react"
import { createRoot, hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  calledFrom,
  checkCounts,
  checkReach,
  checkSeedCaught,
  countCalls,
  countExport,
  countMethod,
  countSetter,
  measure,
  override,
  readingStack,
  type Counter,
  type Counts,
} from "../../../../tests/counting"
import {
  EDITOR_STATE_VERSION,
  PREFERENCES_VERSION,
  RESTORE_STYLE_ID,
  THEMER_STYLE_ATTRIBUTE,
} from "../config/constants"
import { defaultThemeState } from "../config/defaults"
import { configureExtraColors } from "../config/extra-colors"
import { configurePresets, resolvePresetStyles } from "../config/presets"
import { getThemerHeadScript } from "../head-script"
import { Themer } from "../index"
import { ThemerHeadScript } from "../next"
import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import { useThemerUIStore } from "../stores/themer-ui-store"
import type { ThemePreset, ThemerProps } from "../types"
import { startThemedDocument } from "../utils/apply-theme"

// Work that crosses no platform boundary is counted on its module export.
vi.mock("../head-script", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../head-script")>()
  return {
    ...real,
    getThemerHeadScript: passThrough(
      "head-script build",
      real.getThemerHeadScript
    ),
  }
})
vi.mock("../utils/deep-equal", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../utils/deep-equal")>()
  return { ...real, isDeepEqual: passThrough("deep compare", real.isDeepEqual) }
})
vi.mock("../utils/apply-theme", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../utils/apply-theme")>()
  return {
    ...real,
    startThemedDocument: passThrough(
      "themed document start",
      real.startThemedDocument
    ),
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

const PATH = "Page load"
// Frame chunk imports are measured by the merge-gate Playwright count, not
// in Vitest.
const inVitest = (row: string) => row !== "frame chunk imports"

// The stage of the load running now: the head-script rows count in the head
// script's run, the hydration rows in the <Themer> mount or switch.
type Stage = "idle" | "build" | "head" | "mount"
let stage: Stage = "idle"
const inStage = (wanted: Stage) => () => stage === wanted

// Formatting a stack makes the test runner parse source maps with
// JSON.parse; those parses are the tooling's, not the load's.
const parsedIn = (wanted: Stage) => () => !readingStack() && stage === wanted

// A plain stand-in for localStorage, so a counter can wrap its methods (a
// spy on the storage instance itself would be stored as an item).
let storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear">

const isColourModeKey = (key: string) => key.endsWith(":color-mode")

/** Counts the sets of the persisted stores, not hydration's own. */
const countStoreSets = (row: string): Counter => ({
  row,
  install(bump) {
    const counted = () => {
      if (!calledFrom(/\/stores\/hydrate\./)) bump()
    }
    const unsubscribes = [
      useEditorStore.subscribe(counted),
      usePreferencesStore.subscribe(counted),
    ]
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  },
})

const isRestoreSheet = (node: unknown) =>
  node instanceof Element && node.id === RESTORE_STYLE_ID
const isThemerSheet = (node: unknown) =>
  node instanceof HTMLStyleElement && node.hasAttribute(THEMER_STYLE_ATTRIBUTE)
const isFontLink = (node: unknown) =>
  node instanceof HTMLLinkElement && node.rel === "stylesheet"
/** An observer of any <html> attribute: a filter naming any attributes, or
 *  none (`attributeFilter` alone implies `attributes`). */
const observesHtmlAttributes = (args: unknown[]) => {
  const [target, options] = args as [Node, MutationObserverInit | undefined]
  return (
    target === document.documentElement &&
    (options?.attributes === true || options?.attributeFilter !== undefined)
  )
}
/** Counts the nodes `when` matches appended to <head>, by append or
 *  appendChild; once per node (happy-dom's append calls appendChild). */
const countHeadAppends = (
  row: string,
  when: (node: unknown) => boolean
): Counter => ({
  row,
  install(bump) {
    const head = document.head
    let depth = 0
    const restores = (["append", "appendChild"] as const).map((key) => {
      const original = head[key] as (...nodes: unknown[]) => unknown
      return override(head, key, {
        writable: true,
        value(this: unknown, ...nodes: unknown[]) {
          if (depth === 0) nodes.filter(when).forEach(() => bump())
          depth++
          try {
            return original.apply(this, nodes)
          } finally {
            depth--
          }
        },
      })
    })
    return () => restores.reverse().forEach((restore) => restore())
  },
})

const counters = (): Counter[] => [
  countExport("head-script builds", "head-script build"),
  countCalls("head-script storage reads", storage, "getItem", inStage("head")),
  countCalls("head-script parses", JSON, "parse", parsedIn("head")),
  countCalls("hydration storage reads", storage, "getItem", inStage("mount")),
  countCalls("hydration parses", JSON, "parse", parsedIn("mount")),
  countCalls(
    "storage writes",
    storage,
    "setItem",
    (key) => !isColourModeKey(key)
  ),
  countCalls(
    "storage writes",
    storage,
    "removeItem",
    (key) => !isColourModeKey(key)
  ),
  countCalls("colour-mode writes", storage, "setItem", isColourModeKey),
  countCalls("colour-mode writes", storage, "removeItem", isColourModeKey),
  countSetter(
    "restore-sheet writes",
    HTMLStyleElement.prototype,
    "textContent",
    isRestoreSheet
  ),
  countMethod("restore-sheet removals", Element.prototype, "remove", (self) =>
    isRestoreSheet(self)
  ),
  countHeadAppends("stylesheet inserts", isThemerSheet),
  countHeadAppends("font links", isFontLink),
  countExport("Preset deep compares", "deep compare", () =>
    calledFrom(/\badoptDefaultPreset\b|\brefreshUntouchedPreset\b/)
  ),
  countStoreSets("store sets"),
  // A themed document's start is its first apply.
  countExport(
    "first applies",
    "themed document start",
    (doc: unknown) => doc === document
  ),
  countMethod(
    "`<html>` observers",
    MutationObserver.prototype,
    "observe",
    (_self, ...args) => observesHtmlAttributes(args)
  ),
]

/** Checks one unit: `outcome` is its outcome for every split row but the
 *  restore sheet's, whose outcomes are only "nothing saved" and "saved
 *  Theme": `restored` (a load at another version restores nothing). */
function check(outcome: string, counts: Counts, restored: string) {
  checkCounts({
    path: PATH,
    outcomes: [outcome],
    perRow: { "restore-sheet writes": restored },
    counts,
    only: inVitest,
  })
}

/** The contract's "exactly 1 first apply": equality, so a load or switch
 *  that applies nothing fails as well as one that applies twice. */
function expectOneFirstApply(counts: Counts) {
  expect(counts["first applies"]).toBe(1)
}

/** Prints a run's counts, labelled, for the first measurement. */
function report(run: string, counts: Counts) {
  console.log(`${PATH} [${run}]: ${JSON.stringify(counts)}`)
}

// The outcomes, in the paths ADR's names (its Register rows column).
const NOTHING_SAVED = "nothing saved"
const SAVED_THEME = "saved Theme"
const OTHER_VERSION = "other version"
const NAMESPACE_SWITCH = "namespace switch"

// Four Google families, one per font slot (the contract's most).
const GOOGLE_FONTS = {
  "font-sans": "Inter, sans-serif",
  "font-heading": "Poppins, sans-serif",
  "font-serif": "Lora, serif",
  "font-mono": "Fira Code, monospace",
}

// Hex colours: happy-dom drops an oklch() inline style.
const HOST_PRESETS: readonly ThemePreset[] = [
  {
    id: "brand",
    label: "Brand",
    styles: {
      light: { primary: "#111111", ...GOOGLE_FONTS },
      dark: { primary: "#eeeeee" },
    },
  },
]
const HOST: ThemerProps = { presets: HOST_PRESETS, defaultPreset: "brand" }

/** The stored entry of a Theme edited from the default Preset (the four
 *  Google families): its Preset baseline is stored beside it. */
function editedEntry() {
  return {
    themeState: {
      ...defaultThemeState,
      styles: {
        ...defaultThemeState.styles,
        light: { ...defaultThemeState.styles.light, ...GOOGLE_FONTS },
      },
    },
    presetBaseline: { preset: "default", styles: defaultThemeState.styles },
  }
}

/** The stored entry of the Host's default Preset, untouched: the Theme is
 *  its own baseline, so only the Theme is stored. */
function hostPresetEntry() {
  configurePresets({ presets: HOST_PRESETS, defaultPreset: "brand" })
  return {
    themeState: {
      ...defaultThemeState,
      preset: "brand",
      styles: resolvePresetStyles("brand"),
    },
  }
}

function saveEditor(
  namespace: string,
  state: object,
  version = EDITOR_STATE_VERSION
) {
  localStorage.setItem(
    `${namespace}:editor`,
    JSON.stringify({ state, version })
  )
}

function savePreferences(
  namespace: string,
  state: object,
  version = PREFERENCES_VERSION
) {
  localStorage.setItem(
    `${namespace}:preferences`,
    JSON.stringify({ state, version })
  )
}

function saveColourMode(namespace: string, mode: "light" | "dark") {
  localStorage.setItem(`${namespace}:color-mode`, mode)
}

let namespaces = 0
const freshNamespace = () => `page-load-count-${++namespaces}`

const roots: Root[] = []
let themerRoot: Root | null = null

/** Work a failing seed adds in one stage of the load. */
type Seed = Partial<Record<Exclude<Stage, "idle">, () => void>>

async function settle() {
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
}

/**
 * One Next Host page load on `namespace`: the server render of
 * <ThemerHeadScript>, its inline script run as the browser parses it, the
 * hydration and post-hydration renders, then the <Themer> mount.
 */
async function pageLoad(
  namespace: string,
  props: ThemerProps,
  seed: Seed = {}
) {
  stage = "build"
  const html = renderToString(<ThemerHeadScript storageNamespace={namespace} />)
  seed.build?.()

  stage = "head"
  const head = document.createElement("div")
  document.body.append(head)
  head.innerHTML = html
  new Function(head.querySelector("script")?.textContent ?? "")()
  seed.head?.()

  stage = "build"
  await act(async () => {
    roots.push(
      hydrateRoot(head, <ThemerHeadScript storageNamespace={namespace} />)
    )
  })

  stage = "mount"
  const container = document.createElement("div")
  document.body.append(container)
  themerRoot = createRoot(container)
  roots.push(themerRoot)
  const root = themerRoot
  await act(async () =>
    root.render(<Themer storageNamespace={namespace} {...props} />)
  )
  await settle()
  seed.mount?.()
  stage = "idle"
}

/** The mounted <Themer> switches to `namespace`. */
async function switchNamespace(
  namespace: string,
  props: ThemerProps,
  seed: Seed = {}
) {
  const root = themerRoot
  if (!root) throw new Error("no <Themer> mounted")
  stage = "mount"
  await act(async () =>
    root.render(<Themer storageNamespace={namespace} {...props} />)
  )
  await settle()
  seed.mount?.()
  stage = "idle"
}

beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true)
  configurePresets({})
  configureExtraColors(undefined)
  const real = globalThis.localStorage
  real.clear()
  storage = {
    getItem: (key) => real.getItem(key),
    setItem: (key, value) => real.setItem(key, value),
    removeItem: (key) => real.removeItem(key),
    clear: () => real.clear(),
  }
  vi.stubGlobal("localStorage", storage)
  document.head.innerHTML = ""
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
})

/** Themed documents a seed started, stopped after the test. */
const seededStops: (() => void)[] = []

afterEach(async () => {
  for (const stop of seededStops.splice(0)) stop()
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  themerRoot = null
  stage = "idle"
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("Page load rows", () => {
  const cases = [
    {
      outcome: "a load with nothing saved",
      named: NOTHING_SAVED,
      restored: NOTHING_SAVED,
      save: () => {},
    },
    {
      outcome: "a load with a saved Theme at the current version",
      named: SAVED_THEME,
      restored: SAVED_THEME,
      save: (namespace: string) => {
        saveEditor(namespace, editedEntry())
        saveColourMode(namespace, "light")
      },
    },
    {
      // The head script and the stores drop the entry: nothing is restored.
      outcome: "a load with entries saved at another version",
      named: OTHER_VERSION,
      restored: NOTHING_SAVED,
      save: (namespace: string) => {
        saveEditor(namespace, editedEntry(), EDITOR_STATE_VERSION - 1)
        savePreferences(
          namespace,
          { themeOverrideEnabled: true },
          PREFERENCES_VERSION - 1
        )
      },
    },
  ]

  for (const { outcome, named, restored, save } of cases) {
    it(`counts ${outcome}`, async () => {
      const namespace = freshNamespace()
      save(namespace)

      const counts = await measure(counters(), () => pageLoad(namespace, {}))

      report(`row: ${named}`, counts)
      check(named, counts, restored)
    })
  }

  it("counts a storageNamespace switch to a saved Theme", async () => {
    await pageLoad(freshNamespace(), {})
    const next = freshNamespace()
    saveEditor(next, editedEntry())

    const counts = await measure(counters(), () => switchNamespace(next, {}))

    report(`row: ${NAMESPACE_SWITCH} to a ${SAVED_THEME}`, counts)
    check(NAMESPACE_SWITCH, counts, SAVED_THEME)
    expectOneFirstApply(counts)
  })
})

describe("Page load composition", () => {
  /** The Host's Preset restored, with a saved mode the Theme does not hold. */
  function saveHostLoad(namespace: string) {
    saveEditor(namespace, hostPresetEntry())
    saveColourMode(namespace, "dark")
  }

  it("reports every row for a Host load, then a storageNamespace switch", async () => {
    const namespace = freshNamespace()
    saveHostLoad(namespace)

    const load = await measure(counters(), () => pageLoad(namespace, HOST))
    report(`composition: load, ${SAVED_THEME}`, load)
    check(SAVED_THEME, load, SAVED_THEME)
    expectOneFirstApply(load)

    const empty = freshNamespace()
    const switched = await measure(counters(), () =>
      switchNamespace(empty, HOST)
    )
    report(`composition: ${NAMESPACE_SWITCH} to ${NOTHING_SAVED}`, switched)
    check(NAMESPACE_SWITCH, switched, NOTHING_SAVED)
    expectOneFirstApply(switched)
  })

  it("reports every row for a Host load with the Theme override off", async () => {
    const namespace = freshNamespace()
    saveHostLoad(namespace)
    savePreferences(namespace, { themeOverrideEnabled: false })

    const counts = await measure(counters(), () => pageLoad(namespace, HOST))

    report(`composition: Theme override off, ${SAVED_THEME}`, counts)
    check(SAVED_THEME, counts, SAVED_THEME)
    // The Theme override off removes the restore sheet, the head script's
    // font links and the first apply.
    expect({
      "restore-sheet writes": counts["restore-sheet writes"],
      "font links": counts["font links"],
      "first applies": counts["first applies"],
    }).toEqual({
      "restore-sheet writes": 0,
      "font links": 0,
      "first applies": 0,
    })
  })
})

describe("Page load failing seeds", () => {
  /** The unseeded figure, then the same load with the seed: the comparison
   *  must fail and name the seeded row. */
  async function expectSeedCaught(
    row: string,
    seed: (namespace: string) => Seed
  ) {
    const first = freshNamespace()
    saveEditor(first, editedEntry())
    const unseeded = await measure(counters(), () => pageLoad(first, {}))
    for (const root of roots.splice(0)) await act(async () => root.unmount())
    document.body.innerHTML = ""
    document.head.innerHTML = ""

    const second = freshNamespace()
    saveEditor(second, editedEntry())
    const seeded = await measure(counters(), () =>
      pageLoad(second, {}, seed(second))
    )

    checkSeedCaught({ path: PATH, row, unseeded, seeded })
  }

  it("catches a second head-script build", () =>
    expectSeedCaught("head-script builds", (namespace) => ({
      build: () => getThemerHeadScript({ storageNamespace: namespace }),
    })))

  it("catches a fourth storage read in the head script", () =>
    expectSeedCaught("head-script storage reads", () => ({
      head: () => localStorage.getItem("seed"),
    })))

  it("catches a third parse in the head script", () =>
    expectSeedCaught("head-script parses", () => ({
      head: () => JSON.parse("{}"),
    })))

  it("catches a third storage read in hydration", () =>
    expectSeedCaught("hydration storage reads", () => ({
      mount: () => localStorage.getItem("seed"),
    })))

  it("catches a third parse in hydration", () =>
    expectSeedCaught("hydration parses", () => ({
      mount: () => JSON.parse("{}"),
    })))

  it("catches a storage write on a load", () =>
    expectSeedCaught("storage writes", () => ({
      mount: () => localStorage.setItem("seed", "1"),
    })))

  it("catches a second colour-mode write", () =>
    expectSeedCaught("colour-mode writes", (namespace) => ({
      mount: () => localStorage.setItem(`${namespace}:color-mode`, "light"),
    })))

  it("catches a second restore-sheet write", () =>
    expectSeedCaught("restore-sheet writes", () => ({
      head: () => {
        const sheet = document.getElementById(RESTORE_STYLE_ID)
        if (sheet) sheet.textContent = `${sheet.textContent}`
      },
    })))

  it("catches a second restore-sheet removal", () =>
    expectSeedCaught("restore-sheet removals", () => ({
      mount: () => {
        const sheet = document.createElement("style")
        sheet.id = RESTORE_STYLE_ID
        sheet.remove()
      },
    })))

  it("catches a second Themer stylesheet insert", () =>
    expectSeedCaught("stylesheet inserts", () => ({
      mount: () => {
        const style = document.createElement("style")
        style.setAttribute(THEMER_STYLE_ATTRIBUTE, "")
        document.head.append(style)
      },
    })))

  it("catches one more font link", () =>
    expectSeedCaught("font links", () => ({
      mount: () => {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://fonts.googleapis.com/css2?family=Seed"
        document.head.appendChild(link)
      },
    })))

  it("catches one more Preset deep compare", () =>
    expectSeedCaught("Preset deep compares", () => ({
      mount: () => useEditorStore.getState().refreshUntouchedPreset(),
    })))

  it("catches a third store set", () =>
    expectSeedCaught("store sets", () => ({
      mount: () => useEditorStore.setState({}),
    })))

  it("catches a second first apply", () =>
    expectSeedCaught("first applies", () => ({
      mount: () => {
        seededStops.push(startThemedDocument(document, useEditorStore))
      },
    })))

  it("catches a second <html> observer of another attribute", () =>
    expectSeedCaught("`<html>` observers", () => ({
      mount: () =>
        new MutationObserver(() => {}).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["dir"],
        }),
    })))

  it("catches a second <html> observer with no attribute filter", () =>
    expectSeedCaught("`<html>` observers", () => ({
      mount: () =>
        new MutationObserver(() => {}).observe(document.documentElement, {
          attributes: true,
        }),
    })))
})

// Last: every unseeded run above has been compared with the register.
describe("Page load reach", () => {
  it("reaches every register figure in its unseeded runs", () => {
    checkReach({ path: PATH, only: inVitest })
  })
})
