"use client"

// The desktop editor's right-hand pane: the action bar above the preview tabs
// (built-in tabs merged with ThemerConfig.previewTabs).
//
// Contract: `data-lenis-prevent` (native scrolling in a host that runs Lenis;
// see LenisPause) sits on the preview scroller itself, not on the wrapper
// around it.
//
// See: packages/themer/ARCHITECTURE.md (Preview System).

import { cn } from "@workspace/ui/lib/utils"
import { ActionBar } from "../action-bar"
import { PreviewTabs } from "../preview/preview-tabs"
import { usePreviewTabs } from "../preview/use-preview-tabs"
import { useThemerUIStore } from "../../stores/themer-ui-store"

/**
 * Right preview panel with action bar.
 *
 * The padding follows the tab PreviewTabs actually shows (usePreviewTabs),
 * tighter around a tab that fills its area edge to edge (`bare`: Live). In
 * fullscreen the fixed preview covers the action bar; the bar is `inert`
 * then, so keyboard focus cannot land on hidden controls.
 */
export function PreviewPanel() {
  const isFullscreen = useThemerUIStore((state) => state.fullscreenPreview)
  const { activeTab } = usePreviewTabs()

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div inert={isFullscreen} className="contents">
        <ActionBar />
      </div>

      {/* Wrapper: no data-lenis-prevent here; the scroller inside carries it. */}
      <div className="relative min-h-0 flex-1">
        <div
          data-testid="themer-preview-scroll"
          className={cn(
            "absolute inset-0 overflow-y-auto",
            activeTab?.bare ? "px-2 pt-2 pb-6" : "px-6 pt-2 pb-6"
          )}
          data-lenis-prevent
        >
          <PreviewTabs />
        </div>
      </div>
    </div>
  )
}
