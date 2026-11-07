// The Theme fonts module: font categories and their fallbacks, quoting, the
// family a font-family value names, the Google families a Theme needs per
// mode and slot (derived once per Theme state), and their link URLs' inputs
// (the CSS API and the default weights), which the link registry
// (font-links.ts) builds from. Pure (no DOM, no fetch, no catalogue), so the
// head script (utils/theme-script.ts) imports from it without carrying the
// rest.
//
// Contract: never treat as a Google family a value that starts with
// `var(...)` (a host font the host already loads), a generic keyword or an OS
// family (Google answers 400 for those). theme-script.ts embeds
// GENERIC_FONT_FAMILIES, LOCAL_FONT_FAMILY_NAMES, GOOGLE_FONTS_CSS_URL and
// DEFAULT_FONT_WEIGHTS, so the inline script and the link registry
// (font-links.ts) skip the same names and link the same URLs; its ES5 copy of
// getGoogleFontFamily is held to this one by theme-script.test.ts's parity
// table.
import type { FontCategory } from "../types/fonts"
import { THEME_FONT_KEYS, type ThemeFontKey } from "../types/theme"

/** The editor's font slots; heading takes serif faces by default. */
export type ThemeFontRole = "sans" | "heading" | "serif" | "mono"

export const FONT_CATEGORIES: Record<
  FontCategory,
  { label: string; fallback: string }
> = {
  "sans-serif": {
    label: "Sans Serif",
    fallback: "ui-sans-serif, sans-serif, system-ui",
  },
  serif: {
    label: "Serif",
    fallback: "ui-serif, serif",
  },
  monospace: {
    label: "Monospace",
    fallback: "ui-monospace, monospace",
  },
  display: {
    label: "Display",
    fallback: "ui-serif, serif",
  },
  handwriting: {
    label: "Handwriting",
    fallback: "cursive",
  },
}

export const SYSTEM_FONTS = [
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
]

const roleToCategory: Record<ThemeFontRole, FontCategory> = {
  sans: "sans-serif",
  heading: "serif",
  serif: "serif",
  mono: "monospace",
}

function isThemeFontRole(value: string): value is ThemeFontRole {
  return Object.hasOwn(roleToCategory, value)
}

export function toFontCategory(
  category: ThemeFontRole | FontCategory
): FontCategory {
  if (isThemeFontRole(category)) return roleToCategory[category]
  return category
}

/** Generic keywords and CSS-wide values: never a family to fetch. */
export const GENERIC_FONT_FAMILIES = new Set([
  ...SYSTEM_FONTS,
  "system-ui",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
])

/**
 * A family name as CSS needs it in a font-family list. Names with spaces or
 * parts that are not CSS identifiers ("Source Serif 4") are quoted; generic
 * keywords, var() references and already quoted names are kept as they are
 * (quoting `serif` would turn the keyword into a family called "serif").
 */
