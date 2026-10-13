// The GET handler behind a host's font route (`/dev/themer/google-fonts`),
// the catalog the editor's font picker reads.
//
// Contract: 404 unless the host's editor is on, before the font helpers load,
// so a deployment serves nothing here. GOOGLE_FONTS_API_KEY is optional and
// stays on the server; without it the catalog reads Google's public catalog
// instead, and the bundled list answers only when Google fails either way
// (api/font-catalog.ts). The key never appears in a response.
//
// See: packages/themer/README.md ("Host integration contract", Font route).

export function fontCatalogRoute(isEnabled: () => boolean) {
  return async function GET(request: Request): Promise<Response> {
    if (!isEnabled()) {
      return Response.json({ message: "Not found." }, { status: 404 });
    }
    const { fontCatalogResponse } = await import("../api/font-catalog");
    return fontCatalogResponse(
      new URL(request.url),
      process.env.GOOGLE_FONTS_API_KEY,
    );
  };
}
