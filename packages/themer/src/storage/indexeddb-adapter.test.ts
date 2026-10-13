// Proves the IndexedDB adapter's whole-store operations: listing, clearing and
// importing are each one idb-keyval call (the stand-in records its calls), and
// the results are right: newest first, a replace import that clears once and
// keeps the ids, a merge import that mints new ids so nothing is overwritten
// (also within one import), and an export that imports back. idb-keyval is
// replaced by a Map-backed store; no IndexedDB runs here.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stores = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("idb-keyval", () => {
  type Store = Map<string, unknown>;
  const note = (name: string) => stores.calls.push(name);
  return {
    createStore: () => new Map() as Store,
    get: async (key: string, store: Store) => store.get(key),
    set: async (key: string, value: unknown, store: Store) => {
      note("set");
      store.set(key, value);
    },
    del: async (key: string, store: Store) => {
      note("del");
      store.delete(key);
    },
    keys: async (store: Store) => [...store.keys()],
    values: async (store: Store) => {
      note("values");
      return [...store.values()];
    },
    setMany: async (entries: [string, unknown][], store: Store) => {
      note("setMany");
      for (const [key, value] of entries) store.set(key, value);
    },
    clear: async (store: Store) => {
      note("clear");
      store.clear();
    },
  };
});

import type { SavedTheme } from "../types";
import { IndexedDBStorageAdapter } from "./indexeddb-adapter";

const styles = { light: {}, dark: {} } as SavedTheme["styles"];

function theme(id: string, updatedAt: string): SavedTheme {
  return { id, name: id, styles, createdAt: updatedAt, updatedAt };
}

async function adapterWith(...themes: SavedTheme[]) {
  const adapter = new IndexedDBStorageAdapter();
  await adapter.importAll(JSON.stringify(themes), false);
  stores.calls.length = 0;
  return adapter;
}

beforeEach(() => {
  stores.calls.length = 0;
  vi.useRealTimers();
});

describe("IndexedDBStorageAdapter", () => {
  it("lists every theme newest first with one read of the store", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T10:00:00Z"));
    const adapter = new IndexedDBStorageAdapter();
    const saved: SavedTheme[] = [];
    for (const name of ["first", "second", "third"]) {
      saved.push(await adapter.saveTheme({ name, styles }));
      vi.advanceTimersByTime(1000);
    }
    stores.calls.length = 0;

    const themes = await adapter.getThemes();

    expect(stores.calls).toEqual(["values"]);
    expect(themes.map((item) => item.name)).toEqual([
      "third",
      "second",
      "first",
    ]);
  });

  it("replaces on import: clears once, keeps the ids, writes once", async () => {
    const adapter = await adapterWith(
      theme("keep-me", "2026-01-01T00:00:00.000Z"),
    );

    const count = await adapter.importAll(
      JSON.stringify([
        theme("a", "2026-02-01T00:00:00.000Z"),
        theme("b", "2026-03-01T00:00:00.000Z"),
      ]),
      false,
    );

    expect(count).toBe(2);
    expect(stores.calls).toEqual(["clear", "setMany"]);
    expect((await adapter.getThemes()).map((item) => item.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it.each(["{}", "null", '"themes"', "42"])(
    "a replace import that is not a list (%s) keeps the saved themes",
    async (json) => {
      const adapter = await adapterWith(
        theme("keep-me", "2026-01-01T00:00:00.000Z"),
      );

      await expect(adapter.importAll(json, false)).rejects.toThrow();

      expect(stores.calls).not.toContain("clear");
      expect((await adapter.getThemes()).map((item) => item.id)).toEqual([
        "keep-me",
      ]);
    },
  );

  it("merges on import under new ids, so no existing theme is overwritten", async () => {
    const adapter = await adapterWith(theme("a", "2026-01-01T00:00:00.000Z"));

    const count = await adapter.importAll(
      JSON.stringify([theme("a", "2026-02-01T00:00:00.000Z")]),
      true,
    );

    expect(count).toBe(1);
    expect(stores.calls).toEqual(["setMany"]);
    const themes = await adapter.getThemes();
    expect(themes).toHaveLength(2);
    expect(new Set(themes.map((item) => item.id)).size).toBe(2);
  });

  it("gives every merged theme its own id even within one import", async () => {
    const adapter = new IndexedDBStorageAdapter();
    await adapter.importAll(
      JSON.stringify(
        Array.from({ length: 5 }, () =>
          theme("same", "2026-01-01T00:00:00.000Z"),
        ),
      ),
    );
    expect(await adapter.getThemes()).toHaveLength(5);
  });

  it("exports what it holds in a form that imports back", async () => {
    const adapter = await adapterWith(
      theme("a", "2026-02-01T00:00:00.000Z"),
      theme("b", "2026-03-01T00:00:00.000Z"),
    );
    const exported = await adapter.exportAll();

    const copy = new IndexedDBStorageAdapter();
    expect(await copy.importAll(exported, false)).toBe(2);
    expect((await copy.getThemes()).map((item) => item.name).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("clears with one call, and updates keep the id", async () => {
    const adapter = await adapterWith(theme("a", "2026-01-01T00:00:00.000Z"));

    const updated = await adapter.updateTheme("a", {
      name: "Renamed",
      id: "x",
    });
    expect(updated).toMatchObject({ id: "a", name: "Renamed" });
    await expect(adapter.updateTheme("missing", {})).rejects.toThrow(
      "Theme not found: missing",
    );

    stores.calls.length = 0;
    await adapter.clear();
    expect(stores.calls).toEqual(["clear"]);
    expect(await adapter.getThemes()).toEqual([]);
  });
});
