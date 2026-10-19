// @vitest-environment happy-dom

// A font pick waits for the family to load (up to 3 s) while the popover stays
// open and the other rows stay clickable. The last pick must win: an earlier,
// slower load that finishes after a newer pick used to overwrite it and clear
// its spinner. A superseded pick must also drop its own hold on the family's
// stylesheet, and an applied pick keeps its hold for 2 s (FONT_HANDOFF_MS) so
// the theme's font slot can take its own reference first.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loads = vi.hoisted(() => ({
  held: [] as { family: string; release: ReturnType<typeof vi.fn> }[],
  waits: [] as { family: string; settle: (loaded: boolean) => void }[],
}))

vi.mock("../../utils/font-links", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/font-links")>()),
  acquireGoogleFont: (family: string) => {
    const release = vi.fn()
    loads.held.push({ family, release })
    return release
  },
  acquireFontPreview: () => () => {},
  waitForFont: (family: string) =>
    new Promise<boolean>((resolve) => {
      loads.waits.push({ family, settle: resolve })
    }),
}))

// The catalogue query is the host's; the picker only reads its pages.
vi.mock("../../hooks/use-font-search", async () => {
  const { POPULAR_FONTS: popular } =
    await import("../../utils/font-catalog-data")
  const fonts = popular["sans-serif"].slice(0, 2)
  return {
    useFontSearch: () => ({
      data: { pages: [{ fonts }] },
      isLoading: false,
      isError: false,
      isSuccess: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => Promise.resolve(),
      refetch: () => Promise.resolve(),
    }),
  }
})

import { POPULAR_FONTS } from "../../utils/font-catalog-data"
import { buildFontFamily } from "../../utils/font-names"
import { FontPicker } from "./font-picker"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const [first, second] = POPULAR_FONTS["sans-serif"]
if (!first || !second) throw new Error("the picker needs two popular fonts")

let root: Root | null = null
let container: HTMLDivElement
const onChange = vi.fn<(font: string) => void>()

async function openPicker() {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <FontPicker
        value="Lora, serif"
        onChange={onChange}
        category="sans"
        label="Sans-serif"
      />
    )
  )
  const trigger =
    container.querySelector<HTMLButtonElement>('[role="combobox"]')
  if (!trigger) throw new Error("no picker trigger")
  await act(async () => trigger.click())
  await vi.waitFor(() => expect(row(first!.family)).not.toBeNull())
}

function row(family: string) {
  return document.querySelector<HTMLElement>(
    `[cmdk-item][data-value="${family}"]`
  )
}

async function pick(family: string) {
  const item = row(family)
  if (!item) throw new Error(`no row for ${family}`)
  await act(async () => item.click())
}

const waitFor = (family: string) => {
  const wait = loads.waits.find((entry) => entry.family === family)
  if (!wait) throw new Error(`no load was waited for ${family}`)
  return wait
}
const holdOf = (family: string) => {
  const hold = loads.held.find((entry) => entry.family === family)
  if (!hold) throw new Error(`no hold was taken on ${family}`)
  return hold
}

beforeEach(() => {
  loads.held.length = 0
  loads.waits.length = 0
  onChange.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.body.innerHTML = ""
})

describe("FontPicker trigger", () => {
  // The slot's visible label is a <label> with no control to attach to, so the
  // trigger names itself by it; without that every slot was an unnamed combobox.
  it("is named by its slot label", async () => {
    await openPicker()
    const trigger = container.querySelector('[role="combobox"]')
    const labelId = trigger?.getAttribute("aria-labelledby")
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId ?? "")?.textContent).toBe(
      "Sans-serif"
    )
  })
})

describe("FontPicker selection", () => {
  it("applies a pick once its family has loaded, and closes", async () => {
    await openPicker()
    await pick(first.family)
    expect(onChange).not.toHaveBeenCalled()

    await act(async () => waitFor(first.family).settle(true))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      buildFontFamily(first.family, first.category)
    )
    await vi.waitFor(() => expect(row(first.family)).toBeNull())
  })

  it("lets the last pick win when the earlier, slower load finishes after it", async () => {
    await openPicker()
    await pick(first.family)
    await pick(second.family)

    await act(async () => waitFor(second.family).settle(true))
    await act(async () => waitFor(first.family).settle(true))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      buildFontFamily(second.family, second.category)
    )
    // The overtaken pick gives its hold back at once.
    expect(holdOf(first.family).release).toHaveBeenCalledOnce()
  })

  it("does not let an earlier load clear the newer pick's wait when it finishes first", async () => {
    await openPicker()
    await pick(first.family)
    await pick(second.family)

    await act(async () => waitFor(first.family).settle(true))

    // The newer pick is still loading: nothing was applied, and its row still
    // shows the wait (a disabled row).
    expect(onChange).not.toHaveBeenCalled()
    expect(row(second.family)?.getAttribute("aria-disabled")).toBe("true")
    expect(holdOf(first.family).release).toHaveBeenCalledOnce()
    expect(holdOf(second.family).release).not.toHaveBeenCalled()

    await act(async () => waitFor(second.family).settle(true))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      buildFontFamily(second.family, second.category)
    )
  })

  it("keeps its hold on the applied family until the theme slot has taken its own", async () => {
    await openPicker()
    await pick(first.family)
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    try {
      await act(async () => waitFor(first.family).settle(true))
      expect(holdOf(first.family).release).not.toHaveBeenCalled()

      await act(async () => vi.advanceTimersByTime(1999))
      expect(holdOf(first.family).release).not.toHaveBeenCalled()
      await act(async () => vi.advanceTimersByTime(1))
      expect(holdOf(first.family).release).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
