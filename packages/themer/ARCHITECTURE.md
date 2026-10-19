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

Five public entries, built by four tsdown configs
([tsdown.config.ts](tsdown.config.ts)). Rolldown splits a module that two
entries of one config both import into a shared chunk, so entries that must
stay single files with no Themer code get configs of their own:

| Config       | Entries          | Directive                                                  | Import allow-list (`onlyImport`) |
| ------------ | ---------------- | ---------------------------------------------------------- | -------------------------------- |
| `core`       | `index`          | `'use client'` added by `outputOptions.intro` on the entry | the dependencies, React          |
| `adapters`   | `loader`, `next` | kept from the source (`"use client"` on each entry module) | `react`                          |
| `headScript` | `head-script`    | none                                                       | none                             |
| `nextServer` | `next/server`    | none                                                       | none                             |

This differs from the two-config plan of Jbmanllr/themerCN#15 and
Jbmanllr/themerCN#20 (a client config giving every entry `'use client'`
through `outputOptions.intro`, and a server config with no directive):

- **Split by chunk sharing, not by directive.** In one client config, a module
  the core and `loader` or `next` both reach would become a chunk those
  entries import. `head-script` sits apart from `next`, which imports it, so
  `next` inlines the script instead of importing `dist/head-script.js`.
  `next/server`'s lazy catalog code shares `utils/font-names.ts` with the
  head script and the font data with the core, so it sits apart from both.
- **`loader` and `next` share one config** because they share no module:
  `loader` imports only types from the package, `next` only the head script
  and `useHydrated`. `check-entries` (below) fails if a later change makes
  them share a chunk.
- **The intro is only on the core.** Rolldown keeps a top-level directive on
  an entry module, so `loader` and `next` keep their source `"use client"`;
  the core's entry (`src/index.ts`) has none, so its config adds one.
  Rolldown drops the per-file directives inside the core (kept in the source
  for tests and editors); every config silences that warning.

What each entry ships:

| Subpath                | Source                                   | Output                                              | Reaches Themer code?                   |
| ---------------------- | ---------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| `themercn`             | [src/index.ts](src/index.ts)             | `dist/index.js` + lazy chunks, `'use client'` intro | Yes (it is the Themer)                 |
| `themercn/loader`      | [src/loader.tsx](src/loader.tsx)         | `dist/loader.js`, `'use client'`                    | No: types only                         |
| `themercn/head-script` | [src/head-script.ts](src/head-script.ts) | `dist/head-script.js`, no directive, no imports     | No                                     |
| `themercn/next`        | [src/next/index.tsx](src/next/index.tsx) | `dist/next.js`, `'use client'`                      | No: React and the head-script string   |
| `themercn/next/server` | [src/next/server.ts](src/next/server.ts) | `dist/next/server.js` + the lazy catalog chunk      | Only the font catalog, after `enabled` |

