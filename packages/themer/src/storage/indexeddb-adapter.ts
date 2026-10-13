// Browser-only theme adapter over IndexedDB (idb-keyval): one key per theme id,
// in database `themer-db`, object store `themes` unless the caller names
// others (config/constants.ts INDEXED_DB).
//
// Why: the whole-store operations are single idb-keyval calls (`values`,
// `clear`, `setMany`), not a loop of one request per key, so listing,
// clearing and an import's write cost one transaction each.
//
// Contract:
// - getThemes is one read of the store, newest `updatedAt` first.
// - importAll parses the JSON and checks it is a list before touching the
//   store, so invalid JSON or JSON that is not a list throws with nothing
//   cleared. A merge import (the default) gives every theme a NEW id, so
//   nothing is overwritten; a replace import (`merge = false`) clears and
//   keeps the ids. Either way `updatedAt` becomes the import time and the
//   themes themselves are not validated.
// - The write is one `setMany` transaction, but a replace import clears in a
//   separate one just before it, so the replace is not atomic: a write that
//   fails after the clear leaves the store empty.
// - Banter hosts pass `storage: "indexeddb"`, which makes ThemerProvider
//   create this adapter; no editor control calls it.
//
// See: packages/themer/ARCHITECTURE.md (Storage Adapters)

import {
  get,
  set,
  del,
  keys,
  values,
  setMany,
  clear as clearStore,
  createStore,
  type UseStore,
} from "idb-keyval";
import type { StorageType, SavedTheme } from "../types";
import { BaseStorageAdapter } from "./adapter";
import { INDEXED_DB } from "../config/constants";

/**
 * IndexedDB storage adapter for client-side persistence. `isAvailable` is
 * false where `indexedDB` is undefined (a server render) or a trial read of
 * the store throws.
 */
export class IndexedDBStorageAdapter extends BaseStorageAdapter {
  private store: UseStore;

  constructor(options: { dbName?: string; storeName?: string } = {}) {
    super();
    this.store = createStore(
      options.dbName ?? INDEXED_DB.name,
      options.storeName ?? INDEXED_DB.stores.themes,
    );
    this._isAvailable = typeof indexedDB !== "undefined";
  }

  getType(): StorageType {
    return "indexeddb";
  }

  async isAvailable(): Promise<boolean> {
    if (typeof indexedDB === "undefined") {
      this._isAvailable = false;
      return false;
    }

    try {
      // The global can exist while opening the database still fails.
      await keys(this.store);
      this._isAvailable = true;
      return true;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  async getThemes(): Promise<SavedTheme[]> {
    const themes = (await values<SavedTheme>(this.store)).filter(Boolean);
    return this.sortByUpdatedDesc(themes);
  }

  async getTheme(id: string): Promise<SavedTheme | null> {
    const theme = await get<SavedTheme>(id, this.store);
    return theme ?? null;
  }

  async saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme> {
    const savedTheme = this.createSavedTheme(theme);
    await set(savedTheme.id, savedTheme, this.store);
    return savedTheme;
  }

  async updateTheme(
    id: string,
    updates: Partial<SavedTheme>,
  ): Promise<SavedTheme> {
    const existing = await get<SavedTheme>(id, this.store);
    if (!existing) {
      throw new Error(`Theme not found: ${id}`);
    }

    const updated: SavedTheme = {
      ...existing,
      ...updates,
      id, // after the spread: `updates.id` must not rename the theme
      updatedAt: this.getTimestamp(),
    };

    await set(id, updated, this.store);
    return updated;
  }

  async deleteTheme(id: string): Promise<void> {
    await del(id, this.store);
  }

  /** Remove every theme in this store (one idb-keyval `clear`). */
  async clear(): Promise<void> {
    await clearStore(this.store);
  }

  /** All themes, newest first, as pretty-printed JSON that importAll accepts. */
  async exportAll(): Promise<string> {
    const themes = await this.getThemes();
    return JSON.stringify(themes, null, 2);
  }

  /**
   * Import themes from JSON (the exportAll shape); returns how many were
   * written. See the header for the merge and replace rules.
   */
  async importAll(json: string, merge = true): Promise<number> {
    const themes: unknown = JSON.parse(json);
    if (!Array.isArray(themes)) {
      throw new Error("Import must be a list of themes");
    }

    const entries = (themes as SavedTheme[]).map(
      (theme): [string, SavedTheme] => {
        // A merge mints a new id so an imported theme never overwrites one
        // already stored.
        const id = merge ? this.generateId() : theme.id;
        return [id, { ...theme, id, updatedAt: this.getTimestamp() }];
      },
    );

    if (!merge) {
      await this.clear();
    }
    // One transaction: the imported themes are written whole or not at all.
    await setMany(entries, this.store);

    return entries.length;
  }
}
