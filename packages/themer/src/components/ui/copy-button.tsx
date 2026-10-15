"use client";

// The editor's copy-to-clipboard button (the palette preview's per-colour
// copy). It names itself for assistive technology and reports the copy
// through its label, a tooltip and optionally a toast.
//
// Contract: the click never reaches a clickable parent (stopPropagation); the
// caller's `onClick` runs only after the text reached the clipboard (when the
// Clipboard API is missing or refuses, it does not run and the button stays
// idle); the copied label overrides a caller's `aria-label` while the
// feedback shows (copy-button.test.tsx).

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useCopyFeedback } from "../../hooks/use-copy-feedback";

type ButtonClickEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Button>["onClick"]>
>[0];

export interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  /** Text to copy to clipboard */
  textToCopy: string;
  /** Show tooltip feedback when copied (default: true) */
  showFeedbackTooltip?: boolean;
  /** Show toast notification when copied (default: false) */
  showFeedbackToast?: boolean;
  /**
   * How long the copied state (its tooltip and the "Copied" label) shows, in
   * milliseconds (default: 3000). Without `showFeedbackTooltip` it lasts 1200.
   */
  tooltipDuration?: number;
  /** Custom tooltip message (default: "Copied!") */
  tooltipMessage?: string;
  /** Custom toast message (default: "Copied to clipboard") */
  toastMessage?: string;
  /** Custom children to render. If not provided, shows "Copy" / "Copied" */
  children?: React.ReactNode;
}

/**
 * Copies `textToCopy` on click. Feedback: the tooltip (on by default) and an
 * optional toast (off by default; it also reports a failed copy).
 */
export function CopyButton({
  textToCopy,
  className,
  children,
  showFeedbackTooltip = true,
  showFeedbackToast = false,
  tooltipDuration = 3000,
  tooltipMessage = "Copied!",
  toastMessage = "Copied to clipboard",
  onClick,
  "aria-label": ariaLabel,
  ...buttonProps
}: CopyButtonProps) {
  const [copied, copy] = useCopyFeedback(
    showFeedbackTooltip ? tooltipDuration : 1200,
  );

  const handleCopy = React.useCallback(
    async (event: ButtonClickEvent) => {
      event.stopPropagation();

      if (!(await copy(textToCopy))) {
        if (showFeedbackToast) {
          toast.error("Failed to copy to clipboard");
        }
        return;
      }

      if (showFeedbackToast) {
        toast.success(toastMessage);
      }

      onClick?.(event);
    },
    [copy, textToCopy, showFeedbackToast, toastMessage, onClick],
  );

  const buttonContent = children ?? (copied ? "Copied" : "Copy");

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
      {buttonContent}
    </Button>
  );

  // The tooltip is controlled by `copied` alone (the no-op onOpenChange
  // drops hover and focus), so it appears only as copy feedback.
  if (showFeedbackTooltip) {
    return (
      <Tooltip open={copied} onOpenChange={() => {}}>
        <TooltipTrigger render={button}></TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