- `@workspace/ui` (the repo's shadcn components) is bundled into `dist`;
  nothing from `node_modules` is (`deps.onlyBundle: []`), and each config has
  an import allow-list (`onlyImport`). The core's list leaves out `next`, so
  the Themer runs in any React app. `next` is an optional peer.
- `"sideEffects": false`: no entry module runs anything Host-visible on
  import. The core's one top-level side effect, the ColorFocusStore's
  subscription to the ThemerUIStore (it clears the colour focus on close),
  lands in `dist/index.js`, the module that exports `Themer`, so it ships
  whenever the Themer does. The other entries hold only constants. The CSS
  is injected on mount (`useThemerStyle`); the package ships no CSS file.
- `check:package` runs after `build`: `publint --strict`, `attw` (ESM only),
  [scripts/check-pack.mjs](scripts/check-pack.mjs) (the tarball's file
  allow-list, required files, `'use client'` only on client entries, LICENSE
  equal to the root one, CHANGELOG once released) and
  [scripts/check-entries.mjs](scripts/check-entries.mjs) (`loader`,
  `head-script` and `next` are single files with allowed imports and under a
  byte budget).
- The head script imports only the pure family-name helpers
  (`utils/font-names.ts`), so it carries neither the bundled 130-family list
  (`FALLBACK_FONTS`, `utils/font-catalog-data.ts`) nor the link registry.

## Mounting

```
Host tree                         <ThemerLoader {...props} />   (themercn/loader)
                                     │ after hydration: import("themercn")
                                     ▼
                                  <Themer>                       components/themer.tsx
                                     │ null on the server, during hydration, in an iframe
                                     ▼
                                  ThemerApp: hydrateThemerStores(ns) in a layout effect, useThemerStyle()
                                  QueryClientProvider (its own client)
                                  └─ ColorModeProvider (colorMode / onColorModeChange), keyed by ns
                                     └─ ThemerProvider (config: presets, shortcut, …)
                                        └─ ThemerRoot ── portal to <body> ──► ThemerScope [data-themer]
                                                                               ├─ ThemerTrigger
                                                                               ├─ ThemerUI ─► the layout in force, or the mobile drawer
                                                                               └─ [data-themer-portals]
```

### Core Entry Points

| Module                                                            | Responsibility                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [loader.tsx](src/loader.tsx)                                      | `createThemerLoader(load \| null)`: a component that loads the Themer once in an effect after hydration and renders it beside the Host tree. Never `lazy()` + Suspense (server rendering streamed the page twice); never around the Host tree (the page would remount when the Themer arrives). A rejected load logs one `[themercn]` console error and renders nothing; there is no retry. |
| [themer.tsx](src/components/themer.tsx)                           | `<Themer>`: flat props, no children. Skips the server, hydration and frames (`window.self !== window.top`: the Live preview frames the Host page, whose own Themer must not stack). Hydrates the stores, injects the CSS, owns a QueryClient separate from the Host's.                                                                                                                      |
| [color-mode.tsx](src/components/color-mode.tsx)                   | Who owns light/dark (see [Colour mode](#colour-mode)).                                                                                                                                                                                                                                                                                                                                      |
| [themer-provider.tsx](src/components/themer-provider.tsx)         | Registers Host Presets and extra colours during render, applies the Theme to `<html>`, binds the shortcuts, removes everything when the override goes off or it unmounts.                                                                                                                                                                                                                   |
| [themer-root.tsx](src/components/themer-root.tsx)                 | Portals the trigger and the Themer UI into `ThemerScope` on `<body>`; the mobile scroll lock, and the Lenis pause while the open Themer UI hides the page (the drawer, a layout with `coversPage`).                                                                                                                                                                                         |
| [themer-ui/themer-ui.tsx](src/components/themer-ui/themer-ui.tsx) | The Themer UI: on desktop the component of the [Themer layout](#themer-layouts) in force (`LAYOUT_COMPONENTS`); below 1280 px a bottom drawer without preview, whatever the layout ([use-is-mobile.ts](src/hooks/use-is-mobile.ts); the shadcn Sidebar becomes a Sheet below 768 px, so the breakpoint must stay above it).                                                                 |
| [themer-trigger.tsx](src/components/themer-trigger.tsx)           | The floating button (`showTrigger`).                                                                                                                                                                                                                                                                                                                                                        |

## Themer layouts

How the Themer UI sits on screen while open. In-place layouts follow
[ADR 0001](../../docs/adr/0001-in-place-themer-layouts.md): they render in
the Themer's portal beside the Host tree and never wrap it.

| Piece           | Where                                                                                                                                                  | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThemerLayout`  | [types/index.ts](src/types/index.ts)                                                                                                                   | The union of implemented layouts; `ThemerProps.layout` takes it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Registry        | [config/themer-layouts.ts](src/config/themer-layouts.ts)                                                                                               | `THEMER_LAYOUTS`: label, icon, `coversPage` per layout; `resolveThemerLayout`: user choice, else Host default, else Workspace, skipping unknown values.                                                                                                                                                                                                                                                                                                                                                                               |
| Components      | `LAYOUT_COMPONENTS` in [themer-ui.tsx](src/components/themer-ui/themer-ui.tsx)                                                                         | The one map from layout to component (`ThemerLayoutProps`: `onClose`, `zIndex`).                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Layout in force | [hooks/use-themer-layout.ts](src/hooks/use-themer-layout.ts)                                                                                           | `useThemerLayout()`: the `layout` preference over `config.layout`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Switcher        | [themer-ui/layout-switcher.tsx](src/components/themer-ui/layout-switcher.tsx)                                                                          | `DropdownMenu` of `THEMER_LAYOUTS` in every layout's header; writes the `layout` preference. Its `LayoutRadioGroup` also fills the submenu of Toolbar's "More actions" menu.                                                                                                                                                                                                                                                                                                                                                          |
| Shared sidebar  | [themer-ui/themer-sidebar-provider.tsx](src/components/themer-ui/themer-sidebar-provider.tsx), [themer-sidebar.tsx](src/components/themer-sidebar.tsx) | The SidebarProvider bound to `sidebarCollapsed` (collapse is shared and instant: the stock width transition is off; the stock `sidebar_state` cookie and Ctrl/Cmd+B are off, as the Host owns them), and the sidebar with `headerActions`/`footer` slots for a layout without its own header or action bar.                                                                                                                                                                                                                           |
| Panel popups    | [sidebar/panel-popover.tsx](src/components/sidebar/panel-popover.tsx)                                                                                  | A panel in a popup, shared by the Toolbar's panel groups and the collapsed rail's icons: one open at a time, it sets the active panel, and stays open while the page is clicked or scrolled.                                                                                                                                                                                                                                                                                                                                          |
| Actions         | [actions/themer-actions.tsx](src/components/actions/themer-actions.tsx)                                                                                | `useThemerActions`: every action's name, icon, shortcut, state and handler, and the Theme override, defined once. `ActionBar` lays them out as buttons; `ThemerActionsMenu` is the "More actions" menu, composed from the exported item pieces (the Toolbar's adds its layout submenu, the collapsed rail's leads with undo/redo and mode). A dialog action only sets the ThemerUIStore's `dialog`; `ThemerDialogs` ([themer-dialogs.tsx](src/components/actions/themer-dialogs.tsx)), rendered once by `ThemerUI`, owns the dialogs. |

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
  switcher; `ActionBar variant="stacked"` sits in its footer. The collapsed
  rail hides the footer, so its header adds a `ThemerActionsMenu`
  (undo/redo, mode, then the footer's other actions and the override). A
  dialog opened from it stays open when the sidebar expands and the menu
  unmounts. No page pause, no scroll lock.
- **Push** ([push-layout.tsx](src/components/themer-ui/layouts/push-layout.tsx)):
  the in-place sidebar layout, plus a layout effect that sets
  `margin-left`, `--themer-inset-left` (the sidebar's width
  from `useThemerSidebarWidth`, the mapping `ThemerSidebarProvider` lays the
  sidebar out with) as inline styles on `<html>`, with no transition (the
  sidebar does not animate either), and on unmount (close, switch, drawer,
  Themer unmounted) puts back the Host's own inline values of those
  properties, or removes them.
  The properties are physical, like the left-pinned sidebar, so a
  right-to-left page shifts on the same side. Fixed Host elements opt in
  through the variable; the viewport does not shrink (ADR 0001).
- **Toolbar** ([toolbar-layout.tsx](src/components/themer-ui/layouts/toolbar-layout.tsx)):
  no sidebar; a `fixed` bar centred at the top of the page with auto
  margins. The bar is a region labelled "Themer toolbar", not a
  `role="toolbar"`: it has no arrow-key navigation to announce. The page
  inspector mounts beside the bar in the layout's root, so its card is not
  read as part of the bar. Colors, Typography and Other
  are `Popover` triggers drawn as a `ToggleGroup`; each popup holds
  `PanelContent` in a `ScrollArea` capped to Base UI's `--available-height`,
  and opening one sets the active panel; a colour focus jump (`focusRequest`,
  e.g. a pinned inspector element) opens Colors. The popups ignore outside presses
  and focus-out, so the page can be clicked and scrolled while one is open;
  Escape, the trigger or another group closes it. Undo/redo, the inspector
  toggle, mode and Close are a `ButtonGroup`; the rest of the actions, the
  override switch and the layouts (`LayoutRadioGroup` in a submenu) are
  `ThemerActionsMenu`. Nested popups (colour, font pickers) portal after the
  panel popup, so they paint above it. No page pause.
- **Inspector on the Host page** ([page-inspector.tsx](src/components/themer-ui/page-inspector.tsx)):
  every in-place layout (`coversPage: false`: Overlay, Push, Toolbar) mounts
  `<PageInspector />` in its root (beside the Toolbar's bar) and `<PageInspectorToggle />` in its
  sidebar header (Overlay, Push) or its bar (Toolbar, `size="default"` to
  match the `ButtonGroup`).
  `useInspector` binds to the Host document with `ignore: "[data-themer]"`,
  so the Themer's own tree is never inspected and its clicks still act; the
  card renders in a fixed, pointer-transparent layer. The ThemerUIStore
  keeps `inspectorLayout`, the layout the inspector was turned on in;
  `useInspectorMode` (hooks/use-themer-layout.ts) derives "active" from it
  during render. The user's switch (`useSetThemerLayout`) turns it off in
  the same action, and a Host-driven switch leaves it inactive, so no
  listener binds in between; `ThemerUI` then clears it as the old layout
  unmounts, so switching back does not turn it on again.

### Decision: a usable collapsed rail, and instant collapse

Recorded after the fact for PR #41 (549c54a), which changed every sidebar
layout (Workspace, Overlay, Push) without a ticket; #15 had put a redesign of
the Themer UI out of scope.

- **The rail's icons open their panel in a popup.** They used to set only the
  active panel, which a collapsed sidebar does not show. Each icon
  ([collapsed-navigation.tsx](src/components/sidebar/collapsed-navigation.tsx))
  is now the trigger of a [`PanelPopover`](src/components/sidebar/panel-popover.tsx)
  beside the rail (`side="right"`, `align="start"`), the same popup and rules
  as the Toolbar's panel groups: one open at a time, it sets the active panel,
  and the sidebar stays collapsed. Each button keeps its `aria-label`.
- **Expanding and collapsing is instant.** The stock Sidebar's 200 ms width
  transition squeezed the panel content mid-way, and Push's `<html>` margin
  followed it. `ThemerSidebarProvider` turns the transition off on the
  sidebar's gap and container, and Push sets its margin with no transition.
  Popups keep their own animations. The README's Push opt-in example dropped
  its `transition: left 200ms`: a Host element still animating would now
  trail the page.
- Covered by [themer-layout.test.tsx](src/themer-layout.test.tsx) ("the
  collapsed sidebar": a rail icon opens its panel's controls in a popup in
  each sidebar layout, still collapsed) and `apps/web/e2e/themer-layout.spec.ts`
  (the sidebar is at its new width one frame after the press; a rail popup
  leaves the sidebar collapsed).

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
   rewritten to `:scope`. Every `@keyframes` is renamed `themer-<name>`, and
   the `animation`/`animation-name` declarations follow, so the Host's own
   `spin` or `enter` keeps its keyframes. `@property`, `@keyframes` and
   `@font-face` stay at the top level; `view-transition.css` is appended
   outside the scope (it targets `<html>`). The result is written to the gitignored
   `src/generated/themer-css.ts` (`THEMER_CSS`).
3. `useThemerStyle()` ([themer-scope.tsx](src/components/themer-scope.tsx))
   injects it as `<style data-themer-style>` in `<head>` with
   `useInsertionEffect`, and removes it on unmount.

Why: unlayered rules beat the Host's layered Tailwind inside the Themer root
and reach nothing outside it; the Host compiles nothing of the Themer's. A
Tailwind `prefix()` and a shadow root were the rejected alternatives (CSS
isolation prototype, Jbmanllr/themerCN#11). `[data-themer]` is a bare wrapper because `@scope` matches the
root's descendants; its only attribute is `dir="ltr"`, which keeps the Themer
UI and its popups left-to-right in a right-to-left Host. Host preview tabs
render inside `<div data-themer-host style="display:contents">`, the lower
boundary, so they keep the Host's styles, and take `<html>`'s `dir` back,
following it as it changes ([use-host-direction.ts](src/hooks/use-host-direction.ts)). Accepted leak: Host unlayered element rules on
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
every portalling component (Popover, Select, DropdownMenu, Tooltip, Dialog,
Sheet, Drawer, Combobox, …) passes `container={usePortalContainer()}`, and
without a provider they portal to `<body>` as stock shadcn does.
[portal-container.test.tsx](src/components/portal-container.test.tsx) fails if
a `shadcn add -o` reinstall drops it. The container is a sibling of the
Themer UI (it also serves the mobile drawer and the closed state), fixed at the
viewport origin with no size and no clipping, at `(zIndex ?? 10000) + 1`.
Every popup shares that layer; one opened from inside another is portalled
later, so it paints on top.

Positioner invariant: the Themer UI sets placement props only (`side`,
`align`, offsets, `alignItemWithTrigger`; the collapsed rail's popups need
`side="right"`), never a `collisionBoundary`, `positionMethod` or
`container` of its own. The defaults are what keep a popup usable: the
default `absolute` positioning inside a container fixed at the viewport
origin gives viewport coordinates, and the default collision boundary (the
clipping ancestors) is the viewport, since the container does not clip. So a
popup flips and shifts to stay on screen, and `--available-height`, which the
panel popups cap their scroll area to, is the room left in the viewport. A
boundary such as the sidebar would push the rail's popups back over the rail
or cut their height; a `container` would portal outside the scope, unstyled
and below the Themer UI.

## Colour mode

[color-mode.tsx](src/components/color-mode.tsx) decides who owns `.dark` on
`<html>`:

- **Controlled** (`colorMode` or `onColorModeChange` set): the mode is
  `colorMode`; the toggle calls `onColorModeChange`; the Host (for example
  `next-themes`) sets the class. No mode is saved (a saved one is removed).
- **Uncontrolled**: the class is the mode. The toggle flips it, and a
  `MutationObserver` follows changes made by anyone else. The mode is saved
  under `<ns>:color-mode` so the head script restores the class on reload.

The mode controls (the toggle, its menu item, the contrast panel's starting
mode) read `useColorMode()` directly, so a Host `.dark` flip updates them in
the commit that themes the page. The store's `themeState.currentMode` (which
the style controls read) is written by the toggle's handler and by
`ThemerProvider`'s Theme-apply effect, which also puts it back on the colour
mode whenever the two differ (a controlling Host may decline the toggle's
switch), and applies the Theme from a store subscription (an edit never re-renders the provider) and writes variables,
never the class (`applyThemeToElement(..., { updateClass: false })`).
`useToggleMode` ([hooks/use-themer.ts](src/hooks/use-themer.ts)) runs
the switch inside a View Transition
([theme-transition.ts](src/utils/theme-transition.ts)) with a circular reveal where supported.

## Persistence and the head script

- Stores use `skipHydration: true`; `hydrateThemerStores(ns)`
  ([stores/hydrate.ts](src/stores/hydrate.ts)) points them at
  `getStorageKeys(ns)` (`<ns>:editor`, `<ns>:preferences`, plus
  `<ns>:color-mode` written by an uncontrolled `ColorModeProvider`;
  `DEFAULT_STORAGE_NAMESPACE` is `"themercn"`) and hydrates them in a
  layout effect of `<Themer>`, which renders its tree only once the stores
  hold that namespace, so nothing is read from a key the Host did not
  choose. The stores are module singletons, so a page mounts one
  `<Themer>`: a second one on another namespace takes the stores and the
  first renders nothing (a development warning says so).
- Switching `storageNamespace` at runtime only repoints the keys and
  rehydrates. Both stores' `merge` starts from the store's initial state,
  never the current one, so an empty namespace starts fresh and nothing (no
  Theme, preference or undo history) carries over; the switch writes to
  neither namespace. Never reset the stores before rehydrating: a
  `setState` persists at once (zustand 5), overwriting the new namespace's
  entry or wiping the old one. The tree from `ColorModeProvider` down is
  keyed by namespace, so ThemerProvider's mount-time default-Preset adoption
  runs again and the colour mode is read from the new key.
- The `<ns>:color-mode` key amends Jbmanllr/themerCN#15 and
  Jbmanllr/themerCN#18, which named only `<ns>:editor` and
  `<ns>:preferences`: an uncontrolled Themer must restore `.dark` before
  first paint, and the head script can only read it from storage. The
  `storageNamespace` TSDoc and the README list all three keys.
- Each persisted entry carries its store's version, `EDITOR_STATE_VERSION`
  or `PREFERENCES_VERSION`, both in
  [config/constants.ts](src/config/constants.ts) so the head script can
  embed them without reaching store code. There are no migrations
  (pre-release): each store's `migrate` is `dropOtherVersion`
  ([stores/persist-options.ts](src/stores/persist-options.ts)), so an entry
  of another version is not applied, nothing is logged, and zustand rewrites
  the key at the current version.
- Both stores read and write through `guardedLocalStorage` (same module).
  Every localStorage access is wrapped in try/catch, so a full or blocked
  storage never throws from a store action: the edit applies but isn't
  saved, with one development warning per page. A write is skipped when the
  persisted slice is shallow-equal to the last one written to that key (an
  undo-history change, a preference set to its current value). The last
  write is forgotten when the key is read, so the first write after a
  hydration (a namespace switch, a stale entry rewritten) always lands.
- [utils/theme-script.ts](src/utils/theme-script.ts) generates the head
  script string. It sets `.dark` from `<ns>:color-mode` when an uncontrolled
  Themer saved one (otherwise the Host owns the class, and its script may
  run later). It writes both modes of the saved Theme into one
  `<style id="themercn-restore">` (`RESTORE_STYLE_ID`) as
  `html:root:not(.dark)` and `html:root.dark` rules, which outrank the Host's
  `:root` and `.dark`, so the first paint has the right tokens whichever mode
  the page ends up in; it also adds the font links. It writes nothing when
  nothing is saved or `themeOverrideEnabled` is false, ignores an entry
  saved at another version (as the store drops it), and drops a saved
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
`restoredFromStorage` do not. `themeCheckpoint` and `presetBaseline` are
stored only when they differ from `themeState` (an absent key reads back as
the Theme, `null` as none), so an entry on its Preset holds one copy of the
styles, not three. The head script reads `themeState` only. The package is
pre-release: there are no
migrations, and a stored state of another version is dropped (the store
starts fresh, see Persistence and the head script).

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
- One "on Preset" rule (`isOnPreset` in
  [editor-selectors.ts](src/selectors/editor-selectors.ts)) drives both the
  unsaved mark and Reset: the styles equal the resolved Preset (aligned by
  Sidebar Sync while it is on) and the HSL adjustment is neutral (missing or
  the identity). It never looks at the checkpoint.
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
`activePanel` (`colors` | `typography` | `other`), `inspectorLayout`,
`fullscreenPreview`, and `dialog` (the open action dialog: `code` |
`importCss` | `contrast`, or none; closing the Themer UI closes it).

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
  [Font link registry](#font-link-registry-utilsfont-linksts));
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
   │               ├─ googleFontsApiKey: Fonts Developer API (memory, 1 day)
   │               ├─ no key: fonts.google.com/metadata/fonts (memory, 1 day)
   │               └─ Google fails or takes > 5 s: FALLBACK_FONTS (60 s back-off)
   └─ no endpoint: filterAndPaginateFonts(FALLBACK_FONTS) in the browser
User picks a family ─► acquireGoogleFont + waitForFont ─► font-* written as a full stack
```

The response is `{ fonts, total, offset, limit, hasMore }`; paging is clamped
by `filterAndPaginateFonts` (limit 1–100, default 50). The package reads no
environment. The picker also asks the catalog whether a Theme's family is a
Google font (its "Custom font" badge).

#### Font link registry (`utils/font-links.ts`)

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

| Module                              | Purpose                                                                                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreviewTabs`                       | Tab bar, inspector toggle (`Ctrl+I`), fullscreen.                                                                                                                                                         |
| `LivePreview`                       | Same-origin iframe of the Host page; the Theme is applied to its document after each load. The Host must allow same-origin framing.                                                                       |
| `InspectorOverlay` + `useInspector` | Hover shows an element's token classes; click pins it and focuses the colour control. Off on mobile and for a cross-origin frame. `ignore` leaves a subtree alone (the page inspector's `[data-themer]`). |
| `InspectorToggle`                   | The toggle, shared by `PreviewTabs` and `PageInspectorToggle`.                                                                                                                                            |
| `useFullscreenSync`                 | Keeps `fullscreenPreview` in step with the Fullscreen API; CSS fallback; `Esc` exits.                                                                                                                     |

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
is pure. The editor store holds the rule itself, whatever is mounted: every
action that sets the Theme (set, apply/reset/adopt Preset, import, undo,
redo, refresh-untouched-Preset) syncs it in the same commit, reading the
preference from the preferences store, so each action applies and saves the
Theme once; editing a base colour therefore writes its twin. The preference
is set only through the editor store's `setSidebarColorSync`, which aligns
the Theme in one undo entry when it turns on, and hydration restores the
preferences first so the editor's `merge` syncs a restored (or fresh) Theme.
Undo and redo set the checkpoint to the synced Theme.

### Contrast Checker

[contrast-checker.ts](src/utils/contrast-checker.ts) rates the standard
foreground/background pairs, sidebar pairs included, for one mode at a time:
AAA ≥ 7, AA ≥ 4.5, AA Large ≥ 3 (large text only).
[contrast-checker-dialog.tsx](src/components/editor/contrast-checker-dialog.tsx)
shows the ratings in a dialog owned by `ThemerDialogs`. A row's colour
button closes the dialog first, then `focusColor` shows the token's control,
moves keyboard focus to its input and highlights it; the dialog returns
focus to its opener only when the user dismisses it.

## Keyboard Shortcuts

Bound by `useKeyboardShortcut`
([use-keyboard-shortcut.ts](src/hooks/use-keyboard-shortcut.ts)); `ctrl`
matches Cmd on macOS, an extra modifier rejects, editable targets are
ignored. Every shortcut is defined once in `SHORTCUTS`; bindings read it
parsed (`themerShortcuts`) and tooltips format it. Toggle (`shortcut`,
default `SHORTCUTS.toggle` = `ctrl+shift+e`), undo and redo in
`ThemerProvider` (undo and redo only while the Themer UI is open); `Ctrl+I`
(`inspector`) in `PreviewTabs` (Workspace) and `PageInspector` (in-place
layouts). Outside `SHORTCUTS`, `Esc` exits the fallback fullscreen preview
(`subscribeFullscreen`) and hides the inspector card (`useInspector`; a
pinned card takes the key first). The Themer binds no sidebar shortcut: the
stock Ctrl/Cmd+B is off in `ThemerSidebarProvider`. A shortcut string
accepts `cmd`/`command` (meta), `control` (ctrl) and `option` (alt); any
other unknown part makes it invalid, and an invalid `shortcut` warns in
development and falls back to the default toggle.

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
│   │   │   └── layouts/           # one component per Themer layout
│   │   └── preview/               # tabs, registry, Live, inspector, example pages
│   ├── stores/                    # editor, preferences, themer-ui, color-focus; hydrate.ts
│   ├── selectors/ hooks/ utils/ config/ types/   # imports point down: config, utils ← stores ← hooks ← components
│   ├── api/font-catalog.ts        # catalog response (no gating)
│   ├── api/google-fonts.ts        # Google catalog fetch and transform (server)
│   ├── styles/                    # themer.css, view-transition.css (CSS build input)
│   └── generated/                 # themer-css.ts (gitignored build output)
├── scripts/                       # build-css, check-pack, check-entries, publish-packed, doc tests
├── LICENSES/, LICENSE, NOTICE
├── README.md                      # npm-facing docs
└── ARCHITECTURE.md                # this file (not published)
```
