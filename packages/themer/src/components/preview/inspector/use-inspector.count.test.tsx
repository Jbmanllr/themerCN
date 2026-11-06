// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "enableIframePageLoading": true, "handleDisabledFileLoadingAsSuccess": true } }
// The inspector count test: the counted work of one inspector pointer move
// (one `mousemove` over the inspected surface, plus the frame it schedules),
// against the Inspector pointer move rows of the Quality register
// (TESTING.md), whose caps are the paths ADR's Inspector pointer move
// contract. Run it with
// `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx`.
//
// - Row tests drive useInspector (with the overlay it feeds) on each kind of
//   surface: a Preview tab's element tree, the Live frame, and the Host page
//   with the Themer's tree ignored. The test dispatches the pointer events
//   and runs the animation frames. Each run is one outcome of the contract:
//   a move that keeps the same element, a move to a new element, or a move
//   onto the shown card (outside the surface).
// - The composition run mounts each adapter in turn: <Themer> in Workspace
//   on the Cards tab and on the Live tab (PreviewTabs), and <Themer> in an
//   in-place layout (PageInspector). The feature-off run turns the inspector
//   off, which must remove every listener and the pending frame.
// - Each counter has a failing seed: one extra unit of its work, which the
//   comparison against the unseeded figure must catch, naming the row.
import * as React from "react"
import { act } from "react"
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
  checkReach,
  checkSeedCaught,
  countCalls,
  countConstructions,
  countExport,
  countGetter,
  madeBy,
  measure,
  type Counter,
  type Counts,
} from "../../../../../../tests/counting"
import { configurePresets } from "../../../config/presets"
import { Themer } from "../../../index"
import { useColorFocusStore } from "../../../stores/color-focus-store"
import { useEditorStore } from "../../../stores/editor-store"
import { usePreferencesStore } from "../../../stores/preferences-store"
import { useThemerUIStore } from "../../../stores/themer-ui-store"
import { InspectorOverlay } from "./inspector-overlay"
import {
  createThemeClassRegex,
  findThemeClasses,
  matchThemeClasses,
} from "./theme-class-regex"
import { INSPECTOR_CARD_ATTRIBUTE, useInspector } from "./use-inspector"

// Work that crosses no platform boundary is counted on its module export:
// the ancestor walk, and the overlay's render (its memo kept).
vi.mock("./theme-class-regex", async (importOriginal) => {
  const { passThrough } = await import("../../../../../../tests/counting")
  const real = await importOriginal<typeof import("./theme-class-regex")>()
  // While a class match runs, its regex tests are the ones counted per class.
  const matching = globalThis as { __inspectorClassMatch?: number }
  const within = <F extends (...args: never[]) => unknown>(fn: F) =>
    function (this: unknown, ...args: Parameters<F>) {
      matching.__inspectorClassMatch = (matching.__inspectorClassMatch ?? 0) + 1
      try {
        return fn.apply(this, args)
      } finally {
        matching.__inspectorClassMatch--
      }
    } as F
  return {
    ...real,
    findThemeClasses: passThrough(
      "ancestor walk",
      within(real.findThemeClasses)
    ),
    matchThemeClasses: within(real.matchThemeClasses),
  }
})
vi.mock("./inspector-overlay", async (importOriginal) => {
  const { passThrough } = await import("../../../../../../tests/counting")
  const { memo } = await import("react")
  const real = await importOriginal<typeof import("./inspector-overlay")>()
  const render = (
    real.InspectorOverlay as unknown as {
      type: (props: never) => React.ReactNode
    }
  ).type
  return {
    ...real,
    InspectorOverlay: memo(passThrough("overlay render", render)),
  }
})
// happy-dom overflows on the real sheet's custom properties (themer.test.tsx).
vi.mock("../../../generated/themer-css", () => ({
  THEMER_CSS:
    "@scope ([data-themer]) to ([data-themer-host]) { .stand-in { color: red } }",
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const PATH = "Inspector pointer move"

// The outcomes, in the paths ADR's names (its Register rows column). Each
// run names exactly one: a move that keeps the hovered element, a move to a
// new element, or a move onto the shown card, outside the surface.
const SAME = ["same element"] as const
const NEW = ["new element"] as const
const CARD = ["card shown"] as const

// Stacks that tell the inspector's own work apart from the rest of the page.
const USE_INSPECTOR = /\/inspector\/use-inspector\.ts/
/** A class match of the inspector's (set by the mock above) is running. */
const inClassMatch = () =>
  ((globalThis as { __inspectorClassMatch?: number }).__inspectorClassMatch ??
    0) > 0

const THEMER_TREE = "[data-themer]"
const CARD_SELECTOR = `[${INSPECTOR_CARD_ATTRIBUTE}]`

// A failing seed's extra work comes from the test, not from the inspector;
// it counts as the inspector's while `seeding` is set. Each row it seeds
// has a figure above 0, so the file's reach check (last) still proves the
// stack filters see the inspector's own work.
let seeding = false
const asSeed = (work: () => void) => {
  seeding = true
  try {
    work()
  } finally {
    seeding = false
  }
}
const inInspector = () => seeding || calledFrom(USE_INSPECTOR)

// --- Animation frames, run by the test ---------------------------------------

const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0
/** The frames the inspector scheduled (pending while still in `frames`). */
const inspectorFrames = new Set<number>()

function stubFrames() {
  frames.clear()
  inspectorFrames.clear()
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    if (calledFrom(USE_INSPECTOR)) inspectorFrames.add(id)
    return id
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id)
  })
}

