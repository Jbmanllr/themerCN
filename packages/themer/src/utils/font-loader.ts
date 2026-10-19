// Google Fonts for the theme editor: family-name helpers, a per-document
// reference-counted <link> registry, and the catalogue fetch and paging that
// packages/themer/src/api/font-catalog.ts serves to the picker, with the
// bundled fallback catalogue.
//
// Why a registry: fonts are per document (the host page and the Live iframe
// each need their own links) and several holders (the theme, the picker's
// previews, an iframe) ask for the same families. One reference-counted link
// per family avoids duplicates and lets a link go when nothing uses it.
//
// Contract: never request from Google a value that starts with `var(...)` (a
// host font the host already loads), a generic keyword or an OS family (Google
// answers 400 for those). theme-script.ts embeds GENERIC_FONT_FAMILIES and
// LOCAL_FONT_FAMILY_NAMES, so the inline script and this module skip the same
// names. Shipped fonts load through next/font; this module is a development
// preview mechanism.
//
// See: packages/themer/ARCHITECTURE.md ("Font link registry").
import type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  GoogleFont,
  GoogleFontsAPIResponse,
  PaginatedFontsResponse,
} from "../types/fonts"

export type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  GoogleFont,
  PaginatedFontsResponse,
}

/** The editor's font slots; heading takes serif faces by default. */
export type ThemeFontRole = "sans" | "heading" | "serif" | "mono"
type FontWeight = number | string

export const GOOGLE_FONTS_API_URL =
  "https://www.googleapis.com/webfonts/v1/webfonts"
export const GOOGLE_FONTS_CSS_URL = "https://fonts.googleapis.com/css2"

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

/**
 * The bundled catalogue: ~130 popular Latin families from Google's public
 * metadata (fonts.google.com/metadata/fonts, October 2026), grouped by
 * Google's category. Each entry is what transformGoogleFontsMetadata would
 * produce for it (upright weights; variable when it has axes), so the picker
 * never requests a weight Google does not serve.
 */
