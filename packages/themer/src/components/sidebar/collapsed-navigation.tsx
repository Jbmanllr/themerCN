"use client";

// The editor sidebar's icon-only state (ThemerSidebar renders it while the
// SidebarProvider is collapsed): one button per panel from getPanelConfigs,
// the same set PanelTabs shows when the sidebar is expanded.
//
// Contract: every button keeps its `aria-label`; the tooltip is not an
// accessible name (pinned by collapsed-navigation.test.tsx).

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@villa/ui/components/sidebar";
import { useOverlayStore } from "../../stores/overlay-store";
import { useThemerContext } from "../themer-provider";
import { getPanelConfigs } from "./panels-config";

export function CollapsedNavigation() {
  const activePanel = useOverlayStore((state) => state.activePanel);
  const setActivePanel = useOverlayStore((state) => state.setActivePanel);
  const { config } = useThemerContext();
  const panels = getPanelConfigs(config.showTabAI === true);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {panels.map((panel) => (
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
