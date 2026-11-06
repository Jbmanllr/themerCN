// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The store-action count test: the counted work of one `set` on the editor
// store, against the Store action rows of the Quality register (TESTING.md),
// whose caps are the paths ADR's Store action contract. Run it with
// `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx`.
//
// - Row tests drive one set through the store module's actions, with each
//   published selector subscribed, once per outcome the contract splits.
// - The composition run drives one set with <Themer> mounted and open and
//   every panel's selector callers mounted, with Sidebar Sync on, then off;
//   with it off, its lookups are gone.
// - Each counter has a failing seed: one extra unit of its work, which the
//   comparison against the unseeded figure must catch, naming the row.
import * as React from "react"
import { act } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  calledFrom,
  checkCounts,
  checkReach,
  checkSeedCaught,
  countCalls,
  countExport,
  countStorage,
  measure,
  type Counts,
} from "../../../../tests/counting"
import { configureExtraColors } from "../config/extra-colors"
import { configurePresets } from "../config/presets"
import { CodePanelDialog } from "../components/actions/code-panel-dialog"
import { ContrastChecker } from "../components/editor/contrast-checker"
import { OtherPanel } from "../components/panels/other-panel"
import { TypographyPanel } from "../components/panels/typography-panel"
import { useIsOnPreset } from "../hooks/use-editor-selectors"
import { Themer } from "../index"
import {
  selectApplyThemePreset,
  selectCanRedo,
  selectCanUndo,
  selectCurrentMode,
  selectIsOnPreset,
  selectPreset,
} from "../selectors"
import type { ThemerExtraColorGroup } from "../types"
import { getShadowMap } from "../utils/shadows"
import { isDeepEqual } from "../utils/deep-equal"
import { useEditorStore } from "./editor-store"
import { hydrateThemerStores } from "./hydrate"
import { usePreferencesStore } from "./preferences-store"
import { useThemerUIStore } from "./themer-ui-store"

