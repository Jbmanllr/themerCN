// @vitest-environment happy-dom

// The hooks hold a family's stylesheet while a component shows it. The hold
// must end when the component leaves or asks for another family, a load that
// finished for a family the component no longer shows must say nothing about
// the new one, and a family that cannot load is reported once, not retried on
// a timer, so a font nothing displays cannot keep the page re-rendering.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loads = vi.hoisted(() => ({
  held: [] as { family: string; release: ReturnType<typeof vi.fn> }[],
  waits: [] as {
    family: string
    settle: (loaded: boolean) => void
  }[],
}))

vi.mock("../utils/font-links", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/font-links")>()),
  acquireGoogleFont: (family: string) => {
    const release = vi.fn()
    loads.held.push({ family, release })
    return release
  },
  waitForFont: (family: string) =>
    new Promise<boolean>((resolve) => {
      loads.waits.push({ family, settle: resolve })
    }),
}))

import { useFontLoader, useFontsLoader } from "./use-font-loader"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

async function mountHook<T>(useHook: (props: { value: string }) => T) {
  const exposed: { current: T | null; renders: number } = {
    current: null,
    renders: 0,
  }
  function Harness({ value }: { value: string }) {
    exposed.current = useHook({ value })
    exposed.renders += 1
    return null
  }
  root = createRoot(document.createElement("div"))
  const render = (value: string) =>
    act(async () => root?.render(<Harness value={value} />))
  return { exposed, render }
}

const heldFamilies = () => loads.held.map((hold) => hold.family)
const waitFor = (family: string) => {
  const wait = loads.waits.find((entry) => entry.family === family)
  if (!wait) throw new Error(`no load was waited for ${family}`)
  return wait
}

beforeEach(() => {
  loads.held.length = 0
  loads.waits.length = 0
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
})

describe("useFontLoader", () => {
  it("holds the family while mounted and releases it on unmount", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value)
    )
    await render("Lora, serif")
    expect(heldFamilies()).toEqual(["Lora"])
    expect(exposed.current).toMatchObject({
      isLoading: true,
      isLoaded: false,
      fontFamily: "Lora",
    })
    expect(loads.held[0]?.release).not.toHaveBeenCalled()

    await act(async () => waitFor("Lora").settle(true))
    expect(exposed.current).toMatchObject({ isLoading: false, isLoaded: true })

    await act(async () => root?.unmount())
    root = null
    expect(loads.held[0]?.release).toHaveBeenCalledOnce()
  })

  it("releases the old family and starts over when the family changes", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value)
    )
    await render("Lora, serif")
    await act(async () => waitFor("Lora").settle(true))
    expect(exposed.current?.isLoaded).toBe(true)

    await render("Inter, sans-serif")
    expect(heldFamilies()).toEqual(["Lora", "Inter"])
    expect(loads.held[0]?.release).toHaveBeenCalledOnce()
    // The earlier family's "loaded" says nothing about the new one.
    expect(exposed.current).toMatchObject({
      isLoading: true,
      isLoaded: false,
      error: null,
      fontFamily: "Inter",
    })
  })

  it("ignores a load that finishes after the family changed", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value)
    )
    await render("Lora, serif")
    await render("Inter, sans-serif")

    await act(async () => waitFor("Lora").settle(false))
    expect(exposed.current).toMatchObject({
      isLoading: true,
      isLoaded: false,
      error: null,
    })

    await act(async () => waitFor("Inter").settle(true))
    expect(exposed.current).toMatchObject({ isLoaded: true, isLoading: false })
  })

  it("reports a font that cannot load once, and retries only when asked", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value)
    )
    await render("Lora, serif")
    await act(async () => waitFor("Lora").settle(false))
    expect(exposed.current).toMatchObject({
      isLoaded: false,
      isLoading: false,
      error: "Font load timeout",
    })
    // Nothing else is waiting: no timer re-asks for the failing family.
    expect(loads.waits).toHaveLength(1)
    const rendersAfterFailure = exposed.renders
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(exposed.renders).toBe(rendersAfterFailure)

    await act(async () => exposed.current?.loadFont())
    expect(loads.waits).toHaveLength(2)
    expect(exposed.current).toMatchObject({ isLoading: true, error: null })
    // The failed attempt's hold went with it.
    expect(loads.held[0]?.release).toHaveBeenCalledOnce()
  })

  it("loads nothing for a host or system font stack", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value)
    )
    await render("var(--font-dm-sans), sans-serif")
    expect(loads.held).toEqual([])
    expect(exposed.current).toMatchObject({
      isLoaded: true,
      isLoading: false,
      fontFamily: null,
    })
  })

  it("waits for loadFont when autoLoad is off", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontLoader(value, { autoLoad: false })
    )
    await render("Lora, serif")
    expect(loads.held).toEqual([])
    expect(exposed.current?.isLoading).toBe(false)

    await act(async () => exposed.current?.loadFont())
    expect(heldFamilies()).toEqual(["Lora"])
    expect(exposed.current?.isLoading).toBe(true)
  })
})

describe("useFontsLoader", () => {
  const families = (value: string) => value.split("|")

  it("holds every family, and releases them all on unmount", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontsLoader(families(value))
    )
    await render("Lora, serif|Fira Code, monospace")
    expect(heldFamilies()).toEqual(["Lora", "Fira Code"])
    expect(exposed.current).toMatchObject({ isLoading: true, isLoaded: false })

    await act(async () => {
      waitFor("Lora").settle(true)
      waitFor("Fira Code").settle(true)
    })
    expect(exposed.current).toMatchObject({
      isLoading: false,
      isLoaded: true,
      loadedFonts: ["Lora", "Fira Code"],
    })

    await act(async () => root?.unmount())
    root = null
    for (const hold of loads.held) {
      expect(hold.release).toHaveBeenCalledOnce()
    }
  })

  it("stops loading after one pass when a family cannot arrive", async () => {
    const { exposed, render } = await mountHook(({ value }) =>
      useFontsLoader(families(value))
    )
    await render("Lora, serif|Nope, serif")
    await act(async () => {
      waitFor("Lora").settle(true)
      waitFor("Nope").settle(false)
    })
    expect(exposed.current).toMatchObject({
      isLoading: false,
      isLoaded: false,
      loadedFonts: ["Lora"],
    })
    const rendersAfterPass = exposed.renders
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(exposed.renders).toBe(rendersAfterPass)
    expect(loads.waits).toHaveLength(2)
  })

  it("does not restart when the caller passes a new array of the same families", async () => {
    const { render } = await mountHook(({ value }) =>
      useFontsLoader(families(value), { weights: [400, 700] })
    )
    await render("Lora, serif|Inter, sans-serif")
    await render("Lora, serif|Inter, sans-serif")
    expect(heldFamilies()).toEqual(["Lora", "Inter"])
    expect(
      loads.held.every((hold) => hold.release.mock.calls.length === 0)
    ).toBe(true)
  })
})
