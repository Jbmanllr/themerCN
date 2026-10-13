import type { SavedTheme, ThemeStyles } from "./theme";

/**
 * Storage adapter interface for theme persistence
 */
export interface StorageAdapter {
  /** Get all saved themes */
  getThemes(): Promise<SavedTheme[]>;

  /** Get a single theme by ID */
  getTheme(id: string): Promise<SavedTheme | null>;

  /** Save a new theme */
  saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme>;

  /** Update an existing theme */
  updateTheme(id: string, theme: Partial<SavedTheme>): Promise<SavedTheme>;

  /** Delete a theme */
  deleteTheme(id: string): Promise<void>;

  /** Check if storage is available */
  isAvailable(): Promise<boolean>;

  /** Get storage type identifier */
  getType(): StorageType;
}

/**
 * Storage type identifier
 */
export type StorageType = "payload" | "file" | "indexeddb" | "memory";

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage mode: 'payload' for CMS, 'file' for JSON files, 'indexeddb' for browser, 'auto' to detect */
  mode: "payload" | "file" | "indexeddb" | "auto";
  /** Directory for file-based storage (default: './themes') */
  themesDirectory?: string;
  /** Payload API endpoint (default: '/api/themes') */
  payloadEndpoint?: string;
  /** IndexedDB database name */
  indexedDBName?: string;
}

/**
 * Payload theme document structure
 */
export interface PayloadTheme {
  id: string;
  name: string;
  description?: string;
  styles: ThemeStyles;
  preset?: string;
  createdBy?: {
    id: string;
    email?: string;
    name?: string;
  };
  isPublic: boolean;
  previewImage?: {
    id: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * File-based theme JSON structure
 */
export interface FileTheme {
  $schema?: string;
  name: string;
  description?: string;
  version?: string;
  styles: ThemeStyles;
  preset?: string;
  metadata?: {
    author?: string;
    license?: string;
    tags?: string[];
  };
}

/**
 * Theme share URL data
 */
export interface ShareData {
  id: string;
  url: string;
  expiresAt?: string;
}

/**
 * Storage adapter factory options
 */
export interface StorageAdapterOptions {
  config: StorageConfig;
  /** Optional fetch function for server-side usage */
  fetch?: typeof fetch;
}
