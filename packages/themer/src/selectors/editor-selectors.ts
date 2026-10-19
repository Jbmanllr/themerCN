// Selectors over the editor store (stores/editor-store.ts): each extracts the
// one slice a component needs, so it re-renders only when that slice changes.
// Usage: `useEditorStore(selectCanUndo)`; hooks/use-editor-selectors.ts wraps
// them as hooks.
//
// Contract: a selector returns a primitive or a reference the store already
// holds (a style object, an action). One that builds a new object or array on
// each call changes identity on every store update and re-renders its
// component each time; wrap such a selector in useShallow or derive the value
// in the component.

import type { EditorStore, ThemeEditorState, ThemeStyles } from "../types"
import { resolvePresetStyles } from "../config/presets"
import { defaultHSLAdjustments } from "../config/defaults"
import { isDeepEqual } from "../utils/deep-equal"
import { applySidebarSync } from "../utils/sidebar-sync"
import { isIdentityHslAdjustment } from "../utils/hsl-adjust"

/** Whether there is an undo entry. */
export const selectCanUndo = (state: EditorStore): boolean =>
  state.history.length > 0

/** Whether there is a redo entry. */
export const selectCanRedo = (state: EditorStore): boolean =>
  state.future.length > 0

/** The mode the editor is showing ("light" or "dark"). */
export const selectCurrentMode = (state: EditorStore) =>
  state.themeState.currentMode

/** The current preset id; undefined when the state carries none. */
export const selectPreset = (state: EditorStore) => state.themeState.preset

// The Sidebar-Synced form of each resolved Preset. resolvePresetStyles
// caches one object per Preset id (and drops them when Host Presets change),
// so this is a per-Preset cache: the "on Preset" check runs on every store
// update in each subscriber and would otherwise rebuild it every time.
const syncedPresetStyles = new WeakMap<ThemeStyles, ThemeStyles>()

function sidebarSyncedPresetStyles(presetStyles: ThemeStyles): ThemeStyles {
  let synced = syncedPresetStyles.get(presetStyles)
  if (!synced) {
    synced = applySidebarSync(presetStyles)
    syncedPresetStyles.set(presetStyles, synced)
  }
  return synced
}

/**
 * The one "on Preset" rule: the Theme's styles are its Preset's (resolved as
 * when applied, and aligned by Sidebar Sync while `sidebarSync` is on, as the
 * editor store puts it on) and its HSL adjustment is neutral (missing or the
 * identity). Both the unsaved mark and Reset read it.
 */
export function isOnPreset(
  themeState: ThemeEditorState,
  sidebarSync: boolean
): boolean {
  const presetStyles = resolvePresetStyles(themeState.preset ?? "default")
  return (
    isDeepEqual(
      themeState.styles,
      sidebarSync ? sidebarSyncedPresetStyles(presetStyles) : presetStyles
    ) &&
    isIdentityHslAdjustment(themeState.hslAdjustments ?? defaultHSLAdjustments)
  )
}

/**
 * Selector factory over isOnPreset, given the Sidebar Sync preference
 * (preferences store). False drives the unsaved mark and enables Reset.
 */
export const selectIsOnPreset =
  (sidebarSync: boolean) =>
  (state: EditorStore): boolean =>
    isOnPreset(state.themeState, sidebarSync)

// A store action: a stable reference for the store's lifetime, so a component
// that selects it never re-renders because of it.
export const selectApplyThemePreset = (state: EditorStore) =>
  state.applyThemePreset
