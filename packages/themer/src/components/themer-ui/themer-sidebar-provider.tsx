"use client";

// The SidebarProvider every sidebar layout shares: the Themer's widths and
// the collapsed state from the `sidebarCollapsed` preference, so collapsing
// in one layout collapses it in the others. A colour focus jump
// (`focusRequest`, hooks/use-color-focus.ts) expands it, so the picker can
// mount.

import * as React from "react";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { useColorFocusStore } from "../../stores/color-focus-store";
import { usePreferencesStore } from "../../stores/preferences-store";
import { SIDEBAR_WIDTHS } from "../../config/constants";

export function ThemerSidebarProvider({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const sidebarCollapsed = usePreferencesStore(
    (state) => state.sidebarCollapsed,
  );
  const setSidebarCollapsed = usePreferencesStore(
    (state) => state.setSidebarCollapsed,
  );
  const focusRequest = useColorFocusStore((state) => state.focusRequest);

  React.useEffect(() => {
    if (focusRequest) setSidebarCollapsed(false);
  }, [focusRequest, setSidebarCollapsed]);

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      className={className}
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTHS.expanded,
          "--sidebar-width-icon": SIDEBAR_WIDTHS.collapsed,
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
