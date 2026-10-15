"use client";

// Toolbar: the Themer layout with no sidebar. Every control sits in a bar
// centred at the top of the Host app's real page (ADR 0001: it renders beside
// the Host tree and never wraps it).
//
// Contract:
// - Every control of the sidebar layouts is reachable: the panel groups,
//   the preset picker, undo/redo, mode and Close in the bar; the rest of the
//   ActionBar, the Theme override and the layout switcher in its overflow
//   menu.
// - A panel popup stays open while the page is clicked or scrolled; Escape,
//   its trigger or another group's trigger closes it. Opening one makes its
//   panel the active panel (kept across a layout switch).
// - The inspector works on the real page (PageInspector); its toggle sits in
//   the bar's ButtonGroup, beside undo/redo.
// - No Preview, no page pause, no scroll lock. Nested popups portal after
//   the panel popup, into the same layer, so they paint above it.

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { X } from "lucide-react";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Separator } from "@workspace/ui/components/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useThemerLayout } from "../../../hooks/use-themer-layout";
import { useColorFocusStore } from "../../../stores/color-focus-store";
import { useEditorStore } from "../../../stores/editor-store";
import { useThemerUIStore } from "../../../stores/themer-ui-store";
import { PresetSelect } from "../../actions/preset-select";
import {
  ThemerActionButton,
  ThemerActionsMenu,
  useThemerActions,
} from "../../actions/themer-actions";
import { LayoutRadioGroup } from "../layout-switcher";
import { PageInspector, PageInspectorToggle } from "../page-inspector";
import { THEMER_LAYOUTS } from "./registry";
import { PanelContent } from "../../sidebar/panel-content";
import { ActionButton } from "../../ui/action-button";
import { ModeToggle } from "../../ui/mode-toggle";
import { PANELS, type Panel } from "../../sidebar/panels-config";
import type { ThemerLayoutProps } from "./types";

export function ToolbarLayout({ onClose, zIndex }: ThemerLayoutProps) {
  const preset = useEditorStore((state) => state.themeState.preset);
  const applyPreset = useEditorStore((state) => state.applyThemePreset);
  const { actions } = useThemerActions();

  return (
    <div
      data-themer-ui
      data-themer-layout="toolbar"
      data-testid="themer-ui"
      role="toolbar"
      aria-label="Theme Editor"
      className="bg-background fixed inset-x-0 top-3 mx-auto flex w-fit items-center gap-2 rounded-4xl border p-1.5 shadow-lg"
      style={{ zIndex }}
    >
      <PageInspector />
      <PanelGroups />

      <Separator orientation="vertical" className="h-6.5" />

      <div className="w-64">
        <PresetSelect value={preset ?? "default"} onChange={applyPreset} />
      </div>

      <Separator orientation="vertical" className="h-6.5" />

      <ButtonGroup aria-label="Editor actions">
        <ThemerActionButton action={actions.undo} />
        <ThemerActionButton action={actions.redo} />
        <PageInspectorToggle size="default" />
        <ModeToggle data-testid="themer-mode-toggle" />
        <ActionButton label="Close theme editor" onClick={onClose}>
          <X />
        </ActionButton>
      </ButtonGroup>

      {/* The rest of the actions, the Theme override and the layouts. */}
      <ThemerActionsMenu>
        <LayoutSubmenu />
      </ThemerActionsMenu>
    </div>
  );
}

/** The layouts, as a submenu of the Toolbar's "More actions" menu. */
function LayoutSubmenu() {
  const layout = THEMER_LAYOUTS[useThemerLayout()];
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <layout.icon />
        Layout: {layout.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <LayoutRadioGroup />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * Why a panel popup does not close: a press or focus outside it. The user is
 * editing the page behind it, so clicking or scrolling the page keeps it
 * open; Escape, its trigger or another group's trigger closes it.
 */
const STAYS_OPEN_ON: ReadonlySet<string> = new Set([
  "outside-press",
  "focus-out",
]);

const PANEL_POPOVERS = Object.fromEntries(
  PANELS.map((panel) => [panel.id, PopoverPrimitive.createHandle()]),
) as Record<Panel, PopoverPrimitive.Handle<unknown>>;

/**
 * Colors, Typography, Other: popover triggers drawn as a ToggleGroup, the
 * pressed item being the open popup. Opening one makes it the active panel;
 * a colour focus jump (`focusRequest`, hooks/use-color-focus.ts) opens
 * Colors so the picker can mount.
 */
function PanelGroups() {
  const setActivePanel = useThemerUIStore((state) => state.setActivePanel);
  const focusRequest = useColorFocusStore((state) => state.focusRequest);
  const [openPanel, setOpenPanel] = React.useState<Panel | null>(null);

  React.useEffect(() => {
    if (focusRequest) setOpenPanel("colors");
  }, [focusRequest]);

  return (
    <>
      <ToggleGroup value={openPanel ? [openPanel] : []} aria-label="Panels">
        {PANELS.map((panel) => (
          <PopoverTrigger
            key={panel.id}
            handle={PANEL_POPOVERS[panel.id]}
            render={<ToggleGroupItem value={panel.id} aria-label={panel.label} />}
          >
            <panel.icon aria-hidden />
            {panel.label}
          </PopoverTrigger>
        ))}
      </ToggleGroup>
      {/* The popups sit outside the ToggleGroup: a portal keeps React
          context, and a Toggle in a panel (the Sidebar sync) would join the
          group. The triggers reach them through their handles. */}
      {PANELS.map((panel) => (
        <Popover
          key={panel.id}
          handle={PANEL_POPOVERS[panel.id]}
          open={openPanel === panel.id}
          onOpenChange={(open, { reason }) => {
            if (open) {
              setActivePanel(panel.id);
              setOpenPanel(panel.id);
            } else if (!STAYS_OPEN_ON.has(reason)) {
              setOpenPanel((current) => (current === panel.id ? null : current));
            }
          }}
        >
          <PopoverContent
            data-testid={`themer-toolbar-panel-${panel.id}`}
            className="w-md p-0"
          >
            {/* Capped to the room left under the bar (Base UI's
                --available-height); native scrolling in a host running
                Lenis (see LenisPause). */}
            <ScrollArea
              data-lenis-prevent
              className="*:data-[slot=scroll-area-viewport]:max-h-[calc(var(--available-height)-0.75rem)]"
            >
              <div className="p-4">
                <PanelContent panel={panel.id} />
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      ))}
    </>
  );
}
