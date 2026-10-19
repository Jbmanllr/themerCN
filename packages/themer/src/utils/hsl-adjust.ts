// HSL adjustment maths for the "HSL Adjustments" control: shift every theme
// colour's hue and scale its saturation and lightness, from a base (the
// checkpoint), in both modes. Pure so the control's debounced updater stays
// trivial and the rules are testable. Host extra colours are adjusted when
// the caller passes their keys and the theme sets them; an unset extra stays
// unset (the host's CSS value is not the editor's to adjust).
//
// Contract: callers pass the base styles (the checkpoint taken before the first
// adjustment), never already adjusted ones, or each call compounds the last;
// at the neutral adjustment the result equals the base.
//
// See: packages/themer/ARCHITECTURE.md ("HSL Adjustments").

import { COLOR_STYLE_KEYS } from "../types/theme"
import type { HSLAdjustments, ThemeModeStyles, ThemeStyles } from "../types"
import { adjustColorByHsl } from "./color-converter"

/** True for the neutral adjustment (no hue shift, both scales 1). */
export function isIdentityHslAdjustment(adjustments: HSLAdjustments): boolean {
  return (
    adjustments.hueShift === 0 &&
    adjustments.saturationScale === 1 &&
    adjustments.lightnessScale === 1
  )
}

/**
 * One colour adjusted. The neutral adjustment, or an empty value, returns it
 * untouched.
 */
export function adjustColor(
  color: string,
  adjustments: HSLAdjustments
): string {
  if (!color || isIdentityHslAdjustment(adjustments)) return color
  return adjustColorByHsl(
    color,
    adjustments.hueShift,
    adjustments.saturationScale,
    adjustments.lightnessScale
  )
}

function adjustMode(
  styles: ThemeModeStyles,
  adjustments: HSLAdjustments,
  extraColorKeys: readonly string[]
): ThemeModeStyles {
  const next: ThemeModeStyles = { ...styles }
  // The adjustment touches the per-mode colours (shadow-color included).
  for (const key of COLOR_STYLE_KEYS) {
    const value = styles[key]
    if (value) next[key] = adjustColor(value, adjustments)
  }
  for (const key of extraColorKeys) {
    const value = styles[key]
    if (value) next[key] = adjustColor(value, adjustments)
  }
  return next
}

/**
 * Apply an adjustment to every per-mode colour of both modes, plus the given
 * Host extra colours (getExtraColorKeys()) that are set.
 */
export function adjustThemeStyles(
  base: ThemeStyles,
  adjustments: HSLAdjustments,
  extraColorKeys: readonly string[] = []
): ThemeStyles {
  return {
    light: adjustMode(base.light, adjustments, extraColorKeys),
    dark: adjustMode(base.dark, adjustments, extraColorKeys),
  }
}
