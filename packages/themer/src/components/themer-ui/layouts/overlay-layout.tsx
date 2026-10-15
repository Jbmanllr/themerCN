"use client";

// Overlay: the Themer layout where the sidebar floats over the Host app's
// real page, on the left, and the page stays usable beside it (ADR 0001:
// it renders beside the Host tree and never wraps it).
//
// Contract:
// - The container covers only the sidebar's width (it shrinks to the
//   sidebar's gap), so clicks and scrolling reach the page beside it.
// - No Preview, no SidebarInset, no page pause or scroll lock.
// - Its header is the sidebar's: collapse toggle, layout switcher, Close.
//   The actions Workspace shows above its preview (undo/redo, mode, Code, …)
//   sit at the foot of the expanded sidebar.
// - Like Workspace, it must not clip overflow: popups position against the
//   viewport.

import {
  SidebarFooter,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { ActionBar } from "../../action-bar";
import { ThemerSidebar } from "../../themer-sidebar";
import { LayoutSwitcher } from "../layout-switcher";
import { ThemerSidebarProvider } from "../themer-sidebar-provider";
import type { ThemerLayoutProps } from "./types";

export function OverlayLayout({ onClose, zIndex }: ThemerLayoutProps) {
  return (
    <div
      data-themer-ui
      data-themer-layout="overlay"
      data-testid="themer-ui"
      className="fixed inset-y-0 left-0"
      style={{ zIndex }}
    >
      <ThemerSidebarProvider className="min-h-0 w-auto">
        <ThemerSidebar
          onClose={onClose}
          headerActions={
            <>
              <SidebarTrigger />
              <LayoutSwitcher />
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
