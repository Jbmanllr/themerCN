// The public type surface of @banter/themer: re-exports of the theme, font,
// and editor types, plus ThemerConfig (what a host passes to
// ThemerProvider) and the preview-tab and extra-colour types it uses.
//
// Contract: ThemerConfig is the host-facing API (Banter's hosts reach it
// through ThemerDevShell). Fields that take arrays or components (`presets`,
// `extraColors`, `previewTabs`, `previewWrapper`) must be passed as stable
// module-level values: a new identity re-registers or rebuilds them.
//
// See: packages/themer/docs/API.md (ThemerConfig)

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
} from "./theme";

export {
  COLOR_GROUPS,
  COMMON_STYLE_KEYS,
  NON_COLOR_KEYS,
  isCommonStyleKey,
} from "./theme";

export type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  GoogleFont,
  GoogleFontAxis,
  GoogleFontFiles,
  GoogleFontsAPIResponse,
  PaginatedFontsResponse,
} from "./fonts";

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
  ThemerOverlayState,
  ThemerOverlayActions,
  ThemerOverlayStore,
} from "./editor";

// Import for use in interfaces below
import type { ComponentType, ReactNode } from "react";
import type { ThemePreset } from "./theme";

// Component prop types, part of the public type surface. Nothing imports
// them: each component declares its own props next to its code.
export interface ColorPickerProps {
  /** Current color value */
  color: string;
  /** Change handler */
  onChange: (color: string) => void;
  /** Display label */
  label: string;
  /** Variable name for focus tracking */
  name?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface SliderControlProps {
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Display label */
  label: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Unit display (e.g., 'px', 'rem', '%') */
  unit?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface FontPickerProps {
  /** Current font family */
  value: string;
  /** Change handler */
  onChange: (font: string) => void;
  /** Font category (sans, serif, mono) */
  category: "sans" | "serif" | "mono";
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
  /** Override the host-owned font catalog endpoint */
  fontCatalogEndpoint?: string;
}

export interface PresetSelectProps {
  /** Currently selected preset */
  value: string;
  /** Change handler */
  onChange: (preset: string) => void;
  /** Available presets */
  presets?: Array<{ id: string; label: string }>;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * A preview tab a host adds next to the built-in ones (Cards, Dashboard, …).
 * The component renders inside the editor's preview area, wrapped by
 * `ThemerConfig.previewWrapper`, and reads the live theme from the CSS
 * variables the editor writes on <html>.
 */
export interface ThemerPreviewTab {
  /**
   * Unique tab id; persisted as the selected tab (`previewTab` preference).
   * A host tab with a built-in id replaces that built-in tab.
   */
  id: string;
  /** Label shown in the preview tab bar. */
  label: string;
  /**
   * Tab content. Pass a `React.lazy` component so the host's preview code
   * loads only when the tab is opened (the preview area wraps it in Suspense).
   */
  component: ComponentType;
  /** Scrolling of the tab body: vertical (default), both axes, or none. */
  scroll?: "y" | "xy" | "none";
  /**
   * Sort position among all tabs. Built-in tabs use 0, 10, 20, …; a host tab
   * without `order` goes after them, in array order.
   */
  order?: number;
}

/** One host extra colour: a CSS custom property the editor also edits. */
export interface ThemerExtraColor {
  /**
   * CSS custom property name without `--`, kebab-case (`signal`,
   * `success-foreground`). Dropped (normalizeExtraColorGroups) when it is not
   * kebab-case, names a built-in style key, starts with `shadow-`, or repeats
   * an earlier key.
   */
  key: string;
  /** Label shown in the colour list. */
  label: string;
}

/**
 * A group of host extra colours, listed after the built-in colour groups.
 * Titles should be unique: the section's persisted open state is keyed by a
 * slug of the title (getColorSectionId).
 */
export interface ThemerExtraColorGroup {
  title: string;
  description?: string;
  colors: readonly ThemerExtraColor[];
}

/** What a host passes to ThemerProvider as `config`, merged over defaults. */
export interface ThemerConfig {
  /**
   * Preset the editor starts from when nothing is persisted yet, and the
   * fallback target of "reset" when the stored preset id no longer exists.
   * Must name a built-in or host preset; an unknown id falls back to
   * "default".
   */
  defaultPreset?: string;
  /**
   * Host presets, listed after the built-in ones. On an id clash the host
   * preset wins (so a host can replace "default"). Pass a module-level
   * constant: a new array identity re-registers the presets.
   */
  presets?: readonly ThemePreset[];
  /**
   * Host colour tokens beyond the 32 built-in shadcn colours. The editor
   * lists, edits, applies, adjusts (HSL), imports and exports them like the
   * built-in ones; an extra the theme does not set shows the host's computed
   * CSS value and is not written to the page. Pass a module-level constant.
   */
  extraColors?: readonly ThemerExtraColorGroup[];
  /**
   * Keyboard shortcut that toggles the editor (default SHORTCUTS.toggle, "ctrl+shift+e"; on
   * macOS Cmd stands in for ctrl).
   */
  shortcut?: string;
  /** Show floating trigger button (default true) */
  showTrigger?: boolean;
  /**
   * Z-index of the overlay and the trigger. Unset: the overlay uses
   * Z_INDEX.sidebar and the trigger Z_INDEX.trigger (config/constants.ts).
   */
  zIndex?: number;
  /**
   * Endpoint the font picker searches the host's font catalog with (default
   * "/dev/themer/google-fonts", the route the hosts mount from src/host/).
   */
  fontCatalogEndpoint?: string;
  /**
   * Host preview tabs, merged with the built-in ones. Pass a module-level
   * constant with lazy components: a new array identity rebuilds the tab
   * list, and an eager import puts the host's preview code in the editor
   * chunk.
   */
  previewTabs?: readonly ThemerPreviewTab[];
  /**
   * Wraps every host preview tab (not the built-in ones), so host components
   * get the providers they need (i18n, query client, router context…). The
   * editor renders in a portal outside the host's tree. Pass a stable
   * module-level component.
   */
  previewWrapper?: ComponentType<{ children: ReactNode }>;
}

// Context types
export interface ThemerContextValue {
  /** Current configuration: the host's `config` merged over the defaults. */
  config: ThemerConfig;
  /** True once the client has hydrated (persisted theme state is readable). */
  isReady: boolean;
}
