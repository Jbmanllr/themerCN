// WCAG 2 contrast maths for the editor's contrast dialog: the ratio between
// two colours, the AAA / AA / AA Large level it earns, and the theme token
// pairs the dialog rates (standardColorPairs).
//
// Contract: the thresholds come from WCAG_CONTRAST (config/constants.ts).
// There is no "A" level: large text needs 3:1 for AA and 4.5:1 for AAA, and
// "AA Large" is returned only for normal text that meets just the large-text
// 3:1, where it still fails.
//
// See: packages/themer/ARCHITECTURE.md ("Contrast Checker")
import * as culori from "culori"
import { WCAG_CONTRAST } from "../config/constants"
import type { ThemeStyleProps } from "../types"

/** WCAG relative luminance (0 to 1); an unparseable colour counts as black. */
function getLuminance(color: string): number {
  try {
    const parsed = culori.parse(color)
    if (!parsed) {
      console.warn(`Invalid color: ${color}`)
      return 0
    }

    return culori.wcagLuminance(parsed)
  } catch (error) {
    console.error(`Error calculating luminance: ${color}`, error)
    return 0
  }
}

/**
 * The WCAG contrast ratio between two colours, from 1 (identical luminance)
 * to 21 (black on white). An unparseable colour counts as black.
 */
export function getContrastRatio(color1: string, color2: string): number {
  try {
    const lum1 = getLuminance(color1)
    const lum2 = getLuminance(color2)

    // WCAG contrast ratio formula
    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
  } catch (error) {
    console.error(
      `Error calculating contrast between ${color1} and ${color2}:`,
      error
    )
    return 1
  }
}

/** A ratio as shown in the dialog: two decimals, e.g. `4.50:1`. */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}

/**
 * WCAG compliance levels. "AA Large" meets AA for large text only, so it is
 * returned for normal text and still fails there; large text rates "AA" from
 * the same ratio.
 */
export type WCAGLevel = "AAA" | "AA" | "AA Large" | "Fail"

/**
 * Check WCAG compliance for normal text, or for large text with `isLargeText`.
 */
export function checkWCAGCompliance(
  foreground: string,
  background: string,
  isLargeText = false
): { ratio: number; level: WCAGLevel; passes: boolean } {
  const ratio = getContrastRatio(foreground, background)

  let level: WCAGLevel
  let passes: boolean

  if (isLargeText) {
    if (ratio >= WCAG_CONTRAST.AAA_LARGE) {
      level = "AAA"
      passes = true
    } else if (ratio >= WCAG_CONTRAST.AA_LARGE) {
      level = "AA"
      passes = true
    } else {
      level = "Fail"
      passes = false
    }
  } else {
    if (ratio >= WCAG_CONTRAST.AAA_NORMAL) {
      level = "AAA"
      passes = true
    } else if (ratio >= WCAG_CONTRAST.AA_NORMAL) {
      level = "AA"
      passes = true
    } else if (ratio >= WCAG_CONTRAST.AA_LARGE) {
      level = "AA Large"
      passes = false // meets AA for large text only
    } else {
      level = "Fail"
      passes = false
    }
  }

  return { ratio, level, passes }
}

/**
 * A foreground/background token pair the contrast checker rates. `group`
 * optionally tags pairs that belong to one area (the sidebar pairs), so a
 * view can label or group them.
 */
export interface ContrastPair {
  fg: string
  bg: string
  label: string
  group?: string
}

/** The token pairs the contrast dialog rates for each mode. */
export const standardColorPairs: readonly ContrastPair[] = [
  { fg: "foreground", bg: "background", label: "Text on Background" },
  { fg: "primary-foreground", bg: "primary", label: "Primary Button Text" },
  {
    fg: "secondary-foreground",
    bg: "secondary",
    label: "Secondary Button Text",
  },
  { fg: "muted-foreground", bg: "muted", label: "Muted Text" },
  { fg: "accent-foreground", bg: "accent", label: "Accent Text" },
  {
    fg: "destructive-foreground",
    bg: "destructive",
    label: "Destructive Button Text",
  },
  { fg: "card-foreground", bg: "card", label: "Card Text" },
  { fg: "popover-foreground", bg: "popover", label: "Popover Text" },
  {
    fg: "sidebar-foreground",
    bg: "sidebar",
    label: "Sidebar Text",
    group: "Sidebar",
  },
  {
    fg: "sidebar-primary-foreground",
    bg: "sidebar-primary",
    label: "Sidebar Primary Text",
    group: "Sidebar",
  },
  {
    fg: "sidebar-accent-foreground",
    bg: "sidebar-accent",
    label: "Sidebar Accent Text",
    group: "Sidebar",
  },
]

/** One rated pair: the pair's tokens plus their values and WCAG result. */
export interface ContrastResult extends ContrastPair {
  foreground: string
  background: string
  ratio: number
  level: WCAGLevel
  passes: boolean
}

/**
 * Rate each pair (default standardColorPairs) against one mode's styles. A
 * pair with a missing or empty token is skipped; every rating is for normal
 * text.
 */
export function checkThemeContrast(
  styles: Partial<ThemeStyleProps> | Partial<Record<string, string>>,
  pairs: readonly ContrastPair[] = standardColorPairs
): ContrastResult[] {
  const values = styles as Partial<Record<string, string>>
  return pairs.flatMap((pair) => {
    const foreground = values[pair.fg]
    const background = values[pair.bg]
    if (!foreground || !background) return []
    const { ratio, level, passes } = checkWCAGCompliance(foreground, background)
    return [{ ...pair, foreground, background, ratio, level, passes }]
  })
}
