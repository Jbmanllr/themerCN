"use client"

// The editor's preview area: a data-driven tab list (built-in tabs from
// ./builtin-tabs plus the host's `ThemerConfig.previewTabs`), the inspector
// and the fullscreen controls.
//
// - The selected tab is persisted; an unknown id (removed host tab, old
//   build) shows the first tab, derived in render.
// - Only the active tab mounts. PreviewTabs subscribes to no theme state:
//   each tab subscribes to what it needs (the palette to styles, Live to the
//   whole theme it injects), so an edit does not re-render the demos.
// - Host tabs render inside `previewWrapper` so they get the host's providers
//   (the editor is portaled outside the host tree).
// - Inspector: toggle and Ctrl+I here; disabled on mobile and for a
//   cross-origin Live frame. Clicking a class focuses its colour control.
// - Fullscreen: this area goes `fixed` over the editor; ThemerUI unmounts
//   the sidebar and header. The light/dark toggle (ModeToggle) shows here
//   meanwhile, since the action bar is covered.
//
// See: packages/themer/ARCHITECTURE.md (Preview System)

import * as React from "react"
import { Maximize, Minimize, MoreVertical } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area"
import { Tabs, TabsContent, TabsList } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { useColorFocusTrigger } from "../../hooks/use-color-focus"
import { useIsMobile } from "../../hooks/use-is-mobile"
import { useInspectorMode } from "../../hooks/use-themer-layout"
import {
  themerShortcuts,
  useKeyboardShortcut,
} from "../../hooks/use-keyboard-shortcut"
import { useThemerUIStore } from "../../stores/themer-ui-store"
import { usePreferencesStore } from "../../stores/preferences-store"
import type { ThemerConfig } from "../../types"
import { useThemerContext } from "../../hooks/use-themer-context"
import { ActionButton } from "../ui/action-button"
import { ModeToggle } from "../ui/mode-toggle"
import { BUILTIN_TABS } from "./builtin-tabs"
import {
  InspectorOverlay,
  InspectorToggle,
  segmentClassName,
  useInspector,
} from "./inspector"
import {
  mergePreviewTabs,
  resolveActiveTabId,
  type PreviewTabDefinition,
} from "./preview-tab-registry"
import ExamplesPreviewContainer from "./theme-preview/examples-preview-container"
import TabsTriggerPill from "./theme-preview/tabs-trigger-pill"

export function PreviewTabs() {
  const { config } = useThemerContext()
  const { previewTabs, previewWrapper } = config
  const previewTab = usePreferencesStore((state) => state.previewTab)
  const setPreviewTab = usePreferencesStore((state) => state.setPreviewTab)
  const { active: inspectorMode, toggle: toggleInspector } = useInspectorMode()
  const isFullscreen = useThemerUIStore((state) => state.fullscreenPreview)
  const toggleFullscreen = useThemerUIStore((state) => state.toggleFullscreen)
  const isMobile = useIsMobile()
  const { focusColor } = useColorFocusTrigger()

  const tabs = React.useMemo(
    () => mergePreviewTabs(BUILTIN_TABS, previewTabs),
    [previewTabs]
  )
  const activeTabId = resolveActiveTabId(tabs, previewTab)
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const hostRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLElement>(null)

  const handlePick = React.useCallback(
    (className: string) => {
      const { value } = segmentClassName(className)
      if (value) focusColor(value)
    },
    [focusColor]
  )

  const isFrameTab = activeTab?.frame === true
  const { state: inspector, frameBlocked } = useInspector({
    enabled: inspectorMode && !isMobile,
    frame: isFrameTab,
    bindingKey: activeTabId,
    hostRef,
    containerRef,
    onPick: handlePick,
  })
  const inspectorAvailable = !isMobile && !(isFrameTab && frameBlocked)

  useKeyboardShortcut({
    key: themerShortcuts.inspector.key,
    modifiers: themerShortcuts.inspector.modifiers,
    callback: toggleInspector,
    enabled: inspectorAvailable,
  })

  const handleTabChange = React.useCallback(
    (value: unknown) => {
      if (typeof value === "string") setPreviewTab(value)
    },
    [setPreviewTab]
  )

  return (
    <Tabs
      value={activeTabId}
      onValueChange={handleTabChange}
      data-testid="themer-preview"
      data-fullscreen={isFullscreen ? "" : undefined}
      className={cn(
        "flex h-[calc(100vh-8rem)] min-h-[680px] flex-col overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 h-auto min-h-0 bg-background"
      )}
    >
      <div className="mt-2 mb-1 flex w-full items-center justify-between gap-2 overflow-x-auto px-4">
        <PreviewTabList
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
        />

        <div className="flex shrink-0 items-center gap-1">
          {isFullscreen && <ModeToggle size="icon-sm" />}
          <InspectorToggle
            pressed={inspectorMode && inspectorAvailable}
            available={inspectorAvailable}
            blockedReason={
              isMobile
                ? "The inspector needs a desktop layout"
                : "Pages from another origin cannot be inspected"
            }
            onToggle={toggleInspector}
            data-testid="themer-preview-inspector"
          />
          <ActionButton
            label={isFullscreen ? "Exit full screen" : "Full screen"}
            shortcut={isFullscreen ? "esc" : undefined}
            size="icon-sm"
            onClick={toggleFullscreen}
            data-testid="themer-preview-fullscreen"
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </ActionButton>
        </div>
      </div>

      <section
        ref={containerRef}
        className={cn(
          "relative size-full min-h-0 overflow-hidden",
          activeTab?.bare ? "p-0" : "p-4 pt-1"
        )}
      >
        <div
          ref={hostRef}
          className={cn(
            "relative isolate size-full min-h-0 overflow-hidden",
            !activeTab?.bare && "rounded-lg"
          )}
        >
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="m-0 size-full">
              {tab.id === activeTabId ? (
                <PreviewTabBody tab={tab} wrapper={previewWrapper} />
              ) : null}
            </TabsContent>
          ))}
        </div>
        <InspectorOverlay state={inspector} onFocusColor={focusColor} />
      </section>
    </Tabs>
  )
}

