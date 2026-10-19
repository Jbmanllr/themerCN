// State and action shapes of the editor, preferences, colour focus and
// Themer UI stores in src/stores/.
// Behaviour rules (undo batching, persistence versions, what resets on close)
// are written in the store files.

import type {
  CommonStyleKey,
  HSLAdjustments,
  PartialThemeStyleProps,
  ThemeMode,
  ThemeStyles,
} from "./theme"

import type { ThemerLayout } from "./index"

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

/**
 * Complete theme editor state
 */
export interface ThemeEditorState {
  /** Current theme styles for light and dark modes */
  styles: ThemeStyles
  /** Currently active mode */
  currentMode: ThemeMode
  /**
   * Id of the preset the theme started from. On reset, a stale id (a removed
   * Host Preset) falls back to the Host app's default preset.
   */
  preset?: string
  /** HSL adjustment values; absent or neutral means no adjustment */
  hslAdjustments?: HSLAdjustments
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  /** The theme as it was BEFORE the change this entry records. */
  state: ThemeEditorState
  /** `Date.now()` when recorded; setThemeState batches against the last one. */
  timestamp: number
}

/**
 * The preset's styles as they were when the preset was last put on the theme.
 * refreshUntouchedPreset compares the theme with it, so only a theme that no
 * edit, import, AI change or undo has moved off its preset follows the
 * preset's source.
 */
export interface PresetBaseline {
  preset: string
  styles: ThemeStyles
}

/**
 * Editor store state
 */
export interface EditorStoreState {
  /** Current theme state */
  themeState: ThemeEditorState
  /**
   * The theme before the first HSL adjustment: the base the HSL controls
   * recompute from. "Unsaved changes" compares with the resolved preset, not
   * with this. Persisted.
   */
  themeCheckpoint: ThemeEditorState | null
  /**
   * What refreshUntouchedPreset compares the theme with; null on a store
   * saved before it existed. Persisted.
   */
  presetBaseline: PresetBaseline | null
  /** Undo stack, oldest first. Not persisted. */
  history: HistoryEntry[]
  /** Redo stack, next redo first; a recorded edit empties it. Not persisted. */
  future: HistoryEntry[]
  /**
   * True when the state was restored from localStorage at start-up. Not
   * persisted; `adoptDefaultPreset` only acts on a fresh store.
   */
  restoredFromStorage: boolean
}

/**
 * SetThemeState argument - supports both direct state and functional updater
 */
export type SetThemeStateArg =
  ThemeEditorState | ((prev: ThemeEditorState) => ThemeEditorState)

/** Styles parsed from imported CSS: either mode may be partial or absent. */
export interface ImportedThemeStyles {
  light?: PartialThemeStyleProps
  dark?: PartialThemeStyleProps
}

export interface ImportThemeStylesOptions {
  /**
   * Start from the default preset's resolved styles instead of the current
   * ones, so keys the import does not mention are reset.
   */
  replace?: boolean
}

/**
 * Editor store actions
 */
export interface EditorStoreActions {
  /**
   * Update theme state with undo tracking (supports functional updates).
   * Edits within HISTORY_DEBOUNCE_MS share one entry; a mode-only change
   * records nothing.
   */
  setThemeState: (stateOrUpdater: SetThemeStateArg) => void
  /**
   * Apply a registered preset (an unknown id is ignored): one undo entry and
   * a new checkpoint.
   */
  applyThemePreset: (preset: string) => void
  /** Save current state as checkpoint */
  saveThemeCheckpoint: () => void
  /**
   * Reset to the current preset's resolved styles (the Host app's default preset
   * when that id is no longer registered). Clears undo and redo and moves the
   * checkpoint.
   */
  resetToCurrentPreset: () => void
  /** Undo last change; moves the checkpoint to the restored state. */
  undo: () => void
  /** Redo last undone change; moves the checkpoint to the restored state. */
  redo: () => void
  /** Check if undo is available */
  canUndo: () => boolean
  /** Check if redo is available */
  canRedo: () => boolean
  /** Set current mode (light/dark) */
  setCurrentMode: (mode: ThemeMode) => void
  /**
   * Write a style shared by both modes (fonts, radius, spacing, letter
   * spacing, shadow parameters except colour) to light and dark at once.
   * Goes through setThemeState, so it batches into undo history.
   */
  updateCommonStyle: (key: CommonStyleKey, value: string) => void
  /**
   * Apply styles parsed from imported CSS: one undo entry, a new checkpoint
   * and reset HSL adjustments. Common keys set only in light also reach dark.
   */
  importThemeStyles: (
    styles: ImportedThemeStyles,
    options?: ImportThemeStylesOptions
  ) => void
  /**
   * Start a fresh store (nothing restored from storage, nothing edited) on
   * the Host app's default preset, without an undo entry. No-op otherwise.
   */
  adoptDefaultPreset: (presetId: string) => void
  /**
   * Make an untouched preset follow its source: when the theme still equals
   * its presetBaseline (same preset, neutral HSL) but the preset now resolves
   * differently (its host tokens changed), replace theme, checkpoint and
   * baseline with the fresh preset, keeping the mode and adding no undo
   * entry. An edited, imported, AI-made or undone theme is left alone. A
   * store with no baseline gets one when its theme equals its preset. Call
   * after the Host Presets are registered.
   */
  refreshUntouchedPreset: () => void
}

