"use client"

// The preview tabs as the Themer shows them: the built-in tabs merged with
// the Host's `ThemerConfig.previewTabs`, and the active one (the saved tab,
// else the first: preview-tab-registry.ts). PreviewTabs renders from it and
// PreviewPanel sizes its scroller around the same tab, so the two cannot
// disagree on which tab is shown.

import * as React from "react"
import { useThemerContext } from "../../hooks/use-themer-context"
import { usePreferencesStore } from "../../stores/preferences-store"
import { BUILTIN_TABS } from "./builtin-tabs"
import {
  mergePreviewTabs,
  resolveActiveTabId,
  type PreviewTabDefinition,
} from "./preview-tab-registry"

export function usePreviewTabs(): {
  tabs: PreviewTabDefinition[]
  activeTabId: string
  activeTab: PreviewTabDefinition | undefined
} {
  const { previewTabs } = useThemerContext().config
  const previewTab = usePreferencesStore((state) => state.previewTab)
  const tabs = React.useMemo(
    () => mergePreviewTabs(BUILTIN_TABS, previewTabs),
    [previewTabs]
  )
  const activeTabId = resolveActiveTabId(tabs, previewTab)
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  return { tabs, activeTabId, activeTab }
}
