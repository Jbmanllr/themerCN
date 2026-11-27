// What the persisted stores accept from storage. A stored entry is outside
// data: localStorage is shared with the Host app, survives every build of the
// Themer, and can be edited by hand. The version check (dropOtherVersion)
// rejects an entry of another version; these checks reject an entry of the
// current version whose shape is wrong, so the stores never hold a shape
// their code cannot read.
//
// Contract:
// - The editor entry is all or nothing: a Theme with one bad style is not
//   half-applied, the store starts fresh as with nothing stored. Nothing is
//   written, so the entry stays until the next store set replaces it, and
//   the head script, which reads storage on its own, may still paint it for
//   that load (utils/theme-script.ts).
// - Each preference is checked on its own: a valid one is kept, any other
//   takes its default, and a key that is not a preference is dropped. The
//   one rule that ties two preferences (Tailwind 3 has no oklch) stays with
//   the preferences store, which applies it to what this returns.
// - A walk over the entry's values per hydration, with no parse, compare or
//   storage access: nothing the page-load cost contract counts (ADR 0002).
// - Hand-written checks, not a zod schema: zod loads today only with the
//   lazy Dashboard example, and the stores load with the Themer chunk.

import { isThemerLayout } from "../config/themer-layouts"
import type {
  EditorStoreState,
  HSLAdjustments,
  PreferencesState,
  PresetBaseline,
  ThemeEditorState,
  ThemeModeStyles,
  ThemeStyles,
  ThemerLayout,
} from "../types"
import { COLOR_SELECTOR_TABS, PACKAGE_MANAGERS } from "../types/editor"
import { COLOR_FORMATS, TAILWIND_VERSIONS } from "../types/theme"

/**
 * The stored editor entry. The checkpoint and the baseline are left out
 * while they are the Theme's own objects (the usual case: on a Preset,
 * before any HSL adjustment), so the entry holds one copy of the styles
 * instead of three; left out means "the Theme", while `null` means none.
 */
export type PersistedEditorState = Pick<EditorStoreState, "themeState"> &
  Partial<Pick<EditorStoreState, "themeCheckpoint" | "presetBaseline">>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean"

const isString = (value: unknown): value is string => typeof value === "string"

/**
 * An object whose every value is a string: JSON drops an unset style, so
 * nothing a build stored is anything else. Whether each built-in style is
 * present is not checked: ThemeModeStyles promises them, but a Preset may
 * set one to undefined (PartialThemeStyleProps), the Theme is then saved
 * without it, and its readers treat a missing style as unset.
 */
function isModeStyles(value: unknown): value is ThemeModeStyles {
  return isRecord(value) && Object.values(value).every(isString)
}

function isThemeStyles(value: unknown): value is ThemeStyles {
  return (
    isRecord(value) && isModeStyles(value.light) && isModeStyles(value.dark)
  )
}

function isHslAdjustments(value: unknown): value is HSLAdjustments {
  return (
    isRecord(value) &&
    Number.isFinite(value.hueShift) &&
    Number.isFinite(value.saturationScale) &&
    Number.isFinite(value.lightnessScale)
  )
}

function isThemeEditorState(value: unknown): value is ThemeEditorState {
  return (
    isRecord(value) &&
    isThemeStyles(value.styles) &&
    (value.currentMode === "light" || value.currentMode === "dark") &&
    (value.preset === undefined || isString(value.preset)) &&
    (value.hslAdjustments === undefined ||
      isHslAdjustments(value.hslAdjustments))
  )
}

function isPresetBaseline(value: unknown): value is PresetBaseline {
  return (
    isRecord(value) && isString(value.preset) && isThemeStyles(value.styles)
  )
}

/** Whether `value` is a stored editor entry the store can restore. */
export function isPersistedEditorState(
  value: unknown
): value is PersistedEditorState {
  return (
    isRecord(value) &&
    isThemeEditorState(value.themeState) &&
    (value.themeCheckpoint === undefined ||
      value.themeCheckpoint === null ||
      isThemeEditorState(value.themeCheckpoint)) &&
    (value.presetBaseline === undefined ||
      value.presetBaseline === null ||
      isPresetBaseline(value.presetBaseline))
  )
}

/** A check that `value` is one of `options`. */
function oneOf<const Options extends readonly string[]>(...options: Options) {
  return (value: unknown): value is Options[number] =>
    isString(value) && options.includes(value)
}

const isLayoutPreference = (value: unknown): value is ThemerLayout | null =>
  value === null || isThemerLayout(value)

const isSectionStates = (value: unknown): value is Record<string, boolean> =>
  isRecord(value) && Object.values(value).every(isBoolean)

/** `value` when it passes `check`, else `fallback`. */
function restored<Value>(
  value: unknown,
  check: (value: unknown) => value is Value,
  fallback: Value
): Value {
  return check(value) ? value : fallback
}

/**
 * The preferences a stored entry restores: each field that passes its check,
 * and `defaults` for every other, so one bad field costs only itself. A
 * `stored` that is not an object restores nothing. The result holds the
 * preferences alone: a new preference is a compile error here until it is
 * listed with its check, and a stored key that is no preference is left out.
 */
export function restorePreferences(
  stored: unknown,
  defaults: PreferencesState
): PreferencesState {
  const entry = isRecord(stored) ? stored : {}
  return {
    colorFormat: restored(
      entry.colorFormat,
      oneOf(...COLOR_FORMATS),
      defaults.colorFormat
    ),
    tailwindVersion: restored(
      entry.tailwindVersion,
      oneOf(...TAILWIND_VERSIONS),
      defaults.tailwindVersion
    ),
    packageManager: restored(
      entry.packageManager,
      oneOf(...PACKAGE_MANAGERS),
      defaults.packageManager
    ),
    showContrastWarnings: restored(
      entry.showContrastWarnings,
      isBoolean,
      defaults.showContrastWarnings
    ),
    // Any id: one that names no tab falls back to the first tab at render.
    previewTab: restored(entry.previewTab, isString, defaults.previewTab),
    sidebarCollapsed: restored(
      entry.sidebarCollapsed,
      isBoolean,
      defaults.sidebarCollapsed
    ),
    layout: restored(entry.layout, isLayoutPreference, defaults.layout),
    themeOverrideEnabled: restored(
      entry.themeOverrideEnabled,
      isBoolean,
      defaults.themeOverrideEnabled
    ),
    sidebarColorSync: restored(
      entry.sidebarColorSync,
      isBoolean,
      defaults.sidebarColorSync
    ),
    colorSelectorTab: restored(
      entry.colorSelectorTab,
      oneOf(...COLOR_SELECTOR_TABS),
      defaults.colorSelectorTab
    ),
    sectionStates: restored(
      entry.sectionStates,
      isSectionStates,
      defaults.sectionStates
    ),
  }
}