/**
 * Complete editor store type
 */
export type EditorStore = EditorStoreState & EditorStoreActions

/**
 * Preferences store state
 */
export interface PreferencesState {
  /** Preferred color format for display */
  colorFormat: "hex" | "rgb" | "hsl" | "oklch"
  /** Tailwind version for export */
  tailwindVersion: "3" | "4"
  /** Package manager for registry commands */
  packageManager: PackageManager
  /** Show contrast warnings */
  showContrastWarnings: boolean
  /**
   * Id of the last selected preview tab, built-in or host. An id that no
   * longer exists falls back to the first tab at render.
   */
  previewTab?: string
  /** Sidebar collapsed state, shared by every sidebar Themer layout */
  sidebarCollapsed: boolean
  /**
   * The Themer layout the user switched to; null follows the Host's
   * `layout` prop. A value that names no implemented layout is ignored at
   * render (resolveThemerLayout).
   */
  layout: ThemerLayout | null
  /**
   * Whether the editor theme overrides the host application's production
   * theme. Off: nothing is applied to the page, and utils/theme-script.ts
   * skips its pre-hydration apply.
   */
  themeOverrideEnabled: boolean
  /**
   * Sidebar colours follow their base twins (sidebar -> background, ...) in
   * both modes while on; the sidebar inputs are disabled.
   */
  sidebarColorSync: boolean
  /** Last view of the Tailwind colour selector popover. */
  colorSelectorTab: "list" | "palette"
  /** Open state of each editor ControlSection, by section id. */
  sectionStates: Record<string, boolean>
}

/**
 * Preferences store actions
 */
export interface PreferencesActions {
  setColorFormat: (format: PreferencesState["colorFormat"]) => void
  setTailwindVersion: (version: PreferencesState["tailwindVersion"]) => void
  setPackageManager: (packageManager: PackageManager) => void
  setShowContrastWarnings: (show: boolean) => void
  setPreviewTab: (tab: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setLayout: (layout: ThemerLayout) => void
  setThemeOverrideEnabled: (enabled: boolean) => void
  setSidebarColorSync: (enabled: boolean) => void
  setColorSelectorTab: (tab: PreferencesState["colorSelectorTab"]) => void
  setSectionOpen: (id: string, open: boolean) => void
  getAvailableColorFormats: () => readonly PreferencesState["colorFormat"][]
}

/**
 * Complete preferences store type
 */
export type PreferencesStore = PreferencesState & PreferencesActions

/**
 * Color focus store: which colour control is highlighted and the colour list
 * search. Elements are not stored here (they live in a module-level registry
 * in hooks/use-color-focus.ts), so no DOM node ends up in reactive state.
 */
export interface ColorFocusState {
  /** Currently highlighted color variable name */
  highlightTarget: string | null
  /** Colour list search query; kept across panel switches, reset on close. */
  colorSearch: string
  /**
   * The token a focusColor jump is opening, until its picker is highlighted
   * or the jump ends. Each Themer layout shows the Colors panel while it is
   * set: the sidebar layouts expand their sidebar, the Toolbar opens its
   * Colors popup.
   */
  focusRequest: string | null
}

/**
 * Color focus store actions
 */
export interface ColorFocusActions {
  /** Set the highlighted color */
  setHighlightTarget: (target: string | null) => void
  /** Set the colour list search query */
  setColorSearch: (query: string) => void
}

/**
 * Complete color focus store type
 */
export type ColorFocusStore = ColorFocusState & ColorFocusActions

/** The dialogs the Themer's actions open (one at a time). */
export type ThemerDialog = "code" | "importCss" | "contrast"

/**
 * Themer UI state
 */
export interface ThemerUIState {
  /** Whether the themer is open */
  isOpen: boolean
  /** Current active panel. */
  activePanel: "colors" | "typography" | "other"
  /**
   * The Themer layout the inspector was turned on in, or null when off. It
   * is active only while that layout is in force (useInspectorMode): each
   * layout inspects its own surface.
   */
  inspectorLayout: ThemerLayout | null
  /** Fullscreen preview layout flag (see utils/fullscreen.ts) */
  fullscreenPreview: boolean
  /** The open action dialog, whichever surface opened it. */
  dialog: ThemerDialog | null
}

/**
 * Themer UI actions
 */
export interface ThemerUIActions {
  /** Open the themer */
  open: () => void
  /** Close the themer */
  close: () => void
  /** Toggle the themer */
  toggle: () => void
  /** Set active panel */
  setActivePanel: (panel: ThemerUIState["activePanel"]) => void
  /** Toggle the inspector in the Themer layout in force */
  toggleInspector: (layout: ThemerLayout) => void
  /** Turn the inspector off */
  turnOffInspector: () => void
  /** Toggle fullscreen preview */
  toggleFullscreen: () => void
  /** Open an action's dialog, closing any other */
  openDialog: (dialog: ThemerDialog) => void
  /** Close the open dialog */
  closeDialog: () => void
}

/**
 * Complete Themer UI store type
 */
export type ThemerUIStore = ThemerUIState & ThemerUIActions