/** Runs frames and timers until the mounted page is quiet, so its start-up
 *  work (the Cards tab's charts load their scale code once, on a timer
 *  after their first frame) is done before a unit is counted. */
async function settleFrames() {
  for (let round = 0; round < 5; round++) {
    await runFrames()
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
  }
}

/** Runs the frames scheduled so far (not those they schedule). */
async function runFrames() {
  await act(async () => {
    const due = [...frames.entries()]
    frames.clear()
    for (const [, callback] of due) callback(performance.now())
  })
}

// --- Counters ----------------------------------------------------------------

/** Notifications of the Themer's stores: each is one store set. */
const countStoreSets = (store: {
  subscribe(listener: () => void): () => void
}): Counter => ({
  row: "store sets",
  install: (bump) => store.subscribe(() => bump()),
})

// happy-dom's own work, which a browser does natively (its media query
// parser compiles regexes on every `matchMedia(...).matches`).
const FAKE_DOM = /\/node_modules\/.*\/happy-dom\//

/** `new RegExp(...)` calls, except the fake DOM's own. */
const countRegexCompiles = (): Counter => ({
  row: "regex compiles",
  install(bump) {
    const own = countConstructions("regex compiles", globalThis, "RegExp")
    return own.install(() => {
      if (seeding || !madeBy(FAKE_DOM)) bump()
    })
  },
})

/** The most times any one class string was tested by the class regex. */
const countClassTests = (): Counter => ({
  row: "class tests per class",
  install(bump) {
    const tests = new Map<RegExp, Map<string, number>>()
    let most = 0
    const test = RegExp.prototype.test
    RegExp.prototype.test = function (this: RegExp, value: string) {
      if (inClassMatch()) {
        const seen = tests.get(this) ?? new Map<string, number>()
        tests.set(this, seen)
        const times = (seen.get(value) ?? 0) + 1
        seen.set(value, times)
        if (times > most) {
          most = times
          bump()
        }
      }
      return test.call(this, value)
    }
    return () => {
      RegExp.prototype.test = test
    }
  },
})

/** One surface the inspector binds: the realms whose nodes it touches, its
 *  container (one rect per measure), the frame and the ignore selector. */
type Surface = {
  realms: Window[]
  container: HTMLElement
  iframe: HTMLIFrameElement | null
  ignore: string | undefined
}

