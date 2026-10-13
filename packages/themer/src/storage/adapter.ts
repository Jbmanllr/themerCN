// Base class of every theme storage adapter, and the in-memory adapter.
//
// Why: all five adapters (memory, IndexedDB, client files, server files,
// Payload) extend this class, so id minting, timestamps, the theme-file to
// SavedTheme mapping and the newest-first sort are written once here.
//
// Contract:
// - Memory, IndexedDB and server-file getThemes return newest `updatedAt`
//   first (sortByUpdatedDesc). The client-file adapter keeps the manifest's
//   order and Payload keeps the server's order: neither sorts.
// - updateTheme never changes the id. Memory, IndexedDB and server-file
//   adapters reject an unknown id with `Theme not found: <id>`; the
//   client-file adapter refuses every write.
// - A theme file carries no dates, so fileThemeToSaved stamps createdAt and
//   updatedAt with the READ time: the order of file-sourced themes says
//   nothing about the files.
// - Banter's editor never saves or lists themes through an adapter (see
//   ARCHITECTURE.md); the editor's own state persists in the Zustand stores.
//
// See: packages/themer/ARCHITECTURE.md (Storage Adapters)

import type {
  FileTheme,
  StorageAdapter,
  StorageType,
  SavedTheme,
} from "../types";

/**
 * Abstract base class for storage adapters. Subclasses implement the CRUD
 * methods and set `_isAvailable`; the helpers below are shared.
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  protected _isAvailable: boolean = false;

  abstract getType(): StorageType;
  abstract getThemes(): Promise<SavedTheme[]>;
  abstract getTheme(id: string): Promise<SavedTheme | null>;
  abstract saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme>;
  abstract updateTheme(
    id: string,
    theme: Partial<SavedTheme>,
  ): Promise<SavedTheme>;
  abstract deleteTheme(id: string): Promise<void>;

  /** The cached flag; subclasses that can probe their backend override this. */
  async isAvailable(): Promise<boolean> {
    return this._isAvailable;
  }

  /**
   * `theme_<ms>_<random>`: unique in practice (time plus random), not
   * guaranteed.
   */
  protected generateId(): string {
    return `theme_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get current ISO timestamp
   */
  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a complete SavedTheme from partial data
   */
  protected createSavedTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): SavedTheme {
    const now = this.getTimestamp();
    return {
      ...theme,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * A theme file as a SavedTheme: the id is the file name without its
   * ".json" suffix, and a file without a name is named by that id.
   */
  protected fileThemeToSaved(
    filename: string,
    fileTheme: FileTheme,
  ): SavedTheme {
    const id = filename.replace(/[.]json$/u, "");
    const now = this.getTimestamp();
    return {
      id,
      name: fileTheme.name || id,
      description: fileTheme.description,
      styles: fileTheme.styles,
      preset: fileTheme.preset,
      createdAt: now,
      updatedAt: now,
      isPublic: true,
    };
  }

  /**
   * The file name of an id: ".json" is appended unless the id already ends
   * with it, so callers may pass either form.
   */
  protected idToFilename(id: string): string {
    return id.endsWith(".json") ? id : `${id}.json`;
  }

  /**
   * Sort themes by updatedAt, newest first (in place)
   */
  protected sortByUpdatedDesc(themes: SavedTheme[]): SavedTheme[] {
    return themes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
}

/**
 * In-memory storage adapter: tests, and the last fallback of
 * createStorageAdapter in "auto" mode. Themes are lost on reload.
 */
export class MemoryStorageAdapter extends BaseStorageAdapter {
  private themes: Map<string, SavedTheme> = new Map();

  constructor() {
    super();
    this._isAvailable = true;
  }

  getType(): StorageType {
    return "memory";
  }

  async getThemes(): Promise<SavedTheme[]> {
    return this.sortByUpdatedDesc(Array.from(this.themes.values()));
  }

  async getTheme(id: string): Promise<SavedTheme | null> {
    return this.themes.get(id) ?? null;
  }

  async saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme> {
    const savedTheme = this.createSavedTheme(theme);
    this.themes.set(savedTheme.id, savedTheme);
    return savedTheme;
  }

  async updateTheme(
    id: string,
    updates: Partial<SavedTheme>,
  ): Promise<SavedTheme> {
    const existing = this.themes.get(id);
    if (!existing) {
      throw new Error(`Theme not found: ${id}`);
    }

    const updated: SavedTheme = {
      ...existing,
      ...updates,
      id, // after the spread: `updates.id` must not rename the theme
      updatedAt: this.getTimestamp(),
    };

    this.themes.set(id, updated);
    return updated;
  }

  async deleteTheme(id: string): Promise<void> {
    this.themes.delete(id);
  }

  /**
   * Clear all themes (useful for testing)
   */
  clear(): void {
    this.themes.clear();
  }
}
