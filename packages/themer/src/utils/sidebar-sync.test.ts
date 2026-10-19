// Proves Sidebar Sync as a pure rule: every sidebar colour is copied from its
// base twin in both modes without mutating the input, an already synced theme
// comes back as the same object, and the two maps agree.
import { describe, expect, it } from "vitest"

import { defaultThemeStyles } from "../config/defaults"
import type { ThemeStyles } from "../types"
import {
  BASE_TO_SIDEBAR_MAP,
  SIDEBAR_SYNC_MAP,
  applySidebarSync,
  isSidebarSynced,
} from "./sidebar-sync"

function unsynced(): ThemeStyles {
  return {
    light: {
      ...defaultThemeStyles.light,
      sidebar: "#123456",
      primary: "#ff0000",
    },
    dark: {
      ...defaultThemeStyles.dark,
      "sidebar-ring": "#abcdef",
      ring: "#00ff00",
    },
  }
}

describe("applySidebarSync", () => {
  it("copies every base colour onto its sidebar twin in both modes", () => {
    const synced = applySidebarSync(unsynced())
    for (const mode of ["light", "dark"] as const) {
      for (const [sidebarKey, baseKey] of Object.entries(SIDEBAR_SYNC_MAP)) {
        expect(synced[mode][sidebarKey as keyof typeof SIDEBAR_SYNC_MAP]).toBe(
          synced[mode][baseKey]
        )
      }
    }
    expect(synced.light.sidebar).toBe(synced.light.background)
    expect(synced.light["sidebar-primary"]).toBe("#ff0000")
    expect(synced.dark["sidebar-ring"]).toBe("#00ff00")
  })

  it("leaves non-sidebar keys alone and does not mutate its input", () => {
    const input = unsynced()
    const before = JSON.stringify(input)
    const synced = applySidebarSync(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(synced.light.primary).toBe("#ff0000")
    expect(synced.light["font-sans"]).toBe(input.light["font-sans"])
  })

  it("returns the same object when already synced", () => {
    const synced = applySidebarSync(unsynced())
    expect(applySidebarSync(synced)).toBe(synced)
    expect(isSidebarSynced(synced)).toBe(true)
    expect(isSidebarSynced(unsynced())).toBe(false)
  })

  it("maps each base key back to its sidebar twin", () => {
    expect(BASE_TO_SIDEBAR_MAP.background).toBe("sidebar")
    expect(BASE_TO_SIDEBAR_MAP["accent-foreground"]).toBe(
      "sidebar-accent-foreground"
    )
    expect(BASE_TO_SIDEBAR_MAP.card).toBeUndefined()
  })
})
