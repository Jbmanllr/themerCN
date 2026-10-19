// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// The preset registry and its single resolution rule. Every reader of a
// preset's colours (applying, resetting, the "unsaved" indicator, the picker
// swatches) goes through resolvePresetStyles, tweakcn's
// mergePresetWithDefaults (utils/theme-preset-helper.ts): a preset only lists
// the keys it changes, and dark inherits the preset's light values before
// its own dark ones. Reading `preset.styles` directly shows stale or default
// dark colours for presets that only define light.
//
// Registry order: "default", tweakcn's catalog, then Host Presets from
// ThemerConfig.presets, which win on an id clash. Host specifics (a host's own brand preset) live in the host. The
// picker's order is not this one: getPresetIds lists "default" first, then
// sorts by label.
//
// Contract: configurePresets mutates `themePresets` in place and clears the
// resolved-styles cache; no other code may write to either.
//
// See: packages/themer/ARCHITECTURE.md (EditorStore)

import type { ThemePreset, ThemeStyleProps, ThemeStyles } from "../types"
import { defaultLightStyles, defaultDarkStyles } from "./defaults"
import { tweakcnThemePresets } from "./tweakcn-presets"

/** The registry's "default" preset: tweakcn's default theme (defaults.ts). */
const tweakcnDefaultThemePreset: ThemePreset = {
  id: "default",
  label: "Default",
  description: "The default tweakcn theme",
  source: "BUILT_IN",
  styles: {
    light: defaultLightStyles,
    dark: defaultDarkStyles,
  },
}

const tweakcnThemePresetsWithIds = Object.fromEntries(
  Object.entries(tweakcnThemePresets).map(([id, preset]) => {
    const themePreset = preset as typeof preset &
      Partial<Pick<ThemePreset, "label" | "source">>

    return [
      id,
      {
        id,
        source: themePreset.source ?? "BUILT_IN",
        ...themePreset,
        label: themePreset.label ?? id,
      },
    ]
  })
) as Record<string, ThemePreset>

const builtInThemePresets: Readonly<Record<string, ThemePreset>> = {
  default: tweakcnDefaultThemePreset,
  ...tweakcnThemePresetsWithIds,
}

/** The preset every unknown id resolves to. */
export const FALLBACK_PRESET_ID = "default"

/**
 * Live preset registry: built-ins plus registered Host Presets. The object
 * identity is stable (callers may hold it); `configurePresets` adds and
 * removes host entries in place.
 */
export const themePresets: Record<string, ThemePreset> = {
  ...builtInThemePresets,
}

const NO_HOST_PRESETS: readonly ThemePreset[] = []
let registeredHostPresets: readonly ThemePreset[] = NO_HOST_PRESETS
let configuredDefaultPresetId: string = FALLBACK_PRESET_ID
const resolvedStylesCache = new Map<string, ThemeStyles>()

export interface PresetRegistryConfig {
  /** Host presets (ThemerConfig.presets). Host wins on an id clash. */
  presets?: readonly ThemePreset[]
  /** Host default preset id (ThemerConfig.defaultPreset). */
  defaultPreset?: string
}

/**
 * Register Host Presets and the default preset id. Idempotent for the same
 * array; a new array replaces the previous Host Presets (restoring any
 * built-in a Host Preset had shadowed). Called by ThemerProvider during
 * render so the registry is complete before any child reads it.
 */
export function configurePresets({
  presets = NO_HOST_PRESETS,
  defaultPreset,
}: PresetRegistryConfig): void {
  if (presets !== registeredHostPresets) {
    for (const preset of registeredHostPresets) {
      const builtIn = builtInThemePresets[preset.id]
      if (builtIn) {
        themePresets[preset.id] = builtIn
      } else {
        Reflect.deleteProperty(themePresets, preset.id)
      }
    }
    for (const preset of presets) {
      themePresets[preset.id] = preset
    }
    registeredHostPresets = presets
    resolvedStylesCache.clear()
  }

  configuredDefaultPresetId =
    defaultPreset && hasPreset(defaultPreset)
      ? defaultPreset
      : FALLBACK_PRESET_ID
}

/** Whether a preset id is registered (built-in or host). */
export function hasPreset(presetId: string): boolean {
  return Object.hasOwn(themePresets, presetId)
}

/**
 * The host's default preset id (ThemerConfig.defaultPreset when registered,
 * otherwise "default").
 */
