// @vitest-environment happy-dom

// The light/dark switch is named by the mode it switches to, and hands the
// click point to the theme transition so the reveal starts under the pointer.
// The action bar and the fullscreen preview toolbar both draw it.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const toggleMode = vi.hoisted(() => vi.fn())
vi.mock("../../hooks/use-themer", () => ({
  useToggleMode: () => toggleMode,
}))

import { ModeToggle } from "./mode-toggle"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

async function mount(mode: "light" | "dark") {
  // Outside a ColorModeProvider the mode is the Host's `.dark` class.
  document.documentElement.classList.toggle("dark", mode === "dark")
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<ModeToggle data-testid="mode" />))
  return container.querySelector<HTMLButtonElement>("button")!
}

beforeEach(() => {
  toggleMode.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.documentElement.className = ""
})

describe("ModeToggle", () => {
  it("is named by the mode it switches to", async () => {
    expect((await mount("light")).getAttribute("aria-label")).toBe(
      "Switch to dark mode"
    )
    await act(async () => root?.unmount())
    container.remove()

    expect((await mount("dark")).getAttribute("aria-label")).toBe(
      "Switch to light mode"
    )
  })

  it("starts the reveal at the click point and passes extra button props through", async () => {
    const button = await mount("light")
    expect(button.getAttribute("data-testid")).toBe("mode")

    await act(async () => {
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, clientX: 120, clientY: 45 })
      )
    })

    expect(toggleMode).toHaveBeenCalledExactlyOnceWith({ x: 120, y: 45 })
  })
})
