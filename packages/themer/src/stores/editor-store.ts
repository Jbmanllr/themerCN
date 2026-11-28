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
// - Sidebar Sync: while the preference (preferences store) is on, every
//   action that sets the Theme passes it through withSidebarSync in the same
//   commit, so the Theme is applied and saved once per action. The Theme
//   also enters the store in sync: merge syncs a restored or fresh Theme
//   with the restored preference, and setSidebarColorSync (the only setter
//   of the preference) aligns the Theme when it turns it on.
// - Only themeState, themeCheckpoint and presetBaseline persist; history and
//   future do not. The checkpoint and baseline are stored only when they
//   are not the Theme's own objects (PersistedEditorState): persistence
//   decides by identity, never by a deep compare. A set whose updater
//   returns the stored Theme keeps that object, so it writes nothing.
//   Writes go through guardedLocalStorage (stores/persist-options.ts): a
//   storage error never reaches an action, and an unchanged slice is not
//   written.
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
//   setHslAdjustments moves it to the Theme before the first adjustment away
//   from neutral, and recomputes every later one from it. It says nothing
//   about whether the theme was edited.
// - presetBaseline is the preset's styles as they were when a preset was
//   last put on the theme (applyThemePreset, resetToCurrentPreset,
//   adoptDefaultPreset, refreshUntouchedPreset). Nothing else moves it, so an
//   import, an AI theme, an undo or an edit leaves the theme different from it.
// - A restored theme that is still exactly its baseline (neutral HSL) follows
//   the preset's current source: refreshUntouchedPreset, run by ThemerProvider
//   once Host Presets are registered, so a token change in the Host app reaches
//   the page instead of the stored copy. A restored theme with no baseline
//   gets one only when it already equals its preset. A fresh store starts
//   with its default Theme's own baseline, so the refresh sets nothing.
// - Hydration (mergeEditorState) puts the page's colour mode on the hydrated
//   Theme; the stored currentMode is not read at load.
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
  ThemeMode,
} from "../types"
import { COMMON_STYLE_KEYS, THEME_FONT_KEYS } from "../types/theme"
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
import { getExtraColorKeys } from "../config/extra-colors"
import { isDeepEqual } from "../utils/deep-equal"
import { adjustThemeStyles, isIdentityHslAdjustment } from "../utils/hsl-adjust"
import { isProduction } from "../utils/is-production"
import { applySidebarSync } from "../utils/sidebar-sync"
import {
  isUntouchedPreset,
  shouldAdoptPreset,
} from "../selectors/editor-selectors"
import { usePreferencesStore } from "./preferences-store"
import { dropOtherVersion, guardedLocalStorage } from "./persist-options"
import {
  isPersistedEditorState,
  type PersistedEditorState,
} from "./persisted-state"

/**
 * Whether `baseline` is the Theme's own: its Preset, on the Theme's styles
 * object. Decided by identity, never by a deep compare: every action that
 * puts a Preset on the Theme builds the baseline on the new Theme's styles
 * (putOnPreset), and styles are never mutated in place. A baseline equal to
 * the Theme but a separate object is stored; restoring it gives the same
 * state.
 */
function isBaselineOf(
  baseline: PresetBaseline | null,
  themeState: ThemeEditorState
): boolean {
  return (
    baseline !== null &&
    baseline.preset === themeState.preset &&
    baseline.styles === themeState.styles
  )
}

function toPersisted({
  themeState,
  themeCheckpoint,
  presetBaseline,
}: EditorStoreState): PersistedEditorState {
  const persisted: PersistedEditorState = { themeState }
  // By identity too: the checkpoint is left out when it is the Theme itself.
  if (themeCheckpoint !== themeState) {
    persisted.themeCheckpoint = themeCheckpoint
  }
  if (!isBaselineOf(presetBaseline, themeState)) {
    persisted.presetBaseline = presetBaseline
  }
  return persisted
}

function fromPersisted({
  themeState,
  themeCheckpoint,
  presetBaseline,
}: PersistedEditorState): Pick<
  EditorStoreState,
  "themeState" | "themeCheckpoint" | "presetBaseline"
> {
  return {
    themeState,
    themeCheckpoint:
      themeCheckpoint === undefined ? themeState : themeCheckpoint,
    presetBaseline:
      presetBaseline === undefined ? baselineOf(themeState) : presetBaseline,
  }
}

