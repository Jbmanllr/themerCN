"use client";

// The editor sidebar's icon-only state (ThemerSidebar renders it while the
// SidebarProvider is collapsed): one button per panel in PANELS,
// the same set PanelTabs shows when the sidebar is expanded.
//
// Contract: every button keeps its `aria-label`; the tooltip is not an
// accessible name (pinned by collapsed-navigation.test.tsx).

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@workspace/ui/components/sidebar";
import { useThemerUIStore } from "../../stores/themer-ui-store";
import { PANELS } from "./panels-config";

export function CollapsedNavigation() {
  const activePanel = useThemerUIStore((state) => state.activePanel);
  const setActivePanel = useThemerUIStore((state) => state.setActivePanel);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {PANELS.map((panel) => (
          <SidebarMenuItem key={panel.id}>
            <SidebarMenuButton
              isActive={activePanel === panel.id}
              onClick={() => setActivePanel(panel.id)}
              aria-label={panel.label}
              tooltip={panel.label}
            >
              <panel.icon className="h-4 w-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
