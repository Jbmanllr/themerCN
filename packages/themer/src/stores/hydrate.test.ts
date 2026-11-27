// @vitest-environment happy-dom
// Proves hydration trusts nothing it reads: a stored entry at the current
// version whose shape is wrong (hand-edited, or written by a bug) never
// reaches the stores. The editor starts fresh, as with nothing stored; the
// preferences keep their valid fields and take the defaults for the rest.
import { afterEach, describe, expect, it } from "vitest"

import {
  EDITOR_STATE_VERSION,
  PREFERENCES_VERSION,
  getStorageKeys,
} from "../config/constants"
import { defaultThemeState } from "../config/defaults"
import type { ThemeEditorState } from "../types"
import { useEditorStore } from "./editor-store"
import { hydrateThemerStores } from "./hydrate"
import { usePreferencesStore } from "./preferences-store"

let namespaces = 0

/** Stores the entries under a namespace of their own, then hydrates from it. */
function hydrate(entries: { editor?: unknown; preferences?: unknown }) {
  const namespace = `hydrate-test-${namespaces++}`
  const keys = getStorageKeys(namespace)
  if (entries.editor !== undefined) {
    localStorage.setItem(
      keys.editor,
      JSON.stringify({ state: entries.editor, version: EDITOR_STATE_VERSION })
    )
  }
  if (entries.preferences !== undefined) {
    localStorage.setItem(
      keys.preferences,
      JSON.stringify({
        state: entries.preferences,
        version: PREFERENCES_VERSION,
      })
    )
  }
  hydrateThemerStores(namespace, "light")
}

/** A Theme a user saved: the default with one edited colour. */
function savedTheme(): ThemeEditorState {
  return {
    ...defaultThemeState,
    styles: {
      light: { ...defaultThemeState.styles.light, primary: "#123456" },
      dark: { ...defaultThemeState.styles.dark },
    },
  }
}

afterEach(() => {
  localStorage.clear()
})

describe("a stored editor entry", () => {
  it("is restored when its shape is right", () => {
    hydrate({ editor: { themeState: savedTheme() } })

    const state = useEditorStore.getState()
    expect(state.themeState.styles.light.primary).toBe("#123456")
    expect(state.restoredFromStorage).toBe(true)
  })

  const theme = savedTheme()
  const withoutBackground = Object.fromEntries(
    Object.entries(theme.styles.light).filter(([key]) => key !== "background")
  )

  it.each<[string, unknown]>([
    ["is not an object", "themeState"],
    ["has no Theme", {}],
    ["has a Theme without styles", { themeState: { currentMode: "light" } }],
    [
      "has a mode that is not an object",
      { themeState: { ...theme, styles: { ...theme.styles, dark: null } } },
    ],
    [
      "has a style that is not a string",
      {
        themeState: {
          ...theme,
          styles: { ...theme.styles, dark: { ...theme.styles.dark, ring: 4 } },
        },
      },
    ],
    [
      "lacks a built-in style",
      {
        themeState: {
          ...theme,
          styles: { ...theme.styles, light: withoutBackground },
        },
      },
    ],
    [
      "has an unknown colour mode",
      { themeState: { ...theme, currentMode: "sepia" } },
    ],
    [
      "has HSL adjustments that are not numbers",
      { themeState: { ...theme, hslAdjustments: { hueShift: "10" } } },
    ],
    [
      "has a checkpoint that is not a Theme",
      { themeState: theme, themeCheckpoint: { styles: 1 } },
    ],
    [
      "has a Preset baseline without styles",
      { themeState: theme, presetBaseline: { preset: "default" } },
    ],
  ])("is ignored when it %s", (_case, stored) => {
    hydrate({ editor: stored })

    const state = useEditorStore.getState()
    expect(state.themeState.styles).toEqual(defaultThemeState.styles)
    expect(state.themeState.currentMode).toBe("light")
    expect(state.restoredFromStorage).toBe(false)
  })
})

describe("stored preferences", () => {
  const defaults = usePreferencesStore.getInitialState()

  it("keep their valid fields and take the defaults for the others", () => {
    hydrate({
      preferences: {
        sidebarCollapsed: true,
        packageManager: "bun",
        previewTab: "host-tab",
        sectionStates: { "colors-sidebar": true },
        tailwindVersion: "5",
        colorFormat: "cmyk",
        layout: "floating",
        themeOverrideEnabled: "no",
        colorSelectorTab: 3,
        removedPreference: 1,
      },
    })

    const state = usePreferencesStore.getState()
    expect(state.sidebarCollapsed).toBe(true)
    expect(state.packageManager).toBe("bun")
    expect(state.previewTab).toBe("host-tab")
    expect(state.sectionStates).toEqual({ "colors-sidebar": true })
    expect(state.tailwindVersion).toBe(defaults.tailwindVersion)
    expect(state.colorFormat).toBe(defaults.colorFormat)
    expect(state.layout).toBeNull()
    expect(state.themeOverrideEnabled).toBe(true)
    expect(state.colorSelectorTab).toBe(defaults.colorSelectorTab)
    expect(Object.keys(state)).toEqual(Object.keys(defaults))
  })

  it("take the default open states when one of them is not a boolean", () => {
    hydrate({ preferences: { sectionStates: { colors: "open" } } })

    expect(usePreferencesStore.getState().sectionStates).toEqual({})
  })

  it("take every default when the entry is not an object", () => {
    hydrate({ preferences: "preferences" })

    expect(usePreferencesStore.getState()).toEqual(defaults)
  })
})
