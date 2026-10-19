// The theme data model: the CSS custom properties a theme sets (named as the
// variables, without the `--`), one mode's styles, presets, saved themes, and
// the key groups the editor UI is organised by.
//
// Contract:
// - ThemeStyleProps is every built-in key a mode stores: 32 colours, four
//   fonts, six shadow parameters, radius, spacing and letter-spacing.
//   ThemeModeStyles adds the host's extra colours on top.
// - COMMON_STYLE_KEYS (fonts, radius, spacing, letter-spacing, and every
//   shadow parameter but shadow-color) are written to light and dark
//   together (updateCommonStyle); colours, shadow-color included, stay per
//   mode.
// - A preset (PartialThemeStyles) lists only the keys it changes. Read its
//   colours through resolvePresetStyles (config/presets.ts), never from
//   `styles` directly.

/**
 * Theme color variable names used in shadcn/ui
 */
export type ThemeColorKey =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "border"
  | "input"
  | "ring"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "sidebar"
  | "sidebar-foreground"
  | "sidebar-primary"
  | "sidebar-primary-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"
  | "sidebar-border"
  | "sidebar-ring"

/**
 * Theme typography variable names
 */
export type ThemeFontKey =
  "font-sans" | "font-heading" | "font-serif" | "font-mono"

/**
 * Theme shadow variable names
 */
export type ThemeShadowKey =
  | "shadow-color"
  | "shadow-opacity"
  | "shadow-blur"
  | "shadow-spread"
  | "shadow-offset-x"
  | "shadow-offset-y"

/**
 * Theme spacing variable names
 */
export type ThemeSpacingKey = "radius" | "spacing" | "letter-spacing"

/**
 * All theme style property keys
 */
export type ThemeStyleKey =
  ThemeColorKey | ThemeFontKey | ThemeShadowKey | ThemeSpacingKey

/**
 * Style properties for a single theme mode (light or dark). A type alias, not
 * an interface, so it stays assignable to ThemeModeStyles (an interface has
 * no implicit index signature).
 */
export type ThemeStyleProps = {
  // Colors
  background: string
  foreground: string
  card: string
  "card-foreground": string
  popover: string
  "popover-foreground": string
  primary: string
  "primary-foreground": string
  secondary: string
  "secondary-foreground": string
  muted: string
  "muted-foreground": string
  accent: string
  "accent-foreground": string
  destructive: string
  "destructive-foreground": string
  border: string
  input: string
  ring: string
  "chart-1": string
  "chart-2": string
  "chart-3": string
  "chart-4": string
  "chart-5": string
  sidebar: string
  "sidebar-foreground": string
  "sidebar-primary": string
  "sidebar-primary-foreground": string
  "sidebar-accent": string
  "sidebar-accent-foreground": string
  "sidebar-border": string
  "sidebar-ring": string

  // Typography. `font-heading` is the host's display face for headings;
  // presets from tweakcn have none and resolve it to their serif
  // (resolvePresetStyles).
  "font-sans": string
  "font-heading": string
  "font-serif": string
  "font-mono": string

  // Shadows
  "shadow-color": string
  "shadow-opacity": string
  "shadow-blur": string
  "shadow-spread": string
  "shadow-offset-x": string
  "shadow-offset-y": string

  // Spacing
  radius: string
  spacing?: string
  "letter-spacing": string
}

/**
 * Values of Host extra colours (ThemerConfig.extraColors) by CSS custom
 * property name without `--`. Optional by nature: an extra a theme does not
 * set is absent, and the host's own CSS value shows.
 */
export type ExtraColorValues = { [extraKey: string]: string | undefined }

/**
 * One mode's styles as the editor stores them: every built-in key (typed as
 * in ThemeStyleProps) plus any Host extra colours that have a value.
 */
export type ThemeModeStyles = ThemeStyleProps & ExtraColorValues

/**
 * Complete theme styles containing both light and dark modes
 */
