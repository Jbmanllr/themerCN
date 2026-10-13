// The font route ships in every host build, so the gate is what keeps a
// deployment from serving the editor's catalog: closed means 404 before the
// font helpers load. Open, it passes the request URL and only the
// server-held key to the catalog.

import { afterEach, expect, it, vi } from "vitest";

const fontCatalogResponse = vi.fn(async () => Response.json({ fonts: [] }));
vi.mock("../api/font-catalog", () => ({ fontCatalogResponse }));

const { fontCatalogRoute } = await import("./font-catalog-route");

const request = () =>
  new Request("http://localhost/dev/themer/google-fonts?q=inter");

afterEach(() => {
  vi.unstubAllEnvs();
  fontCatalogResponse.mockClear();
});

it("answers 404 without loading the catalog while the editor is off", async () => {
  const response = await fontCatalogRoute(() => false)(request());

  expect(response.status).toBe(404);
  expect(fontCatalogResponse).not.toHaveBeenCalled();
});

it("serves the catalog with the server-held key while the editor is on", async () => {
  vi.stubEnv("GOOGLE_FONTS_API_KEY", "server-key");

  const response = await fontCatalogRoute(() => true)(request());

  expect(response.status).toBe(200);
  expect(fontCatalogResponse).toHaveBeenCalledWith(
    expect.objectContaining({ search: "?q=inter" }),
    "server-key",
  );
});
