// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Sidebar Sync: while the preference is on, every sidebar colour equals its
// base twin (sidebar -> background, sidebar-primary -> primary, ...) in BOTH
// modes. tweakcn syncs the current mode from a component effect; here the
// rule is a pure function over the whole ThemeStyles so the toggle, a base
// colour edit and the re-alignment after preset/undo/import all share it.
//
// See: packages/themer/ARCHITECTURE.md ("Sidebar Sync").

import type { ThemeColorKey, ThemeStyleProps, ThemeStyles } from "../types"

/** Sidebar colour -> the base colour it follows. */
export const SIDEBAR_SYNC_MAP = {
  sidebar: "background",
  "sidebar-foreground": "foreground",
  "sidebar-primary": "primary",
  "sidebar-primary-foreground": "primary-foreground",
  "sidebar-accent": "accent",
  "sidebar-accent-foreground": "accent-foreground",
  "sidebar-border": "border",
  "sidebar-ring": "ring",
} as const satisfies Partial<Record<ThemeColorKey, ThemeColorKey>>

type SidebarKey = keyof typeof SIDEBAR_SYNC_MAP

const SIDEBAR_ENTRIES = Object.entries(SIDEBAR_SYNC_MAP) as Array<
  [SidebarKey, (typeof SIDEBAR_SYNC_MAP)[SidebarKey]]
>

/** Base colour -> its sidebar twin. */
export const BASE_TO_SIDEBAR_MAP: Partial<Record<ThemeColorKey, SidebarKey>> =
  Object.fromEntries(SIDEBAR_ENTRIES.map(([sidebar, base]) => [base, sidebar]))

/** Whether a key is a sidebar colour driven by the sync. */
export function isSyncedSidebarKey(key: string): key is SidebarKey {
  return key in SIDEBAR_SYNC_MAP
}

function syncMode(styles: ThemeStyleProps): ThemeStyleProps {
  let next: ThemeStyleProps | null = null
  for (const [sidebarKey, baseKey] of SIDEBAR_ENTRIES) {
    const baseValue = styles[baseKey]
    if (baseValue !== undefined && styles[sidebarKey] !== baseValue) {
      next ??= { ...styles }
      next[sidebarKey] = baseValue
    }
  }
  return next ?? styles
}

/**
 * Copy each base colour onto its sidebar twin in both modes. Returns the
 * same object when nothing changes, so callers can skip a store write.
 */
export function applySidebarSync(styles: ThemeStyles): ThemeStyles {
  const light = syncMode(styles.light)
  const dark = syncMode(styles.dark)
  return light === styles.light && dark === styles.dark
    ? styles
    : { light, dark }
}

/** Whether every sidebar colour already equals its base twin. */
export function isSidebarSynced(styles: ThemeStyles): boolean {
  return applySidebarSync(styles) === styles
}
