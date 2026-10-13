"use client";

// The editor's panel tabs (Colors, Typography, Other, and AI when enabled),
// shared by the desktop sidebar (ExpandedContent) and the mobile drawer
// (MobilePanelContent), so both show exactly the same panels. Icon-only
// triggers carry an aria-label and a Tooltip.
//
// Contract: the panel list comes from getPanelConfigs(showTabAI), and
// getVisiblePanel falls back to Colors when the stored activePanel is not in
// that list (the AI panel with showTabAI off). The caller owns the surface's
// spacing and scrolling through the three className props.

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@villa/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@villa/ui/components/tooltip";
import { cn } from "@villa/ui/lib/utils";
import { useOverlayStore } from "../../stores/overlay-store";
import { useThemerContext } from "../themer-provider";
import { PanelContent } from "./panel-content";
import { getPanelConfigs, getVisiblePanel, type Panel } from "./panels-config";

interface PanelTabsProps {
  className?: string;
  /** Wrapper around the tab list (spacing differs per surface). */
  listClassName?: string;
  /** Scroll container around the active panel. */
  contentClassName?: string;
}

export function PanelTabs({
  className,
  listClassName,
  contentClassName,
}: PanelTabsProps) {
  const activePanel = useOverlayStore((state) => state.activePanel);
  const setActivePanel = useOverlayStore((state) => state.setActivePanel);
  const { config } = useThemerContext();
  const showTabAI = config.showTabAI === true;
  const panels = getPanelConfigs(showTabAI);
  const visiblePanel = getVisiblePanel(activePanel, showTabAI);

  const handleValueChange = React.useCallback(
    (value: unknown) => {
      const next = panels.find((panel) => panel.id === value);
      if (next) setActivePanel(next.id);
    },
    [panels, setActivePanel],
  );

  return (
    <Tabs
      value={visiblePanel}
      onValueChange={handleValueChange}
      className={cn("flex min-h-0 flex-col gap-0", className)}
    >
      <div className={listClassName}>
        <TabsList
          className={cn(
            "grid w-full",
            showTabAI ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          {panels.map((panel) => (
            <Tooltip key={panel.id}>
              <TooltipTrigger
                render={
                  <TabsTrigger value={panel.id} aria-label={panel.label} />
                }
              >
                <panel.icon aria-hidden className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">{panel.label}</TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </div>

      {panels.map((panel) => (
        <TabsContent
          key={panel.id}
          value={panel.id}
          className={cn("m-0 min-h-0 flex-1", contentClassName)}
          // Leaves this scroll container native in a host that runs Lenis
          // (see LenisPause; neither Banter app does).
          data-lenis-prevent
        >
          <PanelContent panel={panel.id as Panel} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
