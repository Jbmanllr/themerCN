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

import type { EditorStore, ThemeEditorState, ThemeStyleProps } from "../types"
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
      sidebarSync ? applySidebarSync(presetStyles) : presetStyles
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
