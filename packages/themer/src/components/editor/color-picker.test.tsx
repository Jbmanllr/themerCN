// @vitest-environment happy-dom

// One colour token control. The theme only hears a change 150 ms after the
// person stops (a debounce, so dragging the system colour chooser does not
// flood the editor), so the control itself must follow the pick at once: the
// native input used to be tied to the saved colour and React snapped it back
// on every event until the commit landed. A pick made just before the picker
// leaves the screen must still be saved, and text that is not a colour must
// never reach the theme.
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { COLOR_INPUT_DEBOUNCE_MS } from "../../config/constants"

// The palette popover is its own control; here it only reports a palette pick.
vi.mock("./color-selector-popover", () => ({
  ColorSelectorPopover: ({
    onChange,
  }: {
    onChange: (color: string) => void
    children?: ReactNode
  }) => (
    <button
      type="button"
      data-testid="palette-pick"
      onClick={() => onChange("#00ff00")}
    >
      palette
    </button>
  ),
}))

import { ColorPicker } from "./color-picker"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement
const onChange = vi.fn<(color: string, name: string) => void>()

async function mount(color = "#112233") {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  const render = (nextColor: string) =>
    act(async () =>
      root?.render(
        <ColorPicker
          name="primary"
          label="Primary"
          color={nextColor}
          onChange={onChange}
        />
      )
    )
  await render(color)
  return render
}

const native = () =>
  container.querySelector<HTMLInputElement>('input[type="color"]')!
const text = () =>
  container.querySelector<HTMLInputElement>('input[type="text"]')!
const swatch = () =>
  container.querySelector<HTMLElement>("[data-color-swatch-preview]")!

/** Sets a value the way the browser does, and fires the input event React hears. */
async function enter(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  onChange.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  vi.useRealTimers()
})

describe("ColorPicker", () => {
  it("shows a pick in the native input and the swatch at once, and commits it after the debounce", async () => {
    await mount("#112233")

    await enter(native(), "#ff0000")

    // Before the commit: the chooser keeps what was picked, the swatch follows.
    expect(native().value).toBe("#ff0000")
    expect(text().value).toBe("#ff0000")
    expect(swatch().style.backgroundColor).toMatch(
      /^(#ff0000|rgb\(255, 0, 0\))$/
    )
    expect(onChange).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#ff0000", "primary")
  })

  it("commits only the last of several quick edits", async () => {
    await mount("#112233")

    await enter(native(), "#aa0000")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS - 1))
    await enter(native(), "#bb0000")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS - 1))
    expect(onChange).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))

    expect(onChange).toHaveBeenCalledExactlyOnceWith("#bb0000", "primary")
  })

  it("follows valid typed text in the swatch before it is committed", async () => {
    await mount("#112233")

    await enter(text(), "#336699")

    expect(native().value).toBe("#336699")
    expect(onChange).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#336699", "primary")
  })

  it("still commits a pick made just before the picker leaves the screen", async () => {
    await mount("#112233")
    await enter(native(), "#ff0000")
    expect(onChange).not.toHaveBeenCalled()

    await act(async () => root?.unmount())
    root = null

    expect(onChange).toHaveBeenCalledExactlyOnceWith("#ff0000", "primary")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS * 2))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("commits nothing on unmount when nothing is pending", async () => {
    await mount("#112233")
    await act(async () => root?.unmount())
    root = null
    expect(onChange).not.toHaveBeenCalled()
  })

  it("keeps text that is not a colour in the field, marked invalid, and never commits it", async () => {
    await mount("#112233")

    await enter(text(), "not a colour")

    expect(text().value).toBe("not a colour")
    expect(text().getAttribute("aria-invalid")).toBe("true")
    // The swatch stays on the saved colour.
    expect(native().value).toBe("#112233")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS * 2))
    expect(onChange).not.toHaveBeenCalled()

    // Leaving with the invalid text still in the field commits nothing either.
    await act(async () => root?.unmount())
    root = null
    expect(onChange).not.toHaveBeenCalled()
  })

  it("drops a pending valid edit when the text turns invalid", async () => {
    await mount("#112233")

    await enter(text(), "#445566")
    await enter(text(), "#44556")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS * 2))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("commits a palette pick at once and drops the edit that was pending", async () => {
    await mount("#112233")
    await enter(native(), "#ff0000")

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="palette-pick"]')
        ?.click()
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#00ff00", "primary")

    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS * 2))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("replaces the draft with the stored colour when that changes, even back to an earlier value", async () => {
    const render = await mount("#112233")
    await enter(text(), "#445566")
    await act(async () => vi.advanceTimersByTime(COLOR_INPUT_DEBOUNCE_MS))
    onChange.mockClear()

    await render("#778899")
    expect(text().value).toBe("#778899")

    // Edit, then Reset to the colour the picker started from.
    await enter(text(), "#abcdef")
    await render("#112233")
    expect(text().value).toBe("#112233")
  })
})
