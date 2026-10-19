// Preset resolution follows tweakcn's mergePresetWithDefaults: dark inherits
// the preset's light values before its own dark ones, and a preset with no
// heading font uses its serif for headings. The built-in catalog is
// "default" plus tweakcn's 42 presets, Host Presets win on an id clash (and
// a replaced built-in comes back when the host drops it), and the picker
// lists "default" first.
import { afterEach, describe, expect, it } from "vitest"

import type { ThemePreset } from "../types"
import { defaultDarkStyles, defaultLightStyles } from "./defaults"
import {
  configurePresets,
  getDefaultPresetId,
  getPresetIds,
  hasPreset,
  isTweakcnPreset,
  resolvePresetStyles,
  themePresets,
} from "./presets"
import { tweakcnThemePresets } from "./tweakcn-presets"

afterEach(() => {
  configurePresets({})
})

describe("resolvePresetStyles", () => {
  it("lets dark inherit a light value the preset does not override", () => {
    const preset: ThemePreset = {
      id: "test-light-only",
      label: "Light only",
      styles: {
        light: { primary: "#123456", "font-serif": "Lora, serif" },
        dark: { background: "#000000" },
      },
    }
    configurePresets({ presets: [preset] })

    const resolved = resolvePresetStyles("test-light-only")
    expect(resolved.light.primary).toBe("#123456")
    expect(resolved.dark.primary).toBe("#123456")
    expect(resolved.dark.background).toBe("#000000")
    expect(resolved.light.background).toBe(defaultLightStyles.background)
    expect(resolved.dark.card).toBe(defaultDarkStyles.card)
  })

  it("falls back to the preset's serif for the heading font", () => {
    const resolved = resolvePresetStyles("modern-minimal")
    const serif =
      tweakcnThemePresets["modern-minimal"].styles.light["font-serif"]
    expect(serif).toBeTruthy()
    expect(resolved.light["font-heading"]).toBe(serif)
    expect(resolved.dark["font-heading"]).toBe(serif)
  })

  it("keeps a heading font the preset declares", () => {
    configurePresets({
      presets: [
        {
          id: "test-heading",
          label: "Heading",
          styles: {
            light: { "font-heading": "Fraunces, serif" },
            dark: {},
          },
        },
      ],
    })
    expect(resolvePresetStyles("test-heading").dark["font-heading"]).toBe(
      "Fraunces, serif"
    )
  })

  it("resolves unknown ids to the default preset", () => {
    expect(resolvePresetStyles("no-such-preset")).toEqual(
      resolvePresetStyles("default")
    )
  })
})

describe("preset catalog", () => {
  it("is default plus tweakcn's 42 presets", () => {
    const ids = getPresetIds()
    expect(ids).toHaveLength(43)
    expect(ids.filter((id) => !isTweakcnPreset(id))).toEqual(["default"])
    for (const id of ["graphite", "violet-bloom", "neo-brutalism"]) {
      expect(themePresets[id]?.styles).toBe(
        tweakcnThemePresets[id as keyof typeof tweakcnThemePresets].styles
      )
    }
  })

  it("lists default first", () => {
    expect(getPresetIds()[0]).toBe("default")
  })
})

describe("host presets", () => {
  const host: ThemePreset = {
    id: "host-brand",
    label: "Host brand",
    styles: { light: { primary: "#ff0000" }, dark: {} },
  }

  it("registers host presets and the default preset id", () => {
    configurePresets({ presets: [host], defaultPreset: "host-brand" })
    expect(hasPreset("host-brand")).toBe(true)
    expect(getDefaultPresetId()).toBe("host-brand")
    expect(isTweakcnPreset("host-brand")).toBe(false)
  })

  it("falls back to default for an unknown default preset", () => {
    configurePresets({ defaultPreset: "missing" })
    expect(getDefaultPresetId()).toBe("default")
  })

  it("lets a host preset replace a built-in, and restores it after", () => {
    const original = themePresets["neo-brutalism"]
    const replacement: ThemePreset = {
      id: "neo-brutalism",
      label: "Host neo",
      styles: { light: { primary: "#00ff00" }, dark: {} },
    }
    configurePresets({ presets: [replacement] })
    expect(resolvePresetStyles("neo-brutalism").light.primary).toBe("#00ff00")

    configurePresets({ presets: [host] })
    expect(themePresets["neo-brutalism"]).toBe(original)
    expect(resolvePresetStyles("neo-brutalism").light.primary).not.toBe(
      "#00ff00"
    )
  })

  it("drops host presets that are no longer passed", () => {
    configurePresets({ presets: [host] })
    configurePresets({ presets: [] })
    expect(hasPreset("host-brand")).toBe(false)
  })
})
