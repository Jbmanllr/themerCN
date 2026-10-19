"use client"

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
// - The bar is a region labelled "Themer toolbar", not a role="toolbar": it
//   has no arrow-key navigation, so it must not announce any.
// - The inspector works on the real page (PageInspector, mounted beside the
//   bar so its card is not read as part of it); its toggle sits in the bar's
//   ButtonGroup, beside undo/redo.
// - No Preview, no page pause, no scroll lock. Nested popups portal after
//   the panel popup, into the same layer, so they paint above it.

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { X } from "lucide-react"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import {
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import { PopoverTrigger } from "@workspace/ui/components/popover"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useThemerLayout } from "../../../hooks/use-themer-layout"
import { useColorFocusStore } from "../../../stores/color-focus-store"
import { useEditorStore } from "../../../stores/editor-store"
import { PresetSelect } from "../../actions/preset-select"
import {
  ThemerActionButton,
  ThemerActionsMenu,
  ThemerMenuActions,
  useThemerActions,
} from "../../actions/themer-actions"
import { LayoutRadioGroup } from "../layout-switcher"
import { PageInspector, PageInspectorToggle } from "../page-inspector"
import { THEMER_LAYOUTS } from "./registry"
import { PanelPopover, usePanelPopovers } from "../../sidebar/panel-popover"
import { ActionButton } from "../../ui/action-button"
import { ModeToggle } from "../../ui/mode-toggle"
import { PANELS, type Panel } from "../../sidebar/panels-config"
import type { ThemerLayoutProps } from "./types"

export function ToolbarLayout({ onClose, zIndex }: ThemerLayoutProps) {
  const preset = useEditorStore((state) => state.themeState.preset)
  const applyPreset = useEditorStore((state) => state.applyThemePreset)
  const { actions } = useThemerActions()

  return (
    // The root holds the layer. The inspector's card sits beside the bar, so
    // it is never read as part of it.
    <div
      data-themer-ui
      data-themer-layout="toolbar"
      data-testid="themer-ui"
      className="relative"
      style={{ zIndex }}
    >
      <PageInspector />
      <div
        role="region"
        aria-label="Themer toolbar"
        className="fixed inset-x-0 top-3 mx-auto flex w-fit items-center gap-2 rounded-4xl border bg-background p-1.5 shadow-lg"
      >
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
          <ActionButton label="Close Themer" onClick={onClose}>
            <X />
          </ActionButton>
        </ButtonGroup>

        {/* The rest of the actions, the Theme override and the layouts. */}
        <ThemerActionsMenu>
          <ThemerMenuActions />
          <DropdownMenuSeparator />
          <LayoutSubmenu />
        </ThemerActionsMenu>
      </div>
    </div>
  )
}

/** The layouts, as a submenu of the Toolbar's "More actions" menu. */
function LayoutSubmenu() {
  const layout = THEMER_LAYOUTS[useThemerLayout()]
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <layout.icon />
        Themer layout: {layout.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <LayoutRadioGroup />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

const PANEL_POPOVERS = Object.fromEntries(
  PANELS.map((panel) => [panel.id, PopoverPrimitive.createHandle()])
) as Record<Panel, PopoverPrimitive.Handle<unknown>>

/**
 * Colors, Typography, Other: popover triggers drawn as a ToggleGroup, the
 * pressed item being the open popup (sidebar/panel-popover.tsx). A colour
 * focus jump (`focusRequest`, hooks/use-color-focus.ts) opens Colors so the
 * picker can mount.
 */
function PanelGroups() {
  const focusRequest = useColorFocusStore((state) => state.focusRequest)
  const { openPanel, setOpenPanel, popoverProps } = usePanelPopovers()

  React.useEffect(() => {
    if (focusRequest) setOpenPanel("colors")
  }, [focusRequest, setOpenPanel])

  return (
    <>
      <ToggleGroup value={openPanel ? [openPanel] : []} aria-label="Panels">
        {PANELS.map((panel) => (
          <PopoverTrigger
            key={panel.id}
            handle={PANEL_POPOVERS[panel.id]}
            render={
              <ToggleGroupItem value={panel.id} aria-label={panel.label} />
            }
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
        <PanelPopover
          key={panel.id}
          panel={panel.id}
          handle={PANEL_POPOVERS[panel.id]}
          data-testid={`themer-toolbar-panel-${panel.id}`}
          {...popoverProps(panel.id)}
        />
      ))}
    </>
  )
}
