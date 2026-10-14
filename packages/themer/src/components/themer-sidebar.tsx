"use client";

import { X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { CollapsedNavigation, ExpandedContent } from "./sidebar";

interface ThemerSidebarProps {
  onClose: () => void;
}

/**
 * The editor's control sidebar, a stock @workspace/ui Sidebar in `icon`
 * collapsible mode.
 * - Expanded: preset picker and the horizontal panel tabs (ExpandedContent)
 * - Collapsed: a vertical icon menu (CollapsedNavigation)
 *
 * The Close button is a plain Button with its own Tooltip, not ActionButton:
 * the tooltip shows only beside the collapsed rail, where the "Theme Editor"
 * title is hidden (themer-sidebar.test.tsx).
 */
export function ThemerSidebar({ onClose }: ThemerSidebarProps) {
  // The tooltip renders in a portal, outside the sidebar's `group`, so it is
  // shown from the sidebar state (as the stock SidebarMenuButton does).
  const { state, isMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* Header - fixed height, matches content header */}
      <SidebarHeader className="h-12 shrink-0 border-b p-0">
        <div className="flex h-full items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Theme Editor
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close theme editor"
                >
                  <X />
                </Button>
              }
            />
            <TooltipContent
              side="right"
              hidden={state !== "collapsed" || isMobile}
            >
              Close Theme Editor
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarInnerContent />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

/**
 * Inner content that switches between expanded and collapsed views
 */
function SidebarInnerContent() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return <CollapsedNavigation />;
  }

  return <ExpandedContent />;
}
