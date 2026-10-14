// `themercn/next/server`: the Next Adapter's font-catalog route, the catalog
// the Themer's font picker reads when `<Themer fontCatalogEndpoint>` points
// at it.
//
// Contract:
// - `enabled: false` answers 404 before the font helpers load, so a build
//   with the Themer off serves nothing here and loads no catalog code.
// - The package reads no environment: the Host passes `googleFontsApiKey`
//   (optional). It stays on the server; without it the catalog reads
//   Google's public catalog, and the bundled list answers only when Google
//   fails (api/font-catalog.ts). The key never appears in a response.
// - GET ?q=&category=&limit=&offset= returns
//   { fonts, total, offset, limit, hasMore }.

export interface FontCatalogRouteOptions {
  /** Whether the route serves the catalog; `false` answers 404. */
  enabled: boolean;
  /** A Google Fonts API key, read on the server only. */
  googleFontsApiKey?: string;
}

/**
 * Creates the route handler for an App Router `route.ts`.
 *
 * @example
 * ```ts
 * // app/api/themer/fonts/route.ts
 * export const { GET } = createFontCatalogRoute({
 *   enabled: true,
 *   googleFontsApiKey: process.env.GOOGLE_FONTS_API_KEY,
 * })
 * ```
 */
export function createFontCatalogRoute({
  enabled,
  googleFontsApiKey,
}: FontCatalogRouteOptions): { GET: (request: Request) => Promise<Response> } {
  return {
    async GET(request) {
      if (!enabled) {
        return Response.json({ message: "Not found." }, { status: 404 });
      }
      const { fontCatalogResponse } = await import("../api/font-catalog");
      return fontCatalogResponse(new URL(request.url), googleFontsApiKey);
    },
  };
}
