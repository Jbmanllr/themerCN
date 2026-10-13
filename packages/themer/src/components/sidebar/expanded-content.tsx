"use client";

// The editor sidebar's expanded body (ThemerSidebar renders it while the
// SidebarProvider is open): the preset select, then PanelTabs with each
// panel in its own scroll container. The mobile drawer (overlay/
// mobile-drawer.tsx) has its own preset select and draws the same PanelTabs
// through MobilePanelContent.

import { SidebarGroup } from "@villa/ui/components/sidebar";
import { useEditorStore } from "../../stores/editor-store";
import { PresetSelect } from "../actions/preset-select";
import { PanelTabs } from "./panel-tabs";

export function ExpandedContent() {
  // Narrow selections: the sidebar re-renders on preset changes only.
  const preset = useEditorStore((state) => state.themeState.preset);
  const applyPreset = useEditorStore((state) => state.applyThemePreset);

  return (
    <>
      {/* Preset selector: h-12 like the action bar beside it (both sit under
          an h-12 header), so their bottom borders line up. */}
      <SidebarGroup className="h-12 shrink-0 border-b p-0">
        <div className="flex h-full items-center px-2">
          <PresetSelect value={preset ?? "default"} onChange={applyPreset} />
        </div>
      </SidebarGroup>

      <PanelTabs
        className="flex-1"
        listClassName="p-2 pb-0"
        contentClassName="overflow-y-auto px-2 pt-4 pb-4"
      />
    </>
  );
}
