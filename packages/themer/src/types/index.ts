// The package's types: re-exports of the theme, font and editor types, plus
// ThemerProps (the public `<Themer>` props) and the preview-tab and
// extra-colour types it uses. ThemerProps and the types its props reference
// (ThemePreset, PartialThemeStyles, ThemerExtraColorGroup, ThemerExtraColor,
// ThemerLayout, ThemerColorMode, ThemerPreviewTab) leave the package
// (src/index.ts).

// Theme types
export type {
  ThemeColorKey,
  ThemeFontKey,
  ThemeShadowKey,
  ThemeSpacingKey,
  ThemeStyleKey,
  CommonStyleKey,
  ThemeStyleProps,
  ThemeModeStyles,
  ExtraColorValues,
  ThemeStyles,
  ThemeMode,
  HSLAdjustments,
  PartialThemeStyleProps,
  PartialThemeStyles,
  ThemePreset,
  SavedTheme,
  ColorFormat,
  TailwindVersion,
} from "./theme"

export {
  COLOR_GROUPS,
  COMMON_STYLE_KEYS,
  NON_COLOR_KEYS,
  isCommonStyleKey,
} from "./theme"

export type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  GoogleFont,
  GoogleFontAxis,
  GoogleFontFiles,
  GoogleFontsAPIResponse,
  PaginatedFontsResponse,
} from "./fonts"

// Editor types
export type {
  ThemeEditorState,
  HistoryEntry,
  PresetBaseline,
  SetThemeStateArg,
  ImportedThemeStyles,
  ImportThemeStylesOptions,
  EditorStoreState,
  EditorStoreActions,
  EditorStore,
  PreferencesState,
  PreferencesActions,
  PreferencesStore,
  PackageManager,
  ColorFocusState,
  ColorFocusActions,
  ColorFocusStore,
  ThemerUIState,
  ThemerUIActions,
  ThemerUIStore,
} from "./editor"

// Import for use in interfaces below
import type { ComponentType, ReactNode } from "react"
import type { ThemePreset } from "./theme"

// Component prop types, part of the public type surface. Nothing imports
// them: each component declares its own props next to its code.
export interface ColorPickerProps {
  /** Current color value */
  color: string
  /** Change handler */
  onChange: (color: string) => void
  /** Display label */
  label: string
  /** Variable name for focus tracking */
  name?: string
  /** Disabled state */
  disabled?: boolean
}

export interface SliderControlProps {
  /** Current value */
  value: number
  /** Change handler */
  onChange: (value: number) => void
  /** Display label */
  label: string
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Step increment */
  step: number
  /** Unit display (e.g., 'px', 'rem', '%') */
  unit?: string
  /** Disabled state */
  disabled?: boolean
}

export interface FontPickerProps {
  /** Current font family */
  value: string
  /** Change handler */
  onChange: (font: string) => void
  /** Font category (sans, serif, mono) */
  category: "sans" | "serif" | "mono"
  /** Display label */
  label: string
  /** Disabled state */
  disabled?: boolean
  /** Override the host-owned font catalog endpoint */
  fontCatalogEndpoint?: string
}

export interface PresetSelectProps {
  /** Currently selected preset */
  value: string
  /** Change handler */
  onChange: (preset: string) => void
  /** Available presets */
  presets?: Array<{ id: string; label: string }>
  /** Disabled state */
  disabled?: boolean
}

/**
 * A preview tab a Host adds next to the built-in ones (Live, Cards,
 * Dashboard, …). The component renders inside the Themer's preview area,
 * wrapped by `ThemerProps.previewWrapper`, outside the Themer's CSS scope
 * (the Host's own styles apply), and reads the live Theme from the CSS
 * variables the Themer writes on `<html>`.
 */
export interface ThemerPreviewTab {
  /**
   * Unique tab id; persisted as the selected tab (`previewTab` preference).
   * A host tab with a built-in id replaces that built-in tab.
   */
  id: string
  /** Label shown in the preview tab bar. */
  label: string
  /**
   * Tab content. Pass a `React.lazy` component so the host's preview code
   * loads only when the tab is opened (the preview area wraps it in Suspense).
   */
  component: ComponentType
  /** Scrolling of the tab body: vertical (default), both axes, or none. */
  scroll?: "y" | "xy" | "none"
  /**
   * Sort position among all tabs. Built-in tabs use 0, 10, 20, …; a Host tab
   * without `order` goes after them, in array order.
   */
  order?: number
}

/** One Host extra colour: a CSS custom property the editor also edits. */
export interface ThemerExtraColor {
  /**
   * CSS custom property name without `--`, kebab-case (`signal`,
   * `success-foreground`). Dropped (normalizeExtraColorGroups) when it is not
   * kebab-case, names a built-in style key, starts with `shadow-`, or repeats
   * an earlier key.
   */
  key: string
  /** Label shown in the colour list. */
  label: string
}

/**
 * A group of Host extra colours, listed after the built-in colour groups.
 * Titles should be unique: the section's persisted open state is keyed by a
 * slug of the title (getColorSectionId).
 */
