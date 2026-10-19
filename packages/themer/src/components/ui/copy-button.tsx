"use client"

// The editor's copy-to-clipboard button (the palette preview's per-colour
// copy). It names itself for assistive technology and reports the copy
// through its label and a "Copied!" tooltip.
//
// Contract: the click never reaches a clickable parent (stopPropagation); the
// caller's `onClick` runs only after the text reached the clipboard (when the
// Clipboard API is missing or refuses, it does not run and the button stays
// idle); the copied label overrides a caller's `aria-label` while the
// feedback shows (copy-button.test.tsx).

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useCopyFeedback } from "../../hooks/use-copy-feedback"

/** How long the copied state (its tooltip and label) shows. */
const COPIED_FEEDBACK_MS = 3000

type ButtonClickEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Button>["onClick"]>
>[0]

export interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  /** Text to copy to clipboard */
  textToCopy: string
  /** Custom children to render. If not provided, shows "Copy" / "Copied" */
  children?: React.ReactNode
}

/** Copies `textToCopy` on click, and says so in a tooltip. */
export function CopyButton({
  textToCopy,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
  ...buttonProps
}: CopyButtonProps) {
  const [copied, copy] = useCopyFeedback(COPIED_FEEDBACK_MS)

  const handleCopy = React.useCallback(
    async (event: ButtonClickEvent) => {
      event.stopPropagation()
      if (await copy(textToCopy)) onClick?.(event)
    },
    [copy, textToCopy, onClick]
  )

  // The label goes after the spread: a caller's aria-label names the idle
  // button, and the copied state still reaches assistive tech.
  const button = (
    <Button
      type="button"
      onClick={handleCopy}
      variant="outline"
      size="sm"
      className={className}
      {...buttonProps}
      aria-label={
        copied ? "Copied to clipboard" : (ariaLabel ?? "Copy to clipboard")
      }
    >
      {children ?? (copied ? "Copied" : "Copy")}
    </Button>
  )

  // The tooltip is controlled by `copied` alone (the no-op onOpenChange
  // drops hover and focus), so it appears only as copy feedback.
  return (
    <Tooltip open={copied} onOpenChange={() => {}}>
      <TooltipTrigger render={button}></TooltipTrigger>
      <TooltipContent>
        <p>Copied!</p>
      </TooltipContent>
    </Tooltip>
  )
}
