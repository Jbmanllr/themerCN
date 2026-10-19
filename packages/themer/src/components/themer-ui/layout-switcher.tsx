"use client"

// The Themer layout switcher, in the header of every desktop layout: a menu
// of the implemented layouts (THEMER_LAYOUTS in config/themer-layouts.ts),
// each with its icon; the trigger shows the current one. Picking one saves it
// as the user's choice (the `layout` preference), which wins over the Host's
// default.

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  useSetThemerLayout,
  useThemerLayout,
} from "../../hooks/use-themer-layout"
import { isThemerLayout, THEMER_LAYOUTS } from "../../config/themer-layouts"

const LAYOUT_ENTRIES = Object.entries(THEMER_LAYOUTS) as [
  keyof typeof THEMER_LAYOUTS,
  (typeof THEMER_LAYOUTS)[keyof typeof THEMER_LAYOUTS],
][]

export function LayoutSwitcher() {
  const layout = useThemerLayout()
  const current = THEMER_LAYOUTS[layout]

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
          <DropdownMenuLabel>Themer layout</DropdownMenuLabel>
          <LayoutRadioGroup />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The layouts as radio items, the current one checked; picking one saves it
 * and turns the inspector off (useSetThemerLayout).
 * The switcher's menu draws it, and Toolbar's overflow menu in a submenu.
 */
export function LayoutRadioGroup() {
  const layout = useThemerLayout()
  const setLayout = useSetThemerLayout()

  return (
    <DropdownMenuRadioGroup
      value={layout}
      onValueChange={(value) => {
        if (isThemerLayout(value)) setLayout(value)
      }}
    >
      {LAYOUT_ENTRIES.map(([id, definition]) => (
        <DropdownMenuRadioItem key={id} value={id} closeOnClick>
          <definition.icon />
          {definition.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
