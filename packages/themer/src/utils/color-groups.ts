// The colour list's structure: groups, labels, the ControlSection id of each
// group and the search filter. Pure data and functions, so the colour list,
// the focus jump (which section to open for a token) and tests share one
// source. The full list is the built-in groups followed by the host's extra
// colour groups (config/extra-colors.ts); the helpers default to it.
//
// Contract: the built-in groups hold the 32 shadcn colours; an extra group
// never repeats a built-in key (normalizeExtraColorGroups drops those). The
// group title fixes the persisted ControlSection id (getColorSectionId), so
// renaming a title resets that section's remembered open state.
//
// See: packages/themer/ARCHITECTURE.md ("Color System").

import { getExtraColorGroups } from "../config/extra-colors"
import type { ThemeColorKey } from "../types"

/** One colour row; built-in rows are typed by ThemeColorKey. */
export interface ColorGroupEntry<K extends string = string> {
  key: K
  label: string
}

export interface ColorGroup<K extends string = string> {
  title: string
  description?: string
  colors: readonly ColorGroupEntry<K>[]
}

/** The built-in shadcn colour groups. */
export const COLOR_LIST_GROUPS: readonly ColorGroup<ThemeColorKey>[] = [
  {
    title: "Base",
    description: "Background and text colors",
    colors: [
      { key: "background", label: "Background" },
      { key: "foreground", label: "Foreground" },
      { key: "card", label: "Card" },
      { key: "card-foreground", label: "Card Foreground" },
      { key: "popover", label: "Popover" },
      { key: "popover-foreground", label: "Popover Foreground" },
    ],
  },
  {
    title: "Primary & Secondary",
    description: "Main action colors",
    colors: [
      { key: "primary", label: "Primary" },
      { key: "primary-foreground", label: "Primary Foreground" },
      { key: "secondary", label: "Secondary" },
      { key: "secondary-foreground", label: "Secondary Foreground" },
    ],
  },
  {
    title: "Muted & Accent",
    description: "Subtle and highlight colors",
    colors: [
      { key: "muted", label: "Muted" },
      { key: "muted-foreground", label: "Muted Foreground" },
      { key: "accent", label: "Accent" },
      { key: "accent-foreground", label: "Accent Foreground" },
    ],
  },
  {
    title: "Destructive",
    description: "Error and warning colors",
    colors: [
      { key: "destructive", label: "Destructive" },
      { key: "destructive-foreground", label: "Destructive Foreground" },
    ],
  },
  {
    title: "UI Elements",
    description: "Borders, inputs, and focus rings",
    colors: [
      { key: "border", label: "Border" },
      { key: "input", label: "Input" },
      { key: "ring", label: "Ring" },
    ],
  },
  {
    title: "Chart",
    description: "Data visualization colors",
    colors: [
      { key: "chart-1", label: "Chart 1" },
      { key: "chart-2", label: "Chart 2" },
      { key: "chart-3", label: "Chart 3" },
      { key: "chart-4", label: "Chart 4" },
      { key: "chart-5", label: "Chart 5" },
    ],
  },
  {
    title: "Sidebar",
    description: "Sidebar-specific colors",
    colors: [
      { key: "sidebar", label: "Sidebar" },
      { key: "sidebar-foreground", label: "Sidebar Foreground" },
      { key: "sidebar-primary", label: "Sidebar Primary" },
      {
        key: "sidebar-primary-foreground",
        label: "Sidebar Primary Foreground",
      },
      { key: "sidebar-accent", label: "Sidebar Accent" },
      { key: "sidebar-accent-foreground", label: "Sidebar Accent Foreground" },
      { key: "sidebar-border", label: "Sidebar Border" },
      { key: "sidebar-ring", label: "Sidebar Ring" },
    ],
  },
]

let cachedExtraGroups: readonly ColorGroup[] | null = null
let cachedListGroups: readonly ColorGroup[] = COLOR_LIST_GROUPS

/**
 * The full colour list: built-in groups, then the registered host extra
 * groups. Same identity until the registration changes (memo-friendly), and
 * COLOR_LIST_GROUPS itself when the host has none.
 */
export function getColorListGroups(): readonly ColorGroup[] {
  const extras = getExtraColorGroups()
  if (extras !== cachedExtraGroups) {
    cachedExtraGroups = extras
    cachedListGroups =
      extras.length > 0 ? [...COLOR_LIST_GROUPS, ...extras] : COLOR_LIST_GROUPS
  }
  return cachedListGroups
}

/** ControlSection id of a colour group (persisted open state key). */
export function getColorSectionId(group: Pick<ColorGroup, "title">): string {
  return `colors-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
}

/** The group that holds a colour token, or undefined for unknown names. */
export function findColorGroup(
  name: string,
  groups: readonly ColorGroup[] = getColorListGroups()
): ColorGroup | undefined {
  return groups.find((group) =>
    group.colors.some((color) => color.key === name)
  )
}

/**
 * Groups matching a search query, each keeping only matching colours. A
 * colour matches on its label or key; a group title match keeps every colour
 * of the group. An empty query returns all groups unchanged.
 */
export function filterColorGroups(
  query: string,
  groups: readonly ColorGroup[] = getColorListGroups()
): readonly ColorGroup[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return groups
  return groups.flatMap((group) => {
    const titleMatches = group.title.toLowerCase().includes(needle)
    const colors = group.colors.filter(
      (color) =>
        titleMatches ||
        color.label.toLowerCase().includes(needle) ||
        color.key.toLowerCase().includes(needle)
    )
    return colors.length > 0 ? [{ ...group, colors }] : []
  })
}

/** Whether a token is visible in the list under a search query. */
export function colorMatchesSearch(
  name: string,
  query: string,
  groups: readonly ColorGroup[] = getColorListGroups()
): boolean {
  return filterColorGroups(query, groups).some((group) =>
    group.colors.some((color) => color.key === name)
  )
}
