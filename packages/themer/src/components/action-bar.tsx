"use client";

// The bar above the preview (tweakcn's action bar, minus its account
// features): contrast check, light/dark, undo/redo, reset, CSS import, the
// code export and the theme override switch.
//
// Every value is selected narrowly from the stores so the bar does not
// re-render on unrelated edits (it re-renders when undo/redo availability or
// whether Reset would change anything flips: with Sidebar Sync on, a preset
// with its sidebar aligned counts as reset). Icon buttons are ActionButton
// (./ui/action-button.tsx) at the Button `icon` size as is: give them no h-/w-
// classes, because tailwind-merge drops the Button's own `size-8` only for
// another `size-*` class (see themer-trigger.tsx).
// Share and Save are not here: they need tweakcn's accounts, which this
// editor does not port. Keeping a theme means copying the Code dialog's
// output into packages/ui-tokens/tokens; the editor never writes that source
// (README "Run it").
//
// See: packages/themer/ARCHITECTURE.md

import * as React from "react";
import { Undo2, Redo2, Code2, RotateCcw, Eye, Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useEditorStore } from "../stores/editor-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  selectCanRedo,
  selectCanResetToPreset,
  selectCanUndo,
} from "../selectors";
import { SHORTCUTS } from "../config/constants";
import { CodePanelDialog } from "./actions/code-panel-dialog";
import { CssImportDialog } from "./actions/css-import-dialog";
import { ContrastCheckerDialog } from "./editor/contrast-checker-popover";
import { ActionButton } from "./ui/action-button";
import { ModeToggle } from "./ui/mode-toggle";

/**
 * Action bar for the preview area (tweakcn-style)
 */
export function ActionBar() {
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

  const [contrastOpen, setContrastOpen] = React.useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const overrideLabel = themeOverrideEnabled
    ? "Show the production theme"
    : "Apply the edited theme";

  return (
    <div className="bg-background/95 h-12 shrink-0 border-b backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <ActionButton
            label="Contrast checker"
            onClick={() => setContrastOpen(true)}
          >
            <Eye />
          </ActionButton>

          <Separator orientation="vertical" className="h-6.5" />

          <ModeToggle data-testid="themer-mode-toggle" />

          <Separator orientation="vertical" className="h-6.5" />

          <ButtonGroup aria-label="History">
            <ActionButton
              label="Undo"
              shortcut={SHORTCUTS.undo}
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 />
            </ActionButton>
            <ActionButton
              label="Redo"
              shortcut={SHORTCUTS.redo}
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 />
            </ActionButton>
          </ButtonGroup>

          <Separator orientation="vertical" className="h-6.5" />

          <ActionButton
            label="Reset to preset"
            onClick={reset}
            disabled={!canReset}
          >
            <RotateCcw />
          </ActionButton>

          <ActionButton
            label="Import CSS"
            data-testid="themer-import-trigger"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload />
          </ActionButton>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCodeDialogOpen(true)}
          >
            <Code2 data-icon="inline-start" />
            Code
          </Button>

          <Tooltip>
            <TooltipTrigger
              render={
                <div className="ms-1 flex h-8 items-center rounded-md border px-2" />
              }
            >
              <Switch
                aria-label="Theme override"
                checked={themeOverrideEnabled}
                data-testid="themer-theme-override-switch"
                onCheckedChange={setThemeOverrideEnabled}
                size="sm"
              />
            </TooltipTrigger>
            <TooltipContent>{overrideLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ContrastCheckerDialog
        open={contrastOpen}
        onOpenChange={setContrastOpen}
      />
      <CssImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      {/* Mounted only while open: it builds three exports of the theme. */}
      {codeDialogOpen ? (
        <CodePanelDialog open onOpenChange={setCodeDialogOpen} />
      ) : null}
    </div>
  );
}
