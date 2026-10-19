// @vitest-environment happy-dom

// The collapsed editor sidebar is a column of icon buttons. Each one names its
// panel for assistive technology (the tooltip alone is not a name), and
// pressing it makes that panel the active one. The popup it opens is covered
// through the whole <Themer> in themer-layout.test.tsx.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../hooks/use-themer-context", () => ({
  useThemerContext: () => ({ config: { showTabAI: false } }),
  useOptionalThemerContext: () => ({ config: { showTabAI: false } }),
}))

import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { useThemerUIStore } from "../../stores/themer-ui-store"
import { CollapsedNavigation } from "./collapsed-navigation"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

beforeEach(async () => {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  useThemerUIStore.setState({ activePanel: "colors" })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <SidebarProvider>
        <CollapsedNavigation />
      </SidebarProvider>
    )
  )
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
})

describe("CollapsedNavigation", () => {
  it("names every icon button by its panel", () => {
    const names = [...container.querySelectorAll("button")].map((button) =>
      button.getAttribute("aria-label")
    )
    expect(names).toEqual(["Colors", "Typography", "Other"])
  })
})
