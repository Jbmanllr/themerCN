// @vitest-environment happy-dom

// The HSL presets are a single-select group that is clipped to its first row
// while collapsed. Presets past that row used to stay in the tab order while
// clipped, and "Show more" did not say whether it was open. Pressing the
// selected preset again empties the group; that must keep the adjustment
// rather than write nothing. An adjustment is computed from the checkpoint
// (the theme before the first adjustment), not from the current styles.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultThemeState } from "../../config/defaults"
import { hslPresets } from "../../config/presets"
import { useEditorStore } from "../../stores/editor-store"
import { HSLAdjustments } from "./hsl-adjustments"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

const preset = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
const presetButtons = () => hslPresets.map((item) => preset(item.label))
const showMore = () =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("presets")
  )!

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  useEditorStore.setState({
    themeState: defaultThemeState,
    themeCheckpoint: null,
    history: [],
    future: [],
  })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<HSLAdjustments />))
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  vi.useRealTimers()
})

describe("HSLAdjustments presets", () => {
  it("hides the presets past the first row while collapsed, so focus cannot land on them", async () => {
    const hiddenWhileCollapsed = presetButtons().map((button) =>
      button.className.split(/\s+/u).includes("hidden")
    )
    // The first row (five presets) is always shown; the last ones are hidden at
    // every width.
    expect(hiddenWhileCollapsed.slice(0, 5)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
    expect(hiddenWhileCollapsed.slice(13).every(Boolean)).toBe(true)

    await act(async () => showMore().click())
    expect(
      presetButtons().some((button) =>
        button.className.split(/\s+/u).includes("hidden")
      )
    ).toBe(false)
  })

  it("says whether the grid is open and which grid the button controls", async () => {
    const group = container.querySelector('[aria-label="HSL presets"]')
    expect(group?.id).toBeTruthy()
    expect(showMore().getAttribute("aria-controls")).toBe(group?.id)
    expect(showMore().getAttribute("aria-expanded")).toBe("false")
    expect(showMore().textContent).toContain("Show more presets")

    await act(async () => showMore().click())
    expect(showMore().getAttribute("aria-expanded")).toBe("true")
    expect(showMore().textContent).toContain("Hide presets")
  })

  it("applies a preset from the checkpoint, and keeps it when the pressed preset is clicked again", async () => {
    const before = useEditorStore.getState().themeState.styles
    await act(async () => preset("Hue Invert").click())
    await act(async () => vi.advanceTimersByTime(10))

    let state = useEditorStore.getState()
    expect(state.themeState.hslAdjustments).toEqual({
      hueShift: 180,
      saturationScale: 1,
      lightnessScale: 1,
    })
    expect(state.themeState.styles.light.primary).not.toBe(before.light.primary)
    // The theme before the first adjustment is kept to adjust from.
    expect(state.themeCheckpoint?.styles).toEqual(before)

    await act(async () => preset("Hue Invert").click())
    await act(async () => vi.advanceTimersByTime(10))
    state = useEditorStore.getState()
    expect(state.themeState.hslAdjustments).toEqual({
      hueShift: 180,
      saturationScale: 1,
      lightnessScale: 1,
    })
  })
})
