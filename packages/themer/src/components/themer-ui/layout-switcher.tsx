"use client";

// The Themer layout switcher, in the header of every desktop layout: a menu
// of the implemented layouts (THEMER_LAYOUTS), each with its icon; the
// trigger shows the current one. Picking one saves it as the user's choice
// (the `layout` preference), which wins over the Host's default.

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useThemerLayout } from "../../hooks/use-themer-layout";
import { usePreferencesStore } from "../../stores/preferences-store";
import { isThemerLayout, THEMER_LAYOUTS } from "./layouts/registry";

const LAYOUT_ENTRIES = Object.entries(THEMER_LAYOUTS) as [
  keyof typeof THEMER_LAYOUTS,
  (typeof THEMER_LAYOUTS)[keyof typeof THEMER_LAYOUTS],
][];

export function LayoutSwitcher() {
  const layout = useThemerLayout();
  const setLayout = usePreferencesStore((state) => state.setLayout);
  const current = THEMER_LAYOUTS[layout];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Themer layout: ${current.label}`}
          >
            <current.icon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Layout</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={layout}
            onValueChange={(value) => {
              if (isThemerLayout(value)) setLayout(value);
            }}
          >
            {LAYOUT_ENTRIES.map(([id, definition]) => (
              <DropdownMenuRadioItem key={id} value={id}>
                <definition.icon />
                {definition.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
