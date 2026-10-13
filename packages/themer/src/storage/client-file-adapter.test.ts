// Proves the client file adapter over a stubbed fetch: files are fetched in
// parallel yet listed in the manifest's order, however the responses arrive;
// a manifest entry that throws is skipped with a warning and a 404 silently;
// without a manifest the four common names are probed in order; an id loses
// only its trailing ".json"; and every write is refused.
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileTheme } from "../types";
import { ClientFileStorageAdapter } from "./client-file-adapter";

const styles = { light: {}, dark: {} } as FileTheme["styles"];

type Reply = { body?: unknown; ok?: boolean; delay?: number; throws?: boolean };

/** Serves each URL its reply; an unknown URL is a 404. */
function serve(replies: Record<string, Reply>) {
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      requested.push(url);
      const reply = replies[url];
      if (reply?.delay) {
        await new Promise((resolve) => setTimeout(resolve, reply.delay));
      }
      if (reply?.throws) throw new TypeError("network down");
      if (!reply) return { ok: false, json: async () => ({}) };
      return { ok: reply.ok ?? true, json: async () => reply.body };
    }),
  );
  return requested;
}

const theme = (name: string) => ({ name, styles });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ClientFileStorageAdapter", () => {
  it("lists the manifest's themes in the manifest's order, whichever arrives first", async () => {
    serve({
      "/themes/themes-manifest.json": {
        body: { themes: ["slow.json", "fast.json"] },
      },
      "/themes/slow.json": { body: theme("Slow"), delay: 30 },
      "/themes/fast.json": { body: theme("Fast") },
    });

    const themes = await new ClientFileStorageAdapter().getThemes();
    expect(themes.map((item) => item.id)).toEqual(["slow", "fast"]);
  });

  it("skips a manifest entry that is missing or fails, with a warning for each failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    serve({
      "/themes/themes-manifest.json": {
        body: { themes: ["a.json", "gone.json", "down.json", "b.json"] },
      },
      "/themes/a.json": { body: theme("A") },
      "/themes/down.json": { throws: true },
      "/themes/b.json": { body: theme("B") },
    });

    const themes = await new ClientFileStorageAdapter().getThemes();
    expect(themes.map((item) => item.id)).toEqual(["a", "b"]);
    // A 404 is simply no theme; a request that throws is worth a warning.
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain("down.json");
  });

  it("probes the common names when there is no manifest, skipping the ones that are not there", async () => {
    const requested = serve({
      "/themes/dark.json": { body: theme("Dark") },
      "/themes/theme.json": { body: theme("Theme") },
    });

    const themes = await new ClientFileStorageAdapter().getThemes();
    expect(themes.map((item) => item.id)).toEqual(["dark", "theme"]);
    expect(requested).toEqual([
      "/themes/themes-manifest.json",
      "/themes/default.json",
      "/themes/dark.json",
      "/themes/light.json",
      "/themes/theme.json",
    ]);
  });

  it("names a theme file without a name after its id, and removes only the trailing .json", async () => {
    serve({
      "/themes/my.json-theme.json": { body: { styles } },
    });

    const adapter = new ClientFileStorageAdapter({ basePath: "/themes/" });
    const found = await adapter.getTheme("my.json-theme");
    expect(found).toMatchObject({ id: "my.json-theme", name: "my.json-theme" });
    expect((await adapter.getTheme("my.json-theme.json"))?.id).toBe(
      "my.json-theme",
    );
  });

  it("is read-only and says where to put themes instead", async () => {
    const adapter = new ClientFileStorageAdapter();
    await expect(adapter.saveTheme({ name: "x", styles })).rejects.toThrow(
      "read-only",
    );
    await expect(adapter.updateTheme("x", {})).rejects.toThrow("read-only");
    await expect(adapter.deleteTheme("x")).rejects.toThrow("read-only");
  });
});
