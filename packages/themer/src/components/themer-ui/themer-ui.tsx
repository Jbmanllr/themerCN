"use client";

// The editor's UI: full-viewport on desktop, a Drawer below
// breakpoints.wide (1280px, hooks/use-is-mobile.ts). Renders nothing while
// closed. ThemerRoot mounts it in a portal on document.body, inside the
// Themer's `[data-themer]` scope (themer-scope.tsx).
//
// Contract:
// - The layer is `config.zIndex`, else Z_INDEX.sidebar (config/constants.ts).
//   Popups portal into ThemerScope's container one layer above.
// - The desktop container must not clip overflow (no `overflow-hidden`,
//   `transform` or `contain`): popups position against the viewport.
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react";
import { SidebarProvider, SidebarInset } from "@workspace/ui/components/sidebar";
import { useThemerUIStore } from "../../stores/themer-ui-store";
import { usePreferencesStore } from "../../stores/preferences-store";
import { useThemerContext } from "../themer-provider";
import { useIsMobile } from "../../hooks/use-is-mobile";
import { Z_INDEX, SIDEBAR_WIDTHS } from "../../config/constants";
import { ThemerSidebar } from "../themer-sidebar";
import { MobileDrawer } from "./mobile-drawer";
import { ThemerHeader } from "./themer-header";
import { PreviewPanel } from "./preview-panel";
import { useFullscreenSync } from "../../hooks/use-fullscreen";

const getFullscreen = () => useThemerUIStore.getState().fullscreenPreview;
const setFullscreen = (fullscreenPreview: boolean) =>
  useThemerUIStore.setState({ fullscreenPreview });

/**
 * The Themer UI, with a collapsible sidebar (shadcn Sidebar pattern)
 * Left panel: Collapsible sidebar with panel controls
 * Right panel: Action bar + preview area
 *
 * Fullscreen preview: the preview tabs cover the rest of the Themer UI (PreviewTabs goes
 * `fixed`), and the sidebar and header unmount so focus cannot reach hidden
 * chrome. The preview subtree keeps its position in the tree, so the Live
 * frame is not reloaded.
 */
export function ThemerUI() {
  const isOpen = useThemerUIStore((state) => state.isOpen);
  const close = useThemerUIStore((state) => state.close);
  const isFullscreen = useThemerUIStore((state) => state.fullscreenPreview);
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
      data-themer-ui
      data-testid="themer-ui"
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
