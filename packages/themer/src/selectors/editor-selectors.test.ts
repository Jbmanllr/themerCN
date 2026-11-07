// Proves the untouched rule (isUntouchedPreset) and the should-adopt rule
// (shouldAdoptPreset) on plain inputs: no Preset registry and no store. The
// caller passes the resolved Preset styles, already Sidebar-synced while Sync
// is on for the untouched rule.
import { describe, expect, it } from "vitest"

import { defaultHSLAdjustments, defaultThemeState } from "../config/defaults"
import type { PresetBaseline, ThemeEditorState, ThemeStyles } from "../types"
import { applySidebarSync } from "../utils/sidebar-sync"
import { isUntouchedPreset, shouldAdoptPreset } from "./editor-selectors"

const brandStyles: ThemeStyles = {
  light: {
    ...defaultThemeState.styles.light,
    primary: "#111111",
    "sidebar-primary": "#999999",
  },
  dark: { ...defaultThemeState.styles.dark },
}
// The Host's new source for "brand".
const brandV2: ThemeStyles = {
  ...brandStyles,
  light: { ...brandStyles.light, primary: "#222222" },
}
const edited: ThemeStyles = {
  ...brandStyles,
  light: { ...brandStyles.light, primary: "#000000" },
}
// A Host Preset registered as "default", unlike the built-in one.
const hostDefault: ThemeStyles = {
  ...defaultThemeState.styles,
  light: { ...defaultThemeState.styles.light, primary: "#3457FF" },
}

function theme(
  styles: ThemeStyles,
  overrides: Partial<ThemeEditorState> = {}
): ThemeEditorState {
  return {
    ...defaultThemeState,
    preset: "brand",
    styles,
    hslAdjustments: defaultHSLAdjustments,
    ...overrides,
  }
}

const ownBaseline = (state: ThemeEditorState): PresetBaseline => ({
  preset: state.preset ?? "default",
  styles: state.styles,
})

const onOwnStyles = theme(brandStyles)
const hueShifted = { ...defaultHSLAdjustments, hueShift: 30 }
const synced = applySidebarSync(brandStyles)

const cases: [
  name: string,
  themeState: ThemeEditorState,
  baseline: PresetBaseline | null,
  presetStyles: ThemeStyles,
  untouched: boolean,
][] = [
  [
    "a baseline on the Theme's own styles object",
    onOwnStyles,
    ownBaseline(onOwnStyles),
    brandV2,
    true,
  ],
  [
    "a restored copy equal to its baseline",
    theme(structuredClone(brandStyles)),
    { preset: "brand", styles: brandStyles },
    brandV2,
    true,
  ],
  [
    "a missing HSL adjustment, counted as neutral",
    theme(brandStyles, { hslAdjustments: undefined }),
    { preset: "brand", styles: brandStyles },
    brandV2,
    true,
  ],
  [
    "a non-neutral HSL adjustment",
    theme(brandStyles, { hslAdjustments: hueShifted }),
    { preset: "brand", styles: brandStyles },
    brandV2,
    false,
  ],
  [
    "an edit off the baseline",
    theme(edited),
    { preset: "brand", styles: brandStyles },
    brandStyles,
    false,
  ],
  [
    "a baseline at another Preset",
    theme(brandStyles),
    { preset: "plain", styles: brandStyles },
    brandStyles,
    false,
  ],
  [
    "no baseline, already its Preset",
    theme(structuredClone(brandStyles)),
    null,
    brandStyles,
    true,
  ],
  [
    "no baseline, the fresh default then edited",
    theme(edited, { preset: "default" }),
    null,
    defaultThemeState.styles,
    false,
  ],
  [
    "no baseline, a non-neutral HSL adjustment",
    theme(brandStyles, { hslAdjustments: hueShifted }),
    null,
    brandStyles,
    false,
  ],
  [
    "Sync on: no baseline, a synced Theme against the synced Preset",
    theme(structuredClone(synced)),
    null,
    synced,
    true,
  ],
  [
    "Sync on: no baseline, an unsynced Theme against the synced Preset",
    theme(brandStyles),
    null,
    synced,
    false,
  ],
  [
    "Sync off: no baseline, a synced Theme against the unsynced Preset",
    theme(synced),
    null,
    brandStyles,
    false,
  ],
  [
    "a Host Preset replacing default, on the built-in default baseline",
    theme(defaultThemeState.styles, { preset: "default" }),
    { preset: "default", styles: defaultThemeState.styles },
    hostDefault,
    true,
  ],
  [
    "a Host Preset replacing default, no baseline on the built-in styles",
    theme(structuredClone(defaultThemeState.styles), { preset: "default" }),
    null,
    hostDefault,
    false,
  ],
]

describe("isUntouchedPreset", () => {
  it.each(cases)(
    "%s",
    (_name, themeState, baseline, presetStyles, untouched) => {
      expect(isUntouchedPreset(themeState, baseline, presetStyles)).toBe(
        untouched
      )
    }
  )
})

const adoptCases: [
  name: string,
  themeState: ThemeEditorState,
  presetId: string,
  presetStyles: ThemeStyles,
  adopt: boolean,
][] = [
  [
    "a fresh default Theme and another Preset id",
    defaultThemeState,
    "brand",
    brandStyles,
    true,
  ],
  [
    "a Theme on another Preset than the built-in default",
    theme(brandStyles),
    "plain",
    defaultThemeState.styles,
    false,
  ],
  [
    "the same id whose resolved styles equal the Theme's",
    defaultThemeState,
    "default",
    structuredClone(defaultThemeState.styles),
    false,
  ],
  [
    "a Host Preset replacing default: the same id, other styles",
    defaultThemeState,
    "default",
    hostDefault,
    true,
  ],
]

describe("shouldAdoptPreset", () => {
  it.each(adoptCases)(
    "%s",
    (_name, themeState, presetId, presetStyles, adopt) => {
      expect(shouldAdoptPreset(themeState, presetId, presetStyles)).toBe(adopt)
    }
  )
})
