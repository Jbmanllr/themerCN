"use client"

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// The editor's theme state and its undo history. Rules the rest of the
// package relies on:
// - setThemeState batches changes within HISTORY_DEBOUNCE_MS into one undo
//   entry, keeps at most MAX_HISTORY_COUNT entries, and records nothing when
//   only the light/dark mode changed. Any other change clears redo, batched
//   or not.
// - Applying a preset and importing CSS always start a new undo entry and
//   move the checkpoint; resetting to the preset clears history.
// - Preset colours always come from resolvePresetStyles (config/presets.ts).
// - Only themeState, themeCheckpoint and presetBaseline persist; history and
//   future do not.
//   The persisted shape is versioned by EDITOR_STATE_VERSION
//   (config/constants.ts) with no migrations (pre-release): a stored state of
//   another version is dropped without an error and the key rewritten
//   (dropOtherVersion), and the head script ignores it.
//   utils/theme-script.ts reads `state.themeState` (currentMode,
//   styles) straight from this localStorage entry before hydration: keep
//   that path and getStorageKeys().editor when the shape or key changes.
// - themeCheckpoint is the theme before the first HSL adjustment (the base
//   the HSL controls recompute from). Applying, resetting, adopting or
//   refreshing a preset, importing CSS, undo and redo move it;
//   saveThemeCheckpoint sets it before the first HSL adjustment away from
//   neutral. It says nothing about whether the theme was edited.
// - presetBaseline is the preset's styles as they were when a preset was
//   last put on the theme (applyThemePreset, resetToCurrentPreset,
//   adoptDefaultPreset, refreshUntouchedPreset). Nothing else moves it, so an
//   import, an AI theme, an undo or an edit leaves the theme different from it.
// - A restored theme that is still exactly its baseline (neutral HSL) follows
//   the preset's current source: refreshUntouchedPreset, run by ThemerProvider
//   once Host Presets are registered, so a token change in the Host app reaches
//   the page instead of the stored copy. A restored theme with no baseline
//   gets one only when it already equals its preset.
//
// See: packages/themer/ARCHITECTURE.md (EditorStore)

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  PresetBaseline,
  ThemeEditorState,
  EditorStore,
  EditorStoreState,
  HistoryEntry,
  SetThemeStateArg,
  ThemeStyles,
  ThemeStyleProps,
} from "../types"
import { COMMON_STYLE_KEYS } from "../types/theme"
import { defaultThemeState, defaultHSLAdjustments } from "../config/defaults"
import {
  getDefaultPresetId,
  hasPreset,
  resolvePresetStyles,
} from "../config/presets"
import {
  MAX_HISTORY_COUNT,
  HISTORY_DEBOUNCE_MS,
  EDITOR_STATE_VERSION,
  getStorageKeys,
} from "../config/constants"
import { isDeepEqual } from "../utils/deep-equal"
import { dropOtherVersion } from "./persist-options"

type PersistedEditorState = Pick<
  EditorStoreState,
  "themeState" | "themeCheckpoint" | "presetBaseline"
>

function copyStyles(styles: ThemeStyles): ThemeStyles {
  const dark = { ...styles.dark }
  // Typography is shared: old imports/presets may carry a different dark font.
  for (const key of COMMON_STYLE_KEYS) {
    const value = styles.light[key]
    if (key.startsWith("font-") && value !== undefined) dark[key] = value
  }
  return { light: { ...styles.light }, dark }
}

/**
 * Append `state`, the theme as it was BEFORE the change being recorded, and
 * drop the oldest entry beyond MAX_HISTORY_COUNT.
 */
function pushHistory(
  history: HistoryEntry[],
  state: ThemeEditorState
): HistoryEntry[] {
  const next = [...history, { state, timestamp: Date.now() }]
  return next.length > MAX_HISTORY_COUNT ? next.slice(1) : next
}

/** `base` switched to a preset: the preset's styles, no HSL adjustments. */
function presetThemeState(
  base: ThemeEditorState,
  presetId: string
): ThemeEditorState {
  return {
    ...base,
    preset: presetId,
    styles: copyStyles(resolvePresetStyles(presetId)),
    hslAdjustments: defaultHSLAdjustments,
  }
}

/** The baseline for a theme just put on `presetId`. */
function baselineOf(presetId: string, styles: ThemeStyles): PresetBaseline {
  return { preset: presetId, styles: copyStyles(styles) }
}

