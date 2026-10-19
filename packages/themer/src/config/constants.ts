// The editor's tunable constants: timings, layers, sizes, shortcut and storage
// names, and the ranges and presets of the style controls. Internal: no
// package entry exports them.

/**
 * Most undo entries editor-store keeps; the oldest is dropped first. History
 * lives in memory only (the store does not persist it).
 */
export const MAX_HISTORY_COUNT = 30

/**
 * An edit less than this long after the last undo entry was recorded joins
 * that entry instead of recording a new one (editor-store.ts). The window
 * runs from the entry, not from the latest edit.
 */
export const HISTORY_DEBOUNCE_MS = 500

/**
 * Delay before a native or typed colour edit commits to the theme
 * (components/editor/color-picker.tsx).
 */
export const COLOR_INPUT_DEBOUNCE_MS = 150

/**
 * How long the ring that marks a picker after focusColor stays on it
 * (hooks/use-color-focus.ts).
 */
export const HIGHLIGHT_ANIMATION_MS = 1500

/**
 * Layers of the editor chrome: `trigger` (the floating trigger) and
 * `sidebar` (the Themer UI, whatever its layout), each unless the Host
 * sets ThemerConfig.zIndex. Popups take the layer one above the Themer UI's:
 * themer-root.tsx passes it to ThemerScope as `popupLayer`.
 */
export const Z_INDEX = {
  trigger: 9990,
  sidebar: 10000,
} as const

/**
 * Editor sidebar widths, set as `--sidebar-width`/`--sidebar-width-icon` on
 * its own SidebarProvider. Wider than the app Sidebar's 16rem default in
 * @workspace/ui (packages/ui/src/components/sidebar.tsx) to fit the controls.
 */
export const SIDEBAR_WIDTHS = {
  expanded: "20rem", // --sidebar-width (320px) - wider for better control layout
  collapsed: "3rem", // --sidebar-width-icon (48px)
} as const

/**
 * The editor's shortcuts, defined once. Bindings read them parsed, as
 * `themerShortcuts` (hooks/use-keyboard-shortcut.ts); tooltips format these
 * strings. `toggle` is the default of ThemerConfig.shortcut. It must stay out
 * of the browsers' reserved set (Cmd/Ctrl+Shift+T reopens a closed tab, +N
 * and +W open and close windows, +Q quits, +Tab switches tabs) and use no
 * Option/Alt; `ctrl` also matches Cmd on macOS.
 */
export const SHORTCUTS = {
  toggle: "ctrl+shift+e",
  undo: "ctrl+z",
  redo: "ctrl+shift+z",
  inspector: "ctrl+i",
} as const

/** Default `storageNamespace` of `<Themer>`. */
export const DEFAULT_STORAGE_NAMESPACE = "themercn"

/**
 * localStorage keys of a storage namespace. `editor` and `preferences` are
 * the persisted stores (editor-store.ts, preferences-store.ts); `colorMode`
 * is the light/dark mode an uncontrolled Themer owns (components/color-mode.tsx),
 * absent while the Host app controls the mode. The pre-hydration script
 * (utils/theme-script.ts) reads all three.
 */
export function getStorageKeys(namespace: string = DEFAULT_STORAGE_NAMESPACE) {
  return {
    editor: `${namespace}:editor`,
    preferences: `${namespace}:preferences`,
    colorMode: `${namespace}:color-mode`,
  } as const
}

/**
 * Versions of the persisted stores' entries (zustand persist `version`):
 * editor-store.ts and preferences-store.ts persist at them, and the
 * pre-hydration script (utils/theme-script.ts) ignores an entry saved at
 * another version. Bump one when its persisted shape changes; there are no
 * migrations (pre-release), so an entry of another version is dropped.
 * They live here, not in the stores, because the head-script entry must
 * reach no store code (scripts/check-entries.mjs).
 */
export const EDITOR_STATE_VERSION = 0
export const PREFERENCES_VERSION = 1

/**
 * Id of the <style> the pre-hydration script writes the saved Theme into.
 * ThemerProvider removes it once it applies the Theme itself.
 */
export const RESTORE_STYLE_ID = "themercn-restore"

/**
 * WCAG contrast ratio thresholds that utils/contrast-checker.ts grades a
 * foreground and background pair against.
 */
export const WCAG_CONTRAST = {
  /** Minimum for large text (AA) */
  AA_LARGE: 3,
  /** Minimum for normal text (AA) */
  AA_NORMAL: 4.5,
  /** Minimum for large text (AAA) */
  AAA_LARGE: 4.5,
  /** Minimum for normal text (AAA) */
  AAA_NORMAL: 7,
} as const

/**
 * Slider bounds for the numeric style controls. Ranges follow tweakcn's
 * controls (radius up to 5rem, shadow offsets and spread ±50px, blur in
 * half pixels); letter spacing keeps the finer 0.005em step this editor had.
 * Values outside a range (a preset such as `full`, or imported CSS) are
 * stored as given; the slider only clamps what it shows.
 */
export const CONTROL_RANGES = {
  radius: { min: 0, max: 5, step: 0.025, unit: "rem" },
  spacing: { min: 0.15, max: 0.35, step: 0.01, unit: "rem" },
  "letter-spacing": { min: -0.5, max: 0.5, step: 0.005, unit: "em" },
  "shadow-opacity": { min: 0, max: 1, step: 0.01, unit: "" },
  "shadow-blur": { min: 0, max: 50, step: 0.5, unit: "px" },
  "shadow-spread": { min: -50, max: 50, step: 0.5, unit: "px" },
  "shadow-offset-x": { min: -50, max: 50, step: 0.5, unit: "px" },
  "shadow-offset-y": { min: -50, max: 50, step: 0.5, unit: "px" },
} as const satisfies Record<
  string,
  { min: number; max: number; step: number; unit: "" | "px" | "rem" | "em" }
>

/**
 * Radius presets in rem. `full` stays a pill value (9999px); the radius
 * slider converts it and shows its maximum instead of getting stuck.
 */
export const RADIUS_PRESETS = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.625rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const

/**
 * Spacing presets in rem
 */
export const SPACING_PRESETS = {
  tight: "0.15rem",
  normal: "0.25rem",
  relaxed: "0.35rem",
} as const

/**
 * Letter spacing presets in em
 */
export const LETTER_SPACING_PRESETS = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const