/**
 * One tab's content: Suspense for lazy tabs, the scroll mode, and the host
 * wrapper for host tabs. Memoised so PreviewTabs re-renders (inspector,
 * focus store) do not re-render the demo.
 */
const PreviewTabBody = React.memo(function PreviewTabBody({
  tab,
  wrapper: Wrapper,
}: {
  tab: PreviewTabDefinition
  wrapper: ThemerConfig["previewWrapper"]
}) {
  const Component = tab.component
  // A host tab is styled by the Host's CSS alone: `[data-themer-host]` is the
  // lower boundary of the Themer's @scope (themer-scope.tsx). It takes the
  // Host page's direction back from the Themer root's `dir="ltr"`.
  const content =
    tab.source === "host" ? (
      <div
        data-themer-host=""
        dir={document.documentElement.dir || undefined}
        style={{ display: "contents" }}
      >
        {Wrapper ? (
          <Wrapper>
            <Component />
          </Wrapper>
        ) : (
          <Component />
        )}
      </div>
    ) : (
      <Component />
    )

  return (
    <ExamplesPreviewContainer className="size-full">
      {tab.scroll === "none" ? (
        content
      ) : (
        <ScrollArea className="size-full">
          {content}
          {tab.scroll === "xy" && <ScrollBar orientation="horizontal" />}
        </ScrollArea>
      )}
    </ExamplesPreviewContainer>
  )
})

function PreviewTabList({
  tabs,
  activeTabId,
  onTabChange,
}: {
  tabs: readonly PreviewTabDefinition[]
  activeTabId: string
  onTabChange: (value: string) => void
}) {
  const menuTabs = tabs.filter((tab) => tab.inMenu)
  const activeMenuTab = menuTabs.find((tab) => tab.id === activeTabId)

  // The menu sits beside the tablist, not in it: a tablist may only own tabs,
  // and its arrow-key handling would otherwise catch the menu's keys.
  return (
    <div className="flex items-center gap-1">
      <TabsList
        data-testid="themer-preview-tabs"
        className="inline-flex w-fit items-center justify-center rounded-full bg-background px-0 text-muted-foreground"
      >
        {tabs
          .filter((tab) => !tab.inMenu)
          .map((tab) => (
            <TabsTriggerPill
              key={tab.id}
              data-testid={`themer-preview-tab-${tab.id}`}
              value={tab.id}
              className={tab.wideOnly ? "hidden md:inline-flex" : undefined}
            >
              {tab.label}
            </TabsTriggerPill>
          ))}
      </TabsList>
      {menuTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  activeMenuTab
                    ? `More previews, ${activeMenuTab.label} shown`
                    : "More previews"
                }
              >
                <MoreVertical />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {menuTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                data-testid={`themer-preview-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
