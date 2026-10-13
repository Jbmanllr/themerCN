// Proves the in-memory adapter, and through it the BaseStorageAdapter
// helpers: themes list newest `updatedAt` first (an update moves a theme to the top), an
// update cannot change the id and rejects an unknown one, and delete and
// clear remove themes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SavedTheme } from "../types";
import { MemoryStorageAdapter } from "./adapter";

const styles = { light: {}, dark: {} } as SavedTheme["styles"];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MemoryStorageAdapter", () => {
  it("lists the most recently updated theme first", async () => {
    const adapter = new MemoryStorageAdapter();
    const first = await adapter.saveTheme({ name: "First", styles });
    vi.advanceTimersByTime(1000);
    const second = await adapter.saveTheme({ name: "Second", styles });
    expect((await adapter.getThemes()).map((theme) => theme.id)).toEqual([
      second.id,
      first.id,
    ]);

    vi.advanceTimersByTime(1000);
    await adapter.updateTheme(first.id, { name: "First, renamed" });
    expect((await adapter.getThemes()).map((theme) => theme.name)).toEqual([
      "First, renamed",
      "Second",
    ]);
  });

  it("keeps the id on update and refuses an unknown one", async () => {
    const adapter = new MemoryStorageAdapter();
    const saved = await adapter.saveTheme({ name: "A", styles });

    const updated = await adapter.updateTheme(saved.id, {
      id: "hijacked",
      name: "B",
    });
    expect(updated.id).toBe(saved.id);
    expect(await adapter.getTheme("hijacked")).toBeNull();
    await expect(adapter.updateTheme("missing", {})).rejects.toThrow(
      "Theme not found: missing",
    );
  });

  it("deletes and clears", async () => {
    const adapter = new MemoryStorageAdapter();
    const a = await adapter.saveTheme({ name: "A", styles });
    await adapter.saveTheme({ name: "B", styles });

    await adapter.deleteTheme(a.id);
    expect(await adapter.getTheme(a.id)).toBeNull();
    adapter.clear();
    expect(await adapter.getThemes()).toEqual([]);
  });
});
