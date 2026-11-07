// @vitest-environment happy-dom

// The shared <html> observer (paths ADR, Page load): one observer per
// document whatever the number of subscribers, waking only the subscribers
// of the attribute that changed.

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  subscribeToHtmlAttribute,
  type HtmlAttribute,
} from "./html-attribute-observer"

const root = document.documentElement
/** Lets the MutationObserver deliver its pending batch. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("subscribeToHtmlAttribute", () => {
  const unsubscribes: (() => void)[] = []
  const subscribe = (attribute: HtmlAttribute, listener = vi.fn()) => {
    unsubscribes.push(subscribeToHtmlAttribute(attribute, listener))
    return listener
  }

  afterEach(() => {
    unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe())
    vi.restoreAllMocks()
    root.removeAttribute("dir")
    root.removeAttribute("style")
    root.className = ""
  })

  it("wakes only the subscribers of the attribute that changed", async () => {
    const onClass = subscribe("class")
    const onStyle = subscribe("style")
    const onDir = subscribe("dir")

    root.dir = "rtl"
    await flush()
    expect([onClass, onStyle, onDir].map((fn) => fn.mock.calls.length)).toEqual(
      [0, 0, 1]
    )

    root.classList.add("dark")
    await flush()
    expect([onClass, onStyle, onDir].map((fn) => fn.mock.calls.length)).toEqual(
      [1, 0, 1]
    )

    root.style.setProperty("--font-sans", "Inter")
    await flush()
    expect([onClass, onStyle, onDir].map((fn) => fn.mock.calls.length)).toEqual(
      [1, 1, 1]
    )
  })

  it("calls a listener once per batch, whatever attributes it follows", async () => {
    const onChange = vi.fn()
    subscribe("class", onChange)
    subscribe("style", onChange)

    root.classList.add("dark")
    root.style.setProperty("--font-sans", "Inter")
    await flush()

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("builds one observer for every subscriber and disconnects it after the last", async () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe")
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect")
    const onClass = vi.fn()
    const unsubscribeClass = subscribeToHtmlAttribute("class", onClass)
    const unsubscribeDir = subscribeToHtmlAttribute("dir", vi.fn())
    const unsubscribeStyle = subscribeToHtmlAttribute("style", vi.fn())
    expect(observe).toHaveBeenCalledTimes(1)

    unsubscribeDir()
    unsubscribeStyle()
    expect(disconnect).not.toHaveBeenCalled()
    unsubscribeClass()
    expect(disconnect).toHaveBeenCalledTimes(1)

    root.classList.add("dark")
    await flush()
    expect(onClass).not.toHaveBeenCalled()
  })
})
