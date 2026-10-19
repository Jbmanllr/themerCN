// Font catalog response for the editor's font picker. The Next Adapter's
// route (src/next/server.ts) returns it only when the Host enabled it; this
// file does no gating.
//
// Contract:
// - This package reads no environment: the host passes the Google Fonts key.
//   With a key, the official Fonts API list answers; without one, the public
//   catalog behind fonts.google.com. The key is never part of the response
//   body.
// - The route always answers. A Google request that takes over 5 seconds is
//   aborted. If Google fails either way, the bundled FALLBACK_FONTS answer,
//   so the picker works offline.
// - The transformed catalog is held in this module's memory for a day, per
//   key, so a keystroke neither downloads nor parses it again. After a
//   failure the bundled list answers for 60 seconds without calling Google.
// - The picker also asks this catalog whether a theme's family is a Google
//   font (its "Custom font" badge), so the full list matters, not only the
//   first page.
// - GET ?q=&category=&limit=&offset= returns
//   { fonts, total, offset, limit, hasMore }. Paging is clamped by
//   filterAndPaginateFonts (utils/font-catalog-data.ts): limit 1-100 (default
//   50), offset >= 0, both truncated; a non-finite value falls back to the
//   default.
//
// See: packages/themer/README.md ("Font catalog").

import type { FontInfo } from "../types/fonts"
import {
  FALLBACK_FONTS,
  filterAndPaginateFonts,
} from "../utils/font-catalog-data"
import {
  fetchGoogleFontsCatalog,
  fetchGoogleFontsMetadataCatalog,
} from "./google-fonts"

/** How long a fetched catalog answers (also Next's revalidate for the keyed fetch). */
const CATALOG_TTL_SECONDS = 24 * 60 * 60
/** A Google request, its response body included, is aborted after this. */
const GOOGLE_TIMEOUT_MS = 5_000
/** After a failure, the bundled list answers this long without calling Google. */
const FAILURE_BACKOFF_MS = 60_000

// What answers per source (the key, or "" for the keyless catalog), and until
// when: Google's catalog for a day, or the bundled list during a back-off.
const catalogs = new Map<string, { fonts: FontInfo[]; expires: number }>()
// The download in flight per source: requests that arrive meanwhile (the
// picker asks about several families at once) share it.
const requests = new Map<string, Promise<FontInfo[]>>()

async function fetchCatalog(googleFontsApiKey: string): Promise<FontInfo[]> {
  // A timer rather than AbortSignal.timeout, so it can be cleared once the
  // body is read.
  const controller = new AbortController()
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error(`Google Fonts did not answer within ${GOOGLE_TIMEOUT_MS} ms.`)
      ),
    GOOGLE_TIMEOUT_MS
  )
  try {
    return googleFontsApiKey
      ? await fetchGoogleFontsCatalog(googleFontsApiKey, {
          signal: controller.signal,
          next: { revalidate: CATALOG_TTL_SECONDS },
        })
      : // The metadata response (~2.7 MB) is over Next's 2 MB fetch-cache
        // limit; the memory cache holds it instead.
        await fetchGoogleFontsMetadataCatalog({
          signal: controller.signal,
          cache: "no-store",
        })
  } finally {
    clearTimeout(timer)
  }
}

function remember(source: string, fonts: FontInfo[], ttlMs: number) {
  catalogs.set(source, { fonts, expires: Date.now() + ttlMs })
  return fonts
}

function catalog(googleFontsApiKey: string): Promise<FontInfo[]> {
  const cached = catalogs.get(googleFontsApiKey)
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.fonts)
  }

  let request = requests.get(googleFontsApiKey)
  if (!request) {
    request = fetchCatalog(googleFontsApiKey)
      .then((fonts) =>
        remember(googleFontsApiKey, fonts, CATALOG_TTL_SECONDS * 1000)
      )
      .catch((error: unknown) => {
        console.warn(
          "Theme editor: Google Fonts catalog unavailable, using the bundled list.",
          error
        )
        return remember(googleFontsApiKey, FALLBACK_FONTS, FAILURE_BACKOFF_MS)
      })
      .finally(() => {
        requests.delete(googleFontsApiKey)
      })
    requests.set(googleFontsApiKey, request)
  }
  return request
}

/** Test hook: forget every cached catalog, back-off and pending download. */
export function resetFontCatalogCache(): void {
  catalogs.clear()
  requests.clear()
}

/**
 * Answers the picker's GET with a page of the font catalog as JSON. Always
 * resolves with a 200 JSON body: a Google failure or timeout is logged with
 * console.warn and served from the bundled list instead of surfacing as an
 * error. `googleFontsApiKey` is the host's optional key; empty or undefined
 * selects the keyless public catalog.
 */
export async function fontCatalogResponse(
  url: URL,
  googleFontsApiKey: string | undefined
): Promise<Response> {
  const fonts = await catalog(googleFontsApiKey ?? "")

  const params = url.searchParams
  return Response.json(
    filterAndPaginateFonts(fonts, {
      category: params.get("category") ?? "all",
      limit: Number(params.get("limit") ?? 50),
      offset: Number(params.get("offset") ?? 0),
      query: params.get("q") ?? "",
    })
  )
}
