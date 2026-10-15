"use client";

// The editor's icon button: a Button named by `label` (its aria-label and its
// Tooltip text), with the shortcut beside the name in the tooltip when given.
// Every plain icon action draws it (the action bar, the preview toolbars, the
// preset cycle buttons, the overlay header, the floating trigger), so none is
// left unnamed or without a tooltip; menu triggers and toggles keep their own
// controls.
//
// Contract: `label` replaces `aria-label` (the prop is omitted from the
// type). The defaults are a ghost `icon` Button, and any Button prop passed
// overrides them: the trigger passes an outline one, toolbars `icon-sm`.

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { formatShortcut } from "../../hooks/use-keyboard-shortcut";

export interface ActionButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "aria-label"
> {
  /** Accessible name and tooltip text. */
  label: string;
  /** Shortcut string ("ctrl+z") shown in the tooltip. */
  shortcut?: string;
}

/** Ghost icon button with a tooltip naming it (and its shortcut). */
export function ActionButton({
  label,
  shortcut,
  children,
  ...buttonProps
}: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            {...buttonProps}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <Kbd>{formatShortcut(shortcut)}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
