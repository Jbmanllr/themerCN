"use client";

// Read-only theme adapter for JSON files served from a public folder (default
// "/themes"), fetched in the browser.
//
// Why: a static site has no backend and a browser cannot list a folder, so
// the list comes from `themes-manifest.json` (`{ "themes": ["a.json"] }`) or,
// without one, from probing four fixed names: default.json, dark.json,
// light.json, theme.json.
//
// Contract:
// - Never writes: saveTheme, updateTheme and deleteTheme throw. Themes ship
//   as files.
// - getThemes fetches in parallel and keeps the manifest's order. A manifest
//   entry that throws (network failure, invalid JSON) is skipped with a
//   console.warn and a non-2xx entry silently; probe misses and failures are
//   skipped silently.
// - isAvailable is a HEAD on the folder URL, which a static host can answer
//   with 404 even when the files exist; createStorageAdapter's "auto" mode
//   therefore asks getThemes for at least one theme instead.
// - Banter hosts pass `storage: "indexeddb"`, so Banter never creates this
//   adapter.
//
// See: packages/themer/docs/FILE-STORAGE.md

import type { StorageType, SavedTheme, FileTheme } from "../types";
import { BaseStorageAdapter } from "./adapter";

/**
 * Fetches themes as JSON files from a public directory, for example
 * `config: { storage: "file", themesDirectory: "/themes" }` over
 * `public/themes/my-theme.json`.
 */
export class ClientFileStorageAdapter extends BaseStorageAdapter {
  private basePath: string;

  constructor(
    options: {
      basePath?: string;
    } = {},
  ) {
    super();
    // Default "/themes" (the public folder); a trailing slash is dropped.
    this.basePath = options.basePath?.replace(/\/$/, "") ?? "/themes";
  }

  getType(): StorageType {
    return "file";
  }

  async isAvailable(): Promise<boolean> {
    try {
      // A 404 here does not prove the files are missing (see the header).
      const response = await fetch(`${this.basePath}/`, { method: "HEAD" });
      this._isAvailable = response.ok;
      return response.ok;
    } catch {
      // A network error is no proof either: stay available and let
      // getThemes try the files directly.
      this._isAvailable = true;
      return true;
    }
  }

  async getThemes(): Promise<SavedTheme[]> {
    // A browser cannot list a folder: use the manifest, else probe common
    // names. Files are fetched in parallel; results keep the list's order.
    try {
      const manifestResponse = await fetch(
        `${this.basePath}/themes-manifest.json`,
      );
      if (manifestResponse.ok) {
        const manifest = (await manifestResponse.json()) as {
          themes: string[];
        };

        const listed = await Promise.all(
          manifest.themes.map((themeFile) =>
            this.fetchTheme(themeFile).catch((error: unknown) => {
              console.warn(`Failed to load theme: ${themeFile}`, error);
              return null;
            }),
          ),
        );
        return listed.filter((theme) => theme !== null);
      }
    } catch {
      // No manifest (or an unreadable one): fall back to the common names.
    }

    const commonThemes = [
      "default.json",
      "dark.json",
      "light.json",
      "theme.json",
    ];

    const themes = await Promise.all(
      commonThemes.map((filename) =>
        // A theme that doesn't exist is skipped
        this.fetchTheme(filename).catch(() => null),
      ),
    );
    return themes.filter((theme) => theme !== null);
  }

  async getTheme(id: string): Promise<SavedTheme | null> {
    const filename = this.idToFilename(id);
    return this.fetchTheme(filename);
  }

  async saveTheme(
    _theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme> {
    throw new Error(
      "Client-side file storage is read-only. " +
        "To save themes, add them to your public/themes/ folder as JSON files. " +
        "Or use a different storage adapter like IndexedDB.",
    );
  }

  async updateTheme(
    _id: string,
    _updates: Partial<SavedTheme>,
  ): Promise<SavedTheme> {
    throw new Error(
      "Client-side file storage is read-only. " +
        "To update themes, modify the JSON files in your public/themes/ folder.",
    );
  }

  async deleteTheme(_id: string): Promise<void> {
    throw new Error(
      "Client-side file storage is read-only. " +
        "To delete themes, remove the JSON files from your public/themes/ folder.",
    );
  }

  /**
   * Fetch one theme file: null on a non-2xx answer; a network or JSON error
   * throws.
   */
  private async fetchTheme(filename: string): Promise<SavedTheme | null> {
    const url = `${this.basePath}/${filename}`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const fileTheme: FileTheme = await response.json();
    return this.fileThemeToSaved(filename, fileTheme);
  }
}
