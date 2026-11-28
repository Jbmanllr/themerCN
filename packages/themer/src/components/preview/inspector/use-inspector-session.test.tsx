// @vitest-environment happy-dom

// Ctrl+I belongs to the inspector only where it can run. Over a frame of
// another origin the Themer cannot read the page, so the key is left to the
// Host and the inspector stays off.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../hooks/use-themer-context", () => ({
  useThemerContext: () => ({ config: {} }),
}))

import { useThemerUIStore } from "../../../stores/themer-ui-store"
import { useInspectorSession } from "./use-inspector-session"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement
let iframe: HTMLIFrameElement

type Exposed = { available: boolean | null }

async function mount() {
  const exposed: Exposed = { available: null }
  const hostRef = { current: host }
  function Harness() {
    exposed.available = useInspectorSession({
      frame: true,
      bindingKey: "live",
      hostRef,
      containerRef: hostRef,
    }).available
    return null
  }
  root = createRoot(document.createElement("div"))
  await act(async () => root?.render(<Harness />))
  return exposed
}

/** The frame finishes loading a page whose document reads as `read` says. */
async function loadFrame(read: () => Document | null) {
  Object.defineProperty(iframe, "contentDocument", {
    configurable: true,
    get: read,
  })
  await act(async () => {
    iframe.dispatchEvent(new Event("load"))
  })
}

async function pressCtrlI() {
  const event = new KeyboardEvent("keydown", {
    key: "i",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  })
  await act(async () => {
    window.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  host = document.createElement("div")
  iframe = document.createElement("iframe")
  // Left out of the document: happy-dom would try to load a connected frame.
  host.append(iframe)
  useThemerUIStore.setState({ inspectorLayout: null })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
})

describe("the inspector shortcut on a framed page", () => {
  it("turns the inspector on over a page the Themer can read", async () => {
    const exposed = await mount()
    await loadFrame(() => document)

    const event = await pressCtrlI()

    expect(exposed.available).toBe(true)
    expect(useThemerUIStore.getState().inspectorLayout).toBe("workspace")
    expect(event.defaultPrevented).toBe(true)
  })

  it("leaves Ctrl+I alone over a page of another origin", async () => {
    const exposed = await mount()
    await loadFrame(() => {
      throw new DOMException("Blocked a frame", "SecurityError")
    })

    const event = await pressCtrlI()

    expect(exposed.available).toBe(false)
    expect(useThemerUIStore.getState().inspectorLayout).toBeNull()
    expect(event.defaultPrevented).toBe(false)
  })

  it("takes the key back once the frame moves to a readable page", async () => {
    const exposed = await mount()
    await loadFrame(() => null)
    await loadFrame(() => document)

    const event = await pressCtrlI()

    expect(exposed.available).toBe(true)
    expect(event.defaultPrevented).toBe(true)
  })
})