// Work that crosses no platform boundary is counted on its module export.
vi.mock("../utils/deep-equal", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../utils/deep-equal")>()
  return { ...real, isDeepEqual: passThrough("deep compare", real.isDeepEqual) }
})
// Each export of the colour helpers parses the colour text it is given.
vi.mock("../utils/color-converter", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../utils/color-converter")>()
  return Object.fromEntries(
    Object.entries(real).map(([name, value]) => [
      name,
      typeof value === "function" ? passThrough("colour parse", value) : value,
    ])
  )
})
// Sidebar Sync's lookup: the sidebar colours checked against their twins.
vi.mock("../utils/sidebar-sync", async (importOriginal) => {
  const { passThrough } = await import("../../../../tests/counting")
  const real = await importOriginal<typeof import("../utils/sidebar-sync")>()
  return {
    ...real,
    applySidebarSync: passThrough("sidebar sync", real.applySidebarSync),
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

const PATH = "Store action"

// A selector runs in a published selector, or in a hook's selector (the
// subscription zustand's React binding hands to useSyncExternalStore).
const inSelector = () =>
  calledFrom(/\/src\/selectors\/|\/zustand\/esm\/react\.mjs/)

// A font label's stringify and computed-style read follow the Theme apply's
// write to <html> (its root-style observer), so they are Theme apply rows
// (font label stringifies, font label layout reads), counted there.
const notFontLabel = () => !calledFrom(/\/components\/editor\/font-picker\./)

const counters = () => [
  countCalls("stringifies", JSON, "stringify", notFontLabel),
  countStorage("storage writes", "setItem"),
  countStorage("storage reads", "getItem"),
  countExport("store deep compares", "deep compare", () => !inSelector()),
  countExport("selector deep compares", "deep compare", inSelector),
  countExport("selector colour parses", "colour parse", inSelector),
  countCalls(
    "computed-style reads",
    globalThis,
    "getComputedStyle",
    notFontLabel
  ),
]

// The outcomes, in the paths ADR's names (its Register rows column).
const THEME_EDIT = ["persisted change", "Theme change"] as const
const HISTORY_ONLY = ["no change", "history-only change"] as const
const NO_EXTRAS = "no unset extra colours"
const UNSET_EXTRAS = "unset extra colours"

const EXTRA_COLORS: readonly ThemerExtraColorGroup[] = [
  { title: "Status", colors: [{ key: "success", label: "Success" }] },
]

let edits = 0

/** A one-token edit: a new light primary. */
function editTheme() {
  edits++
  useEditorStore.getState().setThemeState((prev) => ({
    ...prev,
    styles: {
      ...prev.styles,
      light: { ...prev.styles.light, primary: `oklch(0.5 0.1 ${edits})` },
    },
  }))
}

/** A set that changes the undo history only: the same Theme again. */
function setSameTheme() {
  useEditorStore.getState().setThemeState((prev) => prev)
}

/** One subscriber per published selector, as each caller subscribes. */
function subscribePublishedSelectors(sidebarSync = false) {
  const selectors = [
    selectCanUndo,
    selectCanRedo,
    selectCurrentMode,
    selectPreset,
    selectIsOnPreset(sidebarSync),
    selectApplyThemePreset,
  ]
  const unsubscribes = selectors.map((selector) =>
    useEditorStore.subscribe((state) => selector(state))
  )
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
}

let namespace = 0
const cleanups: (() => void)[] = []
const roots: Root[] = []

/** Hydrated stores on a fresh namespace, one edit already saved, so the
 *  measured set is a steady-state one. */
function startStores() {
  hydrateThemerStores(`store-action-count-${++namespace}`)
  editTheme()
}

async function render(node: React.ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(node))
}

/** One set, then the effects and the frame it schedules. */
async function settle(action: () => void) {
  await act(async () => action())
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
}

beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true)
  configurePresets({})
  configureExtraColors(undefined)
  localStorage.clear()
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

/** Prints a run's counts, labelled, for the first measurement. */
function report(run: string, counts: Counts) {
  console.log(`${PATH} [${run}]: ${JSON.stringify(counts)}`)
}

describe("Store action rows", () => {
  const cases = [
    {
      outcome: "a Theme edit that changes the persisted slice",
      outcomes: [...THEME_EDIT, NO_EXTRAS],
      action: editTheme,
      extras: false,
    },
    {
      outcome: "a history-only set that leaves the persisted slice as it was",
      outcomes: [...HISTORY_ONLY, NO_EXTRAS],
      action: setSameTheme,
      extras: false,
    },
    {
      outcome: "a Theme edit with unset Host extra colours registered",
      outcomes: [...THEME_EDIT, UNSET_EXTRAS],
      action: editTheme,
      extras: true,
    },
  ]

  for (const { outcome, outcomes, action, extras } of cases) {
    it(`counts ${outcome}`, async () => {
      if (extras) configureExtraColors(EXTRA_COLORS)
      startStores()
      cleanups.push(subscribePublishedSelectors())

      const counts = await measure(counters(), action)

      report(`row: ${outcomes.join(", ")}`, counts)
      checkCounts({ path: PATH, outcomes, counts })
    })
  }
})

/** <Themer> mounted and open on the desktop layout, plus the panels and
 *  dialogs it shows one at a time, so every selector caller is mounted. */
async function mountComposition(extras: boolean) {
  ;(
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void }
    }
  ).happyDOM.setViewport({ width: 1440, height: 900 })
  await render(
    <Themer
      storageNamespace={`store-action-count-${++namespace}`}
      extraColors={extras ? EXTRA_COLORS : undefined}
    />
  )
  const trigger = document.querySelector<HTMLElement>(
    '[data-testid="themer-trigger"]'
  )
  if (!trigger) throw new Error("the Themer trigger did not render")
  await act(async () => trigger.click())
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <TypographyPanel />
      <OtherPanel />
      <ContrastChecker />
      <CodePanelDialog open onOpenChange={() => {}} />
    </QueryClientProvider>
  )
  // The preview tabs load their examples lazily. On a loaded machine the
  // import resolves late, and its Suspense reveal would land in the measured
  // set: settle every import first.
  await act(() => vi.dynamicImportSettled())
  // One saved edit first, so the measured set is a steady-state one.
  await settle(editTheme)
}

