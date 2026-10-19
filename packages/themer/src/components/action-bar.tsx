"use client"

// The Themer's actions as a bar (tweakcn's action bar, minus its account
// features): contrast check, light/dark, undo/redo, reset, CSS import, the
// code export and the theme override switch. Workspace shows it as the bar
// above the preview; Overlay and Push at the foot of their expanded sidebar
// (`stacked`), where it wraps onto two rows. The actions themselves (names,
// icons, state, handlers) are defined in ./actions/themer-actions.tsx, shared
// with the Toolbar and the collapsed rail's menus; this file only lays them
// out. Their dialogs belong to ThemerUI (./actions/themer-dialogs.tsx).
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
// output into the Host's own CSS; the editor never writes source files
// (README "Saved Themes and the head script").
//
// See: packages/themer/ARCHITECTURE.md

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { ThemerActionButton, useThemerActions } from "./actions/themer-actions"
import { ModeToggle } from "./ui/mode-toggle"

/**
 * The Themer's actions: `bar` is the strip above Workspace's preview,
 * `stacked` the sidebar footer of the in-place sidebar layouts (Overlay,
 * Push).
 */
export function ActionBar({
  variant = "bar",
}: {
  variant?: "bar" | "stacked"
}) {
  const { actions, override } = useThemerActions()

  return (
    <div
      className={cn(
        variant === "bar" &&
          "h-12 shrink-0 border-b bg-background/95 backdrop-blur-sm"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          variant === "bar" ? "h-full px-4" : "flex-wrap gap-2"
        )}
      >
        <div className="flex items-center gap-1">
          <ThemerActionButton action={actions.contrast} />

          <Separator orientation="vertical" className="h-6.5" />

          <ModeToggle data-testid="themer-mode-toggle" />

          <Separator orientation="vertical" className="h-6.5" />

          <ButtonGroup aria-label="History">
            <ThemerActionButton action={actions.undo} />
            <ThemerActionButton action={actions.redo} />
          </ButtonGroup>

          <Separator orientation="vertical" className="h-6.5" />

          <ThemerActionButton action={actions.reset} />
          <ThemerActionButton action={actions.importCss} />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={actions.code.onSelect}>
            <actions.code.icon data-icon="inline-start" />
            {actions.code.label}
          </Button>

          <Tooltip>
            <TooltipTrigger
              render={
                <div className="ms-1 flex h-8 items-center rounded-md border px-2" />
              }
            >
              <Switch
                aria-label={override.label}
                checked={override.checked}
                data-testid={override.testId}
                onCheckedChange={override.onCheckedChange}
                size="sm"
              />
            </TooltipTrigger>
            <TooltipContent>{override.description}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
