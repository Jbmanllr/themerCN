// @vitest-environment happy-dom

// The Close button's tooltip renders in a portal, outside the sidebar's CSS
// `group`, so a group-data selector can never match there. Whether it shows is
// therefore decided from the sidebar's state: shown beside the collapsed icon
// rail (where the label is not written out), hidden while the sidebar is open
// because it then says "Themer" itself.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./sidebar", () => ({
  CollapsedNavigation: () => <nav>collapsed</nav>,
  ExpandedContent: () => <div>expanded</div>,
}))

import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { ThemerSidebar } from "./themer-sidebar"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement
const onClose = vi.fn()

async function mount(defaultOpen: boolean) {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <SidebarProvider defaultOpen={defaultOpen}>
        <ThemerSidebar onClose={onClose} />
      </SidebarProvider>
    )
  )
}

const closeButton = () =>
  container.querySelector<HTMLButtonElement>(
    'button[aria-label="Close Themer"]'
  )!

/** The tooltip popup, once opened by keyboard focus. */
async function openTooltip() {
  await act(async () => {
    closeButton().focus()
    closeButton().dispatchEvent(new FocusEvent("focus"))
    closeButton().dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
  })
  await vi.waitFor(
    () =>
      expect(
        [...document.querySelectorAll('[data-slot="tooltip-content"]')].some(
          (popup) => popup.textContent?.includes("Close Themer")
        )
      ).toBe(true),
    { timeout: 3000 }
  )
  return [
    ...document.querySelectorAll<HTMLElement>('[data-slot="tooltip-content"]'),
  ].find((popup) => popup.textContent?.includes("Close Themer"))!
}

beforeEach(() => {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  onClose.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.body.innerHTML = ""
})

describe("ThemerSidebar close button", () => {
  it("closes the editor", async () => {
    await mount(true)
    await act(async () => closeButton().click())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows its tooltip beside the collapsed rail", async () => {
    await mount(false)
    const popup = await openTooltip()
    expect(popup.hasAttribute("hidden")).toBe(false)
  })

  it("keeps the tooltip hidden while the sidebar is open", async () => {
    await mount(true)
    const popup = await openTooltip()
    expect(popup.hasAttribute("hidden")).toBe(true)
  })
})