/** Raw counters; "layout reads" becomes "layout reads per measure". */
function counters({ realms, container, iframe, ignore }: Surface): Counter[] {
  // A frame may share the page's DOM classes (happy-dom does): count each
  // prototype once.
  const elements = new Set(
    realms.map(
      (realm) =>
        (realm as unknown as { Element: typeof Element }).Element.prototype
    )
  )
  const nodes = new Set(
    realms.map(
      (realm) => (realm as unknown as { Node: typeof Node }).Node.prototype
    )
  )
  return [
    countRegexCompiles(),
    countStoreSets(useEditorStore),
    countStoreSets(usePreferencesStore),
    countStoreSets(useThemerUIStore),
    countStoreSets(useColorFocusStore),
    countExport("ancestor walks", "ancestor walk"),
    countClassTests(),
    ...[...elements].flatMap((element) => [
      countCalls(
        "`closest(ignore)` calls",
        element,
        "closest",
        (selector) =>
          ignore !== undefined && selector === ignore && inInspector()
      ),
      countCalls(
        "other DOM queries",
        element,
        "closest",
        (selector) => selector !== ignore && inInspector()
      ),
      countCalls("layout reads", element, "getBoundingClientRect", inInspector),
    ]),
    ...[...nodes].map((node) =>
      countCalls("other DOM queries", node, "contains", inInspector)
    ),
    countCalls("measures", container, "getBoundingClientRect", inInspector),
    ...(iframe
      ? [
          countGetter("layout reads", iframe, "clientLeft"),
          countGetter("layout reads", iframe, "clientTop"),
        ]
      : []),
    countExport("overlay renders", "overlay render"),
  ]
}

/** One pointer move and its frame, counted on `surface`. */
async function measureMove(surface: Surface, move: () => void) {
  const raw = await measure(counters(surface), async () => {
    await act(async () => move())
    await runFrames()
  })
  return perMeasure(raw)
}

/** Layout reads per measure; reads outside any measure count whole. */
function perMeasure(raw: Counts): Counts {
  const { "layout reads": reads = 0, ...counts } = raw
  const measures = counts.measures ?? 0
  return {
    ...counts,
    "layout reads per measure": measures ? reads / measures : reads,
  }
}

/** Prints a run's counts, labelled, for the first measurement. */
function report(run: string, counts: Counts) {
  console.log(`${PATH} [${run}]: ${JSON.stringify(counts)}`)
}

const moveOver = (target: Element) => () => {
  target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
}

// --- Row tests: useInspector and its overlay on one surface -----------------

const roots: Root[] = []
const cleanups: (() => void)[] = []

async function render(node: React.ReactNode, into?: HTMLElement) {
  const container = into ?? document.createElement("div")
  if (!into) document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(node))
  return root
}

/** useInspector feeding the overlay, as PreviewTabs and PageInspector do. */
function Inspected({
  enabled = true,
  frame,
  host,
  container,
  ignore,
  onFocusColor,
}: {
  enabled?: boolean
  frame: boolean
  host: HTMLElement
  container: HTMLElement
  ignore?: string
  onFocusColor: (key: string) => void
}) {
  const hostRef = React.useMemo(() => ({ current: host }), [host])
  const containerRef = React.useMemo(
    () => ({ current: container }),
    [container]
  )
  const { state } = useInspector({
    enabled,
    frame,
    bindingKey: "count",
    hostRef,
    containerRef,
    ignore,
    onPick: () => {},
  })
  return <InspectorOverlay state={state} onFocusColor={onFocusColor} />
}

const noFocus = () => {}

/** Two elements with different token classes, inside `parent`. */
function addTargets(parent: HTMLElement) {
  const doc = parent.ownerDocument
  const first = doc.createElement("button")
  first.className = "rounded bg-primary text-primary-foreground"
  const second = doc.createElement("div")
  second.className = "border border-border bg-card"
  const inner = doc.createElement("span")
  inner.textContent = "label"
  second.append(inner)
  parent.append(first, second)
  return { first, second, inner }
}

