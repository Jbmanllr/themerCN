// @vitest-environment happy-dom
// The stock @workspace/ui SidebarProvider writes a `sidebar_state` cookie and
// binds Ctrl/Cmd+B on the window: both belong to the Host app. The vendored
// provider has local opt-outs, and every sidebar provider the Themer mounts
// turns them off. A `shadcn add sidebar -o` reinstall drops the opt-outs
// silently; this test catches it, and catches a Themer provider that stops
// passing them.
import * as React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import Dashboard from "./preview/examples/dashboard"
import { ThemerSidebarProvider } from "./themer-ui/themer-sidebar-provider"
import { usePreferencesStore } from "../stores/preferences-store"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

function clearSidebarCookie() {
  document.cookie = "sidebar_state=; path=/; max-age=0"
}

beforeEach(() => {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  clearSidebarCookie()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ""
  clearSidebarCookie()
})

async function render(node: React.ReactNode) {
  const host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root?.render(node))
}

function SidebarState() {
  const { state } = useSidebar()
  return <output data-testid="sidebar-state">{state}</output>
}

/** From SidebarState, or else the rendered Sidebar's data-state. */
function sidebarState() {
  return (
    document.querySelector('[data-testid="sidebar-state"]')?.textContent ??
    document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")
  )
}

async function clickTrigger() {
  await act(async () =>
    document.querySelector<HTMLElement>('[data-sidebar="trigger"]')?.click()
  )
}

async function pressModB() {
  const event = new KeyboardEvent("keydown", {
    key: "b",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  await act(async () => window.dispatchEvent(event))
  return event
}

const sidebarCookie = () =>
  document.cookie.split("; ").find((c) => c.startsWith("sidebar_state="))

describe("stock SidebarProvider", () => {
  it("keeps the shadcn defaults: cookie write and Ctrl/Cmd+B", async () => {
    await render(
      <SidebarProvider>
        <SidebarTrigger />
        <SidebarState />
      </SidebarProvider>
    )

    await clickTrigger()
    expect(sidebarCookie()).toBe("sidebar_state=false")

    const event = await pressModB()
    expect(sidebarState()).toBe("expanded")
    expect(event.defaultPrevented).toBe(true)
  })

  it("opts out of both without passing them to the DOM", async () => {
    await render(
      <SidebarProvider persistCookie={false} keyboardShortcut={false}>
        <SidebarTrigger />
        <SidebarState />
      </SidebarProvider>
    )

    await clickTrigger()
    expect(sidebarState()).toBe("collapsed")
    expect(sidebarCookie()).toBeUndefined()

    const event = await pressModB()
    expect(sidebarState()).toBe("collapsed")
    expect(event.defaultPrevented).toBe(false)

    const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]')
    expect(wrapper?.hasAttribute("persistcookie")).toBe(false)
    expect(wrapper?.hasAttribute("keyboardshortcut")).toBe(false)
  })
})

describe("the Themer's sidebar providers", () => {
  const providers: Record<string, () => React.ReactNode> = {
    ThemerSidebarProvider: () => (
      <ThemerSidebarProvider>
        <SidebarTrigger />
        <SidebarState />
      </ThemerSidebarProvider>
    ),
    "Dashboard Preview": () => <Dashboard />,
  }

  it.each(Object.keys(providers))(
    "%s leaves the Host's cookie and Ctrl/Cmd+B alone",
    async (name) => {
      const Provider = providers[name]!
      await render(<Provider />)
      expect(sidebarState()).toBe("expanded")

      const event = await pressModB()
      expect(sidebarState()).toBe("expanded")
      expect(event.defaultPrevented).toBe(false)

      await clickTrigger()
      expect(sidebarState()).toBe("collapsed")
      expect(sidebarCookie()).toBeUndefined()
    }
  )
})
