// The fullscreen preview's document logic, driven against a fake document: it
// enters native fullscreen and leaves it again, falls back to the CSS layout
// when the API is missing or the request is refused (and Esc then exits it,
// unless an earlier listener took that Esc), leaves Esc to the browser while
// natively fullscreen, drops the flag when the browser leaves fullscreen,
// ignores another element going fullscreen, and removes its listeners.
import { describe, expect, it } from "vitest"
import {
  enterFullscreen,
  exitFullscreen,
  subscribeFullscreen,
  type FullscreenDocument,
} from "./use-fullscreen"

type Listener = (event: Event) => void

/** A document whose Fullscreen API behaves as configured. */
function createFakeDocument({
  api = true,
  refuse = false,
}: { api?: boolean; refuse?: boolean } = {}) {
  const listeners = new Map<string, Set<Listener>>()
  const emit = (type: string, event: Partial<KeyboardEvent> = {}) => {
    for (const listener of listeners.get(type) ?? []) {
      listener({ type, ...event } as unknown as Event)
    }
  }

  const doc = {
    fullscreenElement: null as unknown,
    fullscreenEnabled: api,
    documentElement: {} as FullscreenDocument["documentElement"],
    exitFullscreen: undefined as FullscreenDocument["exitFullscreen"],
    addEventListener(type: string, listener: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(listener)
    },
    removeEventListener(type: string, listener: Listener) {
      listeners.get(type)?.delete(listener)
    },
  }

  if (api) {
    doc.documentElement.requestFullscreen = async () => {
      if (refuse) throw new TypeError("Permissions check failed")
      doc.fullscreenElement = doc.documentElement
      emit("fullscreenchange")
    }
    doc.exitFullscreen = async () => {
      doc.fullscreenElement = null
      emit("fullscreenchange")
    }
  }

  /** The user leaves native fullscreen through the browser (Esc, UI). */
  const browserExit = () => {
    doc.fullscreenElement = null
    emit("fullscreenchange")
  }
  const listenerCount = () =>
    [...listeners.values()].reduce((sum, set) => sum + set.size, 0)

  return { doc, emit, browserExit, listenerCount }
}

/** The store flag, as a getter/setter pair. */
function createFlag() {
  let active = false
  return {
    get: () => active,
    set: (next: boolean) => {
      active = next
    },
  }
}

describe("fullscreen state machine", () => {
  it("enters native fullscreen and leaves it again", async () => {
    const { doc } = createFakeDocument()
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    await expect(enterFullscreen(doc, flag.set)).resolves.toBe("native")
    expect(flag.get()).toBe(true)
    expect(doc.fullscreenElement).toBe(doc.documentElement)

    await exitFullscreen(doc, flag.set)
    expect(flag.get()).toBe(false)
    expect(doc.fullscreenElement).toBeNull()
    unsubscribe()
  })

  it("drops the flag when the browser leaves native fullscreen", async () => {
    const { doc, browserExit } = createFakeDocument()
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    await enterFullscreen(doc, flag.set)
    browserExit()
    expect(flag.get()).toBe(false)
    unsubscribe()
  })

  it("falls back to the CSS layout without the API, and Esc exits", async () => {
    const { doc, emit } = createFakeDocument({ api: false })
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    await expect(enterFullscreen(doc, flag.set)).resolves.toBe("fallback")
    expect(flag.get()).toBe(true)

    emit("keydown", { key: "Enter" })
    expect(flag.get()).toBe(true)
    emit("keydown", { key: "Escape" })
    expect(flag.get()).toBe(false)
    unsubscribe()
  })

  // A pinned inspector card takes Esc (preventDefault) before this listener
  // runs: that one key press closes the card, not the fullscreen layout too.
  it("keeps the CSS fallback when an earlier listener already took Esc", async () => {
    const { doc, emit } = createFakeDocument({ api: false })
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    await enterFullscreen(doc, flag.set)
    emit("keydown", { key: "Escape", defaultPrevented: true })
    expect(flag.get()).toBe(true)
    emit("keydown", { key: "Escape", defaultPrevented: false })
    expect(flag.get()).toBe(false)
    unsubscribe()
  })

  it("falls back when the browser refuses the request", async () => {
    const { doc } = createFakeDocument({ refuse: true })
    const flag = createFlag()

    await expect(enterFullscreen(doc, flag.set)).resolves.toBe("fallback")
    expect(flag.get()).toBe(true)
    expect(doc.fullscreenElement).toBeNull()
  })

  it("leaves Esc to the browser while natively fullscreen", async () => {
    const { doc, emit } = createFakeDocument()
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    await enterFullscreen(doc, flag.set)
    emit("keydown", { key: "Escape" })
    expect(flag.get()).toBe(true)
    unsubscribe()
  })

  it("ignores another element going fullscreen", () => {
    const { doc, emit } = createFakeDocument()
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)

    doc.fullscreenElement = { tagName: "VIDEO" }
    emit("fullscreenchange")
    expect(flag.get()).toBe(false)
    doc.fullscreenElement = null
    emit("fullscreenchange")
    expect(flag.get()).toBe(false)
    unsubscribe()
  })

  it("exit without native fullscreen only clears the flag", async () => {
    const { doc } = createFakeDocument()
    let exits = 0
    doc.exitFullscreen = async () => {
      exits += 1
    }
    const flag = createFlag()
    flag.set(true)

    await exitFullscreen(doc, flag.set)
    expect(flag.get()).toBe(false)
    expect(exits).toBe(0)
  })

  it("removes its listeners on unsubscribe", () => {
    const { doc, listenerCount } = createFakeDocument()
    const flag = createFlag()
    const unsubscribe = subscribeFullscreen(doc, flag.get, flag.set)
    expect(listenerCount()).toBe(2)
    unsubscribe()
    expect(listenerCount()).toBe(0)
  })
})
