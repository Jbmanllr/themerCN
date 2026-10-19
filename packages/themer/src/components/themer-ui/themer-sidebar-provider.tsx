"use client"

// The SidebarProvider every sidebar layout shares: the Themer's widths and
// the collapsed state from the `sidebarCollapsed` preference, so collapsing
// in one layout collapses it in the others. A colour focus jump
// (`focusRequest`, hooks/use-color-focus.ts) expands it, so the picker can
// mount. useThemerSidebarWidth gives the width it lays the sidebar out at,
// for what must follow it outside the sidebar (Push's page inset).
//
// Expanding and collapsing is instant: the stock Sidebar animates its width,
// which squeezes the panel content mid-way, so its gap and container get no
// transition here. Popups keep their own animations.
//
// The Host owns the stock provider's `sidebar_state` cookie and window-wide
// Ctrl/Cmd+B, so both are off here: collapsing is kept in the preference.

import * as React from "react"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { useColorFocusStore } from "../../stores/color-focus-store"
import { usePreferencesStore } from "../../stores/preferences-store"
import { SIDEBAR_WIDTHS } from "../../config/constants"

/** The sidebar's current width: SIDEBAR_WIDTHS by the collapse preference. */
export function useThemerSidebarWidth(): string {
  const sidebarCollapsed = usePreferencesStore(
    (state) => state.sidebarCollapsed
  )
  return sidebarCollapsed ? SIDEBAR_WIDTHS.collapsed : SIDEBAR_WIDTHS.expanded
}

export function ThemerSidebarProvider({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const sidebarCollapsed = usePreferencesStore(
    (state) => state.sidebarCollapsed
  )
  const setSidebarCollapsed = usePreferencesStore(
    (state) => state.setSidebarCollapsed
  )
  const focusRequest = useColorFocusStore((state) => state.focusRequest)

  React.useEffect(() => {
    if (focusRequest) setSidebarCollapsed(false)
  }, [focusRequest, setSidebarCollapsed])

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      persistCookie={false}
      keyboardShortcut={false}
      className={cn(
        "[&_[data-slot=sidebar-container]]:transition-none [&_[data-slot=sidebar-gap]]:transition-none",
        className
      )}
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTHS.expanded,
          "--sidebar-width-icon": SIDEBAR_WIDTHS.collapsed,
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  )
}
