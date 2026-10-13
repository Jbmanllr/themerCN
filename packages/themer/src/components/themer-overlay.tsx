"use client";

// The editor's UI: a full-viewport overlay on desktop, a Drawer below
// breakpoints.wide (1280px, hooks/use-is-mobile.ts). Renders nothing while
// closed. ThemerRoot mounts it in a portal on document.body.
//
// Contract:
// - Never drop `data-themer-overlay` from the desktop container:
//   host/themer.css keys on `body:has([data-themer-overlay])` to lift every
//   Base UI popup above it.
// - The layer is `config.zIndex`, else Z_INDEX.sidebar (config/constants.ts).
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react";
import { SidebarProvider, SidebarInset } from "@villa/ui/components/sidebar";
import { useOverlayStore } from "../stores/overlay-store";
import { usePreferencesStore } from "../stores/preferences-store";
import { useThemerContext } from "./themer-provider";
import { useIsMobile } from "../hooks/use-is-mobile";
import { Z_INDEX, SIDEBAR_WIDTHS } from "../config/constants";
import { ThemerSidebar } from "./themer-sidebar";
import { MobileDrawer } from "./overlay/mobile-drawer";
import { ThemerHeader } from "./overlay/themer-header";
import { PreviewPanel } from "./overlay/preview-panel";
import { useFullscreenSync } from "../hooks/use-fullscreen";

const getFullscreen = () => useOverlayStore.getState().fullscreenPreview;
const setFullscreen = (fullscreenPreview: boolean) =>
  useOverlayStore.setState({ fullscreenPreview });

/**
 * Main overlay component with collapsible sidebar (shadcn Sidebar pattern)
 * Left panel: Collapsible sidebar with panel controls
 * Right panel: Action bar + preview area
 *
 * Fullscreen preview: the preview tabs cover the overlay (PreviewTabs goes
 * `fixed`), and the sidebar and header unmount so focus cannot reach hidden
 * chrome. The preview subtree keeps its position in the tree, so the Live
 * frame is not reloaded.
 */
export function ThemerOverlay() {
  const isOpen = useOverlayStore((state) => state.isOpen);
  const close = useOverlayStore((state) => state.close);
  const isFullscreen = useOverlayStore((state) => state.fullscreenPreview);
  const { config } = useThemerContext();
  const isMobile = useIsMobile();
  const sidebarCollapsed = usePreferencesStore(
    (state) => state.sidebarCollapsed,
  );
  const setSidebarCollapsed = usePreferencesStore(
    (state) => state.setSidebarCollapsed,
  );

  useFullscreenSync({
    enabled: isOpen && !isMobile,
    active: isFullscreen,
    getActive: getFullscreen,
    setActive: setFullscreen,
  });

  if (!isOpen) {
    return null;
  }

  if (isMobile) {
    return <MobileDrawer isOpen={isOpen} onClose={close} />;
  }

  return (
    <div
      data-themer-overlay
      data-testid="themer-overlay"
      className="bg-background fixed inset-0"
      style={{ zIndex: config.zIndex ?? Z_INDEX.sidebar }}
    >
      <SidebarProvider
        open={!sidebarCollapsed}
        onOpenChange={(open) => setSidebarCollapsed(!open)}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTHS.expanded,
            "--sidebar-width-icon": SIDEBAR_WIDTHS.collapsed,
          } as React.CSSProperties
        }
      >
        {!isFullscreen && <ThemerSidebar onClose={close} />}
        <SidebarInset className="flex flex-col">
          {!isFullscreen && <ThemerHeader onClose={close} />}
          <PreviewPanel />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