export interface ThemerExtraColorGroup {
  /** Section heading in the colour list; keep it unique. */
  title: string
  /** Short text shown under the heading. */
  description?: string
  /** The tokens of the group, in display order. */
  colors: readonly ThemerExtraColor[]
}

/**
 * How the Themer UI is arranged on screen while it is open: the value of
 * `ThemerProps.layout`.
 * - `"workspace"`: covers the whole page, the sidebar beside the Preview.
 * - `"overlay"`: the sidebar floats over the Host app's real page, which
 *   stays usable beside it.
 * - `"push"`: the sidebar sits beside the Host app's real page and shifts it
 *   aside (`margin-inline-start` on `<html>`, `--themer-inset-inline-start`).
 * - `"toolbar"`: no sidebar; every control sits in a bar at the top of the
 *   Host app's real page, each group of controls in its own popup.
 */
export type ThemerLayout = "workspace" | "overlay" | "push" | "toolbar"

/** Light or dark: the value of `ThemerProps.colorMode`. */
export type ThemerColorMode = "light" | "dark"

/**
 * Props of `<Themer>`. Every prop is optional. Props that take arrays or
 * components (`presets`, `extraColors`, `previewTabs`, `previewWrapper`) must
 * be stable module-level values: a new identity re-registers or rebuilds them.
 */
export interface ThemerProps {
  /**
   * Preset a fresh Themer starts on when nothing is persisted yet, and the
   * fallback target of "reset" when the stored preset id no longer exists.
   * Must name a built-in or Host Preset; an unknown id falls back to
   * `"default"`.
   */
  defaultPreset?: string
  /**
   * Host Presets, listed after the built-in ones. On an id clash the Host
   * Preset wins, so a Preset with id `"default"` replaces the built-in
   * default. Pass a module-level constant.
   */
  presets?: readonly ThemePreset[]
  /**
   * Host colour tokens beyond the built-in shadcn colours. The Themer lists,
   * edits, applies, adjusts, imports and exports them like the built-in ones.
   * Pass a module-level constant.
   */
  extraColors?: readonly ThemerExtraColorGroup[]
  /**
   * Host preview tabs, merged with the built-in ones. Pass a module-level
   * constant with lazy components.
   */
  previewTabs?: readonly ThemerPreviewTab[]
  /**
   * Wraps every Host preview tab (not the built-in ones), so Host components
   * get the providers they need. Pass a stable module-level component.
   */
  previewWrapper?: ComponentType<{ children: ReactNode }>
  /**
   * Keyboard shortcut that toggles the Themer (default `"ctrl+shift+e"`; on
   * macOS Cmd stands in for ctrl).
   */
  shortcut?: string
  /**
   * Themer layout the Themer opens in (default `"workspace"`). The user can
   * switch from the Themer UI's header; their choice is remembered in this
   * browser and wins over this default. Below 1280 px every layout opens as
   * the same bottom drawer.
   */
  layout?: ThemerLayout
  /** Show the floating trigger button (default `true`). */
  showTrigger?: boolean
  /** Z-index of the Themer UI and the trigger (default: the Themer's own layers). */
  zIndex?: number
  /**
   * Prefix of the localStorage keys the Themer persists to (default
   * `"themercn"`):
   * - `<storageNamespace>:editor`: the edited Theme;
   * - `<storageNamespace>:preferences`: Themer UI choices (layout, colour
   *   format, preview tab, sidebar state, override on/off);
   * - `<storageNamespace>:color-mode`: the light/dark mode, saved only when
   *   the Themer owns the mode (`colorMode` and `onColorModeChange` unset).
   *
   * Give `getThemerHeadScript` / `<ThemerHeadScript>` the same value. Read
   * when the Themer mounts.
   */
  storageNamespace?: string
  /**
   * Controlled light/dark mode, for a Host app with its own mode state (a
   * theme library). Pass it with `onColorModeChange`; the Host keeps the
   * `.dark` class on `<html>`. Leave both unset and the Themer toggles `.dark`
   * on `<html>` itself and follows changes made by anyone else.
   */
  colorMode?: ThemerColorMode
  /** Called with the mode the user switched to, in controlled mode. */
  onColorModeChange?: (mode: ThemerColorMode) => void
  /**
   * Font catalog endpoint, answering
   * `GET ?q=&category=&limit=&offset=` with
   * `{ fonts, total, offset, limit, hasMore }`. Unset: the font picker
   * searches the bundled list in the browser.
   */
  fontCatalogEndpoint?: string
}

/**
 * What `<Themer>` passes to the internal ThemerProvider: the editor-facing
 * props (everything but storage and mode, which the Themer handles itself).
 */
export type ThemerConfig = Omit<
  ThemerProps,
  "storageNamespace" | "colorMode" | "onColorModeChange"
>

// Context types
export interface ThemerContextValue {
  /** Current configuration: the host's `config` merged over the defaults. */
  config: ThemerConfig
}
