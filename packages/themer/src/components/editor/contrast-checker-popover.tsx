"use client";

// The contrast checker as a dialog (the file is still named "popover"). The
// action bar opens it controlled (`open`, from its own Contrast checker
// button).
//
// See: packages/themer/ARCHITECTURE.md (Contrast Checker).

import * as React from "react";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { ContrastChecker } from "./contrast-checker";

interface ContrastCheckerDialogProps {
  /** Custom button props for the trigger */
  buttonProps?: React.ComponentProps<typeof Button>;
  /** Custom children for the trigger button */
  children?: React.ReactNode;
  /** Controlled open state, for a dialog opened from elsewhere. */
  open?: boolean;
  /** Called when the dialog asks to open or close. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Inline on purpose: the primitive's `sm:max-w-sm` sits in the host's
 * utilities layer, which outranks the editor's own layer, so a width utility
 * that only the editor uses (here `sm:max-w-lg`) would lose and clip the list.
 */
const CONTRAST_DIALOG_STYLE: React.CSSProperties = {
  maxWidth: "min(32rem, calc(100% - 2rem))",
};

/**
 * Contrast checker as a dialog. Uncontrolled, it renders its own trigger
 * (shaped by `buttonProps` and `children`); controlled through `open` and
 * `onOpenChange`, as the action bar does, it renders a trigger only when
 * given `buttonProps` or `children`.
 */
export function ContrastCheckerDialog({
  buttonProps,
  children,
  open,
  onOpenChange,
}: ContrastCheckerDialogProps) {
  // Focus the dialog itself on open, not its first control (the mode toggle),
  // which would otherwise open with a focus ring on "Light".
  const popupRef = React.useRef<HTMLDivElement>(null);
  const hasTrigger =
    open === undefined || children !== undefined || buttonProps !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {hasTrigger ? (
        <DialogTrigger
          render={<Button variant="ghost" size="sm" {...buttonProps} />}
        >
          {children ?? (
            <>
              <Eye aria-hidden className="size-4" />
              Contrast Checker
            </>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent
        ref={popupRef}
        initialFocus={popupRef}
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
  );
}
