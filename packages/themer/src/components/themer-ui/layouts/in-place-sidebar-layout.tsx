"use client";

// The sidebar Themer layouts that sit on the Host app's real page, Overlay
// and Push: the sidebar on the left, the page usable beside it (ADR 0001: it
// renders beside the Host tree and never wraps it). Push adds its page inset
// (push-layout.tsx); this file holds everything they share.
//
// Contract:
// - The container covers only the sidebar's width (it shrinks to the
//   sidebar's gap), so clicks and scrolling reach the page beside it.
// - No Preview, no SidebarInset, no page pause or scroll lock.
// - Its header is the sidebar's: collapse toggle, inspector toggle, layout
//   switcher, Close. The actions Workspace shows above its preview
//   (undo/redo, mode, Code, …) sit at the foot of the expanded sidebar. The
//   collapsed rail hides that footer, so its header adds a "More actions"
//   menu with the same actions (ThemerActionsMenu).
// - The inspector works on the real page (PageInspector).
// - Like Workspace, it must not clip overflow: popups position against the
//   viewport.

import {
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { ActionBar } from "../../action-bar";
import { ThemerActionsMenu } from "../../actions/themer-actions";
import { ThemerSidebar } from "../../themer-sidebar";
import { LayoutSwitcher } from "../layout-switcher";
import { PageInspector, PageInspectorToggle } from "../page-inspector";
import { ThemerSidebarProvider } from "../themer-sidebar-provider";
import type { ThemerLayoutProps } from "./types";

export function InPlaceSidebarLayout({
  layout,
  onClose,
  zIndex,
}: ThemerLayoutProps & { layout: "overlay" | "push" }) {
  return (
    <div
      data-themer-ui
      data-themer-layout={layout}
      data-testid="themer-ui"
      className="fixed inset-y-0 left-0"
      style={{ zIndex }}
    >
      <PageInspector />
      <ThemerSidebarProvider className="min-h-0 w-auto">
        <ThemerSidebar
          onClose={onClose}
          headerActions={
            <>
              <SidebarTrigger />
              <PageInspectorToggle />
              <LayoutSwitcher />
              <CollapsedRailActions />
            </>
          }
          footer={
            <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
              <ActionBar variant="stacked" />
            </SidebarFooter>
          }
        />
      </ThemerSidebarProvider>
    </div>
  );
}

/**
 * The footer's actions as a menu, only on the collapsed rail (the footer is
 * hidden there); it opens beside the rail.
 */
function CollapsedRailActions() {
  const { state } = useSidebar();
  if (state !== "collapsed") return null;
  return <ThemerActionsMenu withHistory side="right" align="start" />;
}
