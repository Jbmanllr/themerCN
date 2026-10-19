// Font family names for the theme editor: categories and their fallbacks,
// quoting, the family a font-family value names, and the families a theme's
// font keys name. Pure (no DOM, no fetch, no catalogue), so the head script
// (utils/theme-script.ts) imports from it without carrying the rest.
//
// Contract: never treat as a Google family a value that starts with
// `var(...)` (a host font the host already loads), a generic keyword or an OS
// family (Google answers 400 for those). theme-script.ts embeds
// GENERIC_FONT_FAMILIES and LOCAL_FONT_FAMILY_NAMES, so the inline script and
// the link registry (font-links.ts) skip the same names.
import type { FontCategory } from "../types/fonts"

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

export const SYSTEM_FONTS_FALLBACKS: Record<FontCategory, string> = {
  "sans-serif": FONT_CATEGORIES["sans-serif"].fallback,
  serif: FONT_CATEGORIES.serif.fallback,
  monospace: FONT_CATEGORIES.monospace.fallback,
  display: FONT_CATEGORIES.display.fallback,
  handwriting: FONT_CATEGORIES.handwriting.fallback,
}

export const fontFallbacks: Record<ThemeFontRole, readonly string[]> = {
  sans: ["ui-sans-serif", "sans-serif", "system-ui"],
  heading: ["ui-serif", "serif"],
  serif: ["ui-serif", "serif"],
  mono: ["ui-monospace", "monospace"],
}

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
  return `${quoteFontFamily(fontFamily)}, ${SYSTEM_FONTS_FALLBACKS[category]}`
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

/** Alias of extractFontFamily. */
export const extractGoogleFontFamily = extractFontFamily

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

/** Style keys that carry a font-family value. */
export const THEME_FONT_KEYS = [
  "font-sans",
  "font-heading",
  "font-serif",
  "font-mono",
] as const

/**
 * The Google families named by the theme's font keys, across the given style
 * sets (e.g. light and dark), without duplicates. Host stacks (`var(...)`)
 * and system families are skipped.
 */
export function getThemeFontFamilies(
  ...styleSets: ReadonlyArray<
    Partial<Record<(typeof THEME_FONT_KEYS)[number], string>> | undefined
  >
): string[] {
  const families = new Set<string>()
  for (const styles of styleSets) {
    if (!styles) continue
    for (const key of THEME_FONT_KEYS) {
      const family = extractFontFamily(styles[key])
      if (family && !isLocalFontFamily(family)) families.add(family)
    }
  }
  return [...families]
}

export function formatFontFamily(fonts: string[]): string {
  return fonts.map((font) => quoteFontFamily(font)).join(", ")
}

export function generateFontCSS(
  family: string,
  fallbacks: string[] = ["sans-serif"]
): string {
  return formatFontFamily([family, ...fallbacks])
}
