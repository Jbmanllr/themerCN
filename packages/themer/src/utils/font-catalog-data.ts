// The bundled font catalogue (FALLBACK_FONTS) and the paging the picker reads
// it with: the browser pages it when the Host has no font route, and the
// route (api/font-catalog.ts) pages Google's catalogue, or this one when
// Google fails, the same way.
import type {
  FilterFontCategory,
  FontCategory,
  FontInfo,
  PaginatedFontsResponse,
} from "../types/fonts"
import { toFontCategory, type ThemeFontRole } from "./font-names"

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

// Pure, so a bundle that imports this module without the list drops it.
export const FALLBACK_FONTS: FontInfo[] =
  /* @__PURE__ */ Object.values(POPULAR_FONTS).flat()

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
