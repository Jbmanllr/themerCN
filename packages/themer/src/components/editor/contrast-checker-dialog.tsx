"use client"

// The contrast checker as a dialog. It is always controlled: ThemerDialogs
// (actions/themer-dialogs.tsx) owns it and opens it from the ThemerUIStore,
// whichever surface's Contrast checker action asked.
//
// Contract: focus goes back to the opener only when the user dismisses the
// dialog (Escape, the close button, a click outside). A colour row closes it
// from the store instead (contrast-checker.tsx) and hands focus to the colour
// control (focusColor), so the dialog must not pull focus back on its way out.
//
// See: packages/themer/ARCHITECTURE.md (Contrast Checker).

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { ContrastChecker } from "./contrast-checker"

interface ContrastCheckerDialogProps {
  open: boolean
  /** Called when the user asks to close the dialog. */
  onOpenChange: (open: boolean) => void
}

/**
 * Inline on purpose: the primitive's `sm:max-w-sm` sits in the host's
 * utilities layer, which outranks the editor's own layer, so a width utility
 * that only the editor uses (here `sm:max-w-lg`) would lose and clip the list.
 */
const CONTRAST_DIALOG_STYLE: React.CSSProperties = {
  maxWidth: "min(32rem, calc(100% - 2rem))",
}

export function ContrastCheckerDialog({
  open,
  onOpenChange,
}: ContrastCheckerDialogProps) {
  // Focus the dialog itself on open, not its first control (the mode toggle),
  // which would otherwise open with a focus ring on "Light".
  const popupRef = React.useRef<HTMLDivElement>(null)
  // Set when the user dismisses the dialog, read once when it closes.
  const dismissedRef = React.useRef(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismissedRef.current = true
        onOpenChange(next)
      }}
    >
      <DialogContent
        ref={popupRef}
        initialFocus={popupRef}
        finalFocus={() => {
          const returnFocus = dismissedRef.current
          dismissedRef.current = false
          return returnFocus
        }}
        className="max-h-[85vh]"
        style={CONTRAST_DIALOG_STYLE}
      >
        <DialogHeader>
          <DialogTitle>WCAG Contrast Checker</DialogTitle>
        </DialogHeader>
        <ScrollArea className="-me-4 max-h-[65vh] min-w-0">
          <div className="pe-4">
            <ContrastChecker />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
