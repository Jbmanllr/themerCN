"use client";

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified by Banter.
// Source: components/editor/inspector-overlay.tsx.
//
// Highlight box and class card for the inspector. tweakcn opens a HoverCard
// anchored to the box; a HoverCard popup portals out of the preview area, so
// this renders an absolutely positioned card in the same container as the box
// (`useInspector` measures rects relative to it). The layer ignores the
// pointer; only the card takes it, so the pointer can reach the class buttons
// once a click has pinned the card.

import { memo } from "react";
import { Inspect, Pin } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { InspectorClassItem } from "./inspector-class-item";
import { INSPECTOR_CARD_ATTRIBUTE, type InspectorState } from "./use-inspector";

const CARD_WIDTH = 288; // w-72
const GAP = 8;
/** Below this much room above the element, the card goes underneath. */
const MIN_ROOM_ABOVE = 140;

const cardAttributes = { [INSPECTOR_CARD_ATTRIBUTE]: "" };

export const InspectorOverlay = memo(function InspectorOverlay({
  state,
  onFocusColor,
}: {
  state: InspectorState;
  onFocusColor: (colorKey: string) => void;
}) {
  const { rect, classes, bounds, pinned } = state;
  if (!rect || classes.length === 0) return null;

  const above = rect.top >= MIN_ROOM_ABOVE;
  const left = Math.max(
    GAP,
    Math.min(rect.left, bounds.width - CARD_WIDTH - GAP),
  );
  const top = above
    ? rect.top - GAP
    : Math.min(
        rect.top + rect.height + GAP,
        Math.max(GAP, bounds.height - GAP),
      );

  return (
    <div
      data-testid="themer-inspector-overlay"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        className="ring-primary bg-primary/10 absolute rounded-[2px] ring-2 transition-all duration-100 ease-out"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
      <div
        {...cardAttributes}
        className={cn(
          "bg-popover/90 text-popover-foreground pointer-events-auto absolute w-72 max-w-[calc(100%-1rem)] rounded-lg border shadow-xl backdrop-blur-lg",
          above && "-translate-y-full",
        )}
        style={{ top, left }}
      >
        <div className="text-muted-foreground flex items-center gap-1.5 px-2 pt-2 text-sm">
          <Inspect className="size-4" aria-hidden />
          <span className="flex-1">Inspector</span>
          {pinned ? (
            <span className="flex items-center gap-1 text-xs">
              <Pin className="size-3" aria-hidden />
              Pinned · Esc
            </span>
          ) : (
            <span className="text-xs">Click to pin</span>
          )}
        </div>
        <Separator className="my-1" />
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto px-1 pb-2">
          {classes.map((className) => (
            <InspectorClassItem
              key={className}
              className={className}
              onFocusColor={onFocusColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