type Bound = Surface & {
  first: Element
  second: Element
  inner: Element
  card: () => Element
  rerender: (props?: {
    enabled?: boolean
    onFocusColor?: () => void
  }) => Promise<void>
}

/** A Preview tab: the host is an element tree; the overlay is its sibling. */
async function bindPreviewTab(): Promise<Bound> {
  const container = document.createElement("section")
  const host = document.createElement("div")
  const layer = document.createElement("div")
  container.append(host, layer)
  document.body.append(container)
  const targets = addTargets(host)
  return bind({ container, host, layer, frame: false, targets })
}

/** The Live frame: the host holds a same-origin iframe. */
async function bindLiveFrame(): Promise<Bound> {
  const container = document.createElement("section")
  const host = document.createElement("div")
  const layer = document.createElement("div")
  const iframe = document.createElement("iframe")
  host.append(iframe)
  container.append(host, layer)
  document.body.append(container)
  const frameDoc = await vi.waitFor(() => {
    const doc = iframe.contentDocument
    if (!doc?.body) throw new Error("no frame document")
    return doc
  })
  const targets = addTargets(frameDoc.body)
  return bind({ container, host, layer, frame: true, targets, iframe })
}

/** The Host page: the host is <html>, the Themer's tree (holding the
 *  overlay) is ignored. */
async function bindHostPage(): Promise<Bound> {
  const page = document.createElement("main")
  document.body.append(page)
  const targets = addTargets(page)
  const themer = document.createElement("div")
  themer.setAttribute("data-themer", "")
  const container = document.createElement("div")
  themer.append(container)
  document.body.append(themer)
  cleanups.push(() => {
    page.remove()
    themer.remove()
  })
  return bind({
    container,
    host: document.documentElement,
    layer: container,
    frame: false,
    targets,
    ignore: THEMER_TREE,
  })
}

async function bind({
  container,
  host,
  layer,
  frame,
  targets,
  iframe = null,
  ignore,
}: {
  container: HTMLElement
  host: HTMLElement
  layer: HTMLElement
  frame: boolean
  targets: ReturnType<typeof addTargets>
  iframe?: HTMLIFrameElement | null
  ignore?: string
}): Promise<Bound> {
  if (container !== layer) cleanups.push(() => container.remove())
  const root = createRoot(layer)
  roots.push(root)
  const draw = (props: { enabled?: boolean; onFocusColor?: () => void } = {}) =>
    act(async () =>
      root.render(
        <Inspected
          frame={frame}
          host={host}
          container={container}
          ignore={ignore}
          enabled={props.enabled}
          onFocusColor={props.onFocusColor ?? noFocus}
        />
      )
    )
  await draw()
  const frameWindow = iframe?.contentWindow as Window | null | undefined
  return {
    realms: frameWindow ? [window, frameWindow] : [window],
    container,
    iframe,
    ignore,
    ...targets,
    card: () => {
      const found = layer.querySelector(CARD_SELECTOR)
      if (!found) throw new Error("no card shown")
      return found
    },
    rerender: draw,
  }
}

/** The hovered element and its card before the measured move. */
async function hover(target: Element) {
  await act(async () => moveOver(target)())
  await runFrames()
}

const outcomes = [
  {
    name: "a move that keeps the same element",
    outcomes: SAME,
    move: async (b: Bound) => {
      await hover(b.second)
      return moveOver(b.inner)
    },
  },
  {
    name: "a move to a new element",
    outcomes: NEW,
    move: async (b: Bound) => {
      await hover(b.first)
      return moveOver(b.second)
    },
  },
  {
    name: "a move onto the shown card",
    outcomes: CARD,
    move: async (b: Bound) => {
      await hover(b.first)
      return moveOver(b.card())
    },
  },
]

const surfaces = [
  { name: "a Preview tab", bindSurface: bindPreviewTab },
  { name: "the Live frame", bindSurface: bindLiveFrame },
  { name: "the Host page", bindSurface: bindHostPage },
]