// Not a register row: the work Sidebar Sync off must remove.
const SIDEBAR_SYNC_LOOKUPS = "Sidebar Sync lookups"

describe("Store action composition", () => {
  const runs = [
    { name: "Sidebar Sync on", sync: true, extras: false },
    { name: "Sidebar Sync off", sync: false, extras: false },
    {
      name: "unset extra colours, Sidebar Sync off",
      sync: false,
      extras: true,
    },
  ]

  for (const { name, sync, extras } of runs) {
    it(`reports every row with <Themer> mounted, ${name}`, async () => {
      await mountComposition(extras)
      if (sync)
        await act(async () =>
          useEditorStore.getState().setSidebarColorSync(true)
        )
      await settle(editTheme)

      const { [SIDEBAR_SYNC_LOOKUPS]: lookups, ...counts } = await measure(
        [...counters(), countExport(SIDEBAR_SYNC_LOOKUPS, "sidebar sync")],
        () => settle(editTheme)
      )

      const outcomes = [...THEME_EDIT, extras ? UNSET_EXTRAS : NO_EXTRAS]
      report(`composition: ${name}`, counts)
      checkCounts({ path: PATH, outcomes, counts })
      // Sidebar Sync off removes its lookups; on, the counter sees them.
      if (sync) expect(lookups).toBeGreaterThan(0)
      else expect(lookups).toBe(0)
    })
  }

  it("reports every row on a history-only set with <Themer> mounted", async () => {
    await mountComposition(false)

    const counts = await measure(counters(), () => settle(setSameTheme))

    const outcomes = [...HISTORY_ONLY, NO_EXTRAS]
    report(`composition: ${outcomes.join(", ")}`, counts)
    checkCounts({ path: PATH, outcomes, counts })
  })
})

function ExtraOnPresetCaller() {
  useIsOnPreset()
  return null
}

function ExtraShadowCaller() {
  useEditorStore((state) => getShadowMap(state.themeState).shadow)
  return null
}

describe("Store action failing seeds", () => {
  /** The unseeded figure, then the same unit with the seed: the comparison
   *  must fail and name the seeded row. */
  async function expectSeedCaught(row: string, seed: () => Promise<void>) {
    startStores()
    cleanups.push(subscribePublishedSelectors())
    const unseeded = await measure(counters(), () => settle(editTheme))
    await seed()
    const seeded = await measure(counters(), () => settle(editTheme))

    checkSeedCaught({ path: PATH, row, unseeded, seeded })
  }

  const subscriber = (work: () => void) => async () => {
    cleanups.push(useEditorStore.subscribe(work))
  }

  it("catches a second stringify in a store subscriber", () =>
    expectSeedCaught(
      "stringifies",
      subscriber(() => JSON.stringify(useEditorStore.getState().themeState))
    ))

  it("catches a second storage write in a store subscriber", () =>
    expectSeedCaught(
      "storage writes",
      subscriber(() => localStorage.setItem("seed", "1"))
    ))

  it("catches a storage read in a store subscriber", () =>
    expectSeedCaught(
      "storage reads",
      subscriber(() => localStorage.getItem("seed"))
    ))

  it("catches an extra Theme deep compare in the store", () =>
    expectSeedCaught(
      "store deep compares",
      subscriber(() => {
        const { themeState, themeCheckpoint } = useEditorStore.getState()
        isDeepEqual(themeState, themeCheckpoint)
      })
    ))

  it("catches one more selector caller that deep-compares the Theme", () =>
    expectSeedCaught("selector deep compares", () =>
      render(<ExtraOnPresetCaller />)
    ))

  it("catches a selector that parses a colour", () =>
    expectSeedCaught("selector colour parses", () =>
      render(<ExtraShadowCaller />)
    ))

  it("catches a computed-style read in a store subscriber", () =>
    expectSeedCaught(
      "computed-style reads",
      subscriber(() => getComputedStyle(document.documentElement))
    ))
})

// Last: every unseeded run above has been compared with the register.
describe("Store action reach", () => {
  it("reaches every register figure in its unseeded runs", () => {
    checkReach({ path: PATH })
  })
})
