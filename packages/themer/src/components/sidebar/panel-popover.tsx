"use client";

// A panel (Colors, Typography, Other) in a popup: how the Toolbar's panel
// groups and the collapsed sidebar rail show a panel without the expanded
// sidebar.
//
// Contract:
// - One panel popup at a time; opening one makes its panel the active panel
//   (kept across a layout switch and an expand).
// - It stays open while the page is clicked or scrolled: the user is editing
//   the page behind it. Escape, its trigger or another panel's trigger
//   closes it.
// - Its body scrolls inside the room Base UI leaves it (--available-height).

import * as React from "react";
import {
  Popover,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useThemerUIStore } from "../../stores/themer-ui-store";
import { PanelContent } from "./panel-content";
import type { Panel } from "./panels-config";

/** Why a panel popup does not close: a press or focus outside it. */
const STAYS_OPEN_ON: ReadonlySet<string> = new Set([
  "outside-press",
  "focus-out",
]);

/** Which panel popup is open, and the props that open and close each one. */
export function usePanelPopovers() {
  const setActivePanel = useThemerUIStore((state) => state.setActivePanel);
  const [openPanel, setOpenPanel] = React.useState<Panel | null>(null);

  const popoverProps = (panel: Panel) => ({
    open: openPanel === panel,
    onOpenChange: (open: boolean, { reason }: { reason: string }) => {
      if (open) {
        setActivePanel(panel);
        setOpenPanel(panel);
      } else if (!STAYS_OPEN_ON.has(reason)) {
        setOpenPanel((current) => (current === panel ? null : current));
      }
    },
  });

  return { openPanel, setOpenPanel, popoverProps };
}

type PanelPopoverProps = React.ComponentProps<typeof Popover> & {
  panel: Panel;
  /** The trigger, when it sits inside the Popover (no detached handle). */
  trigger?: React.ReactNode;
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  "data-testid"?: string;
};

export function PanelPopover({
  panel,
  trigger,
  side,
  align,
  "data-testid": testId,
  ...props
}: PanelPopoverProps) {
  return (
    <Popover {...props}>
      {trigger}
      <PopoverContent
        data-testid={testId}
        side={side}
        align={align}
        className="w-md p-0"
      >
        {/* Native scrolling in a host running Lenis (see LenisPause). */}
        <ScrollArea
          data-lenis-prevent
          className="*:data-[slot=scroll-area-viewport]:max-h-[calc(var(--available-height)-0.75rem)]"
        >
          <div className="p-4">
            <PanelContent panel={panel} />
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
