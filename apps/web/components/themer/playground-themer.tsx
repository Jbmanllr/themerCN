"use client"

// The Playground's Themer: on everywhere, production included.
// Mirrors the "Next quick start" recipe in packages/themer/README.md: the
// loader is created once at module level and rendered beside the app tree,
// next-themes stays the source of truth for light/dark, and the font picker
// reads the catalog route in app/api/themer/fonts/route.ts.

import { useTheme } from "next-themes"
import { createThemerLoader } from "themercn/loader"

import { NIGHTJAR_PRESET_ID, playgroundPresets } from "@/lib/brand/nightjar"
import { FONT_CATALOG_ENDPOINT } from "@/lib/themer"

// Unconditional: the Playground always ships the Themer. A Host app that
// wants it off in some builds passes `null` here instead.
const ThemerLoader = createThemerLoader(() => import("themercn"))

export function PlaygroundThemer() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <ThemerLoader
      presets={playgroundPresets}
      defaultPreset={NIGHTJAR_PRESET_ID}
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      onColorModeChange={setTheme}
      fontCatalogEndpoint={FONT_CATALOG_ENDPOINT}
    />
  )
}