/**
 * Theme editor store: the edited theme with undo/redo, persisted to
 * localStorage under `<storageNamespace>:editor` (getStorageKeys).
 */
export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      // State
      themeState: defaultThemeState,
      themeCheckpoint: null,
      presetBaseline: null,
      history: [],
      future: [],
      restoredFromStorage: false,

      // Actions
      setThemeState: (stateOrUpdater: SetThemeStateArg) => {
        const oldThemeState = get().themeState
        // Support functional updaters for avoiding stale closures
        const updatedState =
          typeof stateOrUpdater === "function"
            ? stateOrUpdater(oldThemeState)
            : stateOrUpdater
        const newState = {
          ...updatedState,
          styles: copyStyles(updatedState.styles),
        }
        let currentHistory = get().history

        // A change of light/dark mode only is not an edit: no undo entry and
        // redo is kept.
        const oldStateWithoutMode = {
          ...oldThemeState,
          currentMode: undefined,
        }
        const newStateWithoutMode = { ...newState, currentMode: undefined }

        if (
          isDeepEqual(oldStateWithoutMode, newStateWithoutMode) &&
          oldThemeState.currentMode !== newState.currentMode
        ) {
          set({ themeState: newState })
          return
        }

        const currentTime = Date.now()
        const lastHistoryEntry =
          currentHistory.length > 0
            ? currentHistory[currentHistory.length - 1]
            : null

        // Batch rapid changes within debounce threshold
        if (
          !lastHistoryEntry ||
          currentTime - lastHistoryEntry.timestamp >= HISTORY_DEBOUNCE_MS
        ) {
          // Add a new history entry (pushHistory enforces the max count)
          currentHistory = pushHistory(currentHistory, oldThemeState)
        }

        set({
          themeState: newState,
          history: currentHistory,
          // Clear future on every recorded change, batched or not
          future: [],
        })
      },

      setCurrentMode: (mode) => {
        const currentState = get().themeState
        set({
          themeState: {
            ...currentState,
            currentMode: mode,
          },
        })
      },

      applyThemePreset: (preset: string) => {
        if (!hasPreset(preset)) return
        const currentThemeState = get().themeState

        const newThemeState = presetThemeState(currentThemeState, preset)

        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          presetBaseline: baselineOf(preset, newThemeState.styles),
          history: pushHistory(get().history, currentThemeState),
          future: [],
        })
      },

      saveThemeCheckpoint: () => {
        set({ themeCheckpoint: get().themeState })
      },

      restoreThemeCheckpoint: () => {
        const checkpoint = get().themeCheckpoint
        if (checkpoint) {
          const oldThemeState = get().themeState
          const updatedHistory = pushHistory(get().history, oldThemeState)

          set({
            themeState: {
              ...checkpoint,
              currentMode: get().themeState.currentMode,
            },
            history: updatedHistory,
            future: [],
          })
        }
      },

      resetToCurrentPreset: () => {
        const currentThemeState = get().themeState
        // A preset id that is no longer registered (a removed Host Preset)
        // resets to the Host app's default preset instead of shadcn defaults.
        const presetId =
          currentThemeState.preset && hasPreset(currentThemeState.preset)
            ? currentThemeState.preset
            : getDefaultPresetId()

        const newThemeState = presetThemeState(currentThemeState, presetId)

        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          presetBaseline: baselineOf(presetId, newThemeState.styles),
          history: [],
          future: [],
        })
      },

      updateCommonStyle: (key, value) => {
        get().setThemeState((prev) => ({
          ...prev,
          styles: {
            light: { ...prev.styles.light, [key]: value },
            dark: { ...prev.styles.dark, [key]: value },
          },
        }))
      },

      importThemeStyles: (imported, options = {}) => {
        const currentThemeState = get().themeState
        const base = options.replace
          ? resolvePresetStyles(getDefaultPresetId())
          : currentThemeState.styles

        const importedLight = imported.light ?? {}
        const importedDark = imported.dark ?? {}
        // CSS usually declares fonts, radius and shadow geometry only in
        // :root; those keys are shared, so dark takes them from light unless
        // the dark block sets its own.
        const sharedFromLight: Partial<ThemeStyleProps> = {}
        for (const key of COMMON_STYLE_KEYS) {
          const value = importedLight[key]
          if (value !== undefined) sharedFromLight[key] = value
        }

        const newThemeState: ThemeEditorState = {
          ...currentThemeState,
          styles: copyStyles({
            light: { ...base.light, ...importedLight },
            dark: { ...base.dark, ...sharedFromLight, ...importedDark },
          }),
          hslAdjustments: defaultHSLAdjustments,
        }

        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          history: pushHistory(get().history, currentThemeState),
          future: [],
        })
      },

      adoptDefaultPreset: (presetId) => {
        const { restoredFromStorage, history, themeState } = get()
        if (restoredFromStorage || history.length > 0) return
        if (themeState.preset !== defaultThemeState.preset) return
        if (!hasPreset(presetId)) return
        // The same id is adopted again when a Host Preset replaced it (a Host
        // "default"): the fresh state still holds the built-in styles.
        if (
          presetId === themeState.preset &&
          isDeepEqual(themeState.styles, resolvePresetStyles(presetId))
        ) {
          return
        }

        const newThemeState = presetThemeState(themeState, presetId)
        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          presetBaseline: baselineOf(presetId, newThemeState.styles),
        })
      },

      refreshUntouchedPreset: () => {
        const { themeState, presetBaseline } = get()
        const presetId = themeState.preset
        if (!presetId || !hasPreset(presetId)) return
        const neutral = isDeepEqual(
          themeState.hslAdjustments ?? defaultHSLAdjustments,
          defaultHSLAdjustments
        )
        if (!neutral) return
        const fresh = resolvePresetStyles(presetId)

        // No preset was ever put on this theme (the fresh default, then
        // edited): it can only be trusted when it already is its preset.
        if (!presetBaseline) {
          if (isDeepEqual(themeState.styles, fresh)) {
            set({ presetBaseline: baselineOf(presetId, fresh) })
          }
          return
        }

        if (presetBaseline.preset !== presetId) return
        if (!isDeepEqual(themeState.styles, presetBaseline.styles)) return
        if (isDeepEqual(fresh, presetBaseline.styles)) return

        const newThemeState: ThemeEditorState = {
          ...themeState,
          styles: copyStyles(fresh),
          hslAdjustments: defaultHSLAdjustments,
        }
        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          presetBaseline: baselineOf(presetId, fresh),
        })
      },

      undo: () => {
        const history = get().history
        if (history.length === 0) return

        const currentThemeState = get().themeState
        const future = get().future

        const lastHistoryEntry = history[history.length - 1]!
        const newHistory = history.slice(0, -1)

        const newFutureEntry: HistoryEntry = {
          state: currentThemeState,
          timestamp: Date.now(),
        }
        const newFuture = [newFutureEntry, ...future]

        set({
          themeState: {
            ...lastHistoryEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          themeCheckpoint: lastHistoryEntry.state,
          history: newHistory,
          future: newFuture,
        })
      },

      redo: () => {
        const future = get().future
        if (future.length === 0) return

        const history = get().history
        const firstFutureEntry = future[0]!
        const newFuture = future.slice(1)
        const currentThemeState = get().themeState

        set({
          themeState: {
            ...firstFutureEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          themeCheckpoint: firstFutureEntry.state,
          history: pushHistory(history, currentThemeState),
          future: newFuture,
        })
      },

      canUndo: () => get().history.length > 0,
      canRedo: () => get().future.length > 0,
    }),
    {
      name: getStorageKeys().editor,
      // <Themer> names the namespace and hydrates (stores/hydrate.ts).
      skipHydration: true,
      version: EDITOR_STATE_VERSION,
      migrate: dropOtherVersion,
      // Called with `undefined` when nothing (or a state of another version)
      // is stored; the flag lets adoptDefaultPreset tell a fresh store from a
      // restored one. Built on the initial state, never the current one, so
      // a namespace switch (stores/hydrate.ts) carries no Theme or undo
      // history over from the previous namespace.
      merge: (persistedState): EditorStore => {
        const initialState = useEditorStore.getInitialState()
        return (persistedState as Partial<PersistedEditorState> | undefined)
          ?.themeState
          ? {
              ...initialState,
              ...(persistedState as PersistedEditorState),
              presetBaseline:
                (persistedState as PersistedEditorState).presetBaseline ?? null,
              restoredFromStorage: true,
            }
          : initialState
      },
      partialize: (state): PersistedEditorState => ({
        themeState: state.themeState,
        themeCheckpoint: state.themeCheckpoint,
        presetBaseline: state.presetBaseline,
        // history and future stay out of localStorage (quota): undo and
        // redo start empty after a reload.
      }),
    }
  )
)
