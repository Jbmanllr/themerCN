"use client";

// Push: the Themer layout where the sidebar sits beside the Host app's real
// page and shifts it aside instead of covering it. The Themer never wraps the
// Host tree (ADR 0001), so there is no SidebarInset: the page moves by a
// margin on <html>.
//
// Contract:
// - While open on desktop, <html> gets `margin-inline-start` and
//   `--themer-inset-inline-start` set to the sidebar's width (expanded or
//   collapsed), and a 200ms linear margin transition matching the sidebar's.
//   All three are removed when the layout unmounts: close, a switch to
//   another layout, the drawer below 1280 px, the Themer unmounted.
// - Accepted limits: the Host's `position: fixed` elements stay on the
//   viewport unless they opt in with
//   `left: var(--themer-inset-inline-start, 0)`; the viewport does not
//   shrink, so breakpoints and viewport units do not react.
// - Otherwise as Overlay: same sidebar, header and stacked actions, the
//   inspector on the real page; no Preview, no page pause.

import * as React from "react";
import {
  SidebarFooter,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { SIDEBAR_WIDTHS } from "../../../config/constants";
import { usePreferencesStore } from "../../../stores/preferences-store";
import { ActionBar } from "../../action-bar";
import { ThemerSidebar } from "../../themer-sidebar";
import { LayoutSwitcher } from "../layout-switcher";
import { PageInspector, PageInspectorToggle } from "../page-inspector";
import { ThemerSidebarProvider } from "../themer-sidebar-provider";
import type { ThemerLayoutProps } from "./types";

/** The variable fixed Host elements opt in with (README, "Push"). */
const INSET_VARIABLE = "--themer-inset-inline-start";

/**
 * Shifts the Host page aside by `width` (margin-inline-start on <html>, with
 * the sidebar's own 200ms linear width transition) and exposes `width` as
 * INSET_VARIABLE, until the layout unmounts (close, switch, the drawer below
 * 1280 px, the Themer unmounted).
 */
function usePageInset(width: string) {
  React.useLayoutEffect(() => {
    const html = document.documentElement.style;
    html.setProperty(INSET_VARIABLE, width);
    html.setProperty("margin-inline-start", width);
    html.setProperty("transition", "margin-inline-start 200ms linear");
    return () => {
      html.removeProperty(INSET_VARIABLE);
      html.removeProperty("margin-inline-start");
      html.removeProperty("transition");
    };
  }, [width]);
}

export function PushLayout({ onClose, zIndex }: ThemerLayoutProps) {
  const sidebarCollapsed = usePreferencesStore(
    (state) => state.sidebarCollapsed,
  );
  const width = sidebarCollapsed
    ? SIDEBAR_WIDTHS.collapsed
    : SIDEBAR_WIDTHS.expanded;

  usePageInset(width);

  return (
    <div
      data-themer-ui
      data-themer-layout="push"
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
