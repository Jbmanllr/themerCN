// The theme data model: the CSS custom properties a theme sets (named as the
// variables, without the `--`), one mode's styles, presets, saved themes, and
// the style-key families.
//
// Contract:
// - Each style-key family (colours, fonts, spacing, shadow inputs) has one
//   `as const` list here. Its union type and every derived list
//   (THEME_STYLE_KEYS, COLOR_STYLE_KEYS, COMMON_STYLE_KEYS, ThemeStyleProps)
//   are computed from it, so adding a token is one edit.
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
 * The 32 shadcn/ui colour variable names: the colour family's one source.
 * Every colour union and list derives from it.
 */
export const THEME_COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
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
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const

/**
 * Theme color variable names used in shadcn/ui
 */
export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number]

/**
 * Style keys that carry a font-family value: the font family's one source.
 * `font-heading` is the host's display face for headings; presets from
 * tweakcn have none and resolve it to their serif (resolvePresetStyles).
 */
export const THEME_FONT_KEYS = [
  "font-sans",
  "font-heading",
  "font-serif",
  "font-mono",
] as const

/**
 * Theme typography variable names
 */
export type ThemeFontKey = (typeof THEME_FONT_KEYS)[number]

/**
 * The six inputs tweakcn's shadow map is computed from: the shadow family's
 * one source.
 */
export const SHADOW_INPUT_KEYS = [
  "shadow-color",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
] as const

/**
 * Theme shadow variable names
 */
export type ThemeShadowKey = (typeof SHADOW_INPUT_KEYS)[number]

/**
 * Radius, spacing and letter spacing: the spacing family's one source.
 * `spacing` is the only optional key of ThemeStyleProps.
 */
export const THEME_SPACING_KEYS = [
  "radius",
  "spacing",
  "letter-spacing",
] as const

/**
 * Theme spacing variable names
 */
export type ThemeSpacingKey = (typeof THEME_SPACING_KEYS)[number]

/**
 * Joins key lists. A call rather than array spreads, so the bundler can drop
 * the derived lists from entries that use none of them (the head script and
 * the Next.js entry need only THEME_FONT_KEYS).
 */
function joinKeys<const Lists extends readonly (readonly string[])[]>(
  ...lists: Lists
): readonly Lists[number][number][] {
  return lists.flat()
}

/** Every built-in style key, family by family. */
export const THEME_STYLE_KEYS = /* @__PURE__ */ joinKeys(
  THEME_COLOR_KEYS,
  THEME_FONT_KEYS,
  THEME_SPACING_KEYS,
  SHADOW_INPUT_KEYS
)

/**
 * All theme style property keys
 */
export type ThemeStyleKey = (typeof THEME_STYLE_KEYS)[number]

/**
 * Style properties for a single theme mode (light or dark): every built-in
 * key, `spacing` optional. A type alias, not an interface, so it stays
 * assignable to ThemeModeStyles (an interface has no implicit index
 * signature).
 */
export type ThemeStyleProps = {
  [K in Exclude<ThemeStyleKey, "spacing">]: string
} & { spacing?: string }

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
 * A Preset's styles (`ThemePreset.styles`): per mode, only the tokens the
 * Preset changes. The Themer fills the rest from the built-in defaults.
 */
export interface PartialThemeStyles {
  /**
   * Light-mode tokens the Preset sets, keyed by token name without `--`
   * (`primary`, `radius`, `font-sans`, or a Host extra colour key).
   */
  light: PartialThemeStyleProps
  /**
   * Dark-mode tokens the Preset sets. A token left out here takes its value
   * from `light`, then from the built-in dark defaults.
   */
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
 * Style keys each mode holds its own value for: the 32 colours plus
 * `shadow-color`, because a dark theme usually needs a different shadow
 * colour. Host extra colours are not in it (config/extra-colors.ts).
 */
export const COLOR_STYLE_KEYS = /* @__PURE__ */ joinKeys(THEME_COLOR_KEYS, [
  "shadow-color",
] as const satisfies readonly ThemeShadowKey[])

/** A style key each mode holds its own value for. */
export type ColorStyleKey = (typeof COLOR_STYLE_KEYS)[number]

/** A style key that `updateCommonStyle` writes to both modes. */
export type CommonStyleKey = Exclude<ThemeStyleKey, ColorStyleKey>

const COLOR_STYLE_KEY_SET: ReadonlySet<string> = /* @__PURE__ */ new Set(
  COLOR_STYLE_KEYS
)

/** Narrow a style key to one shared by both modes. */
export function isCommonStyleKey(key: string): key is CommonStyleKey {
  return (
    !COLOR_STYLE_KEY_SET.has(key) &&
    (THEME_STYLE_KEYS as readonly string[]).includes(key)
  )
}

/**
 * Style keys shared by both modes (every key but the colours): fonts,
 * radius, spacing, letter-spacing and every shadow parameter but
 * shadow-color. The editor writes them to light and dark together
 * (updateCommonStyle), as tweakcn does, plus the heading font.
 */
export const COMMON_STYLE_KEYS: readonly CommonStyleKey[] =
  /* @__PURE__ */ THEME_STYLE_KEYS.filter(isCommonStyleKey)
