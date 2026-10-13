// Theme storage over a Payload CMS collection's REST API (default endpoint
// "/api/themes").
//
// Contract:
// - isAvailable is a GET on the endpoint and is true only on a 2xx; it is
//   what createStorageAdapter's "auto" mode tries first.
// - getThemes keeps the server's order (no sorting) and reads `docs` or a
//   bare array. getTheme answers null on a 404; deleteTheme treats a 404 as
//   success. Any other non-2xx throws.
// - Banter hosts pass `storage: "indexeddb"`, so Banter never creates this
//   adapter.
//
// See: ./index.ts (createStorageAdapter)
import type { StorageType, SavedTheme, PayloadTheme } from "../types";
import { BaseStorageAdapter } from "./adapter";

/**
 * Payload CMS storage adapter
 * Stores themes using Payload's REST API
 */
export class PayloadStorageAdapter extends BaseStorageAdapter {
  private endpoint: string;
  private fetchFn: typeof fetch;

  constructor(
    options: {
      endpoint?: string;
      fetch?: typeof fetch;
    } = {},
  ) {
    super();
    this.endpoint = options.endpoint ?? "/api/themes";
    this.fetchFn = options.fetch ?? fetch.bind(globalThis);
  }

  getType(): StorageType {
    return "payload";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchFn(this.endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      this._isAvailable = response.ok;
      return this._isAvailable;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  async getThemes(): Promise<SavedTheme[]> {
    const response = await this.fetchFn(this.endpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch themes: ${response.statusText}`);
    }

    const data = await response.json();
    const docs: PayloadTheme[] = data.docs ?? data;

    return docs.map(this.mapPayloadToSaved);
  }

  async getTheme(id: string): Promise<SavedTheme | null> {
    const response = await this.fetchFn(`${this.endpoint}/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.statusText}`);
    }

    const data: PayloadTheme = await response.json();
    return this.mapPayloadToSaved(data);
  }

  async saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme> {
    const response = await this.fetchFn(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: theme.name,
        description: theme.description,
        styles: theme.styles,
        preset: theme.preset,
        isPublic: theme.isPublic ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save theme: ${error}`);
    }

    const data: PayloadTheme = await response.json();
    return this.mapPayloadToSaved(data);
  }

  async updateTheme(
    id: string,
    updates: Partial<SavedTheme>,
  ): Promise<SavedTheme> {
    const response = await this.fetchFn(`${this.endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
        styles: updates.styles,
        preset: updates.preset,
        isPublic: updates.isPublic,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update theme: ${error}`);
    }

    const data: PayloadTheme = await response.json();
    return this.mapPayloadToSaved(data);
  }

  async deleteTheme(id: string): Promise<void> {
    const response = await this.fetchFn(`${this.endpoint}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Failed to delete theme: ${error}`);
    }
  }

  /**
   * Map Payload document to SavedTheme
   */
  private mapPayloadToSaved = (doc: PayloadTheme): SavedTheme => {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      styles: doc.styles,
      preset: doc.preset,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy?.id,
      isPublic: doc.isPublic,
      previewImage: doc.previewImage?.url,
    };
  };

  /**
   * Generate a shareable URL for a theme
   */
  async getShareUrl(id: string, baseUrl?: string): Promise<string> {
    const base =
      baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/theme/${id}`;
  }
}
