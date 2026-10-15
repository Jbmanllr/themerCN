# File-Based Theme Storage

> **Retired.** This page describes the pre-themercn package (`@banter/themer`)
> and is no longer maintained or linked. Use the package
> [README](../README.md) and [ARCHITECTURE.md](../ARCHITECTURE.md). Pending
> removal by the repository owner.

Generic `'file'` storage mode of the package. **Banter does not use it**: both
hosts pass `storage: 'indexeddb'` (see [README](../README.md#host-integration-contract)).
This port also has no save-theme control: `ThemerProvider` creates the chosen
adapter, but no editor control lists or saves themes through it, so "user-saved
themes" below means themes a host's own code writes through the adapter.

This guide explains how to use file-based theme storage for static sites without a backend.

## Overview

The file-based storage adapter allows you to store themes as JSON files in your `public/` folder. This is perfect for:

- Static sites without a backend
- Sites hosted on Vercel, Netlify, GitHub Pages
- Sharing themes via Git
- Version-controlled themes

## Setup

### 1. Create Themes Folder

Create a `themes` folder in your app's `public` directory:

```
apps/web/
├── public/
│   └── themes/           # Your themes go here
│       ├── default.json
│       ├── dark.json
│       └── custom.json
```

### 2. Configure Themer

Set the storage mode to `'file'` and optionally specify the directory:

```tsx
// app/layout.tsx or app/providers.tsx
import { ThemerProvider } from "@banter/themer";

export default function RootLayout({ children }) {
  return (
    <ThemerProvider
      config={{
        storage: "file", // Use file-based storage
        themesDirectory: "/themes", // Path in public folder (default)
      }}
    >
      {children}
    </ThemerProvider>
  );
}
```

### 3. Add Theme JSON Files

Create JSON theme files in `public/themes/`. Here's an example structure:

```json
{
  "$schema": "https://ui.shadcn.com/schema/theme.json",
  "name": "My Custom Theme",
  "description": "A beautiful custom theme",
  "version": "1.0.0",
  "styles": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)",
      "border": "oklch(0.92 0.004 286.32)",
      "ring": "oklch(0.705 0.015 286.067)",
      "radius": "0.625rem",
      "font-sans": "ui-sans-serif, system-ui, sans-serif"
    },
    "dark": {
      "background": "oklch(0.141 0.005 285.823)",
      "foreground": "oklch(0.985 0 0)",
      "primary": "oklch(0.92 0.004 286.32)",
      "primary-foreground": "oklch(0.21 0.006 285.885)",
      "border": "oklch(1 0 0 / 10%)",
      "ring": "oklch(0.552 0.016 285.938)",
      "radius": "0.625rem",
      "font-sans": "ui-sans-serif, system-ui, sans-serif"
    }
  },
  "preset": "default",
  "metadata": {
    "author": "Your Name",
    "tags": ["custom", "dark"]
  }
}
```

A theme's `id` is its file name without a trailing `.json` (`custom.json` is `custom`), and a file with
no `name` takes its id as its name. The Node `file` adapter follows the same rule.

### 4. Optional: Create Manifest File

To explicitly control which themes are loaded, create a `themes-manifest.json`:

```json
{
  "themes": ["default.json", "dark.json", "custom.json"]
}
```

Without a manifest, the adapter probes `default.json`, `dark.json`, `light.json` and `theme.json`; a
missing probe is skipped silently. A manifest entry that fails to load is skipped with a console
warning, so one bad file does not hide the rest. Files are fetched in parallel and the result keeps the
manifest's order.

## Important Notes

### Read-Only

**Client-side file storage is read-only.** Users cannot save themes back to JSON files directly. This is a browser security limitation.

To save themes:

1. Use **IndexedDB** storage (`storage: 'indexeddb'`) for user-saved themes
2. Or use a **backend API** (`storage: 'payload'`) for persistent storage
3. Or export themes and manually add them to the `public/themes/` folder

### Export Workflow

The editor's Export dialog produces CSS, Tailwind config and layout code, not theme JSON. To ship a theme as a file:

1. Create or edit the theme in the UI
2. Copy the exported variable values
3. Write them into a theme JSON file in `public/themes/` (format above)
4. Redeploy your site

### Auto-Detection

In `auto` mode `createStorageAdapter` picks exactly one adapter:

1. Payload, if `payloadEndpoint` (default `/api/themes`) answers
2. Client files, if `public/themes/` yields at least one theme
3. IndexedDB, in a browser
4. Server files, only when `fileOperations` is passed (`ThemerProvider` never passes it)
5. In-memory storage

## Full Configuration Options

```tsx
<ThemerProvider
  config={{
    // Storage mode
    storage: 'file',           // 'file' | 'indexeddb' | 'payload' | 'auto'

    // Path to themes folder (relative to public)
    themesDirectory: '/themes',

    // Other options
    showTrigger: true,
    shortcut: 'ctrl+shift+e',
  }}
>
```

## Switching Storage Modes

You can switch between storage modes at any time:

```tsx
// For static sites (no backend)
storage: "file";

// For user-saved themes (browser storage)
storage: "indexeddb";

// For CMS integration
storage: "payload";
payloadEndpoint: "/api/themes";

// Auto-detect (recommended)
storage: "auto";
```

## `auto` with shipped files

`storage: 'auto'` uses the files when `public/themes/` holds any theme, and IndexedDB only when it holds none. It never combines them: with shipped files present the adapter is the read-only file one, so users cannot save their own themes.
