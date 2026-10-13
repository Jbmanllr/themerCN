"use client";

// Legacy all-in-one header (undo/redo, mode, presets, inspector, export). Not
// the one the overlay shows: nothing in the repository imports this file (it
// stays reachable as `@villa/themer/components/themer-header`). The overlay
// uses ./overlay/themer-header.tsx (sidebar trigger and close button), the
// controls live in ActionBar (./action-bar.tsx), PreviewTabs (inspector,
// fullscreen) and the sidebar's preset picker, and the barrel's
// `ThemerHeader` is the overlay's. Its Share and Download JSON items are
// permanently disabled: this editor has no theme accounts or save action.

import * as React from "react";
import {
  Undo2,
  Redo2,
  Sun,
  Moon,
  Code2,
  Download,
  Share2,
  RotateCcw,
  MoreHorizontal,
  Maximize2,
  Eye,
} from "lucide-react";
import { Button } from "@villa/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@villa/ui/components/dropdown-menu";
import { Separator } from "@villa/ui/components/separator";
import { useThemer } from "../hooks/use-themer";
import { useOverlayStore } from "../stores/overlay-store";
import { formatShortcut } from "../hooks/use-keyboard-shortcut";
import { PresetSelect } from "./actions/preset-select";
import { CodePanelDialog } from "./actions/code-panel-dialog";
import { ContrastCheckerDialog } from "./editor/contrast-checker-popover";

/**
 * Header action bar with undo/redo, theme toggle, presets, and more
 * @deprecated Use ActionBar component for new implementations
 */
export function ThemerHeader() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    currentMode,
    toggleMode,
    hasUnsavedChanges,
    reset,
    preset,
    applyPreset,
  } = useThemer();

  const {
    toggleFullscreen,
    toggleInspector,
    inspectorMode,
    fullscreenPreview,
  } = useOverlayStore();

  const [codeDialogOpen, setCodeDialogOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            className="h-8 w-8"
            title={`Undo (${formatShortcut("ctrl+z")})`}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            className="h-8 w-8"
            title={`Redo (${formatShortcut("ctrl+shift+z")})`}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="h-8 w-8"
          title={`Switch to ${currentMode === "light" ? "dark" : "light"} mode`}
        >
          {currentMode === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Preset selector */}
        <PresetSelect value={preset ?? "default"} onChange={applyPreset} />
      </div>

      <div className="flex items-center gap-2">
        {/* Contrast Checker */}
        <ContrastCheckerDialog
          buttonProps={{
            size: "icon",
            className: "h-8 w-8",
            title: "Contrast Checker",
          }}
        >
          <Eye className="h-4 w-4" />
        </ContrastCheckerDialog>

        {/* Inspector mode */}
        <Button
          variant={inspectorMode ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleInspector}
          title="Toggle Inspector"
        >
          Inspector
        </Button>

        {/* Fullscreen */}
        <Button
          variant={fullscreenPreview ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleFullscreen}
          className="h-8 w-8"
          title="Fullscreen Preview"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Code export */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCodeDialogOpen(true)}
        >
          <Code2 className="me-2 h-4 w-4" />
          Export
        </Button>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCodeDialogOpen(true)}>
              <Code2 className="me-2 h-4 w-4" />
              Export CSS
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Share2 className="me-2 h-4 w-4" />
              Share Theme
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Download className="me-2 h-4 w-4" />
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={reset} disabled={!hasUnsavedChanges}>
              <RotateCcw className="me-2 h-4 w-4" />
              Reset to Preset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Code panel dialog */}
      <CodePanelDialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen} />
    </>
  );
}
