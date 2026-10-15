"use client";

// The editor sidebar's icon-only state (ThemerSidebar renders it while the
// SidebarProvider is collapsed): one button per panel in PANELS, the same set
// PanelTabs shows when the sidebar is expanded. Each button opens its panel
// in a popup beside the rail (./panel-popover.tsx), so the collapsed sidebar
// edits the Theme without expanding.
//
// Contract: every button keeps its `aria-label`; the tooltip is not an
// accessible name (pinned by collapsed-navigation.test.tsx).

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@workspace/ui/components/sidebar";
import { PopoverTrigger } from "@workspace/ui/components/popover";
import { useThemerUIStore } from "../../stores/themer-ui-store";
import { PanelPopover, usePanelPopovers } from "./panel-popover";
import { PANELS } from "./panels-config";

export function CollapsedNavigation() {
  const activePanel = useThemerUIStore((state) => state.activePanel);
  const { openPanel, popoverProps } = usePanelPopovers();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {PANELS.map((panel) => (
          <SidebarMenuItem key={panel.id}>
            <PanelPopover
              panel={panel.id}
              side="right"
              align="start"
              data-testid={`themer-rail-panel-${panel.id}`}
              {...popoverProps(panel.id)}
              trigger={
                <PopoverTrigger
                  render={
                    <SidebarMenuButton
                      isActive={
                        openPanel ? openPanel === panel.id : activePanel === panel.id
                      }
                      aria-label={panel.label}
                      tooltip={panel.label}
                    />
                  }
                >
                  <panel.icon className="h-4 w-4" />
                </PopoverTrigger>
              }
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
