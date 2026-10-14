# Architecture

## Overview

The themer package is a visual theme editor SDK for shadcn/ui applications. It provides a complete system for editing, previewing, and persisting design tokens (colors, fonts, spacing, shadows) with real-time updates.

In Banter it is a local-development tool only, mounted by `apps/web` and the CMS marketing site behind a build-time gate. How a host wires it (gate, alias, shell, font route, scoped CSS layer) is the [README host integration contract](README.md#host-integration-contract); this page describes the package internals.

**Goals:**

- Embeddable in any React/Next.js application
- Multiple storage backends for different deployment scenarios
- Accessible color editing with WCAG compliance
- AI theme generation (a mock server action behind `showTabAI`, off by default; see [AI Generation Flow](#ai-generation-flow))
- Full undo/redo support

**Origin:** adapted from [tweakcn](https://github.com/jnsahaj/tweakcn) (Apache-2.0; see [NOTICE](NOTICE) and `LICENSES/`), via the p0rtal monorepo's themer. Ported files carry the header `Adapted from tweakcn (Apache-2.0, ...); modified for themercn.`

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interaction                               │
│   (Color picker, Font selector, Slider, AI prompt, Keyboard shortcut)   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          State Management                                │
│   EditorStore ─── PreferencesStore ─── OverlayStore ─── AIStore         │
│   (Zustand)       (persistent)          (transient)     (chat history)  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐ ┌─────────────┐ ┌────────────┐
            │ DOM Apply │ │ localStorage│ │ Storage    │
            │ (CSS vars)│ │ (editor +   │ │ Adapter    │
            └───────────┘ │ preferences)│ │ (themes)   │
                          └─────────────┘ └────────────┘
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          ▼                     ▼                     ▼
                    ┌───────────┐         ┌───────────┐         ┌───────────┐
                    │ Payload   │         │ IndexedDB │         │ File/     │
                    │ CMS       │         │           │         │ Memory    │
                    └───────────┘         └───────────┘         └───────────┘
```

## Components

### Core Entry Points

| Component        | Responsibility                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `ThemerProvider` | Context root. Initializes stores, applies theme, registers shortcuts                      |
| `ThemerRoot`     | Renders the trigger and the overlay beside the host's `children`, with no wrapper element |
| `ThemerOverlay`  | Main editor UI. Desktop uses SidebarProvider, mobile (< 1280 px) a Drawer without preview |
| `ThemerTrigger`  | Floating button to open editor                                                            |

### Editor Panels

| Panel       | Components                                                           | Purpose                                                                               |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Colors      | `ColorControls`, `ColorPicker`, `ColorSelectorPopover`               | Edit 32 colour variables plus host `extraColors`: search, groups, Sidebar Sync toggle |
| Typography  | `FontControls` (sans, heading, serif, mono), `LetterSpacingControl`  | Font family selection, character spacing                                              |
| Other       | `HSLAdjustments`, `RadiusControl`, `SpacingControl`, `ShadowControl` | Global transformations, layout tokens                                                 |
| AI Generate | `AIChat`, `AIPromptInput`, `AISuggestions`                           | AI-powered theme generation                                                           |

### Preview System

The tab list is data: `BUILTIN_TABS` (`preview/builtin-tabs.tsx`) merged with `ThemerConfig.previewTabs` by `mergePreviewTabs` (`preview/preview-tab-registry.ts`; sorted by `order`, a host id replaces a built-in id, host tabs without `order` go last). `resolveActiveTabId` falls back to the first tab for an unknown persisted id, in render. Only the active tab mounts; host tabs render inside `ThemerConfig.previewWrapper` (the editor is portaled outside the host tree).

| Component / module                  | Purpose                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreviewTabs`                       | Tab bar, inspector toggle (`Ctrl+I`), fullscreen button; subscribes to no theme state                                                                                                           |
| Built-in tabs                       | Live (order 0), Cards, Dashboard, Mail, Pricing, Color Palette, Typography (in the "more" menu)                                                                                                 |
| `LivePreview`                       | Same-origin iframe of the page the editor was opened from; theme applied with `applyThemeToDocument(..., { loadFonts })`                                                                        |
| `InspectorOverlay` + `useInspector` | Binds to the active tab's element tree or to the frame's `contentDocument`; hover = token classes, click pins and calls `focusColor`; `readFrameDocument` returns null for a cross-origin frame |
| `useFullscreenSync`                 | Keeps `overlay.fullscreenPreview` in step with the Fullscreen API; CSS fallback layout when the request is refused; `Esc` exits                                                                 |

### Initialization

| Component           | Purpose                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThemeScript`       | Inline script for `<head>` to prevent FOUC; Banter's hosts run the same body from `host/head-script.tsx` instead (a raw `<script>` through their alias-gated mount) |
| `DynamicFontLoader` | Loads active theme fonts for runtime preview                                                                                                                        |

### Hooks

| Hook                  | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `useThemer`           | Primary API hook with state, actions, history, export |
| `useKeyboardShortcut` | Register keyboard shortcuts with modifiers            |
| `useColorFocus`       | Register color control for inspector highlighting     |
| `useIsMobile`         | Viewport detection for responsive behavior            |
| `useFontLoader`       | Load a selected font family for browser preview       |
| `useFontSearch`       | Paginated font catalog search for the picker          |
| `useToggleMode`       | Light/dark with the View Transitions circular reveal  |
| `useFullscreenSync`   | Fullscreen preview flag <-> Fullscreen API            |

## State Management

Zustand stores with separation of concerns:

### EditorStore (Persistent)

**Storage:** `localStorage:themer-editor-state`, `version: EDITOR_STATE_VERSION` (2). Only `themeState`, `themeCheckpoint` and `presetBaseline` persist (`history`, `future` and `restoredFromStorage` never do). `migrateEditorState` upgrades older states: v0→v1 renames the seven local presets that shadowed tweakcn ids to `themer-<id>` and fills `font-heading` from each mode's serif; v1→v2 drops a stored, unedited library `default` (saved before hosts had a default preset) so `adoptDefaultPreset` applies the host's preset.

```typescript
{
  themeState: {
    styles: { light: ThemeModeStyles, dark: ThemeModeStyles },  // ThemeStyleProps & host extra colours by key
    currentMode: 'light' | 'dark',
    preset?: string,
    hslAdjustments?: { hueShift, saturationScale, lightnessScale }
  },
  themeCheckpoint: ThemeEditorState | null,  // Base the HSL controls recompute from
  presetBaseline: { preset, styles } | null,  // The preset as last put on the theme; refreshUntouchedPreset's baseline (null on a store saved before it existed)
  history: HistoryEntry[],                   // Undo stack (max 30)
  future: HistoryEntry[],                    // Redo stack
  restoredFromStorage: boolean               // Set when state was restored; lets adoptDefaultPreset tell a fresh store from a restored one
}
```

**Key behaviors:**

- Debounced history (500 ms) batches rapid changes into one entry; at most 30 entries; history is not persisted
- Mode-only changes don't create history entries
- Preset application and CSS import always start a new entry and move the checkpoint; reset to preset clears history
- `themeCheckpoint` is the theme before the first HSL adjustment away from neutral (`saveThemeCheckpoint`, called by `HSLAdjustments`), and the HSL controls always recompute from it. `applyThemePreset`, `importThemeStyles`, `resetToCurrentPreset`, `adoptDefaultPreset`, `refreshUntouchedPreset`, `undo` and `redo` all move it. It does not say whether the theme was edited, and it is not what "unsaved changes" compares with: `selectHasUnsavedChanges` compares `themeState` with the resolved preset and neutral HSL
- Preset colours always come from `resolvePresetStyles` (defaults, then light, then dark over light)
- `updateCommonStyle` writes mode-shared keys (fonts, radius, spacing, letter spacing, shadow parameters) to both modes
- `importThemeStyles` applies parsed CSS (`parseThemeCss`); common keys set only in light also reach dark
- `adoptDefaultPreset` moves a fresh store (nothing restored, nothing edited) to `defaultPreset` without history
- `refreshUntouchedPreset` (run by `ThemerProvider` in the same layout effect, after `configurePresets` registered the host presets; never at module-load hydration) makes an untouched preset follow its source: when `themeState` equals `presetBaseline` (same preset id, equal styles, neutral HSL) but `resolvePresetStyles(preset)` now differs from it (host tokens changed since it was stored), theme, checkpoint and baseline become the fresh preset, keeping `currentMode`, with no history entry. `presetBaseline` is set only by `applyThemePreset`, `resetToCurrentPreset`, `adoptDefaultPreset` and the refresh itself (and kept in step by Sidebar Sync's re-alignment while the theme still equals it), so an imported, AI-made, edited or undone theme is never replaced; a store saved before the baseline existed gets one only when its theme already equals its preset
- **Host extra colours** (`ThemerConfig.extraColors`, registered by `configureExtraColors` in [extra-colors.ts](src/config/extra-colors.ts) during render, like presets) live in the same per-mode `styles` objects as built-in keys, so persistence, undo/redo and "unsaved" need no extra code. An extra a theme does not set is absent (never blank): apply writes nothing for it and the host's CSS value shows; a preset without extras leaves them absent. Pure helpers take the keys as an argument (`adjustThemeStyles`, `generateThemeCode`, `parseThemeCss`); the colour list, `focusColor`, the inspector regex and apply's fallback cleanup read the registry

### Preset registry

[presets.ts](src/config/presets.ts) owns the registry (`themePresets`) and its
one resolution rule; its file header is the contract.

- Registry order: `default`, tweakcn's catalog, this package's local presets
  (renamed `themer-*` where tweakcn has the same id), then host presets from
  `ThemerConfig.presets`, which win on an id clash. The picker's order is
  different: `getPresetIds` lists `default` first, then sorts by label.
- `configurePresets` (called by `ThemerProvider` during render) registers the
  host presets and default preset id in place and clears the resolved-styles
  cache; no other code writes either.
- Every reader of a preset's colours goes through `resolvePresetStyles`: a
  preset lists only the keys it changes, and dark inherits the preset's light
  values before its own. Never read `preset.styles` directly.
- `LEGACY_PRESET_IDS` is applied only by `migrateEditorState`'s v0 to v1 step.
  Renaming a built-in id again also needs an `EDITOR_STATE_VERSION` bump
  whose migration applies it.

### PreferencesStore (Persistent)

**Storage:** `localStorage:themer-preferences`

```typescript
{
  colorFormat: 'hex' | 'hsl' | 'rgb' | 'oklch',  // default 'oklch'; Tailwind 3 drops 'oklch' for 'hsl'
  tailwindVersion: '3' | '4',                     // default '4'
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun', // default 'pnpm'
  showContrastWarnings: boolean,
  aiProvider?: 'openai' | 'google' | 'anthropic',
  previewTab?: string,                            // default 'cards'
  sidebarCollapsed: boolean,
  themeOverrideEnabled: boolean,                  // default true; page and Live tab show the edited theme
  sidebarColorSync: boolean,                      // sidebar colours follow their base twins
  colorSelectorTab: 'list' | 'palette',
  sectionStates: Record<string, boolean>          // ControlSection open states
}
```

`version: PREFERENCES_VERSION` (2). `migratePreferences`: v0 -> v1 the `custom` preview tab became `live`; v1 -> v2 section states move from the legacy `themer-section-states` key into `sectionStates`.

### OverlayStore (Transient)

```typescript
{
  isOpen: boolean,
  activePanel: 'colors' | 'typography' | 'other' | 'generate',
  inspectorMode: boolean,
  fullscreenPreview: boolean
}
```

### ColorFocusStore (Transient)

```typescript
{
  highlightTarget: string | null,  // Variable being highlighted
  colorSearch: string              // Colour list search; cleared when the editor closes
}
```

DOM elements are not stored: the focus registry is a module-level `Map` in `hooks/use-color-focus.ts`, so registering a picker per colour token re-renders nobody.

### AIStore (Transient)

```typescript
{
  messages: AIMessage[],
  isLoading: boolean,
  error: string | null,
  currentInput: string,
  uploadedImages: string[]
}
```

## Data Flow

### Theme Editing Flow

```
1. User adjusts color picker
   │
   ▼
2. setThemeState({ styles: { light: { primary: newColor } } })
   │
   ▼
3. EditorStore updates (with debounced history)
   │
   ▼
4. useEffect in ThemerProvider triggers
   │
   ▼
5. applyThemeToElement(themeState, document.documentElement, options)
   │
   ▼
6. CSS variables + override style sheet updated on <html>
   │
   ▼
7. UI re-renders with new colors
```

#### Applying a theme (`utils/apply-theme.ts`)

- **Verbatim values.** Colours and the common keys are written as stored (`--primary: oklch(...)`). Hosts map `--color-x: var(--x)` in `@theme inline`, so any valid CSS colour works; nothing is rewritten to hsl.
- **Tracking.** Letter spacing has no host reader, so it is set as `letter-spacing` on `<html>` plus `--tracking-tighter|tight|normal|wide|wider|widest` derived from it (`calc(var(--letter-spacing) +/- offset)`; `normal` uses `0em`), which Tailwind's tracking utilities read.
- **Shadows.** Tailwind compiles `.shadow-*` with literal values, so `--shadow-*` alone changes nothing. The editor writes `--shadow-2xs|xs|sm|shadow|md|lg|xl|2xl` (from `getShadowMap`) and injects one constant `<style data-themer-overrides>` per document (`SHADOW_OVERRIDE_CSS`) pointing each utility's `--tw-shadow` at its variable with `!important`, plus `hover:`/`focus:`/`focus-visible:`/`active:` variants so a state size still wins over the base size. Shadows are written only when the mode's six shadow inputs differ from the library defaults (a preset that declares shadows, or an edit), so a preset without shadows keeps the host's Tailwind scale. Sheet removed when no shadow variable is written.
- **Tracking of written properties.** A `WeakMap<HTMLElement, Set<string>>` records what was set, so a re-apply removes keys the new theme dropped and `removeThemeFromElement` removes exactly those (fallback list `knownThemeProperties` if the record was lost, e.g. hot reload).
- **Documents.** `applyThemeToDocument(doc, state, { loadFonts })` serves the host page and the Live iframe (re-applied after each frame load, since a navigation is a new document). The provider re-applies on every change and removes everything only when the override switch goes off or the editor unmounts.
- **Fonts.** Applying the theme to a document with `loadFonts` calls `setThemeFonts`; the host page gets the same through `DynamicFontLoader`.

When the provider is mounted under `next-themes`, `resolvedTheme` controls the active light/dark
mode and themer does not mutate the root theme class. That keeps a single owner for `html.dark` /
`html.light` while preserving live CSS variable editing. Standalone consumers without a
`next-themes` provider keep the legacy behavior because `applyThemeToElement` defaults to updating
the root class.

Apps that use `next/font` keep loaded font asset variables separate from theme tokens: Banter's
`web.css` maps `--font-sans` to `var(--font-dm-sans)` and so on. The editor edits the semantic
`--font-sans`, `--font-heading`, `--font-serif` and `--font-mono` on `<html>`. For that to change
the page, the tokens must be declared in a plain `@theme {}` block (Tailwind then compiles
`.font-sans` to `var(--font-sans)`), not in `@theme inline`, which would bake the `next/font`
variable into every utility. `@banter/ui-tokens` does this for fonts; colours and radius stay
`@theme inline`.

### Font Catalog Flow

```
1. User opens a font picker
   │
   ▼
2. FontPicker enables useFontSearch()
   │
   ├─► Query key: endpoint + search text + category + page size
   ├─► Debounced search input
   └─► IntersectionObserver requests the next page
   │
   ▼
3. Host app route returns { fonts, total, offset, limit, hasMore }
   │
   ├─► Editor on + GOOGLE_FONTS_API_KEY: Google Fonts Developer API catalog (Next fetch cache, 24 h)
   ├─► Editor on without key: Google's public metadata catalog (keyless, 24 h in memory)
   ├─► Failed fetch: bundled fallback catalog
   └─► Editor off (not `next dev` with the host's flag): 404, no catalog exposure
   │
   ▼
4. User selects a font
   │
   ├─► acquireGoogleFont() takes a reference on the family's <link> (utils/font-loader)
   ├─► waitForFont() confirms the browser font is ready
   └─► font-sans/heading/serif/mono is written as a full CSS font-family stack
```

The catalog endpoint is host-configured through `ThemerConfig.fontCatalogEndpoint` and defaults to
`/dev/themer/google-fonts`, the path both Banter hosts serve and pass. Each host's route is
`fontCatalogRoute(isEnabled)` from `src/host/font-catalog-route.ts`: it gates on the host's switch and
reads the server-only API key; the response itself, including the bundled fallback and paging
clamps, comes from `fontCatalogResponse` in `src/api/font-catalog.ts`.
Production apps should continue to load shipped fonts through `next/font` or local assets. The
Themer font loader is a development preview mechanism: it injects Google Fonts links only after user
interaction so the editor can visualize choices before the final exported variables are copied into
the app's global CSS.

`font-sans`, `font-heading`, `font-serif`, and `font-mono` are common typography tokens
(`COMMON_STYLE_KEYS`, with radius, spacing, letter spacing and the shadow parameters). The controls
write them into both light and dark through `updateCommonStyle`.

#### Font link registry (`utils/font-loader.ts`)

Fonts are per document (host page, Live iframe), and several holders ask for the same family (the
theme, picker previews, an iframe). Each document has a registry entry per family (and per preview
subset) with a **reference count**: `acquireGoogleFont` / `acquireFontPreview` return a release
function; the first acquire appends `<link rel="stylesheet" data-themer-font="Family">`, the last
release removes it, and a link someone else removed from `<head>` is treated as stale and recreated.
`setThemeFonts(doc, families)` diffs against the families the theme holds in that document,
releasing the ones no longer named; `clearThemeFonts` releases all (override off, unmount). A failed
link (Google answers 400 for a static family lacking a requested weight) retries once with the
default weight. Names that are not CSS identifiers are quoted by `quoteFontFamily`; a stack starting
with a system family or `var(...)` names no Google family and is never requested.

#### Font Picker Positioning and Scroll Ownership

The font picker composes the shared Base UI shadcn wrappers as `Popover + Command`; the category
filter inside the panel uses the shared Base UI `Select`. The content width is tied to the trigger
through the Base UI Positioner CSS variable `--anchor-width`, which keeps the combobox stable across
different sidebar widths and selected font names. This mirrors the width contract used by the shared
select/dropdown wrappers and avoids a Themer-only hardcoded pixel width.

The picker passes only the stock props `side="bottom"` and `align="start"`; Base UI's default
collision handling applies, so it can still flip above the trigger when there is no room below.
Never add positioner props of Banter's own: `@banter/ui` is stock shadcn and has none (ADR-0080).
The scroll container also clamps wheel events at its own top and bottom boundaries
(`useScrollBoundary`). CSS `overscroll-contain` remains on the command list, but the native
non-passive wheel listener is the guard that prevents scroll chaining into the live preview when the
font list is rendered through a portal.

#### Popup layering

The Themer's CSS (`src/styles/themer.css`, compiled by `scripts/build-css.mjs` and injected as a
`<style data-themer-style>` by `<Themer>`) applies only inside `@scope ([data-themer]) to
([data-themer-host])`. Base UI popups portal into `[data-themer-portals]`, a container inside that
root (`ThemerScope`, `components/themer-scope.tsx`), through `@workspace/ui`'s
`PortalContainerContext`: Popover, Select, DropdownMenu, Tooltip, Dialog, Sheet and Drawer pass
`container={usePortalContainer()}` (`components/portal-container.test.tsx` fails if a
`shadcn add -o` reinstall drops it). The container is fixed at the viewport origin, unclipped, one
layer above the overlay. Every popup shares that layer; one opened from inside another (the font
picker's category select) is portalled later, so it paints on top. Host preview tabs render inside
`[data-themer-host]`, the scope's lower boundary. The editor renders stock
`@banter/ui` components only, so it sets no positioner props of its own.

### Export Flow

```
1. User clicks "Export Code"
   │
   ▼
2. generateThemeCode(themeState, colorFormat, tailwindVersion)
   │
   ├─► CSS: :root { --primary: hsl(...); } .dark { ... }
   │
   └─► Tailwind: @theme inline { ... } (v4) or tailwind.config.js (v3)
```

### AI Generation Flow

```
1. User submits prompt → AIStore.addMessage()
   │
   ▼
2. Server action: generateTheme(request)   (src/api/ai-generate.ts: mock, no provider call)
   │
   ▼
3. Response: { success, theme?: { light, dark }, message?, error? }
   │
   ▼
4. Assistant message shows the result; "Apply Theme" calls importThemeStyles(theme, { replace: true })
   (one undo entry, new checkpoint, HSL adjustments reset; tokens the theme omits come from the
   host's default preset, getDefaultPresetId())
   │
   ▼
5. Theme applied to DOM
```

The Generate panel shows only when `showTabAI` is true (default `false`; `enableAI` is declared but read by nothing); no Banter host sets it.

## Storage Adapters

Five implementations of the `StorageAdapter` interface (`src/storage/`), chosen by `createStorageAdapter`. Banter hosts pass `storage: "indexeddb"` (database `themer-db`).

| Adapter                    | Use Case                                   | Persistence      |
| -------------------------- | ------------------------------------------ | ---------------- |
| `PayloadStorageAdapter`    | Apps with a Payload `/api/themes` endpoint | Database         |
| `IndexedDBStorageAdapter`  | Client-side persistence                    | IndexedDB        |
| `ClientFileStorageAdapter` | Browser read of `public/themes` JSON files | JSON files       |
| `FileStorageAdapter`       | Server side, Node `fs` operations          | JSON files       |
| `MemoryStorageAdapter`     | Final fallback, tests                      | Memory (session) |

**Interface:**

```typescript
interface StorageAdapter {
  getThemes(): Promise<SavedTheme[]>;
  getTheme(id: string): Promise<SavedTheme | null>;
  saveTheme(
    theme: Omit<SavedTheme, "id" | "createdAt" | "updatedAt">,
  ): Promise<SavedTheme>;
  updateTheme(id: string, updates: Partial<SavedTheme>): Promise<SavedTheme>;
  deleteTheme(id: string): Promise<void>;
  isAvailable(): Promise<boolean>;
  getType(): StorageType;
}
```

Banter never saves or lists themes through an adapter: `ThemerProvider` creates one and exposes it in context, and no editor control calls it (the editor's own state persists through the Zustand stores above).

**Auto-detection order (`storage: "auto"`):** Payload (if its endpoint answers) → client files (browser, only if any theme exists) → IndexedDB (browser) → server files (only with `fileOperations`) → Memory.

## Color System

### OKLch Color Space

All internal colors use OKLch (Oklab Lightness, Chroma, Hue):

- **Perceptually uniform** - Equal numeric changes produce equal visual changes
- **Better for adjustments** - Hue shifts don't affect perceived brightness
- **CSS native** - `oklch(0.7 0.15 250)` works in modern browsers

### Color Variables (32 total)

| Category      | Variables                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Base (6)      | background, foreground, card, card-foreground, popover, popover-foreground                       |
| Semantic (10) | primary/fg, secondary/fg, muted/fg, accent/fg, destructive/fg                                    |
| UI (3)        | border, input, ring                                                                              |
| Chart (5)     | chart-1 through chart-5                                                                          |
| Sidebar (8)   | sidebar, sidebar-foreground, sidebar-primary/fg, sidebar-accent/fg, sidebar-border, sidebar-ring |

### HSL Adjustments

Global color transformations without recreating the palette:

```typescript
{
  hueShift: number,        // -180° to +180°
  saturationScale: number, // slider 0 to 2 (1 = no change)
  lightnessScale: number   // slider 0.2 to 2 (1 = no change)
}
```

15 presets (`hslPresets` in `src/config/presets.ts`): hue shifts, Hue Invert, Grayscale, Muted, Vibrant, Dimmer, Brighter, Warm Muted, Cool Vivid, Pastel, Vintage, Neon.

### Sidebar Sync (`utils/sidebar-sync.ts`)

While `sidebarColorSync` is on, every sidebar colour equals its base twin in both modes. The rule is a pure function over `ThemeStyles` (`applySidebarSync`): turning it on aligns both modes in one undo entry; editing a base colour writes its twin in the same update; `useSidebarSyncAlignment` (mounted by the provider, so it works while the Colors panel is unmounted) re-aligns in place, without an undo entry, after preset, undo/redo, import or HSL changes.

## Accessibility

### Contrast Checker

Built-in WCAG compliance validation:

| Level | Normal Text | Large Text |
| ----- | ----------- | ---------- |
| AA    | 4.5:1       | 3:1        |
| AAA   | 7:1         | 4.5:1      |

**Checked pairs** (`standardColorPairs`): text/background, button text on primary/secondary, muted, accent, destructive, card, popover, plus the sidebar pairs (sidebar, sidebar-primary, sidebar-accent with their foregrounds). The dialog rates one mode at a time through its own Light/Dark toggle without flipping the page; levels AAA >= 7, AA >= 4.5, AA Large >= 3 (large text only; fails normal text), else Fail.

### suggestContrastFix()

Binary search algorithm to find adjusted foreground color meeting target contrast ratio.

## Keyboard Shortcuts

| Shortcut       | Action          | Scope                                  | Registered in         |
| -------------- | --------------- | -------------------------------------- | --------------------- |
| `Ctrl+Shift+E` | Toggle editor   | Global (`ThemerConfig.shortcut`)       | `ThemerProvider`      |
| `Ctrl+Z`       | Undo            | When open                              | `ThemerProvider`      |
| `Ctrl+Shift+Z` | Redo            | When open                              | `ThemerProvider`      |
| `Ctrl+I`       | Inspector       | Desktop layout, frame not cross-origin | `PreviewTabs`         |
| `Esc`          | Exit fullscreen | Fullscreen preview, CSS fallback only  | `subscribeFullscreen` |

`themerShortcuts` also defines `save` (`Ctrl+S`) and `export` (`Ctrl+E`); nothing handles them.

**Input field detection:** Shortcuts are disabled when focus is in text inputs or contenteditable elements. `Ctrl` also matches `Cmd` on macOS; an unrequired extra modifier rejects the match.

## Constraints and Tradeoffs

### Design Decisions

| Decision               | Rationale                                           |
| ---------------------- | --------------------------------------------------- |
| OKLch over HSL         | Better perceptual uniformity for color adjustments  |
| Zustand over Context   | Simpler API, better DevTools, persistent middleware |
| 30-entry history limit | Balance between undo depth and memory usage         |
| 500ms history debounce | Batch slider drags without losing precision         |
| Inline ThemeScript     | Prevents FOUC by applying theme before hydration    |
| Host font catalog API  | Keeps Google API keys server-side and app-specific  |

### Limitations

- **Same-origin iframe only** - the Live tab can theme (and the inspector can read) only a same-origin page
- **Google Fonts live loader** - Custom catalog endpoints can provide the same response contract,
  but the live preview loader currently injects Google Fonts stylesheet URLs for non-system font
  names.
- **Client-persisted theme state** - the server HTML never renders per-user themer overrides.
  The head script (`host/head-script.tsx`, which Banter's hosts render through their alias-gated
  mount; `ThemeScript` for other hosts) applies persisted editor variables while the HTML is parsed;
  without it the page paints the host's own theme first and the editor's theme lands when
  `ThemerProvider` applies it.

## Operations

### Theme Reset

```javascript
// Clear all persisted editor state (saved themes stay in IndexedDB "themer-db")
localStorage.removeItem("themer-editor-state");
localStorage.removeItem("themer-preferences");
```

## Glossary

| Term                | Definition                                                |
| ------------------- | --------------------------------------------------------- |
| **OKLch**           | Oklab cylindrical color space (Lightness, Chroma, Hue)    |
| **ThemeStyleProps** | Object containing all 32+ CSS variable values             |
| **Preset**          | Named theme configuration (colors + fonts + spacing)      |
| **Checkpoint**      | Saved state for reset operations (before HSL adjustments) |
| **Storage Adapter** | Abstract interface for theme persistence                  |
| **FOUC**            | Flash of Unstyled Content (prevented by ThemeScript)      |

## File Structure

```
packages/themer/
├── src/
│   ├── components/
│   │   ├── themer-dev-shell.tsx   # Banter host mount (QueryClient + provider + root)
│   │   ├── themer-provider.tsx    # Context root
│   │   ├── themer-overlay.tsx     # Main editor UI
│   │   ├── themer-sidebar.tsx     # Control panel
│   │   ├── editor/                # Control components
│   │   ├── preview/               # Preview tabs, registry, inspector, demo pages
│   │   ├── actions/               # Action buttons/dialogs
│   │   └── ai/                    # AI chat interface
│   ├── host/                      # Host wiring: flag, passthrough, gate, font route handler
│   ├── stores/                    # Zustand stores (5)
│   ├── selectors/                 # Narrow editor-store selectors
│   ├── hooks/                     # Custom hooks
│   ├── utils/                     # Pure functions
│   ├── storage/                   # Storage adapters (5)
│   ├── config/                    # Defaults, presets, host extra-colour registry
│   ├── types/                     # TypeScript definitions
│   └── api/                       # Mock AI server action; font catalog response
├── docs/                          # API reference, file storage mode
├── LICENSES/                      # tweakcn (Apache-2.0), shadcn/ui (MIT)
├── NOTICE                         # Attribution for adapted code
├── README.md                      # Host integration contract (start here)
└── ARCHITECTURE.md
```
