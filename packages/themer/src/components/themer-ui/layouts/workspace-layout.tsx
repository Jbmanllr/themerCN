"use client";

// Workspace: the Themer layout that covers the whole page, the sidebar beside
// the Preview. The only layout with Preview tabs, inspector and fullscreen
// preview.
//
// Contract: the container must not clip overflow (no `overflow-hidden`,
// `transform` or `contain`): popups position against the viewport.

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { useThemerUIStore } from "../../../stores/themer-ui-store";
import { ThemerSidebar } from "../../themer-sidebar";
import { ThemerHeader } from "../themer-header";
import { PreviewPanel } from "../preview-panel";
import { ThemerSidebarProvider } from "../themer-sidebar-provider";
import type { ThemerLayoutProps } from "./types";

/**
 * Fullscreen preview: the preview tabs cover the rest of the Themer UI
 * (PreviewTabs goes `fixed`), and the sidebar and header unmount so focus
 * cannot reach hidden chrome. The preview subtree keeps its position in the
 * tree, so the Live frame is not reloaded.
 */
export function WorkspaceLayout({ onClose, zIndex }: ThemerLayoutProps) {
  const isFullscreen = useThemerUIStore((state) => state.fullscreenPreview);

  return (
    <div
      data-themer-ui
      data-themer-layout="workspace"
      data-testid="themer-ui"
      className="bg-background fixed inset-0"
      style={{ zIndex }}
    >
      <ThemerSidebarProvider>
        {!isFullscreen && <ThemerSidebar onClose={onClose} />}
        <SidebarInset className="flex flex-col">
          {!isFullscreen && <ThemerHeader onClose={onClose} />}
          <PreviewPanel />
        </SidebarInset>
      </ThemerSidebarProvider>
    </div>
  );
}
