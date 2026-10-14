// The Themer's font catalog (see `fontCatalogEndpoint` in
// components/themer/playground-themer.tsx). Mirrors the README's font route
// recipe. Without GOOGLE_FONTS_API_KEY it serves the bundled catalogue; with
// it, the full Google Fonts list. The key stays on the server.
import { createFontCatalogRoute } from "themercn/next/server"

export const { GET } = createFontCatalogRoute({
  enabled: true,
  googleFontsApiKey: process.env.GOOGLE_FONTS_API_KEY,
})
