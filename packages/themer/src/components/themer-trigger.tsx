"use client"

// The floating button that opens the editor; ThemerRoot mounts it. Hidden
// below `sm` (themer-trigger.test.tsx).

import * as React from "react"
import { Paintbrush } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { useThemerUIStore } from "../stores/themer-ui-store"
import { useThemerContext } from "../hooks/use-themer-context"
import { SHORTCUTS, Z_INDEX } from "../config/constants"
import { ActionButton } from "./ui/action-button"

/**
 * Floating button to open the themer, in the bottom-end corner, 16px from
 * both edges.
 */
export function ThemerTrigger() {
  const { config } = useThemerContext()
  const isOpen = useThemerUIStore((state) => state.isOpen)
  const toggle = useThemerUIStore((state) => state.toggle)

  if (!config.showTrigger || isOpen) {
    return null
  }

  return (
    <ActionButton
      label="Open Themer"
      shortcut={config.shortcut ?? SHORTCUTS.toggle}
      variant="outline"
      size="icon"
      data-themer-trigger
      data-testid="themer-trigger"
      onClick={toggle}
      className={cn(
        // size-12, not h-12 w-12: tailwind-merge only drops the Button's
        // own size-8 for another size-*; with h/w it stays, and wins wherever
        // the Host app's stylesheet lacks w-12 (the CMS), squashing the
        // circle to 32×48.
        "fixed end-4 bottom-4 size-12 rounded-full shadow-lg",
        "bg-background/80 backdrop-blur-sm",
        "transition-transform hover:scale-105",
        "hidden sm:inline-flex"
      )}
      style={{ zIndex: config.zIndex ?? Z_INDEX.trigger }}
    >
      <Paintbrush className="size-5" />
    </ActionButton>
  )
}