beforeAll(() => {
  // A Live frame with a URL loads an empty page instead of the network.
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
  window.matchMedia ??= ((query: string) => ({
    media: query,
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  stubFrames()
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("Inspector pointer move rows", () => {
  for (const { name: surfaceName, bindSurface } of surfaces) {
    for (const { name, outcomes: named, move } of outcomes) {
      it(`counts ${name} on ${surfaceName}`, async () => {
        const bound = await bindSurface()
        const unit = await move(bound)

        const counts = await measureMove(bound, unit)

        report(`row: ${surfaceName}, ${name}`, counts)
        checkCounts({ path: PATH, outcomes: named, counts })
      })
    }
  }
})

// --- Composition: each adapter in the mounted Themer -------------------------

let namespace = 0

function setViewport(width: number) {
  ;(
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void }
    }
  ).happyDOM.setViewport({ width, height: 900 })
}

/** Elements of `root` with token classes of their own, two different. */
function pickTargets(root: ParentNode): [Element, Element] {
  const found: Element[] = []
  for (const element of root.querySelectorAll("[class]")) {
    const classes = matchThemeClasses(String(element.getAttribute("class")))
    if (classes.length === 0) continue
    const first = found[0]
    if (
      first &&
      matchThemeClasses(String(first.getAttribute("class"))).join(" ") ===
        classes.join(" ")
    )
      continue
    found.push(element)
    if (found.length === 2) return [found[0]!, found[1]!]
  }
  throw new Error("no two elements with different token classes")
}

/** Tracks the inspector's listeners in `realms` until stopped; returns the
 *  ones still bound. */
function trackListeners(realms: Window[]) {
  const bound = new Map<string, number>()
  const keyOf = (
    target: object,
    type: string,
    listener: unknown,
    options: unknown
  ) => {
    const capture =
      typeof options === "boolean"
        ? options
        : Boolean((options as { capture?: boolean } | undefined)?.capture)
    return { target, type, listener, capture }
  }
  const ids = new WeakMap<object, number>()
  let nextId = 0
  const idOf = (value: unknown) => {
    if (typeof value !== "object" && typeof value !== "function") return 0
    if (!value) return 0
    if (!ids.has(value)) ids.set(value, ++nextId)
    return ids.get(value)!
  }
  const name = (key: ReturnType<typeof keyOf>) =>
    `${idOf(key.target)}:${key.type}:${idOf(key.listener)}:${key.capture}`
  const restores = [...new Set(realms)].map((realm) => {
    const proto = (realm as unknown as { EventTarget: typeof EventTarget })
      .EventTarget.prototype
    const add = proto.addEventListener
    const remove = proto.removeEventListener
    proto.addEventListener = function (
      this: EventTarget,
      ...args: Parameters<EventTarget["addEventListener"]>
    ) {
      if (calledFrom(USE_INSPECTOR)) {
        const key = name(keyOf(this, args[0], args[1], args[2]))
        bound.set(key, (bound.get(key) ?? 0) + 1)
      }
      return add.apply(this, args)
    }
    proto.removeEventListener = function (
      this: EventTarget,
      ...args: Parameters<EventTarget["removeEventListener"]>
    ) {
      const key = name(keyOf(this, args[0], args[1], args[2]))
      if (bound.has(key)) {
        const left = bound.get(key)! - 1
        if (left > 0) bound.set(key, left)
        else bound.delete(key)
      }
      return remove.apply(this, args)
    }
    return () => {
      proto.addEventListener = add
      proto.removeEventListener = remove
    }
  })
  cleanups.push(() => restores.forEach((restore) => restore()))
  return () => [...bound.keys()]
}

type Adapter = {
  name: string
  /** Mounts the adapter with the inspector on; returns its surface. */
  mount: (track: (realms: Window[]) => () => string[]) => Promise<{
    surface: Surface
    targets: ParentNode
    card: () => Element
    stillBound: () => string[]
    turnOff: () => Promise<void>
  }>
}

async function openThemer(layout?: "workspace" | "overlay") {
  setViewport(1440)
  await render(
    <Themer
      storageNamespace={`inspector-count-${++namespace}`}
      layout={layout}
    />
  )
  const trigger = document.querySelector<HTMLElement>(
    '[data-testid="themer-trigger"]'
  )
  if (!trigger) throw new Error("the Themer trigger did not render")
  await act(async () => trigger.click())
}

const turnInspector = (layout: "workspace" | "overlay") => () =>
  act(async () => useThemerUIStore.getState().toggleInspector(layout))

function previewParts() {
  const preview = document.querySelector('[data-testid="themer-preview"]')
  const container = preview?.querySelector("section")
  const host = container?.firstElementChild
  if (!container || !(host instanceof HTMLElement))
    throw new Error("no Preview tabs")
  return { container: container as HTMLElement, host }
}

const previewCard = () => {
  const found = previewParts().container.querySelector(CARD_SELECTOR)
  if (!found) throw new Error("no card shown")
  return found
}

const adapters: Adapter[] = [
  {
    name: "Workspace's Preview tabs, Cards tab",
    async mount(track) {
      await openThemer()
      await act(async () =>
        usePreferencesStore.getState().setPreviewTab("cards")
      )
      const { container, host } = await vi.waitFor(() => {
        const parts = previewParts()
        pickTargets(parts.host)
        return parts
      })
      const stillBound = track([window])
      await turnInspector("workspace")()
      return {
        surface: {
          realms: [window],
          container,
          iframe: null,
          ignore: undefined,
        },
        targets: host,
        card: previewCard,
        stillBound,
        turnOff: turnInspector("workspace"),
      }
    },
  },
  {
    name: "Workspace's Preview tabs, Live tab",
    async mount(track) {
      await openThemer()
      await act(async () =>
        usePreferencesStore.getState().setPreviewTab("live")
      )
      const iframe = await vi.waitFor(() => {
        const found = document.querySelector("iframe")
        if (!found?.contentDocument?.body) throw new Error("no frame")
        return found
      })
      await act(async () => iframe.dispatchEvent(new Event("load")))
      const frameDoc = iframe.contentDocument!
      addTargets(frameDoc.body)
      const frameWindow = iframe.contentWindow as unknown as Window
      const stillBound = track([window, frameWindow])
      await turnInspector("workspace")()
      return {
        surface: {
          realms: [window, frameWindow],
          container: previewParts().container,
          iframe,
          ignore: undefined,
        },
        targets: frameDoc.body,
        card: previewCard,
        stillBound,
        turnOff: turnInspector("workspace"),
      }
    },
  },
  {
    name: "the in-place layouts' page inspector (Overlay)",
    async mount(track) {
      const page = document.createElement("main")
      document.body.append(page)
      addTargets(page)
      await openThemer("overlay")
      const stillBound = track([window])
      await turnInspector("overlay")()
      const container = document.querySelector<HTMLElement>(
        '[data-testid="themer-page-inspector"]'
      )
      if (!container) throw new Error("no page inspector")
      return {
        surface: {
          realms: [window],
          container,
          iframe: null,
          ignore: THEMER_TREE,
        },
        targets: page,
        card: () => {
          const found = container.querySelector(CARD_SELECTOR)
          if (!found) throw new Error("no card shown")
          return found
        },
        stillBound,
        turnOff: turnInspector("overlay"),
      }
    },
  },
]

describe("Inspector pointer move composition", () => {
  for (const { name, mount } of adapters) {
    it(`reports every row for each outcome, ${name}`, async () => {
      const { surface, targets, card } = await mount(trackListeners)
      await settleFrames()
      const [first, second] = pickTargets(targets)

      await hover(first)
      const toNew = await measureMove(surface, moveOver(second))
      const toSame = await measureMove(surface, moveOver(second))
      const toCard = await measureMove(surface, moveOver(card()))

      report(`composition: ${name}, new element`, toNew)
      report(`composition: ${name}, same element`, toSame)
      report(`composition: ${name}, card shown`, toCard)
      checkCounts({ path: PATH, outcomes: NEW, counts: toNew })
      checkCounts({ path: PATH, outcomes: SAME, counts: toSame })
      checkCounts({ path: PATH, outcomes: CARD, counts: toCard })
    })

    it(`removes every listener and the pending frame, inspector off, ${name}`, async () => {
      const { surface, targets, stillBound, turnOff } =
        await mount(trackListeners)
      await settleFrames()
      const [first, second] = pickTargets(targets)
      await hover(first)
      // A move to a new element leaves its measure pending.
      await act(async () => moveOver(second)())
      const pending = [...inspectorFrames].filter((id) => frames.has(id))
      expect(pending).toHaveLength(1)

      await turnOff()

      expect([...inspectorFrames].filter((id) => frames.has(id))).toEqual([])
      expect(stillBound()).toEqual([])
      const counts = await measureMove(surface, moveOver(first))
      report(`feature off: ${name}`, counts)
      checkCounts({ path: PATH, outcomes: NEW, counts })
      expect(Object.values(counts).every((count) => count === 0)).toBe(true)
    })
  }
})

// --- Failing seeds -------------------------------------------------------------

/** The comparison of a seeded run with the unseeded figure fails on `row`. */
const expectCaught = (row: string, unseeded: Counts, seeded: Counts) =>
  checkSeedCaught({ path: PATH, row, unseeded, seeded })

describe("Inspector pointer move failing seeds", () => {
  /** A move to a new element on a Preview tab, then the same with the seed. */
  async function expectSeedCaught(
    row: string,
    seed: (bound: Bound) => void | Promise<void>
  ) {
    const bound = await bindPreviewTab()
    await hover(bound.first)
    const plain = await measureMove(bound, moveOver(bound.second))
    await hover(bound.first)
    const seeded = await measureMove(bound, () => {
      moveOver(bound.second)()
      return seed(bound)
    })
    expectCaught(row, plain, seeded)
  }

  it("catches a regex compile", () =>
    expectSeedCaught("regex compiles", () => {
      createThemeClassRegex()
    }))

  it("catches a store set", () =>
    expectSeedCaught("store sets", () => {
      useThemerUIStore.getState().toggleFullscreen()
    }))

  it("catches a second ancestor walk", () =>
    expectSeedCaught("ancestor walks", (b) => {
      findThemeClasses(b.second, null)
    }))

  it("catches a class tested twice", () =>
    expectSeedCaught("class tests per class", (b) => {
      matchThemeClasses(String(b.second.getAttribute("class")))
    }))

  it("catches a second `closest(ignore)`", async () => {
    const bound = await bindHostPage()
    await hover(bound.first)
    const plain = await measureMove(bound, moveOver(bound.second))
    await hover(bound.first)
    const seeded = await measureMove(bound, () => {
      moveOver(bound.second)()
      asSeed(() => bound.second.closest(THEMER_TREE))
    })
    expectCaught("`closest(ignore)` calls", plain, seeded)
  })

  it("catches another DOM query", () =>
    expectSeedCaught("other DOM queries", (b) => {
      asSeed(() => b.container.contains(b.second))
    }))

  it("catches a second measure", () =>
    expectSeedCaught("measures", (b) => {
      asSeed(() => b.container.getBoundingClientRect())
    }))

  it("catches an extra layout read in a measure", () =>
    expectSeedCaught("layout reads per measure", (b) => {
      asSeed(() => b.second.getBoundingClientRect())
    }))

  it("catches an overlay render with an unchanged state", () =>
    expectSeedCaught("overlay renders", (b) =>
      b.rerender({ onFocusColor: () => {} })
    ))
})

// Last: every unseeded run above has been compared with the register.
describe("Inspector pointer move reach", () => {
  it("reaches every register figure in its unseeded runs", () => {
    checkReach({ path: PATH })
  })
})
