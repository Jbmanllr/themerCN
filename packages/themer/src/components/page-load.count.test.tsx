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
//   the Theme override off.
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
  countCalls,
  countExport,
  measure,
  registerOf,
  type Counter,
  type Counts,
} from "../../../../tests/counting"
import { loadRegister } from "../../../../tests/register"
import {
  EDITOR_STATE_VERSION,
  PREFERENCES_VERSION,
  RESTORE_STYLE_ID,
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
import { applyThemeToElement } from "../utils/apply-theme"
import { THEMER_STYLE_ATTRIBUTE } from "./themer-scope"

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
    applyThemeToElement: passThrough("theme apply", real.applyThemeToElement),
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
// Measured by the merge-gate Playwright count, not in Vitest.
const BROWSER_ONLY_ROWS = new Set(["frame chunk imports"])

// The stage of the load running now: the head-script rows count in the head
// script's run, the hydration rows in the <Themer> mount or switch.
type Stage = "idle" | "build" | "head" | "mount"
let stage: Stage = "idle"
const inStage = (wanted: Stage) => () => stage === wanted

// Formatting a stack makes the test runner parse source maps with
// JSON.parse; those parses are the tooling's, not the load's.
let readingStack = 0
const stackHas = (pattern: RegExp) => {
  readingStack++
  try {
    return calledFrom(pattern)
  } finally {
    readingStack--
  }
}
const parsedIn = (wanted: Stage) => () => !readingStack && stage === wanted

// A plain stand-in for localStorage, so a counter can wrap its methods (a
// spy on the storage instance itself would be stored as an item).
let storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear">

const isColourModeKey = (key: string) => key.endsWith(":color-mode")

/** Counts the calls of a method, deciding on the receiver too. */
const countMethod = <T extends object>(
  row: string,
  prototype: T,
  key: keyof T & string,
  when: (self: unknown, args: unknown[]) => boolean
): Counter => ({
  row,
  install(bump) {
    const own = Object.getOwnPropertyDescriptor(prototype, key)
    const original = prototype[key] as (...args: unknown[]) => unknown
    Object.defineProperty(prototype, key, {
      configurable: true,
      writable: true,
      value(this: unknown, ...args: unknown[]) {
        if (when(this, args)) bump()
        return original.apply(this, args)
      },
    })
    return () => restore(prototype, key, own)
  },
})

/** Counts the writes of the setter `prototype[key]` (own or inherited). */
const countSetter = (
  row: string,
  prototype: object,
  key: string,
  when: (self: unknown) => boolean
): Counter => ({
  row,
  install(bump) {
    const own = Object.getOwnPropertyDescriptor(prototype, key)
    let found: PropertyDescriptor | undefined
    for (let at: object | null = prototype; at && !found;) {
      found = Object.getOwnPropertyDescriptor(at, key)
      at = Object.getPrototypeOf(at)
    }
    const { get, set } = found ?? {}
    if (!get || !set) throw new Error(`countSetter: ${key} has no setter`)
    Object.defineProperty(prototype, key, {
      configurable: true,
      get,
      set(this: unknown, value: unknown) {
        if (when(this)) bump()
        set.call(this, value)
      },
    })
    return () => restore(prototype, key, own)
  },
})

function restore(
  target: object,
  key: string,
  own: PropertyDescriptor | undefined
) {
  if (own) Object.defineProperty(target, key, own)
  else delete (target as Record<string, unknown>)[key]
}

/** Counts the sets of the persisted stores, not hydration's own. */
const countStoreSets = (row: string): Counter => ({
  row,
  install(bump) {
    const counted = () => {
      if (!stackHas(/\/stores\/hydrate\./)) bump()
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
const observesRootClass = (args: unknown[]) => {
  const [target, options] = args as [Node, MutationObserverInit | undefined]
  return (
    target === document.documentElement &&
    options?.attributes === true &&
    (!options.attributeFilter || options.attributeFilter.includes("class"))
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
    const keys = ["append", "appendChild"] as const
    const owns = keys.map((key) => Object.getOwnPropertyDescriptor(head, key))
    let depth = 0
    for (const key of keys) {
      const original = head[key] as (...nodes: unknown[]) => unknown
      Object.defineProperty(head, key, {
        configurable: true,
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
    }
    return () => keys.forEach((key, index) => restore(head, key, owns[index]))
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
  countMethod(
    "restore-sheet removals",
    Element.prototype,
    "remove",
    isRestoreSheet
  ),
  countHeadAppends("stylesheet inserts", isThemerSheet),
  countHeadAppends("font links", isFontLink),
  countExport("Preset deep compares", "deep compare", () =>
    stackHas(/\badoptDefaultPreset\b|\brefreshUntouchedPreset\b/)
  ),
  countStoreSets("store sets"),
  countExport(
    "first applies",
    "theme apply",
    (_state: unknown, element: unknown) => element === document.documentElement
  ),
  countMethod(
    "root-class observers",
    MutationObserver.prototype,
    "observe",
    (_self, args) => observesRootClass(args)
  ),
]

/** The register's Page load rows that Vitest measures. */
function vitestRegister() {
  const register = loadRegister()
  return {
    row: (path: string, name: string) => register.row(path, name),
    rows: (path: string) =>
      register.rows(path).filter(({ row }) => !BROWSER_ONLY_ROWS.has(row)),
  }
}

function check(outcomes: readonly string[], counts: Counts) {
  checkCounts({ path: PATH, outcomes, counts, register: vitestRegister() })
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

afterEach(async () => {
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
      outcomes: [NOTHING_SAVED],
      save: () => {},
    },
    {
      outcome: "a load with a saved Theme at the current version",
      outcomes: [SAVED_THEME],
      save: (namespace: string) => {
        saveEditor(namespace, editedEntry())
        saveColourMode(namespace, "light")
      },
    },
    {
      // The head script and the stores drop the entry: nothing is restored.
      outcome: "a load with entries saved at another version",
      outcomes: [OTHER_VERSION, NOTHING_SAVED],
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

  for (const { outcome, outcomes, save } of cases) {
    it(`counts ${outcome}`, async () => {
      const namespace = freshNamespace()
      save(namespace)

      const counts = await measure(counters(), () => pageLoad(namespace, {}))

      report(`row: ${outcomes.join(", ")}`, counts)
      check(outcomes, counts)
    })
  }

  it("counts a storageNamespace switch to a saved Theme", async () => {
    await pageLoad(freshNamespace(), {})
    const next = freshNamespace()
    saveEditor(next, editedEntry())

    const counts = await measure(counters(), () => switchNamespace(next, {}))

    const outcomes = [NAMESPACE_SWITCH, SAVED_THEME]
    report(`row: ${outcomes.join(", ")}`, counts)
    check(outcomes, counts)
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
    check([SAVED_THEME], load)

    const empty = freshNamespace()
    const switched = await measure(counters(), () =>
      switchNamespace(empty, HOST)
    )
    const outcomes = [NAMESPACE_SWITCH, NOTHING_SAVED]
    report(`composition: ${outcomes.join(", ")}`, switched)
    check(outcomes, switched)
  })

  it("reports every row for a Host load with the Theme override off", async () => {
    const namespace = freshNamespace()
    saveHostLoad(namespace)
    savePreferences(namespace, { themeOverrideEnabled: false })

    const counts = await measure(counters(), () => pageLoad(namespace, HOST))

    report(`composition: Theme override off, ${SAVED_THEME}`, counts)
    check([SAVED_THEME], counts)
  })
})

describe("Page load failing seeds", () => {
  const outcomes = [SAVED_THEME]

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

    expect(() =>
      checkCounts({
        path: PATH,
        outcomes,
        counts: seeded,
        register: registerOf(PATH, unseeded),
      })
    ).toThrow(`${PATH}: ${row} (`)
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
      mount: () =>
        applyThemeToElement(
          useEditorStore.getState().themeState,
          document.documentElement
        ),
    })))

  it("catches a second root-class observer", () =>
    expectSeedCaught("root-class observers", () => ({
      mount: () =>
        new MutationObserver(() => {}).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        }),
    })))
})
