// The Themer's font catalog (see `fontCatalogEndpoint` in
// components/themer/playground-themer.tsx). Mirrors the README's font route
// recipe (packages/themer/README.md, Next quick start). With
// GOOGLE_FONTS_API_KEY it serves the Google Fonts Developer API list; without
// it, Google's public catalog; the bundled list if Google fails. The key
// stays on the server.
import { createFontCatalogRoute } from "themercn/next/server"

export const { GET } = createFontCatalogRoute({
  enabled: true,
  googleFontsApiKey: process.env.GOOGLE_FONTS_API_KEY,
})
