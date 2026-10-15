// Font catalog response for the editor's font picker. The Next Adapter's
// route (src/next/server.ts) returns it only when the Host enabled it; this
// file does no gating.
//
// Contract:
// - This package reads no environment: the host passes the Google Fonts key.
//   With a key, the official Fonts API list answers (Next fetch cache, one
//   day). Without one, the public catalog behind fonts.google.com answers,
//   held in this module's memory for a day. If Google fails either way, the
//   bundled FALLBACK_FONTS answer, so the picker works offline. The key is
//   never part of the response body.
// - The picker also asks this catalog whether a theme's family is a Google
//   font (its "Custom font" badge), so the full list matters, not only the
//   first page.
// - GET ?q=&category=&limit=&offset= returns
//   { fonts, total, offset, limit, hasMore }. Paging is clamped by
//   filterAndPaginateFonts (utils/font-loader.ts): limit 1-100 (default 50),
//   offset >= 0, both truncated; a non-finite value falls back to the
//   default.
//
// See: packages/themer/README.md ("Font catalog").

import {
  FALLBACK_FONTS,
  fetchGoogleFontsCatalog,
  fetchGoogleFontsMetadataCatalog,
  filterAndPaginateFonts,
  type FontInfo,
} from "../utils/font-loader";

const METADATA_TTL_MS = 24 * 60 * 60 * 1000;
// The metadata response (~2.7 MB) is over Next's 2 MB fetch-cache limit, so
// it is cached here. A failed fetch is not cached: the next request retries.
let metadataCache: { fonts: FontInfo[]; expires: number } | null = null;
// The download in flight: requests that arrive meanwhile (the picker asks
// about several families at once) share it instead of starting their own.
let metadataRequest: Promise<FontInfo[]> | null = null;

async function keylessCatalog(): Promise<FontInfo[]> {
  if (metadataCache && metadataCache.expires > Date.now()) {
    return metadataCache.fonts;
  }
  metadataRequest ??= fetchGoogleFontsMetadataCatalog({ cache: "no-store" })
    .then((fonts) => {
      metadataCache = { fonts, expires: Date.now() + METADATA_TTL_MS };
      return fonts;
    })
    .finally(() => {
      metadataRequest = null;
    });
  return metadataRequest;
}

/** Test hook: forget the cached keyless catalog. */
export function resetFontCatalogCache(): void {
  metadataCache = null;
  metadataRequest = null;
}

/**
 * Answers the picker's GET with a page of the font catalog as JSON. Always
 * resolves with a 200 JSON body: a Google failure is logged with console.warn
 * and served from the bundled list instead of surfacing as an error.
 * `googleFontsApiKey` is the host's optional key; empty or undefined selects
 * the keyless public catalog.
 */
export async function fontCatalogResponse(
  url: URL,
  googleFontsApiKey: string | undefined,
): Promise<Response> {
  let fonts = FALLBACK_FONTS;

  try {
    fonts = googleFontsApiKey
      ? await fetchGoogleFontsCatalog(googleFontsApiKey, {
          next: { revalidate: 60 * 60 * 24 },
        })
      : await keylessCatalog();
  } catch (error) {
    console.warn(
      "Theme editor: Google Fonts catalog unavailable, using the bundled list.",
      error,
    );
  }

  const params = url.searchParams;
  return Response.json(
    filterAndPaginateFonts(fonts, {
      category: params.get("category") ?? "all",
      limit: Number(params.get("limit") ?? 50),
      offset: Number(params.get("offset") ?? 0),
      query: params.get("q") ?? "",
    }),
  );
}
