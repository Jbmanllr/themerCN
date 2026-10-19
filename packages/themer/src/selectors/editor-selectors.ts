// Selectors over the editor store (stores/editor-store.ts): each extracts the
// one slice a component needs, so it re-renders only when that slice changes.
// Usage: `useEditorStore(selectCanUndo)`; hooks/use-editor-selectors.ts wraps
// them as hooks.
//
// Contract: a selector returns a primitive or a reference the store already
// holds (a style object, an action). One that builds a new object or array on
// each call changes identity on every store update and re-renders its
// component each time; wrap such a selector in useShallow (as
// hooks/use-themer.ts does) or derive the value in the component.

import type { EditorStore, ThemeStyleProps } from "../types"
import { resolvePresetStyles } from "../config/presets"
import { defaultHSLAdjustments } from "../config/defaults"
import { isDeepEqual } from "../utils/deep-equal"
import { applySidebarSync } from "../utils/sidebar-sync"

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

/** The whole theme state. It changes identity on every theme edit. */
export const selectThemeState = (state: EditorStore) => state.themeState

/**
 * The styles of the current mode. The reference changes when an edit touches
 * that mode's styles or the mode switches, not when only the other mode's
 * styles change.
 */
export const selectCurrentStyles = (state: EditorStore): ThemeStyleProps =>
  state.themeState.styles[state.themeState.currentMode]

/** The styles of both modes (`{ light, dark }`), for a reader of both. */
export const selectStyles = (state: EditorStore) => state.themeState.styles

/**
 * The current HSL adjustment values. The styles already include their effect
 * (computed from themeCheckpoint); do not apply them again.
 */
export const selectHSLAdjustments = (state: EditorStore) =>
  state.themeState.hslAdjustments

/**
 * Whether the theme differs from its preset (resolved as when applied) or
 * has HSL adjustments. Drives the "unsaved" indicator.
 */
export const selectHasUnsavedChanges = (state: EditorStore): boolean => {
  const { themeState } = state
  const presetStyles = resolvePresetStyles(themeState.preset ?? "default")
  return (
    !isDeepEqual(themeState.styles, presetStyles) ||
    !isDeepEqual(themeState.hslAdjustments, defaultHSLAdjustments)
  )
}

/**
 * Selector factory for the Reset button: whether resetting would change the
 * theme. Like selectHasUnsavedChanges, but with Sidebar Sync on the preset
 * counts as the sync aligns it (the sidebar colours on their base twins), so a
 * freshly applied preset leaves Reset disabled instead of offering to wipe the
 * undo history for the same theme. HSL adjustments always count.
 */
export const selectCanResetToPreset =
  (sidebarSync: boolean) =>
  (state: EditorStore): boolean => {
    const { themeState } = state
    const presetStyles = resolvePresetStyles(themeState.preset ?? "default")
    return (
      !isDeepEqual(
        themeState.styles,
        sidebarSync ? applySidebarSync(presetStyles) : presetStyles
      ) || !isDeepEqual(themeState.hslAdjustments, defaultHSLAdjustments)
    )
  }

/**
 * Selector factory: `selectStyleProperty(key)` reads one style value of the
 * current mode, so its component re-renders only when that value changes (a
 * mode switch can change it).
 */
export const selectStyleProperty =
  (key: keyof ThemeStyleProps) =>
  (state: EditorStore): string | undefined =>
    state.themeState.styles[state.themeState.currentMode][key]

// Store actions: stable references for the store's lifetime, so a component
// that selects one never re-renders because of it.
export const selectSetThemeState = (state: EditorStore) => state.setThemeState

export const selectApplyThemePreset = (state: EditorStore) =>
  state.applyThemePreset

export const selectUndo = (state: EditorStore) => state.undo

export const selectRedo = (state: EditorStore) => state.redo

export const selectResetToCurrentPreset = (state: EditorStore) =>
  state.resetToCurrentPreset

export const selectSetCurrentMode = (state: EditorStore) => state.setCurrentMode

export const selectSaveThemeCheckpoint = (state: EditorStore) =>
  state.saveThemeCheckpoint

export const selectRestoreThemeCheckpoint = (state: EditorStore) =>
  state.restoreThemeCheckpoint

export const selectUpdateCommonStyle = (state: EditorStore) =>
  state.updateCommonStyle

export const selectImportThemeStyles = (state: EditorStore) =>
  state.importThemeStyles
