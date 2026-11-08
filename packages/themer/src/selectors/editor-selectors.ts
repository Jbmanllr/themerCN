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
//
// The module also holds the pure Preset rules (isOnPreset, isUntouchedPreset,
// shouldAdoptPreset) that the store's actions and selectors call; they take
// plain values and are not selectors themselves.

import type {
  EditorStore,
  PresetBaseline,
  ThemeEditorState,
  ThemeStyles,
} from "../types"
import { resolvePresetStyles } from "../config/presets"
import { defaultHSLAdjustments, defaultThemeState } from "../config/defaults"
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
  return onPreset(
    themeState,
    sidebarSync,
    resolvePresetStyles(themeState.preset ?? "default")
  )
}

// The neutral-HSL check both Preset rules share: a missing adjustment counts
// as the identity.
function hasNeutralHsl(themeState: ThemeEditorState): boolean {
  return isIdentityHslAdjustment(
    themeState.hslAdjustments ?? defaultHSLAdjustments
  )
}

function onPreset(
  themeState: ThemeEditorState,
  sidebarSync: boolean,
  presetStyles: ThemeStyles
): boolean {
  return (
    isDeepEqual(
      themeState.styles,
      sidebarSync ? sidebarSyncedPresetStyles(presetStyles) : presetStyles
    ) && hasNeutralHsl(themeState)
  )
}

/**
 * The "untouched" rule: no edit, import, AI change or undo has moved the
 * Theme off the Preset last put on it, so a Host Preset change may refresh
 * it. Its HSL adjustment is neutral, and its styles equal its Preset
 * baseline at its own Preset; with no baseline (the fresh default, then
 * edited), they must equal `presetStyles`, the resolved Preset as it would
 * be put on (Sidebar-synced while Sync is on). A baseline built on the
 * Theme's own styles object is untouched without a compare.
 */
export function isUntouchedPreset(
  themeState: ThemeEditorState,
  baseline: PresetBaseline | null,
  presetStyles: ThemeStyles
): boolean {
  if (!hasNeutralHsl(themeState)) return false
  if (!baseline) return isDeepEqual(themeState.styles, presetStyles)
  if (baseline.preset !== themeState.preset) return false
  return (
    themeState.styles === baseline.styles ||
    isDeepEqual(themeState.styles, baseline.styles)
  )
}

/**
 * The "should adopt" rule: a fresh Theme takes the Host's default Preset
 * `presetId` unless it is already that Preset. Only a Theme on the built-in
 * default Preset id adopts; on the same id it adopts only when `presetStyles`,
 * the resolved Preset, differ from its styles (a Host Preset replacing
 * "default"). Freshness (no restore, no history) and the Preset registry
 * lookup (`hasPreset`) are the caller's checks.
 */
export function shouldAdoptPreset(
  themeState: ThemeEditorState,
  presetId: string,
  presetStyles: ThemeStyles
): boolean {
  if (themeState.preset !== defaultThemeState.preset) return false
  return (
    presetId !== themeState.preset ||
    !isDeepEqual(themeState.styles, presetStyles)
  )
}

// isOnPreset's answer, built once per Theme state object and shared by every
// caller. The store keeps the Theme state object while the Theme is unchanged
// (a history-only set), so the answer holds until the next Theme change. An
// answer also records the resolved Preset styles it was computed against: a
// Host Preset re-registration replaces that object, so the answer is
// recomputed. One slot per Sidebar Sync setting.
interface OnPresetAnswer {
  presetStyles: ThemeStyles
  onPreset: boolean
}
const onPresetAnswers = new WeakMap<
  ThemeEditorState,
  { synced?: OnPresetAnswer; unsynced?: OnPresetAnswer }
>()

function sharedIsOnPreset(
  themeState: ThemeEditorState,
  sidebarSync: boolean
): boolean {
  const presetStyles = resolvePresetStyles(themeState.preset ?? "default")
  let answers = onPresetAnswers.get(themeState)
  if (!answers) {
    answers = {}
    onPresetAnswers.set(themeState, answers)
  }
  const slot = sidebarSync ? "synced" : "unsynced"
  const answer = answers[slot]
  if (answer?.presetStyles === presetStyles) return answer.onPreset
  const result = onPreset(themeState, sidebarSync, presetStyles)
  answers[slot] = { presetStyles, onPreset: result }
  return result
}

/**
 * Selector factory over isOnPreset, given the Sidebar Sync preference
 * (preferences store). False drives the unsaved mark and enables Reset.
 * Every caller shares one answer per Theme state, Sidebar Sync setting and
 * resolved Preset, so a Theme change costs one deep compare whatever the
 * number of callers.
 */
export const selectIsOnPreset =
  (sidebarSync: boolean) =>
  (state: EditorStore): boolean =>
    sharedIsOnPreset(state.themeState, sidebarSync)

// A store action: a stable reference for the store's lifetime, so a component
// that selects it never re-renders because of it.
export const selectApplyThemePreset = (state: EditorStore) =>
  state.applyThemePreset
