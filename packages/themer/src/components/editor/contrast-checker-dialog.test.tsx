// @vitest-environment happy-dom

// The contrast dialog is always controlled (ThemerDialogs owns it): it draws
// no trigger of its own, opens when told to, and reports the user's close.
// Its colour rows closing it is covered through <Themer> (themer-layout.test).
import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ContrastCheckerDialog } from "./contrast-checker-dialog"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement
const onOpenChange = vi.fn<(open: boolean) => void>()

const dialog = () => document.querySelector('[role="dialog"]')

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
  it("opens without a trigger of its own, and reports a close", async () => {
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
    expect(dialog()?.textContent).toContain("WCAG Contrast Checker")

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
})
