"use client";

// The desktop editor's right-hand pane: the action bar above the preview tabs
// (built-in tabs merged with ThemerConfig.previewTabs).
//
// Contract: `data-lenis-prevent` (native scrolling in a host that runs Lenis;
// see LenisPause) sits on the preview scroller itself, not on the wrapper
// around it.
//
// See: packages/themer/ARCHITECTURE.md (Preview System).

import * as React from "react";
import { cn } from "@villa/ui/lib/utils";
import { ActionBar } from "../action-bar";
import { PreviewTabs } from "../preview/preview-tabs";
import { BUILTIN_TABS } from "../preview/builtin-tabs";
import {
  mergePreviewTabs,
  resolveActiveTabId,
} from "../preview/preview-tab-registry";
import { useThemerContext } from "../themer-provider";
import { usePreferencesStore } from "../../stores/preferences-store";
import { useOverlayStore } from "../../stores/overlay-store";

/**
 * Right preview panel with action bar.
 *
 * The padding follows the tab PreviewTabs actually shows (an unknown saved
 * id resolves to the first tab, as there), not the raw saved id. In
 * fullscreen the fixed preview covers the action bar; the bar is `inert`
 * then, so keyboard focus cannot land on hidden controls.
 */
export function PreviewPanel() {
  const previewTab = usePreferencesStore((state) => state.previewTab);
  const isFullscreen = useOverlayStore((state) => state.fullscreenPreview);
  const { config } = useThemerContext();
  const tabs = React.useMemo(
    () => mergePreviewTabs(BUILTIN_TABS, config.previewTabs),
    [config.previewTabs],
  );
  const isLivePreview = resolveActiveTabId(tabs, previewTab) === "live";

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
            isLivePreview ? "px-2 pt-2 pb-6" : "px-6 pt-2 pb-6",
          )}
          data-lenis-prevent
        >
          <PreviewTabs />
        </div>
      </div>
    </div>
  );
}
