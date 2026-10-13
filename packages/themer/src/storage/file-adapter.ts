// Read-write theme adapter over a directory of JSON files, for the server.
//
// Why: it takes the file system as an injected `FileOperations` and never
// imports `fs` itself, so it works over any file system implementation;
// createNodeFileOperations builds one from `fs/promises`.
//
// Contract:
// - The id is the file name minus its trailing ".json"; saveTheme derives it
//   from the name (slugify), so two names with the same slug share one file
//   and the later save overwrites it. Nothing here checks for a clash.
// - getThemes skips a file that cannot be read or parsed (console.warn) and
//   keeps the rest; getTheme returns null for any read failure.
// - saveTheme takes both timestamps from the file's stat and updateTheme its
//   updatedAt; listing and reading stamp the READ time instead (see
//   BaseStorageAdapter.fileThemeToSaved).
// - createStorageAdapter creates it only when given `fileOperations` ("file"
//   mode: outside a browser; "auto" mode: after the other candidates fail).
//   ThemerProvider never passes them, and Banter hosts use IndexedDB.
//
// See: packages/themer/docs/FILE-STORAGE.md

import type { StorageType, SavedTheme, FileTheme } from "../types";
import { BaseStorageAdapter } from "./adapter";

/**
 * File-based storage adapter for server-side use: themes are JSON files in
 * one directory. Call it from server actions or API routes, never from client
 * code (the injected operations need the file system).
 */
export class FileStorageAdapter extends BaseStorageAdapter {
  private directory: string;
  private fileOps: FileOperations;

  constructor(options: { directory?: string; fileOperations: FileOperations }) {
    super();
    this.directory = options.directory ?? "./themes";
    this.fileOps = options.fileOperations;
  }

  getType(): StorageType {
    return "file";
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.fileOps.ensureDir(this.directory);
      this._isAvailable = true;
      return true;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  async getThemes(): Promise<SavedTheme[]> {
    const files = await this.fileOps.readDir(this.directory);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    // Read in parallel; a file that fails to read or parse is skipped, so one
    // broken file does not hide the others.
    const themes = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await this.fileOps.readFile(
            `${this.directory}/${file}`,
          );
          const fileTheme: FileTheme = JSON.parse(content);
          return this.fileThemeToSaved(file, fileTheme);
        } catch (error) {
          console.warn(`Failed to read theme file: ${file}`, error);
          return null;
        }
      }),
    );

    return this.sortByUpdatedDesc(themes.filter((theme) => theme !== null));
  }

  async getTheme(id: string): Promise<SavedTheme | null> {
    const filename = this.idToFilename(id);
    const filepath = `${this.directory}/${filename}`;

    try {
      const exists = await this.fileOps.exists(filepath);
      if (!exists) return null;

      const content = await this.fileOps.readFile(filepath);
      const fileTheme: FileTheme = JSON.parse(content);
      return this.fileThemeToSaved(filename, fileTheme);
    } catch {
      return null;
    }
  }

  async saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme> {
    const id = this.slugify(theme.name);
    const filename = `${id}.json`;
    const filepath = `${this.directory}/${filename}`;

    const fileTheme: FileTheme = {
      $schema: "https://ui.shadcn.com/schema/theme.json",
      name: theme.name,
      description: theme.description,
      version: "1.0.0",
      styles: theme.styles,
      preset: theme.preset,
      metadata: {
        tags: [],
      },
    };

    await this.fileOps.ensureDir(this.directory);
    await this.fileOps.writeFile(filepath, JSON.stringify(fileTheme, null, 2));

    const stats = await this.fileOps.stat(filepath);

    return {
      id,
      name: theme.name,
      description: theme.description,
      styles: theme.styles,
      preset: theme.preset,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      isPublic: theme.isPublic,
    };
  }

  async updateTheme(
    id: string,
    updates: Partial<SavedTheme>,
  ): Promise<SavedTheme> {
    const existing = await this.getTheme(id);
    if (!existing) {
      throw new Error(`Theme not found: ${id}`);
    }

    const filename = this.idToFilename(id);
    const filepath = `${this.directory}/${filename}`;

    const fileTheme: FileTheme = {
      $schema: "https://ui.shadcn.com/schema/theme.json",
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      version: "1.0.0",
      styles: updates.styles ?? existing.styles,
      preset: updates.preset ?? existing.preset,
    };

    await this.fileOps.writeFile(filepath, JSON.stringify(fileTheme, null, 2));

    const stats = await this.fileOps.stat(filepath);

    return {
      ...existing,
      ...updates,
      id,
      updatedAt: stats.mtime,
    };
  }

  async deleteTheme(id: string): Promise<void> {
    const filename = this.idToFilename(id);
    const filepath = `${this.directory}/${filename}`;

    try {
      await this.fileOps.unlink(filepath);
    } catch {
      // Deleting a theme that is not there is not an error.
    }
  }

  /**
   * "Ocean Breeze!" -> "ocean-breeze": lower-case, drop punctuation and
   * non-ASCII letters, turn runs of spaces, underscores and hyphens into one
   * "-", trim hyphens at both ends. A name without an ASCII letter or digit
   * gives an empty slug.
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

/**
 * The file system operations FileStorageAdapter needs, injected so it works
 * with any file system implementation. Paths are joined as
 * `<directory>/<name>`. `stat` times are ISO 8601 strings.
 */
export interface FileOperations {
  readDir(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  unlink(path: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  stat(path: string): Promise<{ birthtime: string; mtime: string }>;
}

/**
 * FileOperations over Node's `fs/promises`, which the caller passes in. Use
 * it in server actions or API routes. `ensureDir` creates the directory
 * recursively.
 */
export function createNodeFileOperations(
  fs: typeof import("fs/promises"),
): FileOperations {
  return {
    readDir: (path) => fs.readdir(path),
    readFile: (path) => fs.readFile(path, "utf-8"),
    writeFile: (path, content) => fs.writeFile(path, content, "utf-8"),
    exists: async (path) => {
      try {
        await fs.access(path);
        return true;
      } catch {
        return false;
      }
    },
    unlink: (path) => fs.unlink(path),
    ensureDir: (path) =>
      fs.mkdir(path, { recursive: true }).then(() => undefined),
    stat: async (path) => {
      const stats = await fs.stat(path);
      return {
        birthtime: stats.birthtime.toISOString(),
        mtime: stats.mtime.toISOString(),
      };
    },
  };
}