export interface ThemeStyles {
  light: ThemeModeStyles
  dark: ThemeModeStyles
}

/**
 * Theme mode type
 */
export type ThemeMode = "light" | "dark"

/**
 * HSL adjustment values for color manipulation: `hueShift` in degrees, the
 * two scales as multipliers (1 = unchanged). Neutral is `{ 0, 1, 1 }`
 * (defaultHSLAdjustments in config/defaults.ts).
 */
export interface HSLAdjustments {
  hueShift: number
  saturationScale: number
  lightnessScale: number
}

/**
 * Partial style properties for presets (only define colors you want to
 * override). Host extra colours may be included; a preset that leaves one
 * out leaves it unset.
 */
export type PartialThemeStyleProps = Partial<ThemeStyleProps> & ExtraColorValues

/**
 * Partial theme styles for presets
 */
export interface PartialThemeStyles {
  light: PartialThemeStyleProps
  dark: PartialThemeStyleProps
}

/**
 * A Preset: a named Theme the preset picker offers as a starting point.
 * `styles` lists only the keys the Preset changes; the Themer fills the rest
 * from the built-in defaults (internally, resolvePresetStyles).
 */
export interface ThemePreset {
  /**
   * Unique id, persisted as the Theme's preset. A Host Preset with a
   * built-in id replaces that built-in Preset.
   */
  id: string
  /** Name shown in the preset picker, which sorts by it. */
  label: string
  /** Free-form description; the Themer UI does not show it. */
  description?: string
  /** Free-form origin tag; the Themer UI does not read it. */
  source?: string
  /**
   * Date string (ISO 8601). The picker shows a "New" badge for 5 days after
   * it.
   */
  createdAt?: string
  /**
   * Token values by mode, CSS custom property names without `--` (`primary`,
   * `font-sans`, `radius`, and any Host extra colour). Light is laid over the
   * defaults; dark is laid over the Preset's resolved light values.
   */
  styles: PartialThemeStyles
}

/**
 * A saved theme record. Nothing in the Themer UI saves or lists these.
 */
export interface SavedTheme {
  id: string
  name: string
  description?: string
  styles: ThemeStyles
  preset?: string
  hslAdjustments?: HSLAdjustments
  createdAt: string
  updatedAt: string
  createdBy?: string
  isPublic?: boolean
  previewImage?: string
}

/**
 * Color format for export
 */
export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch"

/**
 * Tailwind version for export
 */
export type TailwindVersion = "3" | "4"

/**
 * Color groups for organizing the editor UI
 */
export const COLOR_GROUPS = {
  base: [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
  ],
  semantic: [
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
  ],
  ui: ["border", "input", "ring"],
  chart: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
} as const

/**
 * Style keys shared by both modes: the editor writes them to light and dark
 * together (updateCommonStyle), as tweakcn does (config/theme.ts COMMON_STYLES)
 * plus the heading font. Shadow colour stays per mode, because a dark theme
 * usually needs a different shadow colour; every other shadow parameter is
 * common.
 */
export const COMMON_STYLE_KEYS = [
  "font-sans",
  "font-heading",
  "font-serif",
  "font-mono",
  "radius",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
  "spacing",
] as const satisfies readonly ThemeStyleKey[]

/** A style key that `updateCommonStyle` writes to both modes. */
export type CommonStyleKey = (typeof COMMON_STYLE_KEYS)[number]

/** Narrow a style key to one shared by both modes. */
export function isCommonStyleKey(key: string): key is CommonStyleKey {
  return (COMMON_STYLE_KEYS as readonly string[]).includes(key)
}

/**
 * Style keys that are not colors
 */
export const NON_COLOR_KEYS: ThemeStyleKey[] = [
  "font-sans",
  "font-heading",
  "font-serif",
  "font-mono",
  "radius",
  "spacing",
  "letter-spacing",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
]
