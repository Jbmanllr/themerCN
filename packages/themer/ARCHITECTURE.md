# Architecture

How `themercn` works inside, for contributors. How a Host app uses it is the
[README](README.md); the words (Themer, Theme, Preset, Host app, Adapter,
Themer UI, Preview) are defined in the repository's
[GLOSSARY.md](../../GLOSSARY.md), with Themer layout, Workspace, Overlay, Push
and Toolbar. This file is not published: `files` in
`package.json` ships only `dist/`, the README, the licences and the changelog.

Origin: adapted from [tweakcn](https://github.com/jnsahaj/tweakcn) @
`a3b47b37` (Apache-2.0; see [NOTICE](NOTICE)). Ported files open with
`Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.`
Most files open with a header comment that states their contract; this page
links them together.

## Package shape

Five public entries, each built by its own tsdown config
([tsdown.config.ts](tsdown.config.ts)) so no chunk is shared between the core
and the entries a Host imports where the Themer is off:

| Subpath                | Source                                     | Output                     | Reaches Themer code? |
| ---------------------- | ------------------------------------------ | -------------------------- | -------------------- |
| `themercn`             | [src/index.ts](src/index.ts)               | `dist/index.js` + lazy chunks, `'use client'` intro | Yes (it is the Themer) |
| `themercn/loader`      | [src/loader.tsx](src/loader.tsx)           | `dist/loader.js`, `'use client'` | No: types only     |
| `themercn/head-script` | [src/head-script.ts](src/head-script.ts)   | `dist/head-script.js`, no directive, no imports | No |
| `themercn/next`        | [src/next/index.tsx](src/next/index.tsx)   | `dist/next.js`, `'use client'` | No: React and the head-script string |
| `themercn/next/server` | [src/next/server.ts](src/next/server.ts)   | `dist/next/server.js` + the lazy catalog chunk | Only the font catalog, after `enabled` |

- `@workspace/ui` (the repo's shadcn components) is bundled into `dist`;
  nothing from `node_modules` is (`deps.onlyBundle: []`), and each config has
  an import allow-list (`onlyImport`). The core's list leaves out `next`, so
  the Themer runs in any React app. `next` is an optional peer.
- `check:package` runs after `build`: `publint --strict`, `attw` (ESM only),
  [scripts/check-pack.mjs](scripts/check-pack.mjs) (the tarball's file
  allow-list, required files, `'use client'` only on client entries, LICENSE
  equal to the root one, CHANGELOG once released) and
  [scripts/check-entries.mjs](scripts/check-entries.mjs) (`loader`,
  `head-script` and `next` are single files with allowed imports and under a
  byte budget).
- `FALLBACK_FONTS` (the bundled 130-family list in `utils/font-loader.ts`) is
  `/* @__PURE__ */`, so the head script, which imports font constants from
  that file, does not carry the list.

## Mounting

```
Host tree                         <ThemerLoader {...props} />   (themercn/loader)
                                     │ after hydration: import("themercn")
                                     ▼
                                  <Themer>                       components/themer.tsx
                                     │ null on the server, during hydration, in an iframe
                                     ▼
                                  ThemerApp: hydrateThemerStores(ns), useThemerStyle()
                                  QueryClientProvider (its own client)
                                  └─ ColorModeProvider (colorMode / onColorModeChange)
                                     └─ ThemerProvider (config: presets, shortcut, …)
                                        └─ ThemerRoot ── portal to <body> ──► ThemerScope [data-themer]
                                                                               ├─ ThemerTrigger
                                                                               ├─ ThemerUI ─► the layout in force, or the mobile drawer
                                                                               └─ [data-themer-portals]
```

### Core Entry Points

| Module | Responsibility |
| ------ | -------------- |
| [loader.tsx](src/loader.tsx) | `createThemerLoader(load \| null)`: a component that loads the Themer once in an effect after hydration and renders it beside the Host tree. Never `lazy()` + Suspense (server rendering streamed the page twice); never around the Host tree (the page would remount when the Themer arrives). |
| [themer.tsx](src/components/themer.tsx) | `<Themer>`: flat props, no children. Skips the server, hydration and frames (`window.self !== window.top`: the Live preview frames the Host page, whose own Themer must not stack). Hydrates the stores, injects the CSS, owns a QueryClient separate from the Host's. |
| [color-mode.tsx](src/components/color-mode.tsx) | Who owns light/dark (see [Colour mode](#colour-mode)). |
| [themer-provider.tsx](src/components/themer-provider.tsx) | Registers Host Presets and extra colours during render, applies the Theme to `<html>`, binds the shortcuts, removes everything when the override goes off or it unmounts. |
| [themer-root.tsx](src/components/themer-root.tsx) | Portals the trigger and the Themer UI into `ThemerScope` on `<body>`; the mobile scroll lock, and the Lenis pause while the open Themer UI hides the page (the drawer, a layout with `coversPage`). |
| [themer-ui/themer-ui.tsx](src/components/themer-ui/themer-ui.tsx) | The Themer UI: on desktop the component of the [Themer layout](#themer-layouts) in force (`LAYOUT_COMPONENTS`); below 1280 px a bottom drawer without preview, whatever the layout ([use-is-mobile.ts](src/hooks/use-is-mobile.ts); the shadcn Sidebar becomes a Sheet below 768 px, so the breakpoint must stay above it). |
| [themer-trigger.tsx](src/components/themer-trigger.tsx) | The floating button (`showTrigger`). |

## Themer layouts

How the Themer UI sits on screen while open. In-place layouts follow
[ADR 0001](../../docs/adr/0001-in-place-themer-layouts.md): they render in
the Themer's portal beside the Host tree and never wrap it.

| Piece | Where | Role |
| ----- | ----- | ---- |
| `ThemerLayout` | [types/index.ts](src/types/index.ts) | The union of implemented layouts; `ThemerProps.layout` takes it. |
| Registry | [themer-ui/layouts/registry.ts](src/components/themer-ui/layouts/registry.ts) | `THEMER_LAYOUTS`: label, icon, `coversPage` per layout; `resolveThemerLayout`: user choice, else Host default, else Workspace, skipping unknown values. |
| Components | `LAYOUT_COMPONENTS` in [themer-ui.tsx](src/components/themer-ui/themer-ui.tsx) | The one map from layout to component (`ThemerLayoutProps`: `onClose`, `zIndex`). |
| Layout in force | [hooks/use-themer-layout.ts](src/hooks/use-themer-layout.ts) | `useThemerLayout()`: the `layout` preference over `config.layout`. |
| Switcher | [themer-ui/layout-switcher.tsx](src/components/themer-ui/layout-switcher.tsx) | `DropdownMenu` of `THEMER_LAYOUTS` in every layout's header; writes the `layout` preference. Its `LayoutRadioGroup` also fills Toolbar's overflow submenu. |
| Shared sidebar | [themer-ui/themer-sidebar-provider.tsx](src/components/themer-ui/themer-sidebar-provider.tsx), [themer-sidebar.tsx](src/components/themer-sidebar.tsx) | The SidebarProvider bound to `sidebarCollapsed` (collapse is shared), and the sidebar with `headerActions`/`footer` slots for a layout without its own header or action bar. |

- **Workspace** ([workspace-layout.tsx](src/components/themer-ui/layouts/workspace-layout.tsx)):
  `fixed inset-0`, the sidebar beside `SidebarInset` with `ThemerHeader`
  (switcher, close) and `PreviewPanel` (action bar, Preview tabs). The only
  layout with Preview tabs and fullscreen preview; its inspector works on
  the Preview tabs.
- **Overlay** ([overlay-layout.tsx](src/components/themer-ui/layouts/overlay-layout.tsx)):
  the in-place sidebar layout
  ([in-place-sidebar-layout.tsx](src/components/themer-ui/layouts/in-place-sidebar-layout.tsx)),
  shared with Push: a `fixed inset-y-0 left-0` container that shrinks to the
  sidebar's gap, so the page beside it takes clicks and wheel events. The
  sidebar header holds the collapse toggle, the inspector toggle and the
  switcher; `ActionBar variant="stacked"` sits in its footer. No page pause,
  no scroll lock.
- **Push** ([push-layout.tsx](src/components/themer-ui/layouts/push-layout.tsx)):
  the in-place sidebar layout, plus a layout effect that sets
  `margin-inline-start`, `--themer-inset-inline-start` (the sidebar's width
  from `useThemerSidebarWidth`, the mapping `ThemerSidebarProvider` lays the
  sidebar out with) and a 200 ms linear margin transition as inline styles
  on `<html>`, and on unmount (close, switch, drawer, Themer unmounted) puts
  back the Host's own inline values of those properties, or removes them.
  Fixed Host elements opt in through the variable; the viewport does not
  shrink (ADR 0001).
- **Toolbar** ([toolbar-layout.tsx](src/components/themer-ui/layouts/toolbar-layout.tsx)):
  no sidebar; a `fixed` bar centred at the top of the page with auto
  margins, not a transform (a transform would make the bar the containing
  block of the page inspector's fixed layer). Colors, Typography and Other
  are `Popover` triggers drawn as a `ToggleGroup`; each popup holds
  `PanelContent` in a `ScrollArea` capped to Base UI's `--available-height`,
  and opening one sets the active panel; a colour focus jump (`focusRequest`,
  e.g. a pinned inspector element) opens Colors. The popups ignore outside presses
  and focus-out, so the page can be clicked and scrolled while one is open;
  Escape, the trigger or another group closes it. Undo/redo, the inspector
  toggle, mode and Close are a `ButtonGroup`; the rest of the ActionBar, the
  override switch and the layouts (`LayoutRadioGroup` in a submenu) are a
  `DropdownMenu`. Nested popups (colour, font pickers) portal after the
  panel popup, so they paint above it. No page pause.
- **Inspector on the Host page** ([page-inspector.tsx](src/components/themer-ui/page-inspector.tsx)):
  every in-place layout (`coversPage: false`: Overlay, Push, Toolbar) mounts
  `<PageInspector />` in its root and `<PageInspectorToggle />` in its
  sidebar header (Overlay, Push) or its bar (Toolbar, `size="default"` to
  match the `ButtonGroup`).
  `useInspector` binds to the Host document with `ignore: "[data-themer]"`,
  so the Themer's own tree is never inspected and its clicks still act; the
  card renders in a fixed, pointer-transparent layer. `ThemerUI` turns
  `inspectorMode` off whenever the layout in force changes.

Every editing state (Theme, history, active panel, collapse) lives in the
stores, so a switch keeps it (the inspector is turned off: each layout
inspects its own surface); the layout components hold none (Toolbar keeps
only which popup is open). Adding a
layout: add it to `ThemerLayout`, `THEMER_LAYOUTS` (the compiler then asks
for `LAYOUT_COMPONENTS` too), write its component under `layouts/`, and add
e2e and visual screens in `apps/web/e2e`.

## Runtime CSS and `@scope`

The Themer UI is styled by its own Tailwind v4 build, not by the Host's:

1. [src/styles/themer.css](src/styles/themer.css) is the entry: Tailwind's
   theme (inlined, `theme(inline)`), Preflight, utilities with
   `source(none)` + `@source` for this package and `packages/ui`, plus
   `tw-animate-css` and `shadcn/tailwind.css`. Utilities read the page's own
   variables (`var(--primary)`), so the Themer UI shows the Theme being
   edited and declares no theme values of its own.
2. [scripts/build-css.mjs](scripts/build-css.mjs) (`build:css`, a turbo
   dependency of `typecheck`, `test` and `build`) compiles it, strips
   self-referencing custom properties (`--spacing: var(--spacing, …)` would
   be a cycle on the page), unwraps every `@layer`, and moves Preflight, base
   rules and utilities into one unlayered
   `@scope ([data-themer]) to ([data-themer-host])`, with `html`/`:root`/`:host`
   rewritten to `:scope`. `@property`, `@keyframes` and `@font-face` stay at
   the top level; `view-transition.css` is appended outside the scope (it
   targets `<html>`). The result is written to the gitignored
   `src/generated/themer-css.ts` (`THEMER_CSS`).
3. `useThemerStyle()` ([themer-scope.tsx](src/components/themer-scope.tsx))
   injects it as `<style data-themer-style>` in `<head>` with
   `useInsertionEffect`, and removes it on unmount.

Why: unlayered rules beat the Host's layered Tailwind inside the Themer root
and reach nothing outside it; the Host compiles nothing of the Themer's. A
Tailwind `prefix()` and a shadow root were the rejected alternatives (CSS
isolation prototype, Jbmanllr/themerCN#11). `[data-themer]` is a bare wrapper because `@scope` matches the
root's descendants. Host preview tabs render inside
`<div data-themer-host style="display:contents">`, the lower boundary, so they
keep the Host's styles. Accepted leak: Host unlayered element rules on
properties Preflight does not reset. Required browsers: `@scope` with a lower
boundary (Chrome 118, Safari 17.4, Firefox 146).

`build-css` output covers every class of the preview examples (about 250 kB
minified). DOM tests that mount `<Themer>` mock `./generated/themer-css`:
happy-dom's `getComputedStyle` overflows on the real sheet.

### Popup layering

Base UI popups would portal to `<body>`, outside the scope. Instead they
portal into `[data-themer-portals]`, a container inside `ThemerScope`, through
`@workspace/ui`'s `PortalContainerContext`
([packages/ui/src/lib/portal-container.ts](../ui/src/lib/portal-container.ts)):
Popover, Select, DropdownMenu, Tooltip, Dialog, Sheet and Drawer pass
`container={usePortalContainer()}`, and without a provider they portal to
`<body>` as stock shadcn does.
[portal-container.test.tsx](src/components/portal-container.test.tsx) fails if
a `shadcn add -o` reinstall drops it. The container is a sibling of the
Themer UI (it also serves the mobile drawer and the closed state), fixed at the
viewport origin with no size and no clipping, at `(zIndex ?? 10000) + 1`.
Every popup shares that layer; one opened from inside another is portalled
later, so it paints on top. The Themer UI uses stock `@workspace/ui`
components and sets no positioner props of its own.

## Colour mode

[color-mode.tsx](src/components/color-mode.tsx) decides who owns `.dark` on
`<html>`:

- **Controlled** (`colorMode` or `onColorModeChange` set): the mode is
  `colorMode`; the toggle calls `onColorModeChange`; the Host (for example
  `next-themes`) sets the class. No mode is saved (a saved one is removed).
- **Uncontrolled**: the class is the mode. The toggle flips it, and a
  `MutationObserver` follows changes made by anyone else. The mode is saved
  under `<ns>:color-mode` so the head script restores the class on reload.

`ThemerProvider` mirrors the mode into the editor store and writes variables,
never the class (`applyThemeToElement(..., { updateClass: false })`).
`useToggleMode` ([theme-transition.ts](src/utils/theme-transition.ts)) runs
the switch inside a View Transition with a circular reveal where supported.

## Persistence and the head script

- Stores use `skipHydration: true`; `hydrateThemerStores(ns)`
  ([stores/hydrate.ts](src/stores/hydrate.ts)) points them at
  `getStorageKeys(ns)` (`<ns>:editor`, `<ns>:preferences`, plus
  `<ns>:color-mode` written by an uncontrolled `ColorModeProvider`;
  `DEFAULT_STORAGE_NAMESPACE` is `"themercn"`) and hydrates them during
  `<Themer>`'s first client render, so nothing is read from a key the Host
  did not choose.
- [utils/theme-script.ts](src/utils/theme-script.ts) generates the head
  script string. It sets `.dark` from `<ns>:color-mode` when an uncontrolled
  Themer saved one (otherwise the Host owns the class, and its script may
  run later). It writes both modes of the saved Theme into one
  `<style id="themercn-restore">` (`RESTORE_STYLE_ID`) as
  `html:root:not(.dark)` and `html:root.dark` rules, which outrank the Host's
  `:root` and `.dark`, so the first paint has the right tokens whichever mode
  the page ends up in; it also adds the font links. It writes nothing when
  nothing is saved or `themeOverrideEnabled` is false, and drops a saved
  value that could end its declaration. `ThemerProvider` (and
  `applyThemeToDocument`, for the Live frame) removes the sheet once it
  applies the Theme itself. It embeds what it needs with `JSON.stringify` and
  imports constants only. A change to the persisted shape is a change to this
  script.
- `getThemerHeadScript` (`themercn/head-script`) returns that string;
  `<ThemerHeadScript>` (`themercn/next`) renders it as a raw `<script>` (not
  `next/script`, whose inline `beforeInteractive` need not run before first
  paint) and, once hydrated, as `type="application/json"` so a client
  re-render of the document (Next's not-found under `next dev`) neither warns
  nor runs it again. The string never contains `data-themer` (the Vite app's
  off-build check greps for it).

## State Management

Zustand stores. Two persist; two are transient.

### EditorStore

[stores/editor-store.ts](src/stores/editor-store.ts). Persisted under
`<ns>:editor`, `version: EDITOR_STATE_VERSION` (0). Only `themeState`,
`themeCheckpoint` and `presetBaseline` persist; `history`, `future` and
`restoredFromStorage` do not. The package is pre-release: there are no
migrations, and a stored state of another version is dropped (the store
starts fresh).

```typescript
{
  themeState: {
    styles: { light: ThemeModeStyles, dark: ThemeModeStyles }, // shadcn keys + Host extra colours
    currentMode: 'light' | 'dark',
    preset?: string,
    hslAdjustments?: { hueShift, saturationScale, lightnessScale }
  },
  themeCheckpoint: ThemeEditorState | null, // base the HSL controls recompute from
  presetBaseline: { preset, styles } | null, // the Preset as last put on the Theme
  history: HistoryEntry[],                   // undo (max 30, not persisted)
  future: HistoryEntry[],                    // redo
  restoredFromStorage: boolean
}
```

- `setThemeState` batches changes within 500 ms into one undo entry, keeps
  at most 30, records nothing for a mode-only change, and clears redo.
- Applying a Preset and importing CSS start a new entry and move the
  checkpoint; resetting to the Preset clears history.
- `updateCommonStyle` writes mode-shared keys (fonts, radius, spacing, letter
  spacing, shadow parameters) to both modes.
- `adoptDefaultPreset` moves a fresh store to `defaultPreset` without
  history. `refreshUntouchedPreset` (run by `ThemerProvider` after Host
  Presets are registered) makes a restored Theme that still equals its
  `presetBaseline` follow the Preset's current source, so a Host token change
  reaches the page; an edited, imported or undone Theme is kept.
- "Unsaved" (`selectHasUnsavedChanges`) compares `themeState` with the
  resolved Preset and neutral HSL, not with the checkpoint.
- Host extra colours (`extraColors`, registered by `configureExtraColors` in
  [config/extra-colors.ts](src/config/extra-colors.ts) during render) live in
  the same per-mode `styles`, so persistence, undo and "unsaved" need no extra
  code. An extra a Theme does not set is absent: nothing is written and the
  Host's value shows. Pure helpers take the keys as an argument.

### Preset registry

[config/presets.ts](src/config/presets.ts) owns `themePresets` and its one
resolution rule (its header is the contract). Registry order: `default`,
tweakcn's catalogue ([tweakcn-presets.ts](src/config/tweakcn-presets.ts)), the
package's local Presets, then Host Presets, which win on an id clash. The
picker lists `default` first, then sorts by label. `configurePresets` (render
of `ThemerProvider`) registers Host Presets and the default id and clears the
cache. Every reader goes through `resolvePresetStyles` (defaults, then light,
then dark over light; `font-heading` falls back to the mode's `font-serif`);
never read `preset.styles` directly.

### PreferencesStore

[stores/preferences-store.ts](src/stores/preferences-store.ts). Persisted
whole under `<ns>:preferences`, `version: PREFERENCES_VERSION` (1; no
migrations, another version is dropped):
`colorFormat` (`oklch` default; Tailwind 3 has no oklch), `tailwindVersion`,
`packageManager`, `showContrastWarnings`, `previewTab`, `sidebarCollapsed`
(shared by every sidebar layout), `layout` (the user's Themer layout, `null`
follows the Host's),
`themeOverrideEnabled` (read by the head script), `sidebarColorSync`,
`colorSelectorTab`, `sectionStates`.

### ThemerUIStore

[stores/themer-ui-store.ts](src/stores/themer-ui-store.ts), transient: `isOpen`,
`activePanel` (`colors` | `typography` | `other`), `inspectorMode`,
`fullscreenPreview`.

### ColorFocusStore

[stores/color-focus-store.ts](src/stores/color-focus-store.ts), transient:
`highlightTarget`, `colorSearch` and `focusRequest` (cleared on close).
`focusColor` posts the token as `focusRequest` until its picker is highlighted
or the jump gives up; each layout answers it by showing the Colors panel:
`ThemerSidebarProvider` expands the sidebar (Workspace, Overlay, Push), the
Toolbar opens its Colors popup. DOM elements live in a
module-level `Map` in [use-color-focus.ts](src/hooks/use-color-focus.ts), so
registering one picker per token re-renders nobody.

## Data Flow

### Applying a theme

[utils/apply-theme.ts](src/utils/apply-theme.ts) writes the Theme on a
document (the Host's `<html>` and the Live frame's, through the same code).
`ThemerProvider` re-applies on every change.

- **Verbatim values.** Colours and common keys are written as stored; Hosts
  map `--color-x: var(--x)` in `@theme inline`, so any CSS colour works.
- **Letter spacing** is written as `letter-spacing` on the root plus
  `--tracking-*` derived from it, which Tailwind's tracking utilities read.
- **Shadows.** Tailwind compiles `.shadow-*` with literal values, so the
  Themer writes `--shadow-*` (from `getShadowMap`,
  [utils/shadows.ts](src/utils/shadows.ts)) and one
  `<style data-themer-overrides>` per document pointing each utility's
  `--tw-shadow` at its variable (`!important`, with the Host's state variants
  mirrored). Written only when the shadow inputs differ from the defaults,
  so a Preset without shadows keeps the Host's scale.
- **Tracking of written properties.** A `WeakMap` per element records what
  was set, so a re-apply drops keys the new Theme lost and removal takes away
  exactly those.
- **Fonts.** `setThemeFonts` loads the Theme's Google families (see
  [Font link registry](#font-link-registry-utilsfont-loaderts));
  `DynamicFontLoader` does it for the Host page.

### Export and import

- [utils/theme-generator.ts](src/utils/theme-generator.ts) builds the Code
  dialog's output: `index.css` (`:root`, `.dark`, `@theme inline`) for
  Tailwind v4 or v3 (v3 tokens are `hsl(var(--x))`, so oklch maps to hsl),
  `tailwind.config.ts` for v3, and a `layout.tsx` for `next/font`. Each mode
  block comes from that mode's own values; the radius scale is shadcn v4's
  multiplicative one; Host extra colours are exported when set.
- [utils/parse-css.ts](src/utils/parse-css.ts) (`parseThemeCss`) reads a
  pasted shadcn/tweakcn `index.css` or a Tailwind v3/v4 theme for Import CSS:
  one undo entry, new checkpoint, HSL reset; "replace" resets keys the CSS
  does not mention to the default Preset.

### Font Catalog Flow

```
FontPicker opens ─► useFontSearch (TanStack infinite query, own QueryClient)
   ├─ fontCatalogEndpoint set: GET ?q=&category=&limit=&offset=
   │     └─ Host route, e.g. createFontCatalogRoute (src/next/server.ts)
   │          ├─ enabled: false → 404, no catalog code loaded
   │          └─ fontCatalogResponse (src/api/font-catalog.ts)
   │               ├─ googleFontsApiKey: Fonts Developer API (fetch cache, 1 day)
   │               ├─ no key: fonts.google.com/metadata/fonts (memory, 1 day)
   │               └─ Google fails: FALLBACK_FONTS
   └─ no endpoint: filterAndPaginateFonts(FALLBACK_FONTS) in the browser
User picks a family ─► acquireGoogleFont + waitForFont ─► font-* written as a full stack
```

The response is `{ fonts, total, offset, limit, hasMore }`; paging is clamped
by `filterAndPaginateFonts` (limit 1–100, default 50). The package reads no
environment. The picker also asks the catalog whether a Theme's family is a
Google font (its "Custom font" badge).

#### Font link registry (`utils/font-loader.ts`)

Fonts are per document (Host page, Live frame) and several holders ask for
the same family. Each document has a reference-counted entry per family and
per preview subset: `acquireGoogleFont` / `acquireFontPreview` return a
release function; the first acquire appends
`<link rel="stylesheet" data-themer-font>`, the last release removes it, and a
link removed by someone else is recreated. `setThemeFonts(doc, families)`
diffs against what the Theme holds; `clearThemeFonts` releases all. A failed
link retries once with the default weight. A stack starting with a system
family or `var(...)` names no Google family.

#### Font Picker Positioning and Scroll Ownership

The picker is `Popover + Command` with a Base UI `Select` for the category;
its width follows the trigger through `--anchor-width`. It passes only
`side="bottom"` and `align="start"`. `useScrollBoundary`
([scroll-boundary.ts](src/components/editor/scroll-boundary.ts)) clamps wheel
events at the list's ends so scrolling does not chain into the preview.

## Preview System

The tab list is data: `BUILTIN_TABS`
([builtin-tabs.tsx](src/components/preview/builtin-tabs.tsx): Live 0, Cards
10, Dashboard 20, Mail 30, Pricing 40, Color Palette 50, Typography 60)
merged with the Host's `previewTabs` by `mergePreviewTabs`
([preview-tab-registry.ts](src/components/preview/preview-tab-registry.ts):
sorted by `order`, a Host id replaces a built-in, Host tabs without `order`
go last). Only the active tab mounts; Host tabs render inside
`previewWrapper` and `[data-themer-host]`.

| Module | Purpose |
| ------ | ------- |
| `PreviewTabs` | Tab bar, inspector toggle (`Ctrl+I`), fullscreen. |
| `LivePreview` | Same-origin iframe of the Host page; the Theme is applied to its document after each load. The Host must allow same-origin framing. |
| `InspectorOverlay` + `useInspector` | Hover shows an element's token classes; click pins it and focuses the colour control. Off on mobile and for a cross-origin frame. `ignore` leaves a subtree alone (the page inspector's `[data-themer]`). |
| `InspectorToggle` | The toggle, shared by `PreviewTabs` and `PageInspectorToggle`. |
| `useFullscreenSync` | Keeps `fullscreenPreview` in step with the Fullscreen API; CSS fallback; `Esc` exits. |

## Color System

32 shadcn colour tokens (base, semantic, border/input/ring, 5 chart, 8
sidebar) plus Host extra colours, grouped by
[color-groups.ts](src/utils/color-groups.ts). Values are stored as written
(oklch by default); [color-converter.ts](src/utils/color-converter.ts)
converts with `culori` for display and export formats.

### HSL Adjustments

`{ hueShift (-180..180), saturationScale (0..2), lightnessScale (0.2..2) }`
recomputed from `themeCheckpoint`
([hsl-adjust.ts](src/utils/hsl-adjust.ts)); 15 presets in `hslPresets`.

### Sidebar Sync

While `sidebarColorSync` is on, each sidebar colour equals its base twin in
both modes: `applySidebarSync` ([sidebar-sync.ts](src/utils/sidebar-sync.ts))
is pure; turning it on is one undo entry; editing a base colour writes its
twin; `useSidebarSyncAlignment` (mounted by the provider) re-aligns after a
Preset, undo/redo, import or HSL change, without an undo entry.

### Contrast Checker

[contrast-checker.ts](src/utils/contrast-checker.ts) rates the standard
foreground/background pairs, sidebar pairs included, for one mode at a time:
AAA ≥ 7, AA ≥ 4.5, AA Large ≥ 3 (large text only). `suggestContrastFix`
binary-searches a foreground that meets a target.

## Keyboard Shortcuts

Bound by `useKeyboardShortcut`
([use-keyboard-shortcut.ts](src/hooks/use-keyboard-shortcut.ts)); `ctrl`
matches Cmd on macOS, an extra modifier rejects, editable targets are
ignored. Toggle (`shortcut`, default `SHORTCUTS.toggle` = `ctrl+shift+e`),
undo and redo in `ThemerProvider`; `Ctrl+I` in `PreviewTabs`; `Esc` in
`subscribeFullscreen`. `save` and `export` are defined but have no handler.
`SHORTCUTS` repeats undo/redo for tooltips; keep both in step.

## Testing

- Vitest, Node by default; DOM files opt in with
  `// @vitest-environment happy-dom`. Run `pnpm --filter themercn build:css`
  once before running `vitest` directly (turbo does it for you).
- [src/themer.test.tsx](src/themer.test.tsx) covers the public component
  (frames, namespaces, controlled/uncontrolled mode, props); entry tests sit
  beside each entry (`loader.test.tsx`, `head-script.test.ts`, `next/*.test.*`).
- [scripts/public-api-docs.test.ts](scripts/public-api-docs.test.ts) fails
  when a public export, or a member of an exported interface, has no TSDoc.
- [scripts/readme-recipes.test.ts](scripts/readme-recipes.test.ts) fails
  when a README recipe (a block after `<!-- recipe: <path> -->`) is no longer
  an excerpt of the app file it names.
- The apps add end-to-end checks: `apps/vite` (Playwright smoke and an
  off-build check that no `data-themer` ships) and `apps/web` (Playwright,
  the Playground's Theme).

## File Structure

```
packages/themer/
├── src/
│   ├── index.ts, loader.tsx, head-script.ts   # public entries
│   ├── next/                      # Next Adapter: index.tsx (client), server.ts (route)
│   ├── components/
│   │   ├── themer.tsx             # <Themer>
│   │   ├── themer-scope.tsx       # [data-themer] root, style injection, portal container
│   │   ├── color-mode.tsx         # light/dark ownership
│   │   ├── themer-provider.tsx, themer-root.tsx, …
│   │   ├── editor/ panels/ sidebar/ actions/ ui/
│   │   ├── themer-ui/             # ThemerUI, layout switcher, header, preview panel, mobile drawer
│   │   │   └── layouts/           # registry and one component per Themer layout
│   │   └── preview/               # tabs, registry, Live, inspector, example pages
│   ├── stores/                    # editor, preferences, themer-ui, color-focus; hydrate.ts
│   ├── selectors/ hooks/ utils/ config/ types/
│   ├── api/font-catalog.ts        # catalog response (no gating)
│   ├── styles/                    # themer.css, view-transition.css (CSS build input)
│   └── generated/                 # themer-css.ts (gitignored build output)
├── scripts/                       # build-css, check-pack, check-entries, publish-packed, doc tests
├── LICENSES/, LICENSE, NOTICE
├── README.md                      # npm-facing docs
└── ARCHITECTURE.md                # this file (not published)
```