function copyStyles(styles: ThemeStyles): ThemeStyles {
  const dark = { ...styles.dark }
  // Typography is shared: old imports/presets may carry a different dark font.
  for (const key of THEME_FONT_KEYS) {
    const value = styles.light[key]
    if (value !== undefined) dark[key] = value
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

/**
 * `themeState` with Sidebar Sync applied while the preference is on
 * (preferences store): each sidebar colour on its base twin. The same object
 * when nothing changes. Every action that sets the Theme passes it through
 * here, so the Theme is synced in the same commit (one apply, one write).
 */
function withSidebarSync(themeState: ThemeEditorState): ThemeEditorState {
  if (!usePreferencesStore.getState().sidebarColorSync) return themeState
  const styles = applySidebarSync(themeState.styles)
  return styles === themeState.styles ? themeState : { ...themeState, styles }
}

/**
 * `base` switched to a preset: the preset's styles (synced, see
 * withSidebarSync), no HSL adjustments.
 */
function presetThemeState(
  base: ThemeEditorState,
  presetId: string
): ThemeEditorState {
  return withSidebarSync({
    ...base,
    preset: presetId,
    styles: copyStyles(resolvePresetStyles(presetId)),
    hslAdjustments: defaultHSLAdjustments,
  })
}

/**
 * The baseline of a Theme that is its Preset: built on that Theme state's
 * own styles object, not a copy, so the stored entry leaves it out
 * (isBaselineOf).
 */
function baselineOf(themeState: ThemeEditorState): PresetBaseline {
  return { preset: themeState.preset, styles: themeState.styles }
}

/** The store fields every action that sets the Theme's Preset moves. */
type PresetFields = Pick<
  EditorStoreState,
  "themeState" | "themeCheckpoint" | "presetBaseline"
>

/**
 * `base` put on a Preset: the Theme (presetThemeState), the checkpoint on
 * it and its baseline, the three fields that move together whenever a
 * Preset is put on the Theme (apply, reset, adopt, refresh).
 */
function putOnPreset(base: ThemeEditorState, presetId: string): PresetFields {
  const themeState = presetThemeState(base, presetId)
  return {
    themeState,
    themeCheckpoint: themeState,
    presetBaseline: baselineOf(themeState),
  }
}

/**
 * The store fields an undo or redo restores from `entry`: its Theme, in
 * sync and in the mode the editor shows now, and the checkpoint on it, so
 * the two stay aligned.
 */
function restored(
  entry: HistoryEntry,
  currentMode: ThemeMode
): Pick<EditorStoreState, "themeState" | "themeCheckpoint"> {
  const themeState = withSidebarSync({ ...entry.state, currentMode })
  return { themeState, themeCheckpoint: themeState }
}

/**
 * Theme editor store: the edited theme with undo/redo, persisted to
 * localStorage under `<storageNamespace>:editor` (getStorageKeys).
 */
export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      themeState: defaultThemeState,
      themeCheckpoint: null,
      // The default Theme is its own Preset, untouched: with its baseline,
      // the refresh of a fresh store has nothing to set.
      presetBaseline: baselineOf(defaultThemeState),
      history: [],
      future: [],
      restoredFromStorage: false,

      setThemeState: (stateOrUpdater: SetThemeStateArg) => {
        const oldThemeState = get().themeState
        // Support functional updaters for avoiding stale closures
        const updatedState =
          typeof stateOrUpdater === "function"
            ? stateOrUpdater(oldThemeState)
            : stateOrUpdater
        // The stored Theme returned unchanged is kept as it is (it is already
        // in sync, with copied styles), so the persisted slice is left as it
        // was. The set still records its undo entry and clears redo.
        const newState =
          updatedState === oldThemeState
            ? oldThemeState
            : withSidebarSync({
                ...updatedState,
                styles: copyStyles(updatedState.styles),
              })
        let currentHistory = get().history

        // A change of light/dark mode only is not an edit: no undo entry and
        // redo is kept.
        const oldStateWithoutMode = {
          ...oldThemeState,
          currentMode: undefined,
        }
        const newStateWithoutMode = { ...newState, currentMode: undefined }

        if (
          newState !== oldThemeState &&
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

        if (
          !lastHistoryEntry ||
          currentTime - lastHistoryEntry.timestamp >= HISTORY_DEBOUNCE_MS
        ) {
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

        set({
          ...putOnPreset(currentThemeState, preset),
          history: pushHistory(get().history, currentThemeState),
          future: [],
        })
      },

      setHslAdjustments: (adjustments) => {
        const { themeState, themeCheckpoint } = get()
        // Leaving neutral: the Theme as it is now is the base from here on.
        const leavingNeutral = isIdentityHslAdjustment(
          themeState.hslAdjustments ?? defaultHSLAdjustments
        )
        const base =
          leavingNeutral || !themeCheckpoint ? themeState : themeCheckpoint
        if (base !== themeCheckpoint) set({ themeCheckpoint: base })
        get().setThemeState((prev) => ({
          ...prev,
          hslAdjustments: adjustments,
          styles: adjustThemeStyles(
            base.styles,
            adjustments,
            getExtraColorKeys()
          ),
        }))
      },

      resetToCurrentPreset: () => {
        const currentThemeState = get().themeState
        // A preset id that is no longer registered (a removed Host Preset)
        // resets to the Host app's default preset instead of shadcn defaults.
        const presetId = hasPreset(currentThemeState.preset)
          ? currentThemeState.preset
          : getDefaultPresetId()

        set({
          ...putOnPreset(currentThemeState, presetId),
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

      updateModeStyle: (key, value) => {
        get().setThemeState((prev) => ({
          ...prev,
          styles: {
            ...prev.styles,
            [prev.currentMode]: {
              ...prev.styles[prev.currentMode],
              [key]: value,
            },
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

        const newThemeState = withSidebarSync({
          ...currentThemeState,
          styles: copyStyles({
            light: { ...base.light, ...importedLight },
            dark: { ...base.dark, ...sharedFromLight, ...importedDark },
          }),
          hslAdjustments: defaultHSLAdjustments,
        })

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
        if (!hasPreset(presetId)) return
        if (
          !shouldAdoptPreset(
            themeState,
            presetId,
            resolvePresetStyles(presetId)
          )
        ) {
          return
        }

        set(putOnPreset(themeState, presetId))
      },

      refreshUntouchedPreset: () => {
        const { themeState, presetBaseline } = get()
        if (!hasPreset(themeState.preset)) return
        // The preset's current source, as applyThemePreset would put it on.
        const fresh = putOnPreset(themeState, themeState.preset)
        const freshStyles = fresh.themeState.styles
        if (!isUntouchedPreset(themeState, presetBaseline, freshStyles)) return

        // No preset was ever put on this theme, but it already is its
        // preset: record the baseline only.
        if (!presetBaseline) {
          set({ presetBaseline: baselineOf(themeState) })
          return
        }
        // The preset's source has not changed since the baseline.
        if (isDeepEqual(freshStyles, presetBaseline.styles)) return

        set(fresh)
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
          ...restored(lastHistoryEntry, currentThemeState.currentMode),
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
          ...restored(firstFutureEntry, currentThemeState.currentMode),
          history: pushHistory(history, currentThemeState),
          future: newFuture,
        })
      },

      setSidebarColorSync: (enabled) => {
        usePreferencesStore.setState({ sidebarColorSync: enabled })
        if (!enabled) return
        const { themeState, setThemeState } = get()
        const synced = withSidebarSync(themeState)
        if (synced !== themeState) setThemeState(synced)
      },
    }),
    {
      name: getStorageKeys().editor,
      // <Themer> names the namespace and hydrates (stores/hydrate.ts).
      skipHydration: true,
      version: EDITOR_STATE_VERSION,
      migrate: dropOtherVersion,
      // No merge here: hydration is the only rehydrate, and it sets the
      // merge (mergeEditorState) for the page's colour mode
      // (stores/hydrate.ts).
      // history and future stay out of localStorage (quota): undo and redo
      // start empty after a reload. A change to them alone writes nothing
      // (guardedLocalStorage skips a slice equal to the last write).
      partialize: (state: EditorStore) => toPersisted(state),
      storage: guardedLocalStorage(),
    }
  )
)

/**
 * The editor state hydrated from `persistedState`, on the page's colour
 * `mode`. Nothing stored, an entry at another version (both undefined here)
 * and an entry of the wrong shape (isPersistedEditorState) start fresh:
 * the hydrated Theme already holds the mode the mount renders with, so the
 * mode sync has nothing to set. A fresh store keeps its default Theme's
 * baseline (in sync, as the Theme), so the refresh sets nothing. Writes
 * nothing.
 *
 * Built on the initial state, never the current one, so a namespace switch
 * carries no Theme or undo history over; `restoredFromStorage` lets
 * adoptDefaultPreset tell a fresh store from a restored one. The Theme is
 * put in sync with the preference, already restored (stores/hydrate.ts), so
 * a Theme saved with Sync off (another tab) holds the rule too.
 */
export function mergeEditorState(
  persistedState: unknown,
  mode: ThemeMode
): EditorStore {
  const initialState = useEditorStore.getInitialState()
  const persisted = isPersistedEditorState(persistedState)
    ? persistedState
    : undefined
  if (!persisted) {
    // Something is stored and is not an entry: the Theme the user saved is
    // not coming back, which the developer should not have to guess.
    if (persistedState !== undefined && !isProduction()) {
      console.warn(
        "[themercn] The saved Theme is not a valid entry and was ignored: " +
          "the Themer starts on its default Preset."
      )
    }
    const themeState = withSidebarSync({
      ...initialState.themeState,
      currentMode: mode,
    })
    const presetBaseline =
      themeState.styles === initialState.themeState.styles
        ? initialState.presetBaseline
        : baselineOf(themeState)
    return { ...initialState, themeState, presetBaseline }
  }
  return {
    ...initialState,
    ...fromPersisted({
      ...persisted,
      themeState: withSidebarSync({
        ...persisted.themeState,
        currentMode: mode,
      }),
    }),
    restoredFromStorage: true,
  }
}
