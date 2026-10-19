"use client"

// Keeps the theme's sidebar colours on their base twins while Sidebar Sync is
// on (the rules are in utils/sidebar-sync.ts and editor/color-controls.tsx).
//
// Mount it once, as ThemerProvider does: a preset, an undo or an import must
// re-align even while the Colors panel, which owns the toggle, is unmounted. A
// second mount only repeats the work.

import * as React from "react"
import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import { isDeepEqual } from "../utils/deep-equal"
import { applySidebarSync } from "../utils/sidebar-sync"

/**
 * Keep the theme's sidebar colours on their base twins while Sidebar Sync
 * is on. Writes in place (no undo entry), so undo/redo stay usable: an undo
 * to an unsynced state is re-aligned without touching the redo stack. When
 * the checkpoint is the same object as the theme (just after a preset or an
 * import) it is re-aligned too, and so is the preset baseline when the theme
 * still equals it.
 */
export function useSidebarSyncAlignment() {
  React.useEffect(() => {
    const align = () => {
      if (!usePreferencesStore.getState().sidebarColorSync) return
      const { themeState, themeCheckpoint, presetBaseline } =
        useEditorStore.getState()
      const styles = applySidebarSync(themeState.styles)
      if (styles === themeState.styles) return
      const nextThemeState = { ...themeState, styles }
      useEditorStore.setState({
        themeState: nextThemeState,
        themeCheckpoint:
          themeCheckpoint === themeState ? nextThemeState : themeCheckpoint,
        // A theme still on its preset stays on it when sync re-aligns it.
        presetBaseline:
          presetBaseline &&
          isDeepEqual(presetBaseline.styles, themeState.styles)
            ? { ...presetBaseline, styles }
            : presetBaseline,
      })
    }
    align()
    const unsubscribeEditor = useEditorStore.subscribe((state, previous) => {
      if (state.themeState.styles !== previous.themeState.styles) align()
    })
    const unsubscribePreferences = usePreferencesStore.subscribe(
      (state, previous) => {
        if (state.sidebarColorSync && !previous.sidebarColorSync) align()
      }
    )
    return () => {
      unsubscribeEditor()
      unsubscribePreferences()
    }
  }, [])
}
