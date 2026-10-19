// @vitest-environment happy-dom

// The Themer arrives after hydration without disturbing the Host page. When
// it wrapped the page, React remounted the whole page about a second after
// load: a counter went back to zero, a typed value was dropped, and every
// element was replaced. These checks fail if the page is remounted, if the
// Themer lands around the page instead of beside it, if it renders before the
// load resolves, if `null` loads or renders anything, or if a late load lands
// after the page has gone.
import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ThemerProps } from "./types"
import { createThemerLoader } from "./loader"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function FakeThemer({ storageNamespace }: ThemerProps) {
  return <aside data-testid="themer" data-ns={storageNamespace} />
}

function Page() {
  const [count, setCount] = useState(0)
  return (
    <main>
      <button onClick={() => setCount((value) => value + 1)} type="button">
        {count}
      </button>
      <input aria-label="note" />
    </main>
  )
}

/** A load the test resolves when it wants the Themer to arrive. */
function deferredLoad() {
  let arrive: () => void = () => {}
  const load = vi.fn(
    () =>
      new Promise<{ Themer: typeof FakeThemer }>((resolve) => {
        arrive = () => resolve({ Themer: FakeThemer })
      })
  )
  return { load, arrive: () => act(async () => arrive()) }
}

let root: Root | null = null
let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  vi.restoreAllMocks()
})

async function mount(
  load: Parameters<typeof createThemerLoader>[0],
  props: ThemerProps = {}
) {
  const ThemerLoader = createThemerLoader(load)
  await act(async () =>
    root?.render(
      <>
        <Page />
        <ThemerLoader {...props} />
      </>
    )
  )
  return ThemerLoader
}

describe("the Themer loader", () => {
  it("keeps the page, its state and its elements when the Themer arrives", async () => {
    const themer = deferredLoad()
    await mount(themer.load)
    const button = container.querySelector("button")
    const input = container.querySelector("input")
    if (!button || !input) throw new Error("the page did not render")

    await act(async () => button.click())
    await act(async () => button.click())
    input.value = "typed before the Themer"
    expect(container.querySelector('[data-testid="themer"]')).toBeNull()
    await themer.arrive()

    expect(container.querySelector('[data-testid="themer"]')).not.toBeNull()
    expect(container.querySelector("button")).toBe(button)
    expect(container.querySelector("input")).toBe(input)
    expect(button.textContent).toBe("2")
    expect(input.value).toBe("typed before the Themer")
  })

  it("puts the Themer beside the page with the props it was given", async () => {
    const themer = deferredLoad()
    await mount(themer.load, { storageNamespace: "shop" })
    await themer.arrive()

    const [page, aside] = [...container.children]
    expect(page?.tagName).toBe("MAIN")
    expect(aside?.getAttribute("data-testid")).toBe("themer")
    expect(aside?.getAttribute("data-ns")).toBe("shop")
  })

  it("renders nothing and loads nothing during server rendering", () => {
    const themer = deferredLoad()
    const ThemerLoader = createThemerLoader(themer.load)

    expect(renderToString(<ThemerLoader />)).toBe("")
    expect(themer.load).not.toHaveBeenCalled()
  })

  it("loads once, however often the Host re-renders it", async () => {
    const themer = deferredLoad()
    const ThemerLoader = await mount(themer.load)
    await themer.arrive()
    const aside = container.querySelector('[data-testid="themer"]')

    await act(async () =>
      root?.render(
        <>
          <Page />
          <ThemerLoader storageNamespace="again" />
        </>
      )
    )

    expect(themer.load).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="themer"]')).toBe(aside)
  })

  it("renders nothing for null", async () => {
    await mount(null)

    expect(container.innerHTML).toBe(container.querySelector("main")?.outerHTML)
  })

  it("drops a Themer that arrives after the page has gone", async () => {
    const themer = deferredLoad()
    await mount(themer.load)
    await act(async () => root?.unmount())
    root = null
    const error = vi.spyOn(console, "error").mockImplementation(() => {})

    await themer.arrive()

    expect(error).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="themer"]')).toBeNull()
  })
})
