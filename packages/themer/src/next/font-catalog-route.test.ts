// The font route ships in every build of a Next Host, so `enabled` is what
// keeps a deployment from serving the Themer's catalog: disabled means 404
// before the font helpers load. Enabled, it passes the request URL and only
// the key the Host injected to the catalog; the package reads no env vars.

import { afterEach, expect, it, vi } from "vitest"

const fontCatalogResponse = vi.fn(async () => Response.json({ fonts: [] }))
vi.mock("../api/font-catalog", () => ({ fontCatalogResponse }))

const { createFontCatalogRoute } = await import("./server")

const request = () => new Request("http://localhost/api/fonts?q=inter")

afterEach(() => {
  vi.unstubAllEnvs()
  fontCatalogResponse.mockClear()
})

it("answers 404 without loading the catalog when disabled", async () => {
  const { GET } = createFontCatalogRoute({ enabled: false })

  const response = await GET(request())

  expect(response.status).toBe(404)
  expect(fontCatalogResponse).not.toHaveBeenCalled()
})

it("serves the catalog with the injected key when enabled", async () => {
  const { GET } = createFontCatalogRoute({
    enabled: true,
    googleFontsApiKey: "injected-key",
  })

  const response = await GET(request())

  expect(response.status).toBe(200)
  expect(fontCatalogResponse).toHaveBeenCalledWith(
    expect.objectContaining({ search: "?q=inter" }),
    "injected-key"
  )
})

it("ignores GOOGLE_FONTS_API_KEY in the environment", async () => {
  vi.stubEnv("GOOGLE_FONTS_API_KEY", "env-key")
  const { GET } = createFontCatalogRoute({ enabled: true })

  await GET(request())

  expect(fontCatalogResponse).toHaveBeenCalledWith(expect.any(URL), undefined)
})
