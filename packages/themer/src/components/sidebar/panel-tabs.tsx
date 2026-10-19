"use client"

// The Themer UI's panel tabs (Colors, Typography, Other),
// shared by the desktop sidebar (ExpandedContent) and the mobile drawer
// (MobilePanelContent), so both show exactly the same panels. Icon-only
// triggers carry an aria-label and a Tooltip.
//
// Contract: the panel list is PANELS. The caller owns the surface's spacing
// and scrolling through the three className props.

import * as React from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useThemerUIStore } from "../../stores/themer-ui-store"
import { PanelContent } from "./panel-content"
import { PANELS } from "./panels-config"

interface PanelTabsProps {
  className?: string
  /** Wrapper around the tab list (spacing differs per surface). */
  listClassName?: string
  /** Scroll container around the active panel. */
  contentClassName?: string
}

export function PanelTabs({
  className,
  listClassName,
  contentClassName,
}: PanelTabsProps) {
  const activePanel = useThemerUIStore((state) => state.activePanel)
  const setActivePanel = useThemerUIStore((state) => state.setActivePanel)

  const handleValueChange = React.useCallback(
    (value: unknown) => {
      const next = PANELS.find((panel) => panel.id === value)
      if (next) setActivePanel(next.id)
    },
    [setActivePanel]
  )

  return (
    <Tabs
      value={activePanel}
      onValueChange={handleValueChange}
      className={cn("flex min-h-0 flex-col gap-0", className)}
    >
      <div className={listClassName}>
        <TabsList className="grid w-full grid-cols-3">
          {PANELS.map((panel) => (
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

      {PANELS.map((panel) => (
        <TabsContent
          key={panel.id}
          value={panel.id}
          className={cn("m-0 min-h-0 flex-1", contentClassName)}
          // Leaves this scroll container native in a host that runs Lenis
          // (see LenisPause).
          data-lenis-prevent
        >
          <PanelContent panel={panel.id} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