export function getDefaultPresetId(): string {
  return hasPreset(configuredDefaultPresetId)
    ? configuredDefaultPresetId
    : FALLBACK_PRESET_ID
}

/**
 * Whether the id names a theme from tweakcn's catalog, so tweakcn's registry
 * (`tweakcn.com/r/themes/<id>.json`) has it. Host presets are not there.
 */
export function isTweakcnPreset(presetId: string): boolean {
  return Object.hasOwn(tweakcnThemePresets, presetId)
}

function resolveModeHeading(
  resolved: ThemeStyleProps,
  ...declared: (Partial<ThemeStyleProps> | undefined)[]
): ThemeStyleProps {
  // A preset without a heading font uses its own serif for headings, not
  // the default heading stack (tweakcn presets have no heading slot).
  const declaresHeading = declared.some(
    (styles) => styles?.["font-heading"] !== undefined
  )
  return declaresHeading
    ? resolved
    : { ...resolved, "font-heading": resolved["font-serif"] }
}

/**
 * Full light and dark styles for a preset: defaults, then the preset's light
 * values, then (for dark) its dark values on top of its light ones, as
 * tweakcn's mergePresetWithDefaults. When neither the mode's own values nor
 * (for dark) the preset's light values declare `font-heading`, the mode's
 * resolved `font-serif` is its heading font (a themercn addition; tweakcn presets
 * have no heading slot). Unknown ids resolve to "default". The result is
 * cached per id and shared: treat it as read-only.
 */
export function resolvePresetStyles(presetId: string): ThemeStyles {
  const id = hasPreset(presetId) ? presetId : FALLBACK_PRESET_ID
  const cached = resolvedStylesCache.get(id)
  if (cached) return cached

  const presetStyles = themePresets[id]?.styles
  const light = presetStyles?.light
  const dark = presetStyles?.dark

  const resolved: ThemeStyles = {
    light: resolveModeHeading({ ...defaultLightStyles, ...light }, light),
    dark: resolveModeHeading(
      { ...defaultDarkStyles, ...light, ...dark },
      light,
      dark
    ),
  }
  resolvedStylesCache.set(id, resolved)
  return resolved
}

/** The quick-pick presets of the HSL adjustment controls. */
export const hslPresets = [
  // Hue adjustments
  {
    label: "Hue (-120°)",
    hueShift: -120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  { label: "Hue (-60°)", hueShift: -60, saturationScale: 1, lightnessScale: 1 },
  { label: "Hue (+60°)", hueShift: 60, saturationScale: 1, lightnessScale: 1 },
  {
    label: "Hue (+120°)",
    hueShift: 120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  { label: "Hue Invert", hueShift: 180, saturationScale: 1, lightnessScale: 1 },

  // Saturation adjustments
  { label: "Grayscale", hueShift: 0, saturationScale: 0, lightnessScale: 1 },
  { label: "Muted", hueShift: 0, saturationScale: 0.6, lightnessScale: 1 },
  { label: "Vibrant", hueShift: 0, saturationScale: 1.4, lightnessScale: 1 },

  // Lightness adjustments
  { label: "Dimmer", hueShift: 0, saturationScale: 1, lightnessScale: 0.8 },
  { label: "Brighter", hueShift: 0, saturationScale: 1, lightnessScale: 1.2 },

  // Combined adjustments
  {
    label: "Warm Muted",
    hueShift: 30,
    saturationScale: 0.5,
    lightnessScale: 0.95,
  },
  {
    label: "Cool Vivid",
    hueShift: -20,
    saturationScale: 1.2,
    lightnessScale: 1.05,
  },
  { label: "Pastel", hueShift: 20, saturationScale: 0.7, lightnessScale: 1.1 },
  {
    label: "Vintage",
    hueShift: -10,
    saturationScale: 0.75,
    lightnessScale: 0.95,
  },
  { label: "Neon", hueShift: 60, saturationScale: 1.5, lightnessScale: 1.1 },
] as const

/** Every registered preset id: "default" first, then by label. */
export function getPresetIds(): string[] {
  return Object.keys(themePresets).sort((a, b) => {
    if (a === FALLBACK_PRESET_ID) {
      return -1
    }
    if (b === FALLBACK_PRESET_ID) {
      return 1
    }
    return getPresetLabel(a).localeCompare(getPresetLabel(b))
  })
}

/**
 * Get preset label by ID
 */
export function getPresetLabel(presetId: string): string {
  return themePresets[presetId]?.label ?? presetId
}