export function quoteFontFamily(family: string): string {
  const name = family.trim()
  if (!name) return name
  if (/^(["']).*\1$/u.test(name) || name.startsWith("var(")) return name
  if (GENERIC_FONT_FAMILIES.has(name.toLowerCase())) return name
  if (/^-?[A-Za-z_][\w-]*$/u.test(name)) return name
  return `"${name.replace(/["\\]/gu, (char) => `\\${char}`)}"`
}

export function buildFontFamily(
  fontFamily: string,
  category: FontCategory
): string {
  return `${quoteFontFamily(fontFamily)}, ${FONT_CATEGORIES[category].fallback}`
}

/**
 * The Google family a font-family value starts with, or null when it starts
 * with a system/generic family or a var() reference (a host font such as
 * `var(--font-dm-sans), sans-serif`, which is already loaded by the host and
 * must not be requested from Google).
 */
export function extractFontFamily(
  fontFamilyValue: string | undefined | null
): string | null {
  if (!fontFamilyValue) return null

  const firstFont = fontFamilyValue.split(",")[0]?.trim() ?? ""
  if (firstFont.startsWith("var(")) return null
  const cleanFont = firstFont.replace(/['"]/g, "").trim()

  if (!cleanFont || GENERIC_FONT_FAMILIES.has(cleanFont.toLowerCase())) {
    return null
  }

  return cleanFont
}

/**
 * Families every desktop OS ships, which Google Fonts does not serve. Theme
 * values that name them are not requested from Google (it would answer 400).
 */
export const LOCAL_FONT_FAMILY_NAMES = [
  "arial",
  "cambria",
  "consolas",
  "courier",
  "courier new",
  "georgia",
  "helvetica",
  "helvetica neue",
  "menlo",
  "monaco",
  "segoe ui",
  "sfmono-regular",
  "tahoma",
  "times",
  "times new roman",
  "verdana",
] as const

const LOCAL_FONT_FAMILIES = new Set<string>(LOCAL_FONT_FAMILY_NAMES)

export function isLocalFontFamily(family: string): boolean {
  return LOCAL_FONT_FAMILIES.has(family.toLowerCase())
}

/** What a theme font value names, for the picker's label. */
export type FontValueDescription =
  /** A named first family. Whether Google serves it is the catalog's call. */
  | { kind: "family"; family: string }
  /** A `var(--x)` the host defines (e.g. next/font), resolved when it can be. */
  | { kind: "variable"; variable: string; family: string | null }
  /** Only generic or system names, e.g. `ui-sans-serif, system-ui`. */
  | { kind: "system"; generic: string }
  | { kind: "empty" }

/**
 * Describe a font-family value. `resolveVariable` reads a custom property
 * (normally from the document root's computed style); a value naming another
 * variable is followed a few levels deep.
 */
export function describeFontValue(
  value: string | undefined | null,
  resolveVariable?: (name: string) => string
): FontValueDescription {
  const first = value?.split(",")[0]?.trim() ?? ""
  if (!first) return { kind: "empty" }

  const variable = /^var\(\s*(--[\w-]+)/u.exec(first)?.[1]
  if (variable) {
    let resolved: string | null = null
    let current = variable
    for (let depth = 0; depth < 4 && resolveVariable; depth += 1) {
      const next = resolveVariable(current).trim()
      const nested = /^var\(\s*(--[\w-]+)/u.exec(next)?.[1]
      if (!nested) {
        resolved = extractFontFamily(next)
        break
      }
      current = nested
    }
    return { kind: "variable", variable, family: resolved }
  }

  const family = extractFontFamily(value)
  if (family) return { kind: "family", family }
  return { kind: "system", generic: first.replace(/['"]/g, "") }
}

/** The Google Fonts CSS API every Theme font link asks. */
export const GOOGLE_FONTS_CSS_URL = "https://fonts.googleapis.com/css2"

/**
 * The weights a Theme font link requests, by the head script and the link
 * registry alike; a family lacking one is retried at its default weight.
 */
export const DEFAULT_FONT_WEIGHTS = ["400", "500", "600", "700"] as const

/**
 * The Google family a font-family value names, or null for a host stack
 * (`var(...)`), a generic keyword or a family every OS ships.
 */
export function getGoogleFontFamily(
  fontFamilyValue: string | undefined | null
): string | null {
  const family = extractFontFamily(fontFamilyValue)
  return family && !isLocalFontFamily(family) ? family : null
}

/** One mode's Google family per font slot, null where it names none. */
export type ThemeFontSlots = Readonly<Record<ThemeFontKey, string | null>>

/** The Google fonts a Theme needs. */
export type ThemeFonts = {
  readonly light: ThemeFontSlots
  readonly dark: ThemeFontSlots
  /** Both modes' families, light first, in slot order, without duplicates. */
  readonly families: readonly string[]
}

type ThemeFontModeStyles = Partial<Record<ThemeFontKey, string>> | undefined

/** A Theme's styles as far as its fonts go: the store's `themeState.styles`. */
export type ThemeFontStyles = {
  readonly light?: ThemeFontModeStyles
  readonly dark?: ThemeFontModeStyles
}

// A literal over the slots, so the compiler rejects a missing one.
function slotsOf(styles: ThemeFontModeStyles): ThemeFontSlots {
  return {
    "font-sans": getGoogleFontFamily(styles?.["font-sans"]),
    "font-heading": getGoogleFontFamily(styles?.["font-heading"]),
    "font-serif": getGoogleFontFamily(styles?.["font-serif"]),
    "font-mono": getGoogleFontFamily(styles?.["font-mono"]),
  }
}

// Keyed by the Theme's styles object: the store replaces it on every Theme
// change, so the Host page's font loader and the Live frame apply of one
// Theme state share one derivation.
const themeFontsByStyles = new WeakMap<ThemeFontStyles, ThemeFonts>()

/**
 * The Google families a Theme names, per mode and slot and all together.
 * Derived once per styles object: pass the store's `themeState.styles`
 * itself, since a rebuilt object derives them again.
 */
export function getThemeFonts(styles: ThemeFontStyles): ThemeFonts {
  const cached = themeFontsByStyles.get(styles)
  if (cached) return cached

  const light = slotsOf(styles.light)
  const dark = slotsOf(styles.dark)
  const families = new Set<string>()
  for (const slots of [light, dark]) {
    for (const key of THEME_FONT_KEYS) {
      const family = slots[key]
      if (family) families.add(family)
    }
  }
  const fonts: ThemeFonts = { light, dark, families: [...families] }
  themeFontsByStyles.set(styles, fonts)
  return fonts
}
