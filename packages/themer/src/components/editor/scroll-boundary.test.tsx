// @vitest-environment happy-dom

// The editor's pickers scroll inside a portal on top of the host page. At the
// edge of such a list a wheel turn must stop there instead of scrolling the
// page behind the editor.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useScrollBoundary } from "./scroll-boundary"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let outer: HTMLDivElement
let list: HTMLDivElement

/** A box `client` px tall holding `content` px of content, scrolled to `top`. */
function scrollBox(
  element: HTMLElement,
  client: number,
  content: number,
  top: number
) {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: client,
  })
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: content,
  })
  element.scrollTop = top
}

async function mount(
  options: { enabled?: boolean; viewportSelector?: string } = {}
) {
  const ref = { current: outer }
  function Harness({ enabled }: { enabled: boolean }) {
    useScrollBoundary(ref, {
      enabled,
      viewportSelector: options.viewportSelector,
    })
    return null
  }
  root = createRoot(document.createElement("div"))
  const render = (enabled: boolean) =>
    act(async () => root?.render(<Harness enabled={enabled} />))
  await render(options.enabled ?? true)
  // The hook binds a frame after mount, so portaled content is in place.
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
  return render
}

function wheel(deltaY: number) {
  const event = new WheelEvent("wheel", {
    deltaY,
    bubbles: true,
    cancelable: true,
  })
  const stop = vi.spyOn(event, "stopPropagation")
  ;(list ?? outer).dispatchEvent(event)
  return { event, stop }
}

beforeEach(() => {
  outer = document.createElement("div")
  list = document.createElement("div")
  list.setAttribute("data-slot", "viewport")
  outer.append(list)
  document.body.append(outer)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  outer.remove()
})

describe("useScrollBoundary", () => {
  it("holds a wheel turn at the top and the bottom edge", async () => {
    scrollBox(outer, 100, 400, 0)
    await mount()

    const up = wheel(-30)
    expect(up.event.defaultPrevented).toBe(true)
    expect(up.stop).toHaveBeenCalled()
    expect(outer.scrollTop).toBe(0)

    outer.scrollTop = 290
    const down = wheel(50)
    expect(down.event.defaultPrevented).toBe(true)
    // Clamped to the end, not past it.
    expect(outer.scrollTop).toBe(300)
  })

  it("lets a wheel turn inside the list scroll it", async () => {
    scrollBox(outer, 100, 400, 150)
    await mount()

    expect(wheel(40).event.defaultPrevented).toBe(false)
    expect(wheel(-40).event.defaultPrevented).toBe(false)
    expect(wheel(0).event.defaultPrevented).toBe(false)
  })

  it("swallows the wheel when the list does not scroll at all", async () => {
    scrollBox(outer, 100, 100, 0)
    await mount()
    expect(wheel(30).event.defaultPrevented).toBe(true)
  })

  it("watches a descendant when given a selector", async () => {
    scrollBox(outer, 500, 500, 0)
    scrollBox(list, 100, 400, 0)
    await mount({ viewportSelector: '[data-slot="viewport"]' })

    // The outer box would swallow every turn; the viewport is the one watched.
    expect(wheel(30).event.defaultPrevented).toBe(false)
    expect(wheel(-30).event.defaultPrevented).toBe(true)
  })

  it("does nothing while disabled, and binds when enabled", async () => {
    scrollBox(outer, 100, 400, 0)
    const render = await mount({ enabled: false })
    expect(wheel(-30).event.defaultPrevented).toBe(false)

    await render(true)
    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    )
    expect(wheel(-30).event.defaultPrevented).toBe(true)
  })

  it("lets go of the list when unmounted", async () => {
    scrollBox(outer, 100, 400, 0)
    await mount()
    await act(async () => root?.unmount())
    root = null
    expect(wheel(-30).event.defaultPrevented).toBe(false)
  })
})
