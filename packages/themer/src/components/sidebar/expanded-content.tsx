"use client"

// The editor sidebar's expanded body (ThemerSidebar renders it while the
// SidebarProvider is open): the preset select, then PanelTabs with each
// panel in its own scroll container. The mobile drawer (themer-ui/
// mobile-drawer.tsx) has its own preset select and draws the same PanelTabs
// through MobilePanelContent.

import { SidebarGroup } from "@workspace/ui/components/sidebar"
import { PresetSelect } from "../actions/preset-select"
import { PanelTabs } from "./panel-tabs"

export function ExpandedContent() {
  return (
    <>
      {/* Preset selector: h-12 like the action bar beside it (both sit under
          an h-12 header), so their bottom borders line up. */}
      <SidebarGroup className="h-12 shrink-0 border-b p-0">
        <div className="flex h-full items-center px-2">
          <PresetSelect />
        </div>
      </SidebarGroup>

      <PanelTabs
        className="flex-1"
        listClassName="p-2 pb-0"
        contentClassName="overflow-y-auto px-2 pt-4 pb-4"
      />
    </>
  )
}
