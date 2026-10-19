// The shadow scale must match tweakcn's getShadowMap (utils/shadows.ts @
// a3b47b37) so its presets look the same here. Expected strings are what
// tweakcn exports for neo-brutalism (hard 4px offset, no blur, opacity 1).
import { describe, expect, it } from "vitest"

import { resolvePresetStyles } from "../config/presets"
import { defaultThemeState } from "../config/defaults"
import type { ThemeEditorState } from "../types"
import {
  getShadowMap,
  getShadowParams,
  getShadowVariables,
  SHADOW_SCALE_KEYS,
} from "./shadows"

function stateFor(presetId: string): ThemeEditorState {
  return {
    ...defaultThemeState,
    preset: presetId,
    styles: resolvePresetStyles(presetId),
  }
}

const NEO_BRUTALISM = {
  "shadow-2xs": "4px 4px 0px 0px hsl(0 0% 0% / 0.50)",
  "shadow-xs": "4px 4px 0px 0px hsl(0 0% 0% / 0.50)",
  "shadow-sm":
    "4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 1px 2px -1px hsl(0 0% 0% / 1.00)",
  shadow:
    "4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 1px 2px -1px hsl(0 0% 0% / 1.00)",
  "shadow-md":
    "4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 2px 4px -1px hsl(0 0% 0% / 1.00)",
  "shadow-lg":
    "4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 4px 6px -1px hsl(0 0% 0% / 1.00)",
  "shadow-xl":
    "4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 8px 10px -1px hsl(0 0% 0% / 1.00)",
  "shadow-2xl": "4px 4px 0px 0px hsl(0 0% 0% / 2.50)",
}

describe("getShadowMap", () => {
  it("matches tweakcn for neo-brutalism in light", () => {
    expect(getShadowMap(stateFor("neo-brutalism"), "light")).toEqual(
      NEO_BRUTALISM
    )
  })

  it("gives dark the preset's light shadow when dark sets none", () => {
    expect(getShadowMap(stateFor("neo-brutalism"), "dark")).toEqual(
      NEO_BRUTALISM
    )
  })

  it("uses the requested mode, not the current one", () => {
    const state = stateFor("default")
    const dark = {
      ...state,
      styles: {
        ...state.styles,
        dark: { ...state.styles.dark, "shadow-offset-x": "7px" },
      },
    }
    expect(getShadowMap(dark, "dark").shadow.startsWith("7px ")).toBe(true)
    expect(getShadowMap(dark, "light").shadow.startsWith("0 ")).toBe(true)
  })

  it("keeps the scale and raw keys consumers read", () => {
    const variables = getShadowVariables(stateFor("default"))
    for (const key of SHADOW_SCALE_KEYS) {
      expect(variables[key]).toBeTruthy()
    }
    expect(Object.keys(variables)).toEqual(
      expect.arrayContaining([
        "shadow-x",
        "shadow-y",
        "shadow-blur-raw",
        "shadow-spread-raw",
        "shadow-opacity-raw",
        "shadow-color-raw",
      ])
    )
  })
})

// The shadow controls take their starting values from getShadowParams, so what
// a control shows for a theme that sets nothing is decided here: no fallback
// numbers of their own to drift from it.
describe("getShadowParams", () => {
  it("falls back to the soft default shadow when the theme sets nothing", () => {
    expect(getShadowParams({})).toEqual({
      color: "oklch(0 0 0)",
      opacity: 0.1,
      blur: 3,
      spread: 0,
      offsetX: 0,
      offsetY: 1,
    })
  })

  it("reads each stored value in px, whichever unit it was stored in", () => {
    expect(
      getShadowParams({
        "shadow-color": "#112233",
        "shadow-opacity": "0.4",
        "shadow-blur": "0.5rem",
        "shadow-spread": "-2px",
        "shadow-offset-x": "4px",
        "shadow-offset-y": "0",
      })
    ).toEqual({
      color: "#112233",
      opacity: 0.4,
      blur: 8,
      spread: -2,
      offsetX: 4,
      offsetY: 0,
    })
  })

  it("falls back per value for one that cannot be read, not for the whole shadow", () => {
    expect(
      getShadowParams({
        "shadow-opacity": "lots",
        "shadow-blur": "calc(1px + 2px)",
        "shadow-offset-x": "5px",
      })
    ).toMatchObject({ opacity: 0.1, blur: 3, offsetX: 5, offsetY: 1 })
  })
})
