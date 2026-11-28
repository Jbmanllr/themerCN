// @vitest-environment happy-dom

// The preview area's tab bar. A tablist may only own tabs and its arrow-key
// handling catches the keys of anything inside it, so the "More previews" menu
// sits beside the tablist, not in it. When the shown preview lives in that
// menu, the menu button says which one, since no tab is selected otherwise.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./builtin-tabs", () => ({
  BUILTIN_TABS: [
    {
      id: "live",
      label: "Live",
      component: () => <p>live body</p>,
      scroll: "none",
      order: 1,
    },
    {
      id: "cards",
      label: "Cards",
      component: () => <p>cards body</p>,
      scroll: "y",
      order: 2,
    },
    {
      id: "mail",
      label: "Mail",
      component: () => <p>mail body</p>,
      scroll: "y",
      order: 3,
      inMenu: true,
    },
  ],
}))
vi.mock("../../hooks/use-themer-context", () => ({
  useThemerContext: () => ({ config: {} }),
}))

import { usePreferencesStore } from "../../stores/preferences-store"
import { PreviewTabs } from "./preview-tabs"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement

async function mount() {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<PreviewTabs />))
}

const moreButton = () =>
  container.querySelector<HTMLButtonElement>(
    'button[aria-label^="More previews"]'
  )!

beforeEach(() => {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  usePreferencesStore.setState({ previewTab: "live" })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
  document.body.innerHTML = ""
})

describe("PreviewTabs", () => {
  it("keeps the More previews menu out of the tablist", async () => {
    await mount()

    const tablist = container.querySelector('[role="tablist"]')
    const tabs = [...(tablist?.children ?? [])]
    expect(tabs.map((tab) => tab.getAttribute("role"))).toEqual(["tab", "tab"])
    expect(tablist?.contains(moreButton())).toBe(false)
    expect(tablist?.textContent).not.toContain("Mail")
  })

  it("shows the active tab's body and switches tabs", async () => {
    await mount()
    expect(container.textContent).toContain("live body")
    expect(container.textContent).not.toContain("cards body")

    const cards = container.querySelector<HTMLElement>(
      '[data-testid="themer-preview-tab-cards"]'
    )
    await act(async () => cards?.click())
    expect(usePreferencesStore.getState().previewTab).toBe("cards")
    expect(container.textContent).toContain("cards body")
  })

  it("names the menu button after the preview it shows", async () => {
    await mount()
    expect(moreButton().getAttribute("aria-label")).toBe("More previews")

    await act(async () => usePreferencesStore.setState({ previewTab: "mail" }))
    expect(moreButton().getAttribute("aria-label")).toBe(
      "More previews, Mail shown"
    )
    expect(container.textContent).toContain("mail body")
  })

  it("opens a menu preview from the menu", async () => {
    await mount()
    await act(async () => moreButton().click())
    await vi.waitFor(() =>
      expect(document.querySelector('[role="menu"]')).not.toBeNull()
    )

    const item = document.querySelector<HTMLElement>(
      '[role="menuitem"][data-testid="themer-preview-tab-mail"]'
    )
    await act(async () => item?.click())
    expect(usePreferencesStore.getState().previewTab).toBe("mail")
  })
})
