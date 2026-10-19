"use client"

// The Themer's actions, defined once for every surface that offers them:
// the ActionBar (Workspace's bar, the in-place sidebar's footer), the
// Toolbar's bar and its "More actions" menu, and the collapsed rail's menu.
// useThemerActions gives each action's name, icon, shortcut, state and
// handler, and the Theme override; a surface lays out the actions it shows
// (ThemerActionButton draws one as an icon button).
//
// An action with a dialog only asks the ThemerUIStore to open it: ThemerUI
// renders the dialogs once (themer-dialogs.tsx), so a dialog behaves the same
// whichever surface opened it, and survives that surface unmounting.
//
// The menu form is composed: ThemerActionsMenu is the trigger and the popup,
// and its children are the pieces exported here (ThemerHistoryMenuGroup,
// ThemerMenuActions, ThemerActionMenuItem, ThemerModeMenuItem) plus any item
// of the surface's own (the Toolbar's layout submenu).
//
// Adding an action: define it in useThemerActions, and list it in MENU_ITEMS
// and in the ActionBar's layout (action-bar.tsx).
//
// Every value is selected narrowly from the stores (see action-bar.tsx).

import * as React from "react"
import {
  Code2,
  Ellipsis,
  Eye,
  Moon,
  Redo2,
  RotateCcw,
  Sun,
  Undo2,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { SHORTCUTS } from "../../config/constants"
import { useToggleMode } from "../../hooks/use-themer"
import { useIsOnPreset } from "../../hooks/use-editor-selectors"
import {
  selectCanRedo,
  selectCanUndo,
  selectCurrentMode,
} from "../../selectors"
import { useEditorStore } from "../../stores/editor-store"
import { usePreferencesStore } from "../../stores/preferences-store"
import { useThemerUIStore } from "../../stores/themer-ui-store"
import { ActionButton } from "../ui/action-button"

export interface ThemerAction {
  /** Accessible name, tooltip and menu text. */
  label: string
  icon: LucideIcon
  onSelect: () => void
  disabled?: boolean
  /** Shortcut string ("ctrl+z") shown in the tooltip. */
  shortcut?: string
  testId?: string
}

export type ThemerActionId =
  "undo" | "redo" | "reset" | "code" | "importCss" | "contrast"

export function useThemerActions() {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const reset = useEditorStore((state) => state.resetToCurrentPreset)
  const canUndo = useEditorStore(selectCanUndo)
  const canRedo = useEditorStore(selectCanRedo)
  // Reset is enabled exactly when the unsaved mark shows.
  const canReset = !useIsOnPreset()
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled
  )
  const setThemeOverrideEnabled = usePreferencesStore(
    (state) => state.setThemeOverrideEnabled
  )
  const openDialog = useThemerUIStore((state) => state.openDialog)

  const actions: Record<ThemerActionId, ThemerAction> = {
    undo: {
      label: "Undo",
      icon: Undo2,
      shortcut: SHORTCUTS.undo,
      onSelect: undo,
      disabled: !canUndo,
    },
    redo: {
      label: "Redo",
      icon: Redo2,
      shortcut: SHORTCUTS.redo,
      onSelect: redo,
      disabled: !canRedo,
    },
    reset: {
      label: "Reset to preset",
      icon: RotateCcw,
      onSelect: reset,
      disabled: !canReset,
    },
    code: { label: "Code", icon: Code2, onSelect: () => openDialog("code") },
    importCss: {
      label: "Import CSS",
      icon: Upload,
      testId: "themer-import-trigger",
      onSelect: () => openDialog("importCss"),
    },
    contrast: {
      label: "Contrast checker",
      icon: Eye,
      onSelect: () => openDialog("contrast"),
    },
  }

  const override = {
    label: "Theme override",
    testId: "themer-theme-override-switch",
    checked: themeOverrideEnabled,
    onCheckedChange: setThemeOverrideEnabled,
    /** What turning it over does, for a tooltip. */
    description: themeOverrideEnabled
      ? "Show the production theme"
      : "Apply the edited theme",
  }

  return { actions, override }
}

/** An action as an icon button (ActionButton: tooltip with its shortcut). */
export function ThemerActionButton({ action }: { action: ThemerAction }) {
  return (
    <ActionButton
      label={action.label}
      shortcut={action.shortcut}
      data-testid={action.testId}
      onClick={action.onSelect}
      disabled={action.disabled}
    >
      <action.icon />
    </ActionButton>
  )
}

/** The actions every menu lists, in order; the override follows them. */
const MENU_ITEMS: ThemerActionId[] = ["code", "importCss", "contrast", "reset"]

/**
 * A "More actions" menu: its trigger and popup, holding `children` (the
 * pieces below, and the surface's own items).
 */
export function ThemerActionsMenu({
  side,
  align = "end",
  children,
}: {
  side?: "right" | "bottom"
  align?: "start" | "end"
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="More actions">
            <Ellipsis />
          </Button>
        }
      />
      <DropdownMenuContent side={side} align={align} className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Undo, redo and the colour mode, for a menu on a surface that has no
 * buttons for them (the collapsed rail).
 */
export function ThemerHistoryMenuGroup() {
  const { actions } = useThemerActions()
  return (
    <DropdownMenuGroup>
      <ThemerActionMenuItem action={actions.undo} />
      <ThemerActionMenuItem action={actions.redo} />
      <ThemerModeMenuItem />
    </DropdownMenuGroup>
  )
}

/** The actions every menu lists (MENU_ITEMS), then the Theme override. */
export function ThemerMenuActions() {
  const { actions, override } = useThemerActions()
  return (
    <>
      <DropdownMenuGroup>
        {MENU_ITEMS.map((id) => (
          <ThemerActionMenuItem key={id} action={actions[id]} />
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        data-testid={override.testId}
        checked={override.checked}
        onCheckedChange={override.onCheckedChange}
      >
        {override.label}
      </DropdownMenuCheckboxItem>
    </>
  )
}

/** An action as a menu item. */
export function ThemerActionMenuItem({ action }: { action: ThemerAction }) {
  return (
    <DropdownMenuItem
      data-testid={action.testId}
      onClick={action.onSelect}
      disabled={action.disabled}
    >
      <action.icon />
      {action.label}
    </DropdownMenuItem>
  )
}

/** ModeToggle's menu form, named by the mode it switches to. */
export function ThemerModeMenuItem() {
  const isDark = useEditorStore(selectCurrentMode) === "dark"
  const toggleMode = useToggleMode()
  const Icon = isDark ? Sun : Moon

  return (
    <DropdownMenuItem
      onClick={(event) => toggleMode({ x: event.clientX, y: event.clientY })}
    >
      <Icon />
      {isDark ? "Switch to light mode" : "Switch to dark mode"}
    </DropdownMenuItem>
  )
}
