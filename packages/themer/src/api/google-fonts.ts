// Google's font catalogues, fetched on the server and transformed to the
// picker's FontInfo: the developer API (with a key) and the public metadata
// behind fonts.google.com (without one). api/font-catalog.ts serves them.
import type {
  FontCategory,
  FontInfo,
  GoogleFont,
  GoogleFontsAPIResponse,
} from "../types/fonts"

export const GOOGLE_FONTS_API_URL =
  "https://www.googleapis.com/webfonts/v1/webfonts"

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
