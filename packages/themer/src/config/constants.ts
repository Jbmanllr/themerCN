// The editor's tunable constants: timings, layers, sizes, shortcut and storage
// names, and the ranges and presets of the style controls.
//
// Contract: a constant is only as live as its readers. The notes below say
// which ones code reads today; a constant marked "no reader" changes no
// behavior when edited.

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
 * Layers of the editor chrome. Read today: `trigger` (the floating trigger)
 * and `sidebar` (the Themer UI, whatever its layout), each unless the Host
 * sets ThemerConfig.zIndex. Popups take the layer one above the Themer UI's:
 * themer-root.tsx passes it to ThemerScope as `popupLayer`. `header`,
 * `popover`, `modal` and `inspector` have no reader.
 */
export const Z_INDEX = {
  trigger: 9990,
  sidebar: 10000,
  header: 10001,
  popover: 10002,
  modal: 10003,
  inspector: 10004,
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
 * Sidebar width in pixels. No reader.
 * @deprecated Use SIDEBAR_WIDTHS instead
 */
export const SIDEBAR_WIDTH = 380

/**
 * Header height in pixels. No reader: the header, the sidebar header and the
 * action bar each set `h-12` (3rem, the same 48px) in their own classes.
 */
export const HEADER_HEIGHT = 48

/**
 * The editor's shortcuts, defined once. Bindings read them parsed, as
 * `themerShortcuts` (hooks/use-keyboard-shortcut.ts); tooltips format these
 * strings. `toggle` is the default of ThemerConfig.shortcut. It must stay out
 * of the browsers' reserved set (Cmd/Ctrl+Shift+T reopens a closed tab, +N
 * and +W open and close windows, +Q quits, +Tab switches tabs) and use no
 * Option/Alt; `ctrl` also matches Cmd on macOS. `save` and `export` have no
 * handler anywhere.
 */
export const SHORTCUTS = {
  toggle: "ctrl+shift+e",
  undo: "ctrl+z",
  redo: "ctrl+shift+z",
  save: "ctrl+s",
  export: "ctrl+e",
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
 * Google Fonts URL and starter family names. No reader: the font picker's
 * lists and URLs come from utils/font-loader.ts (GOOGLE_FONTS_CSS_URL,
 * FALLBACK_FONTS) and the catalog route.
 */
export const GOOGLE_FONTS = {
  apiUrl: "https://fonts.googleapis.com/css2",
  popularFonts: [
    "Inter",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Poppins",
    "Source Sans 3",
    "Nunito",
    "Raleway",
    "Ubuntu",
  ],
  popularSerifFonts: [
    "Merriweather",
    "Playfair Display",
    "Lora",
    "PT Serif",
    "Noto Serif",
    "Source Serif Pro",
    "Crimson Text",
    "Libre Baskerville",
    "EB Garamond",
    "Bitter",
  ],
  popularMonoFonts: [
    "JetBrains Mono",
    "Fira Code",
    "Source Code Pro",
    "Roboto Mono",
    "IBM Plex Mono",
    "Ubuntu Mono",
    "Inconsolata",
    "Space Mono",
    "Cousine",
    "Anonymous Pro",
  ],
} as const

/**
 * Shadow presets by size name. No reader: the shadow control edits the
 * individual `shadow-*` styles directly.
 */
export const SHADOW_PRESETS = {
  none: {
    blur: "0",
    spread: "0",
    offsetX: "0",
    offsetY: "0",
    opacity: "0",
  },
  sm: {
    blur: "2px",
    spread: "0",
    offsetX: "0",
    offsetY: "1px",
    opacity: "0.05",
  },
  md: {
    blur: "6px",
    spread: "-1px",
    offsetX: "0",
    offsetY: "4px",
    opacity: "0.1",
  },
  lg: {
    blur: "15px",
    spread: "-3px",
    offsetX: "0",
    offsetY: "10px",
    opacity: "0.1",
  },
  xl: {
    blur: "25px",
    spread: "-5px",
    offsetX: "0",
    offsetY: "20px",
    opacity: "0.1",
  },
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

export type ControlRangeKey = keyof typeof CONTROL_RANGES

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
