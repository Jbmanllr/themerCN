"use client"

// Workspace's top strip over the preview pane: sidebar trigger, a "Preview"
// label, the layout switcher and the close button. WorkspaceLayout unmounts
// it in fullscreen preview.

import { X } from "lucide-react"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { ActionButton } from "../ui/action-button"
import { LayoutSwitcher } from "./layout-switcher"

interface ThemerHeaderProps {
  onClose: () => void
}

/**
 * Workspace's header: sidebar trigger and "Preview" label on the left, the
 * layout switcher and Close on the right. Fixed height h-12, matching the
 * sidebar header.
 */
export function ThemerHeader({ onClose }: ThemerHeaderProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="text-sm font-medium">Preview</span>
      </div>
      <div className="flex items-center gap-1">
        <LayoutSwitcher />
        <ActionButton label="Close Themer" onClick={onClose}>
          <X />
        </ActionButton>
      </div>
    </div>
  )
}
