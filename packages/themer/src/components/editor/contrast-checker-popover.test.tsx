// @vitest-environment happy-dom

// The contrast dialog is opened two ways: from its own trigger (uncontrolled),
// and from elsewhere, as the action bar does, by controlling `open`. A
// controlled dialog draws a trigger only when it was given one, so the action
// bar's own button is the only way in and no stray button appears.
import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ContrastCheckerDialog } from "./contrast-checker-popover"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement
const onOpenChange = vi.fn<(open: boolean) => void>()

const dialog = () => document.querySelector('[role="dialog"]')
const trigger = () => container.querySelector<HTMLButtonElement>("button")

async function mount(node: React.ReactNode) {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(node))
}

beforeEach(() => {
  onOpenChange.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.body.innerHTML = ""
})

describe("ContrastCheckerDialog", () => {
  it("draws its own trigger when uncontrolled, and opens from it", async () => {
    await mount(<ContrastCheckerDialog />)
    expect(trigger()?.textContent).toContain("Contrast Checker")
    expect(dialog()).toBeNull()

    await act(async () => trigger()?.click())
    await vi.waitFor(() => expect(dialog()).not.toBeNull())
    expect(dialog()?.textContent).toContain("WCAG Contrast Checker")
  })

  it("draws no trigger when controlled without one, and reports a close", async () => {
    function Host() {
      const [open, setOpen] = useState(true)
      return (
        <ContrastCheckerDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next)
            setOpen(next)
          }}
        />
      )
    }
    await mount(<Host />)

    expect(container.querySelector("button")).toBeNull()
    await vi.waitFor(() => expect(dialog()).not.toBeNull())

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    })
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("stays closed while controlled as closed", async () => {
    await mount(
      <ContrastCheckerDialog open={false} onOpenChange={onOpenChange} />
    )
    expect(dialog()).toBeNull()
    expect(container.querySelector("button")).toBeNull()
  })

  it("draws the trigger it was given even when controlled", async () => {
    await mount(
      <ContrastCheckerDialog open={false} onOpenChange={onOpenChange}>
        Check contrast
      </ContrastCheckerDialog>
    )
    expect(trigger()?.textContent).toBe("Check contrast")

    await act(async () => trigger()?.click())
    expect(onOpenChange.mock.calls.map(([next]) => next)).toEqual([true])
  })
})