export const POPULAR_FONTS: Record<FontCategory, FontInfo[]> = {
  "sans-serif": [
    {
      family: "Inter",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Roboto",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Open Sans",
      category: "sans-serif",
      variants: ["300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Lato",
      category: "sans-serif",
      variants: ["100", "300", "400", "700", "900"],
      variable: false,
    },
    {
      family: "Montserrat",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Poppins",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: false,
    },
    {
      family: "Source Sans 3",
      category: "sans-serif",
      variants: ["200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Nunito",
      category: "sans-serif",
      variants: [
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
        "1000",
      ],
      variable: true,
    },
    {
      family: "Raleway",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Plus Jakarta Sans",
      category: "sans-serif",
      variants: ["200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Geist",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Bebas Neue",
      category: "sans-serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Fredoka",
      category: "sans-serif",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Google Sans",
      category: "sans-serif",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Roboto Condensed",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "DM Sans",
      category: "sans-serif",
      variants: [
        "100",
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
        "1000",
      ],
      variable: true,
    },
    {
      family: "Arimo",
      category: "sans-serif",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Oswald",
      category: "sans-serif",
      variants: ["200", "300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Ubuntu",
      category: "sans-serif",
      variants: ["300", "400", "500", "700"],
      variable: false,
    },
    {
      family: "Outfit",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Nunito Sans",
      category: "sans-serif",
      variants: [
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
        "1000",
      ],
      variable: true,
    },
    {
      family: "Work Sans",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Quicksand",
      category: "sans-serif",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Rubik",
      category: "sans-serif",
      variants: ["300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Archivo",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Manrope",
      category: "sans-serif",
      variants: ["200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Barlow",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: false,
    },
    {
      family: "IBM Plex Sans",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Fira Sans",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: false,
    },
    {
      family: "Bricolage Grotesque",
      category: "sans-serif",
      variants: ["200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Figtree",
      category: "sans-serif",
      variants: ["300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Inter Tight",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Smooch Sans",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "PT Sans",
      category: "sans-serif",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Archivo Black",
      category: "sans-serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Barlow Condensed",
      category: "sans-serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: false,
    },
  ],
  serif: [
    {
      family: "Playfair Display",
      category: "serif",
      variants: ["400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Merriweather",
      category: "serif",
      variants: ["300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Lora",
      category: "serif",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "PT Serif",
      category: "serif",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Noto Serif",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Source Serif 4",
      category: "serif",
      variants: ["200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Libre Baskerville",
      category: "serif",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "EB Garamond",
      category: "serif",
      variants: ["400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Crimson Text",
      category: "serif",
      variants: ["400", "600", "700"],
      variable: false,
    },
    {
      family: "Bitter",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Roboto Slab",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Cormorant Garamond",
      category: "serif",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Instrument Serif",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Fraunces",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "DM Serif Display",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Newsreader",
      category: "serif",
      variants: ["200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Arvo",
      category: "serif",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Bodoni Moda",
      category: "serif",
      variants: ["400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Domine",
      category: "serif",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "IBM Plex Serif",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700"],
      variable: false,
    },
    {
      family: "Cormorant",
      category: "serif",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Roboto Serif",
      category: "serif",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Sanchez",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Cinzel",
      category: "serif",
      variants: ["400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Slabo 13px",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Slabo 27px",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Cardo",
      category: "serif",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Bree Serif",
      category: "serif",
      variants: ["400"],
      variable: false,
    },
  ],
  monospace: [
    {
      family: "JetBrains Mono",
      category: "monospace",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Fira Code",
      category: "monospace",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Source Code Pro",
      category: "monospace",
      variants: ["200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Roboto Mono",
      category: "monospace",
      variants: ["100", "200", "300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "IBM Plex Mono",
      category: "monospace",
      variants: ["100", "200", "300", "400", "500", "600", "700"],
      variable: false,
    },
    {
      family: "Space Mono",
      category: "monospace",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Ubuntu Mono",
      category: "monospace",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Inconsolata",
      category: "monospace",
      variants: ["200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Geist Mono",
      category: "monospace",
      variants: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Anonymous Pro",
      category: "monospace",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Courier Prime",
      category: "monospace",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "DM Mono",
      category: "monospace",
      variants: ["300", "400", "500"],
      variable: false,
    },
    {
      family: "Google Sans Code",
      category: "monospace",
      variants: ["300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "PT Mono",
      category: "monospace",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Cutive Mono",
      category: "monospace",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Fira Mono",
      category: "monospace",
      variants: ["400", "500", "700"],
      variable: false,
    },
    {
      family: "Share Tech Mono",
      category: "monospace",
      variants: ["400"],
      variable: false,
    },
    {
      family: "VT323",
      category: "monospace",
      variants: ["400"],
      variable: false,
    },
  ],
  display: [
    {
      family: "Abril Fatface",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Righteous",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Lobster",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Comfortaa",
      category: "display",
      variants: ["300", "400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Alfa Slab One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Bungee",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Lilita One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Black Ops One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Changa One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Lobster Two",
      category: "display",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Gravitas One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Oleo Script",
      category: "display",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Titan One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Luckiest Guy",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Press Start 2P",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Bangers",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Patua One",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Special Elite",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Chelsea Market",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Audiowide",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Oxanium",
      category: "display",
      variants: ["200", "300", "400", "500", "600", "700", "800"],
      variable: true,
    },
    {
      family: "Passion One",
      category: "display",
      variants: ["400", "700", "900"],
      variable: false,
    },
    {
      family: "Tektur",
      category: "display",
      variants: ["400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Playball",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Forum",
      category: "display",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Gabarito",
      category: "display",
      variants: ["400", "500", "600", "700", "800", "900"],
      variable: true,
    },
  ],
  handwriting: [
    {
      family: "Permanent Marker",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Dancing Script",
      category: "handwriting",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Pacifico",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Caveat",
      category: "handwriting",
      variants: ["400", "500", "600", "700"],
      variable: true,
    },
    {
      family: "Satisfy",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Great Vibes",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Sacramento",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Kalam",
      category: "handwriting",
      variants: ["300", "400", "700"],
      variable: false,
    },
    {
      family: "Patrick Hand",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Indie Flower",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Shadows Into Light",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Zeyada",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Yellowtail",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Allura",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Kaushan Script",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Courgette",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Architects Daughter",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Homemade Apple",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Gloria Hallelujah",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
    {
      family: "Tangerine",
      category: "handwriting",
      variants: ["400", "700"],
      variable: false,
    },
    {
      family: "Merienda",
      category: "handwriting",
      variants: ["300", "400", "500", "600", "700", "800", "900"],
      variable: true,
    },
    {
      family: "Pinyon Script",
      category: "handwriting",
      variants: ["400"],
      variable: false,
    },
  ],
}

// Pure, so entries that need only the name lists (head-script) drop the catalogue.
export const FALLBACK_FONTS: FontInfo[] =
  /* @__PURE__ */ Object.values(POPULAR_FONTS).flat()

function normalizeWeights(weights: readonly FontWeight[]): string[] {
  return weights.map((weight) => String(weight))
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

/** The upright numeric weights a catalogue variant list can name. */
const NUMERIC_FONT_WEIGHTS: ReadonlySet<string> = new Set([
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
])

/**
 * The weights to request for a family's catalogue variants, ascending: its
 * 400, 500, 600 and 700 when it has them, topped up with its other upright
 * numeric weights to at most four; a family with none of those gets its first
 * two numeric weights, and one with no numeric weight gets `["400"]`.
 */
export function getDefaultWeights(variants: string[]): string[] {
  const availableWeights = variants.filter((variant) =>
    NUMERIC_FONT_WEIGHTS.has(variant)
  )

  if (availableWeights.length === 0) return ["400"]

  const preferredWeights = ["400", "500", "600", "700"]
  const selectedWeights = preferredWeights.filter((weight) =>
    availableWeights.includes(weight)
  )

  if (selectedWeights.length === 0) {
    return availableWeights.slice(0, 2).sort((a, b) => Number(a) - Number(b))
  }

  return [
    ...selectedWeights,
    // react-doctor-disable-next-line react-doctor/js-set-map-lookups -- selectedWeights holds at most the four preferred weights, so building a Set would cost more than the scan
    ...availableWeights.filter((weight) => !selectedWeights.includes(weight)),
  ]
    .slice(0, 4)
    .sort((a, b) => Number(a) - Number(b))
}

const DEFAULT_THEME_WEIGHTS = ["400", "500", "600", "700"] as const

export function buildFontCssUrl(
  family: string,
  weights: readonly FontWeight[] = DEFAULT_THEME_WEIGHTS
): string {
  const weightsParam = normalizeWeights(weights).join(";")
  return `${GOOGLE_FONTS_CSS_URL}?family=${encodeURIComponent(
    family
  )}:wght@${weightsParam}&display=swap`
}

/** The family at its default weight: what Google serves for any family. */
function buildPlainFontCssUrl(family: string): string {
  return `${GOOGLE_FONTS_CSS_URL}?family=${encodeURIComponent(
    family
  )}&display=swap`
}

/**
 * A preview stylesheet: only the glyphs of `text` (Google's `&text=`
 * subset), a few hundred bytes instead of the whole family.
 */
export function buildFontPreviewUrl(family: string, text = family): string {
  return `${buildPlainFontCssUrl(family)}&text=${encodeURIComponent(text)}`
}

// ---------------------------------------------------------------------------
// Link registry: one counted entry per family and per preview subset in each
// document (rationale in the file header).
// ---------------------------------------------------------------------------

export const FONT_LINK_ATTRIBUTE = "data-themer-font"

/** Releases one reference; calling it again is a no-op. */
export type FontRelease = () => void

type FontLinkEntry = {
  link: HTMLLinkElement
  refs: number
  /** Settles once the stylesheet loaded, or failed with no retry to come. */
  ready: Promise<void>
}

const fontRegistries = new WeakMap<Document, Map<string, FontLinkEntry>>()

const noopRelease: FontRelease = () => {}

function resolveDocument(doc?: Document): Document | undefined {
  if (doc) return doc
  return typeof document === "undefined" ? undefined : document
}

function registryFor(doc: Document): Map<string, FontLinkEntry> {
  let registry = fontRegistries.get(doc)
  if (!registry) {
    registry = new Map()
    fontRegistries.set(doc, registry)
  }
  return registry
}

function acquireFontLink(
  doc: Document,
  key: string,
  family: string,
  href: string,
  fallbackHref?: string
): FontRelease {
  const registry = registryFor(doc)
  let entry = registry.get(key)
  // A link someone else removed (e.g. a host re-render of <head>) is stale.
  if (entry && !entry.link.isConnected) {
    registry.delete(key)
    entry = undefined
  }

  if (!entry) {
    const link = doc.createElement("link")
    link.setAttribute("rel", "stylesheet")
    link.setAttribute("href", href)
    link.setAttribute(FONT_LINK_ATTRIBUTE, family)
    const retryHref =
      fallbackHref && fallbackHref !== href ? fallbackHref : null
    if (retryHref) {
      // Google answers 400 when a static family lacks a requested weight;
      // retry once with the family's default weight.
      link.addEventListener(
        "error",
        () => link.setAttribute("href", retryHref),
        { once: true }
      )
    }
    const ready = new Promise<void>((resolve) => {
      link.addEventListener("load", () => resolve(), { once: true })
      link.addEventListener(
        "error",
        () => {
          if (retryHref) {
            // The retry's own load, or its error, settles it.
            link.addEventListener("error", () => resolve(), { once: true })
          } else {
            resolve()
          }
        },
        { once: true }
      )
    })
    doc.head.appendChild(link)
    entry = { link, refs: 0, ready }
    registry.set(key, entry)
  }

  const held = entry
  held.refs += 1
  let released = false
  return () => {
    if (released) return
    released = true
    held.refs -= 1
    if (held.refs > 0) return
    held.link.remove()
    if (registry.get(key) === held) registry.delete(key)
  }
}

/**
 * Hold a Google family in a document. The first holder decides the weights;
 * later holders share that link.
 */
export function acquireGoogleFont(
  family: string,
  options: { weights?: readonly FontWeight[]; doc?: Document } = {}
): FontRelease {
  const doc = resolveDocument(options.doc)
  const name = family.trim()
  if (!doc || !name || extractFontFamily(name) === null) return noopRelease

  return acquireFontLink(
    doc,
    `family:${name}`,
    name,
    buildFontCssUrl(name, options.weights),
    buildPlainFontCssUrl(name)
  )
}

/**
 * Hold a preview subset of a family (by default the glyphs of its own name),
 * for picker rows. Release it when the row leaves the screen or the picker
 * closes.
 */
export function acquireFontPreview(
  family: string,
  options: { text?: string; doc?: Document } = {}
): FontRelease {
  const doc = resolveDocument(options.doc)
  const name = family.trim()
  if (!doc || !name || extractFontFamily(name) === null) return noopRelease

  // The family is already loaded in full (a theme font): share that link.
  // A subset under the same family name, added later, would win over the
  // full face for page text until the picker closes.
  const full = fontRegistries.get(doc)?.get(`family:${name}`)
  if (full?.link.isConnected) {
    return acquireFontLink(doc, `family:${name}`, name, full.link.href)
  }

  const text = options.text ?? name
  return acquireFontLink(
    doc,
    `preview:${name}:${text}`,
    name,
    buildFontPreviewUrl(name, text)
  )
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

/** The families the theme currently holds per document. */
const themeFontSlots = new WeakMap<Document, Map<string, FontRelease>>()

/**
 * Make `families` the document's theme fonts: newly named families are
 * acquired and families the theme no longer names are released, so
 * replacing a theme font unloads the old one.
 */
export function setThemeFonts(
  doc: Document | undefined,
  families: Iterable<string>
): void {
  const target = resolveDocument(doc)
  if (!target) return

  const wanted = new Set(families)
  let slot = themeFontSlots.get(target)
  if (!slot) {
    slot = new Map()
    themeFontSlots.set(target, slot)
  }

  for (const [family, release] of slot) {
    if (wanted.has(family)) continue
    release()
    slot.delete(family)
  }
  const registry = fontRegistries.get(target)
  for (const family of wanted) {
    const held = slot.get(family)
    // A link removed from <head> by someone else (a host re-render) is
    // re-requested instead of being trusted as loaded.
    const link = registry?.get(`family:${family}`)?.link
    if (held && link?.isConnected) continue
    held?.()
    slot.set(family, acquireGoogleFont(family, { doc: target }))
  }
}

/** Release every theme font of a document (override off, unmount). */
export function clearThemeFonts(doc?: Document): void {
  const target = resolveDocument(doc)
  if (!target) return

  const slot = themeFontSlots.get(target)
  if (!slot) return
  for (const release of slot.values()) release()
  themeFontSlots.delete(target)
}

/**
 * Load a family and keep it until unloadGoogleFont. Prefer acquireGoogleFont,
 * whose release lets the link go when nothing uses it.
 */
export function loadGoogleFont(
  family: string,
  weights: readonly FontWeight[] = DEFAULT_THEME_WEIGHTS,
  doc?: Document
): void {
  acquireGoogleFont(family, { weights, doc })
}

export function loadGoogleFonts(fonts: string[], doc?: Document): void {
  fonts.forEach((font) => loadGoogleFont(font, DEFAULT_THEME_WEIGHTS, doc))
}

/** Remove every link of a family from a document, whoever holds it. */
export function unloadGoogleFont(family: string, doc?: Document): void {
  const target = resolveDocument(doc)
  if (!target) return

  const registry = fontRegistries.get(target)
  if (!registry) return
  for (const [key, entry] of registry) {
    if (entry.link.getAttribute(FONT_LINK_ATTRIBUTE) !== family) continue
    entry.link.remove()
    registry.delete(key)
  }
}

/** Whether the browser has the family loaded at `weight` (document.fonts). */
export function isGoogleFontLoaded(
  family: string,
  weight: FontWeight = "400",
  doc?: Document
): boolean {
  const target = resolveDocument(doc)
  if (!target?.fonts) return false
  return target.fonts.check(`${weight} 16px ${quoteFontFamily(family)}`)
}

/** Alias of isGoogleFontLoaded. */
export const isFontLoaded = isGoogleFontLoaded

/**
 * Waits for the family's face, then resolves whether the browser has it at
 * `weight`. Resolves `false` on a timeout, an error or when the document has no
 * `fonts`; it never rejects. It waits first for the family's own stylesheet
 * (including the weight retry) when this module added it, then for the face;
 * both waits share `timeout` (ms). It adds no stylesheet: hold the family
 * (acquireGoogleFont) first.
 */
export async function waitForFont(
  family: string,
  weight: FontWeight = "400",
  timeout = 3000,
  doc?: Document
): Promise<boolean> {
  const target = resolveDocument(doc)
  if (!target?.fonts) return false

  const font = `${weight} 16px ${quoteFontFamily(family)}`
  // The family's stylesheet, when this module added it. Until the sheet is
  // parsed the document has no face for the family (at most a picker row's
  // preview subset), so fonts.load alone would resolve at once.
  const sheet = fontRegistries.get(target)?.get(`family:${family.trim()}`)
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      (async () => {
        await sheet?.ready
        await target.fonts.load(font)
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Font load timeout")),
          timeout
        )
      }),
    ])
    return target.fonts.check(font)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function formatFontFamily(fonts: string[]): string {
  return fonts.map((font) => quoteFontFamily(font)).join(", ")
}

export function getPopularFonts(
  category: ThemeFontRole | FontCategory | "all"
): FontInfo[] {
  if (category === "all") {
    return [
      ...POPULAR_FONTS["sans-serif"].slice(0, 2),
      ...POPULAR_FONTS.serif.slice(0, 1),
      ...POPULAR_FONTS.monospace.slice(0, 1),
    ]
  }

  return POPULAR_FONTS[toFontCategory(category)] ?? []
}

export function getFontPreviewUrl(
  family: string,
  text = "The quick brown fox"
): string {
  return `https://fonts.google.com/specimen/${encodeURIComponent(
    family
  )}?preview.text=${encodeURIComponent(text)}`
}

export function generateFontCSS(
  family: string,
  fallbacks: string[] = ["sans-serif"]
): string {
  return formatFontFamily([family, ...fallbacks])
}

export function transformGoogleFontsResponse(
  response: GoogleFontsAPIResponse
): FontInfo[] {
  return response.items.map((font: GoogleFont) => ({
    family: font.family,
    category: font.category,
    variants: font.variants,
    variable: font.variants.some(
      (variant) => variant.includes("wght") || variant.includes("ital,wght")
    ),
  }))
}

type FontFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

/**
 * The Google Fonts developer-API catalogue. Throws when the key is empty or
 * Google answers with an error status. `options` pass through to `fetch`,
 * including Next's `next.revalidate`.
 */
export async function fetchGoogleFontsCatalog(
  googleFontsApiKey: string,
  options?: FontFetchOptions
): Promise<FontInfo[]> {
  if (!googleFontsApiKey) {
    throw new Error("Google Fonts API key is required.")
  }

  const response = await fetch(
    `${GOOGLE_FONTS_API_URL}?key=${encodeURIComponent(googleFontsApiKey)}`,
    options
  )

  if (!response.ok) {
    throw new Error(`Google Fonts API error: ${response.status}`)
  }

  return transformGoogleFontsResponse(
    (await response.json()) as GoogleFontsAPIResponse
  )
}

/** Google's public, keyless catalog (the one fonts.google.com renders). */
export const GOOGLE_FONTS_METADATA_URL =
  "https://fonts.google.com/metadata/fonts"

type GoogleFontsMetadata = {
  familyMetadataList: Array<{
    family: string
    category: string
    fonts: Record<string, unknown>
    axes?: unknown[]
  }>
}

const METADATA_CATEGORIES: Record<string, FontCategory> = {
  "sans serif": "sans-serif",
  serif: "serif",
  monospace: "monospace",
  display: "display",
  handwriting: "handwriting",
}

export function transformGoogleFontsMetadata(
  metadata: GoogleFontsMetadata
): FontInfo[] {
  return metadata.familyMetadataList.map((font) => ({
    family: font.family,
    category: METADATA_CATEGORIES[font.category.toLowerCase()] ?? "sans-serif",
    // Keys are "400", "400i", "700"...: keep the upright weights, the
    // format getDefaultWeights reads.
    variants: Object.keys(font.fonts).filter((key) => /^\d+$/u.test(key)),
    variable: (font.axes?.length ?? 0) > 0,
  }))
}

/**
 * The full Google catalog without an API key, in popularity order. The
 * response may carry the `)]}'` JSON-hijacking guard prefix.
 */
export async function fetchGoogleFontsMetadataCatalog(
  options?: FontFetchOptions
): Promise<FontInfo[]> {
  const response = await fetch(GOOGLE_FONTS_METADATA_URL, options)
  if (!response.ok) {
    throw new Error(`Google Fonts metadata error: ${response.status}`)
  }
  const text = (await response.text()).replace(/^\)\]\}'\s*/u, "")
  return transformGoogleFontsMetadata(JSON.parse(text) as GoogleFontsMetadata)
}

function normalizeCatalogLimit(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.max(1, Math.min(Math.trunc(value), 100))
}

function normalizeCatalogOffset(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

/**
 * One page of a catalogue after a case-insensitive family-name `query` and a
 * `category` filter ("all" keeps every category). `limit` is clamped to 1-100
 * (default 50, also for a non-finite value) and `offset` to 0 or more; the
 * response reports the clamped values.
 */
export function filterAndPaginateFonts(
  fonts: FontInfo[],
  {
    query = "",
    category = "all",
    limit = 50,
    offset = 0,
  }: {
    query?: string
    category?: FilterFontCategory | string
    limit?: number
    offset?: number
  }
): PaginatedFontsResponse {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedCategory = category.toLowerCase()
  const safeLimit = normalizeCatalogLimit(limit)
  const safeOffset = normalizeCatalogOffset(offset)

  let filteredFonts = fonts

  if (normalizedQuery) {
    filteredFonts = filteredFonts.filter((font) =>
      font.family.toLowerCase().includes(normalizedQuery)
    )
  }

  if (normalizedCategory !== "all") {
    filteredFonts = filteredFonts.filter(
      (font) => font.category === normalizedCategory
    )
  }

  const paginatedFonts = filteredFonts.slice(safeOffset, safeOffset + safeLimit)

  return {
    fonts: paginatedFonts,
    total: filteredFonts.length,
    offset: safeOffset,
    limit: safeLimit,
    hasMore: safeOffset + safeLimit < filteredFonts.length,
  }
}
