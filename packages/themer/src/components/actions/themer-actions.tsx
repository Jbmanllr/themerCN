"use client";

// The Themer's actions, defined once for every surface that offers them:
// the ActionBar (Workspace's bar, the in-place sidebar's footer), the
// Toolbar's bar and its "More actions" menu, and the collapsed rail's menu.
// useThemerActions gives each action's name, icon, shortcut, state and
// handler, the Theme override, and the dialogs the actions open; a surface
// lays out the actions it shows (ThemerActionButton draws one as an icon
// button) and renders `dialogs` once. ThemerActionsMenu is the menu form,
// shared by the Toolbar and the collapsed rail.
//
// Adding an action: define it in useThemerActions, and list it in MENU_ITEMS
// and in the ActionBar's layout (action-bar.tsx).
//
// Every value is selected narrowly from the stores (see action-bar.tsx).

import * as React from "react";
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
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SHORTCUTS } from "../../config/constants";
import { useToggleMode } from "../../hooks/use-themer";
import {
  selectCanRedo,
  selectCanResetToPreset,
  selectCanUndo,
  selectCurrentMode,
} from "../../selectors";
import { useEditorStore } from "../../stores/editor-store";
import { usePreferencesStore } from "../../stores/preferences-store";
import { CodePanelDialog } from "./code-panel-dialog";
import { CssImportDialog } from "./css-import-dialog";
import { ContrastCheckerDialog } from "../editor/contrast-checker-popover";
import { ActionButton } from "../ui/action-button";

export interface ThemerAction {
  /** Accessible name, tooltip and menu text. */
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Shortcut string ("ctrl+z") shown in the tooltip. */
  shortcut?: string;
  testId?: string;
}

export type ThemerActionId =
  | "undo"
  | "redo"
  | "reset"
  | "code"
  | "importCss"
  | "contrast";

type ActionDialog = "code" | "importCss" | "contrast";

export function useThemerActions() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const reset = useEditorStore((state) => state.resetToCurrentPreset);
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const sidebarColorSync = usePreferencesStore(
    (state) => state.sidebarColorSync,
  );
  const canReset = useEditorStore(selectCanResetToPreset(sidebarColorSync));
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled,
  );
  const setThemeOverrideEnabled = usePreferencesStore(
    (state) => state.setThemeOverrideEnabled,
  );

  const [dialog, setDialog] = React.useState<ActionDialog | null>(null);
  const onDialogOpenChange = (open: boolean) => {
    if (!open) setDialog(null);
  };

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
    code: { label: "Code", icon: Code2, onSelect: () => setDialog("code") },
    importCss: {
      label: "Import CSS",
      icon: Upload,
      testId: "themer-import-trigger",
      onSelect: () => setDialog("importCss"),
    },
    contrast: {
      label: "Contrast checker",
      icon: Eye,
      onSelect: () => setDialog("contrast"),
    },
  };

  const override = {
    label: "Theme override",
    testId: "themer-theme-override-switch",
    checked: themeOverrideEnabled,
    onCheckedChange: setThemeOverrideEnabled,
    /** What turning it over does, for a tooltip. */
    description: themeOverrideEnabled
      ? "Show the production theme"
      : "Apply the edited theme",
  };

  const dialogs = (
    <>
      <ContrastCheckerDialog
        open={dialog === "contrast"}
        onOpenChange={onDialogOpenChange}
      />
      <CssImportDialog
        open={dialog === "importCss"}
        onOpenChange={onDialogOpenChange}
      />
      {/* Mounted only while open: it builds three exports of the theme. */}
      {dialog === "code" ? (
        <CodePanelDialog open onOpenChange={onDialogOpenChange} />
      ) : null}
    </>
  );

  return { actions, override, dialogs };
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
  );
}

/** The actions every menu lists, in order; the override follows them. */
const MENU_ITEMS: ThemerActionId[] = ["code", "importCss", "contrast", "reset"];

/**
 * The actions as a "More actions" menu. `withHistory` leads with undo, redo
 * and the colour mode, for a surface that has no buttons for them (the
 * collapsed rail); `children` are items appended after a separator (the
 * Toolbar's layout submenu). The dialogs are mounted beside the menu, which
 * closes when an item is picked.
 */
export function ThemerActionsMenu({
  withHistory = false,
  side,
  align = "end",
  children,
}: {
  withHistory?: boolean;
  side?: "right" | "bottom";
  align?: "start" | "end";
  children?: React.ReactNode;
}) {
  const { actions, override, dialogs } = useThemerActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="More actions">
              <Ellipsis />
            </Button>
          }
        />
        <DropdownMenuContent side={side} align={align} className="w-56">
          {withHistory ? (
            <>
              <DropdownMenuGroup>
                <ActionMenuItem action={actions.undo} />
                <ActionMenuItem action={actions.redo} />
                <ModeMenuItem />
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuGroup>
            {MENU_ITEMS.map((id) => (
              <ActionMenuItem key={id} action={actions[id]} />
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
          {children ? (
            <>
              <DropdownMenuSeparator />
              {children}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}

function ActionMenuItem({ action }: { action: ThemerAction }) {
  return (
    <DropdownMenuItem
      data-testid={action.testId}
      onClick={action.onSelect}
      disabled={action.disabled}
    >
      <action.icon />
      {action.label}
    </DropdownMenuItem>
  );
}

/** ModeToggle's menu form, named by the mode it switches to. */
function ModeMenuItem() {
  const isDark = useEditorStore(selectCurrentMode) === "dark";
  const toggleMode = useToggleMode();
  const Icon = isDark ? Sun : Moon;

  return (
    <DropdownMenuItem
      onClick={(event) => toggleMode({ x: event.clientX, y: event.clientY })}
    >
      <Icon />
      {isDark ? "Switch to light mode" : "Switch to dark mode"}
    </DropdownMenuItem>
  );
}
