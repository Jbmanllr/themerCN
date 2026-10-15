"use client";

// The SidebarProvider every sidebar layout shares: the Themer's widths and
// the collapsed state from the `sidebarCollapsed` preference, so collapsing
// in one layout collapses it in the others.

import * as React from "react";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
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
