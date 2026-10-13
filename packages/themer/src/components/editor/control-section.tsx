"use client";

// One collapsible section for every editor panel. Open state:
// - with an `id`, it lives in the preferences store (`sectionStates`), so
//   it persists and focusColor can open a section from outside;
// - without one, it is local state;
// - `forceOpen` (search matches) shows it open without changing what is
//   stored, so clearing the search restores the user's layout.
// The content stays mounted while closed (`keepMounted`) so colour pickers
// stay registered for focus jumps; Base UI hides the closed panel.
// Children can read and set the open state through SectionContext
// (section-context.ts).

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@villa/ui/components/collapsible";
import { cn } from "@villa/ui/lib/utils";
import { usePreferencesStore } from "../../stores/preferences-store";
import { SectionContext } from "./section-context";

interface ControlSectionProps {
  /** Persisted open-state key; without it the state is local. */
  id?: string;
  title: string;
  description?: string;
  /** Open state when nothing is stored for `id`. */
  defaultOpen?: boolean;
  /** Show open regardless of the stored state (e.g. a search match). */
  forceOpen?: boolean;
  /** Control shown at the end of the header, outside the toggle button. */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Collapsible section wrapper for editor controls (tweakcn styling: rounded
 * border, background header with hover state).
 */
export function ControlSection({
  id,
  title,
  description,
  defaultOpen = false,
  forceOpen = false,
  headerAction,
  children,
  className,
}: ControlSectionProps) {
  const storedOpen = usePreferencesStore((state) =>
    id === undefined ? undefined : state.sectionStates[id],
  );
  const setSectionOpen = usePreferencesStore((state) => state.setSectionOpen);
  const [localOpen, setLocalOpen] = React.useState(defaultOpen);

  const isOpen =
    forceOpen || (id === undefined ? localOpen : (storedOpen ?? defaultOpen));

  const setIsExpanded = React.useCallback(
    (open: boolean) => {
      if (id === undefined) setLocalOpen(open);
      else setSectionOpen(id, open);
    },
    [id, setSectionOpen],
  );

  const contextValue = React.useMemo(
    () => ({ isExpanded: isOpen, setIsExpanded }),
    [isOpen, setIsExpanded],
  );

  return (
    <SectionContext.Provider value={contextValue}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsExpanded}
        className={cn("mb-4 overflow-hidden rounded-lg border", className)}
      >
        <div className="bg-background hover:bg-muted flex items-center gap-2 pe-3 transition-colors">
          <h3 className="flex min-w-0 flex-1">
            <CollapsibleTrigger className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 py-3 ps-3 text-start outline-none focus-visible:underline">
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                {description && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {description}
                  </span>
                )}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
          </h3>
          {headerAction}
        </div>
        <CollapsibleContent
          keepMounted
          className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0"
        >
          <div className="bg-background border-t p-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </SectionContext.Provider>
  );
}
