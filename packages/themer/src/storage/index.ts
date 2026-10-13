// Theme storage: the adapters and the one function that picks one.
//
// Contract:
// - createStorageAdapter in "auto" mode tries, in order: Payload (a 2xx GET
//   on its endpoint); in a browser, client files when at least one theme is
//   found, then IndexedDB; with `fileOperations`, server files; else memory,
//   which loses themes on reload.
// - An explicit mode creates its adapter without checking it; "indexeddb"
//   throws outside a browser, and "file" on a server throws without
//   `fileOperations`.
// - ThemerProvider passes its own `themesDirectory` (undefined unless the
//   host sets one, so the client-file default "/themes" applies), not
//   defaultStorageConfig. Banter hosts pass `storage: "indexeddb"`.
//
// See: packages/themer/docs/FILE-STORAGE.md
import type { StorageAdapter, StorageConfig } from "../types";
import { MemoryStorageAdapter } from "./adapter";
import { PayloadStorageAdapter } from "./payload-adapter";
import { IndexedDBStorageAdapter } from "./indexeddb-adapter";
import { FileStorageAdapter, type FileOperations } from "./file-adapter";
import { ClientFileStorageAdapter } from "./client-file-adapter";

export { BaseStorageAdapter, MemoryStorageAdapter } from "./adapter";
export { PayloadStorageAdapter } from "./payload-adapter";
export { IndexedDBStorageAdapter } from "./indexeddb-adapter";
export {
  FileStorageAdapter,
  createNodeFileOperations,
  type FileOperations,
} from "./file-adapter";
export { ClientFileStorageAdapter } from "./client-file-adapter";

/** Creates the storage adapter `config.mode` names; "auto" picks one in
 * the order the file header gives. */
export async function createStorageAdapter(
  config: StorageConfig,
  options?: {
    fetch?: typeof fetch;
    fileOperations?: FileOperations;
  },
): Promise<StorageAdapter> {
  const { mode } = config;

  // Auto-detect mode
  if (mode === "auto") {
    // Try Payload first (if backend available)
    const payloadAdapter = new PayloadStorageAdapter({
      endpoint: config.payloadEndpoint,
      fetch: options?.fetch,
    });

    if (await payloadAdapter.isAvailable()) {
      return payloadAdapter;
    }

    // Client-side detection (browser only)
    if (typeof window !== "undefined") {
      // Try client file storage (public/themes folder)
      const clientFileAdapter = new ClientFileStorageAdapter({
        basePath: config.themesDirectory,
      });

      // Check if any themes exist
      const themes = await clientFileAdapter.getThemes();
      if (themes.length > 0) {
        return clientFileAdapter;
      }

      // Fall back to IndexedDB
      const indexedDBAdapter = new IndexedDBStorageAdapter({
        dbName: config.indexedDBName,
      });

      if (await indexedDBAdapter.isAvailable()) {
        return indexedDBAdapter;
      }
    }

    // Server-side: file storage if file operations provided
    if (options?.fileOperations) {
      const fileAdapter = new FileStorageAdapter({
        directory: config.themesDirectory,
        fileOperations: options.fileOperations,
      });

      if (await fileAdapter.isAvailable()) {
        return fileAdapter;
      }
    }

    // Final fallback: memory storage
    return new MemoryStorageAdapter();
  }

  // Explicit mode selection
  switch (mode) {
    case "payload":
      return new PayloadStorageAdapter({
        endpoint: config.payloadEndpoint,
        fetch: options?.fetch,
      });

    case "indexeddb":
      if (typeof window === "undefined") {
        throw new Error("IndexedDB is only available in browser environments");
      }
      return new IndexedDBStorageAdapter({
        dbName: config.indexedDBName,
      });

    case "file":
      // Use client-side file adapter in browser, server-side if fileOperations provided
      if (typeof window !== "undefined") {
        // Browser: fetch from public folder
        return new ClientFileStorageAdapter({
          basePath: config.themesDirectory,
        });
      }

      // Server: use Node.js fs
      if (!options?.fileOperations) {
        throw new Error(
          "File operations required for server-side file storage mode",
        );
      }
      return new FileStorageAdapter({
        directory: config.themesDirectory,
        fileOperations: options.fileOperations,
      });

    default:
      throw new Error(`Unknown storage mode: ${mode}`);
  }
}

/**
 * Default storage configuration
 */
export const defaultStorageConfig: StorageConfig = {
  mode: "auto",
  themesDirectory: "./themes",
  payloadEndpoint: "/api/themes",
  indexedDBName: "themer-db",
};
