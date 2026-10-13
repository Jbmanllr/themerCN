// Proves the server-side file adapter over an in-memory directory behind the
// injected file operations: the id is the file name without its trailing
// ".json" (the ".json" inside "my.json-theme.json" is part of the name), a
// file without a name is named by its id, one unreadable file does not hide
// the others, and saving, updating and deleting write, rewrite and remove
// `<slug>.json`.
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileTheme } from "../types";
import { FileStorageAdapter, type FileOperations } from "./file-adapter";

const styles = { light: {}, dark: {} } as FileTheme["styles"];

const nameOf = (path: string) => path.split("/").at(-1) ?? "";

/** An adapter over a directory held in memory: file name to content. */
function directory(contents: Record<string, string> = {}) {
  const files = new Map(Object.entries(contents));
  const ops: FileOperations = {
    readDir: async () => [...files.keys()],
    readFile: async (path) => {
      const content = files.get(nameOf(path));
      if (content === undefined) throw new Error(`ENOENT ${path}`);
      return content;
    },
    writeFile: async (path, content) => {
      files.set(nameOf(path), content);
    },
    exists: async (path) => files.has(nameOf(path)),
    unlink: async (path) => {
      files.delete(nameOf(path));
    },
    ensureDir: async () => {},
    stat: async () => ({
      birthtime: "2026-10-04T10:00:00.000Z",
      mtime: "2026-10-04T10:00:00.000Z",
    }),
  };
  return {
    files,
    adapter: new FileStorageAdapter({
      directory: "/themes",
      fileOperations: ops,
    }),
  };
}

const file = (theme: Partial<FileTheme>) =>
  JSON.stringify({ name: "", styles, ...theme });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FileStorageAdapter reading", () => {
  it("takes the id from the file name and names a nameless file after it", async () => {
    const { adapter } = directory({
      "ocean.json": file({ name: "Ocean" }),
      "plain.json": file({}),
    });

    const themes = await adapter.getThemes();
    expect(
      themes
        .map(({ id, name }) => ({ id, name }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual([
      { id: "ocean", name: "Ocean" },
      { id: "plain", name: "plain" },
    ]);
  });

  it("removes only the trailing .json from an id", async () => {
    const { adapter } = directory({
      "my.json-theme.json": file({ name: "Mine" }),
    });

    const [theme] = await adapter.getThemes();
    expect(theme?.id).toBe("my.json-theme");
    expect((await adapter.getTheme("my.json-theme"))?.id).toBe("my.json-theme");
    expect((await adapter.getTheme("my.json-theme.json"))?.id).toBe(
      "my.json-theme",
    );
  });

  it("skips a file that cannot be read or parsed, with a warning, and keeps the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { adapter } = directory({
      "good.json": file({ name: "Good" }),
      "broken.json": "{not json",
      "notes.txt": "ignored",
    });

    const themes = await adapter.getThemes();
    expect(themes.map((theme) => theme.id)).toEqual(["good"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain("broken.json");
  });

  it("returns nothing for an id with no file", async () => {
    const { adapter } = directory();
    expect(await adapter.getTheme("missing")).toBeNull();
  });
});

describe("FileStorageAdapter writing", () => {
  it("saves under a slug of the name and updates in place", async () => {
    const { adapter, files } = directory();

    const saved = await adapter.saveTheme({ name: "Ocean Breeze!", styles });
    expect(saved.id).toBe("ocean-breeze");
    expect([...files.keys()]).toEqual(["ocean-breeze.json"]);

    const updated = await adapter.updateTheme("ocean-breeze", {
      description: "Cool blues",
    });
    expect(updated).toMatchObject({
      id: "ocean-breeze",
      name: "Ocean Breeze!",
      description: "Cool blues",
    });
    await expect(adapter.updateTheme("nope", {})).rejects.toThrow(
      "Theme not found: nope",
    );

    await adapter.deleteTheme("ocean-breeze");
    expect([...files.keys()]).toEqual([]);
  });
});
