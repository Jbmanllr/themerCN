/**
 * @banter/themer
 *
 * The local-development shadcn/ui theme editor, adapted from tweakcn
 * (README.md). This root barrel re-exports the package's public surface;
 * some files are reachable only by path (docs/API.md says which).
 * - Live theme editing with real-time preview
 * - Storage adapters (Payload CMS, files, IndexedDB); no editor control
 *   saves themes through them
 * - HSL adjustments, contrast checking, font selection
 * - Export to CSS, Tailwind v3/v4
 * - An AI generation panel that is a mock, shown only with `showTabAI`
 */

// Types
export * from "./types";

// Config
export * from "./config";

// Selectors
export * from "./selectors";

// Stores
export * from "./stores";

// Hooks
export * from "./hooks";

// Utils
export * from "./utils";

// Storage
export * from "./storage";

// Components
export * from "./components";

// API (server actions)
export * from "./api";
