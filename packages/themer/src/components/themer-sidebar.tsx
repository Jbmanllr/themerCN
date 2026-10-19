"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { CollapsedNavigation, ExpandedContent } from "./sidebar"

interface ThemerSidebarProps {
  onClose: () => void
  /**
   * Controls placed before the Close button, for a layout with no header of
   * its own (Overlay). The collapsed rail stacks them above Close.
   */
  headerActions?: ReactNode
  /** Rendered after the panels, for a layout with no action bar of its own. */
  footer?: ReactNode
}

/**
 * The Themer UI's control sidebar, a stock @workspace/ui Sidebar in `icon`
 * collapsible mode.
 * - Expanded: preset picker and the horizontal panel tabs (ExpandedContent)
 * - Collapsed: a vertical icon menu (CollapsedNavigation)
 *
 * The Close button is a plain Button with its own Tooltip, not ActionButton:
 * the tooltip shows only beside the collapsed rail, where the "Themer"
 * title is hidden (themer-sidebar.test.tsx).
 */
export function ThemerSidebar({
  onClose,
  headerActions,
  footer,
}: ThemerSidebarProps) {
  // The tooltip renders in a portal, outside the sidebar's `group`, so it is
  // shown from the sidebar state (as the stock SidebarMenuButton does).
  const { state, isMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      {/* Header - fixed height, matches content header */}
      <SidebarHeader
        className={cn(
          "h-12 shrink-0 border-b p-0",
          headerActions && "group-data-[collapsible=icon]:h-auto"
        )}
      >
        <div
          className={cn(
            "flex h-full items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
            headerActions &&
              "gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:py-2"
          )}
        >
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Themer
          </span>
          {headerActions && (
            <div className="ms-auto flex items-center gap-1 group-data-[collapsible=icon]:ms-0 group-data-[collapsible=icon]:flex-col">
              {headerActions}
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close Themer"
                >
                  <X />
                </Button>
              }
            />
            <TooltipContent
              side="right"
              hidden={state !== "collapsed" || isMobile}
            >
              Close Themer
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarInnerContent />
      </SidebarContent>

      {footer}

      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Inner content that switches between expanded and collapsed views
 */
function SidebarInnerContent() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (isCollapsed) {
    return <CollapsedNavigation />
  }

  return <ExpandedContent />
}
