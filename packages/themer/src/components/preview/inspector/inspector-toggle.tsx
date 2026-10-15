"use client";

// The inspector's on/off toggle, shared by the Preview tabs (Workspace) and
// the in-place Themer layouts' headers (page-inspector.tsx). A disabled
// toggle keeps a tooltip that says why.

import { Inspect } from "lucide-react";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { formatShortcut } from "../../../hooks/use-keyboard-shortcut";

const INSPECTOR_SHORTCUT = formatShortcut("ctrl+i");

export function InspectorToggle({
  pressed,
  available = true,
  blockedReason,
  onToggle,
  size = "sm",
  "data-testid": testId,
}: {
  pressed: boolean;
  available?: boolean;
  /** Tooltip of a disabled toggle. */
  blockedReason?: string;
  onToggle: () => void;
  /** `default` matches icon Buttons, as in the Toolbar's ButtonGroup. */
  size?: "sm" | "default";
  "data-testid"?: string;
}) {
  const toggle = (
    <Toggle
      size={size}
      pressed={pressed}
      onPressedChange={onToggle}
      disabled={!available}
      aria-label="Inspector"
      data-testid={testId}
    >
      <Inspect />
      {/* Hidden on a collapsed sidebar rail, which is one icon wide. */}
      {pressed && (
        <span className="text-xs tracking-wide uppercase group-data-[collapsible=icon]:hidden">
          on
        </span>
      )}
    </Toggle>
  );

  return (
    <Tooltip>
      {/* A disabled button gets no pointer events: hover the wrapper. */}
      {/* react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- Base UI's Toggle cannot stay focusable while disabled, so this wrapper is what keeps the disabled reason's tooltip reachable by keyboard */}
      <TooltipTrigger render={available ? toggle : <span tabIndex={0} />}>
        {available ? undefined : toggle}
      </TooltipTrigger>
      <TooltipContent>
        {available ? `Inspector (${INSPECTOR_SHORTCUT})` : blockedReason}
      </TooltipContent>
    </Tooltip>
  );
}
