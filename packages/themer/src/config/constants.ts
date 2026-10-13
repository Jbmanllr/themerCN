// The editor's tunable constants: timings, layers, sizes, shortcut and storage
// names, and the ranges and presets of the style controls.
//
// Contract: a constant is only as live as its readers. The notes below say
// which ones code reads today; a constant marked "no reader" changes no
// behavior when edited. A value mirrored in another file (Z_INDEX.portalPopup
// in host/themer.css, SHORTCUTS.undo and .redo in themerShortcuts) must be
// edited in both places.

/**
 * Most undo entries editor-store keeps; the oldest is dropped first. History
 * lives in memory only (the store does not persist it).
 */
export const MAX_HISTORY_COUNT = 30;

/**
 * An edit less than this long after the last undo entry was recorded joins
 * that entry instead of recording a new one (editor-store.ts). The window
 * runs from the entry, not from the latest edit.
 */
export const HISTORY_DEBOUNCE_MS = 500;

/**
 * Delay before a native or typed colour edit commits to the theme
 * (components/editor/color-picker.tsx).
 */
export const COLOR_INPUT_DEBOUNCE_MS = 150;

/**
 * How long the ring that marks a picker after focusColor stays on it
 * (hooks/use-color-focus.ts).
 */
export const HIGHLIGHT_ANIMATION_MS = 1500;

/**
 * Layers of the editor chrome. Read today: `trigger` and `sidebar` (the
 * floating trigger and the overlay, each unless the host sets
 * ThemerConfig.zIndex). `portalPopup` has no code reader: host/themer.css
 * repeats its value as a literal. `overlay`, `header`, `popover`, `modal` and
 * `inspector` have no reader.
 */
export const Z_INDEX = {
  trigger: 9990,
  overlay: 9999,
  sidebar: 10000,
  header: 10001,
  popover: 10002,
  modal: 10003,
  inspector: 10004,
  /**
   * Every Base UI popup layer while the editor is mounted. Mirrored as a
   * literal in host/themer.css (CSS cannot import it); keep the two equal.
   */
  portalPopup: 10060,
} as const;

/**
 * Editor sidebar widths, set as `--sidebar-width`/`--sidebar-width-icon` on
 * its own SidebarProvider. Wider than the app Sidebar's 16rem default in
 * @banter/ui (packages/ui/src/components/sidebar.tsx) to fit the controls.
 */
export const SIDEBAR_WIDTHS = {
  expanded: "20rem", // --sidebar-width (320px) - wider for better control layout
  collapsed: "3rem", // --sidebar-width-icon (48px)
} as const;

/**
 * Sidebar width in pixels. No reader.
 * @deprecated Use SIDEBAR_WIDTHS instead
 */
export const SIDEBAR_WIDTH = 380;

/**
 * Header height in pixels. No reader: the header, the sidebar header and the
 * action bar each set `h-12` (3rem, the same 48px) in their own classes.
 */
export const HEADER_HEIGHT = 48;

/**
 * Shortcut strings. `toggle` is the default of ThemerConfig.shortcut, read by
 * the provider (the binding), the floating trigger (its tooltip) and
 * `themerShortcuts.toggle`. It must stay out of the browsers' reserved set
 * (Cmd/Ctrl+Shift+T reopens a closed tab, +N and +W open and close windows,
 * +Q quits, +Tab switches tabs) and use no Option/Alt; `ctrl` also matches Cmd
 * on macOS. `undo` and `redo` are read for the action bar's tooltips only: their
 * bindings are `themerShortcuts` in hooks/use-keyboard-shortcut.ts, so a
 * changed undo or redo key must change there and here or the tooltip shows
 * the wrong key. `save` and `export` have no handler anywhere.
 */
export const SHORTCUTS = {
  toggle: "ctrl+shift+e",
  undo: "ctrl+z",
  redo: "ctrl+shift+z",
  save: "ctrl+s",
  export: "ctrl+e",
  inspector: "ctrl+i",
} as const;

/**
 * localStorage keys. `editor` and `preferences` are the persisted stores
 * (editor-store.ts, preferences-store.ts) and are also read by the
 * pre-hydration script (utils/theme-script.ts). `themes` has no reader: the
 * editor has no save-theme action.
 */
export const STORAGE_KEYS = {
  editor: "villa-themer-editor-state",
  preferences: "villa-themer-preferences",
  themes: "themer-saved-themes",
} as const;

/**
 * IndexedDB defaults for IndexedDBStorageAdapter, the saved-theme store that
 * no editor UI calls (README "Run it"). Only `name` and `stores.themes` are
 * read; `version` and `stores.preferences` have no reader.
 */
export const INDEXED_DB = {
  name: "themer-db",
  version: 1,
  stores: {
    themes: "themes",
    preferences: "preferences",
  },
} as const;

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
} as const;

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
    "Source Sans Pro",
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
} as const;

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
} as const;

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
>;

export type ControlRangeKey = keyof typeof CONTROL_RANGES;

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
} as const;

/**
 * Spacing presets in rem
 */
export const SPACING_PRESETS = {
  tight: "0.15rem",
  normal: "0.25rem",
  relaxed: "0.35rem",
} as const;

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
} as const;
