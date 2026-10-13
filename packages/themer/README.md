# Themer dans Villa du Golfe

Port local du package `packages/themer` de Banterapp, à partir de son intégration réelle dans `apps/cms`. Les notices et licences originales sont conservées. Les imports ont été adaptés à `@villa/ui`, aux composants Luma et aux versions du monorepo. Les clés de stockage sont propres à Villa du Golfe. Le breakpoint de l’éditeur est conservé à 1280 px sans importer les tokens de marque de Banterapp.

L’application hôte : `apps/web/src/components/dev-tools/themer`. Le preset choisi est le **Default intégré**, sans preset de marque. `next.config.mjs` exclut le montage client lors d’un build de production. Les styles de l’éditeur ne sont importés que par son shell différé de développement. L’URL de catalogue des polices est `/dev/themer/fonts`, réservée au développement.

Les tests historiques du package restent présents comme référence du port ; les vérifications exécutables du projet sont `pnpm --filter @villa/themer typecheck` et les parcours publics dans `apps/web/tests/themer.spec.ts`.

---

## Documentation originale de Banterapp

# @banter/themer

Local-development theme editor for the shadcn CSS variables that
`@banter/ui-tokens` generates. It edits the live page in `apps/web` and the CMS
marketing site; **no deployment ever compiles it**. Adapted from
[tweakcn](https://github.com/jnsahaj/tweakcn) (Apache-2.0; see
[Credits and licences](#credits-and-licences)).

## Run it

```bash
BANTER_WEB_THEMER=1 BANTER_CMS_THEMER=1 pnpm dev:web   # web and CMS, editor in both
BANTER_WEB_THEMER=1 pnpm --filter @banter/web dev   # web only, :3000
BANTER_CMS_THEMER=1 pnpm --filter @banter/cms dev   # CMS marketing site only, :3002
```

The `pnpm dev*` commands run `turbo run dev` in strict env mode, so these switches reach the
apps only because `turbo.json` lists them in `dev.passThroughEnv`.

Open it with the floating button or `Ctrl+Shift+E` (`Cmd+Shift+E` on Mac). A
flag change needs a dev server restart: `next.config.ts` reads it at load.

**The editor never writes the token source.** To keep a theme, copy the exported
values into `packages/ui-tokens/tokens` and run `pnpm tokens:build`;
`@banter/ui-tokens` owns the shipped values. The editor's own state (the edited
theme and its preferences) persists in this browser's `localStorage` only
(`themer-editor-state`, `themer-preferences`; undo history is not kept). There
is no save-theme action in this port: `ThemerProvider` creates the configured
storage adapter, but no editor control reads or writes themes through it.

## Host integration contract

The wiring lives once in this package, under [`src/host/`](src/host/)
(exported as `@banter/themer/host/*`); each host (`apps/web`, `apps/cms`)
keeps only one-line bindings under `src/components/dev-tools/themer/` (the
CMS's route is in `app/(frontend)/dev/themer/`). Nothing in `src/host/` needs
Next.js: the gate is plain React and the font handler uses web `Request`/
`Response`. Only the build alias and the route file's location are Next's.

| Piece       | Shared, in `src/host/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Host binding (web paths)                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Switch      | [flag.ts](src/host/flag.ts): on only under `next dev` with the host's flag `1`                                                                                                                                                                                                                                                                                                                                                                                                                    | [themer-gate.ts](../../apps/web/src/components/dev-tools/themer/themer-gate.ts) names the flag (`BANTER_WEB_THEMER`, `BANTER_CMS_THEMER`).                                                                                                              |
| Build alias | [passthrough.tsx](src/host/passthrough.tsx): renders children and no head script, imports nothing else; exports every name a host's mount module does (pinned by `tests/config/themer-wiring.test.mjs`)                                                                                                                                                                                                                                                                                           | [next.config.ts](../../apps/web/next.config.ts): `turbopack.resolveAlias` points the mount at `@banter/themer/host/passthrough` unless the switch is on, so other builds never compile the editor.                                                      |
| Mount       | [gate.tsx](src/host/gate.tsx): `createDevThemerGate(loadShell)` loads the shell after hydration, skips it inside the Live tab's frame, and renders it after the page as a sibling, never around it: wrapping the page once the shell arrived remounted it and dropped what the visitor had done. Never `lazy()` + `<Suspense>`: SSR streamed the page twice and left the visible copy dead. [head-script.tsx](src/host/head-script.tsx): the saved edit, painted from `<head>` before React runs. | [dev-themer-gate.tsx](../../apps/web/src/components/dev-tools/themer/dev-themer-gate.tsx) passes the host's shell loader and re-exports the head script as `DevThemerHeadScript`, which the root layout renders in `<head>`.                            |
| Shell       | [`ThemerDevShell`](src/components/themer-dev-shell.tsx): the editor's providers, trigger and overlay; takes no children                                                                                                                                                                                                                                                                                                                                                                           | [dev-themer-shell.tsx](../../apps/web/src/components/dev-tools/themer/dev-themer-shell.tsx) passes the host's font route and imports the host's `themer.css`.                                                                                           |
| Styles      | [themer.css](src/host/themer.css): the `themer` layer, the scanned sources (this package and `@banter/ui`), the popup z-index lift                                                                                                                                                                                                                                                                                                                                                                | [themer.css](../../apps/web/src/components/dev-tools/themer/themer.css): `@reference` to the host's own `globals.css`, then `@import "@banter/themer/host/themer.css"`.                                                                                 |
| Font route  | [font-catalog-route.ts](src/host/font-catalog-route.ts): `404` before loading anything while off; otherwise [`fontCatalogResponse`](src/api/font-catalog.ts) with the server-only `GOOGLE_FONTS_API_KEY` (optional)                                                                                                                                                                                                                                                                               | [route.ts](../../apps/web/src/app/dev/themer/google-fonts/route.ts): `export const GET = fontCatalogRoute(() => isThemerEnabled())`.                                                                                                                    |
| Presets     | `ThemerConfig.presets` / `defaultPreset` through `ThemerDevShell` props                                                                                                                                                                                                                                                                                                                                                                                                                           | Both hosts pass `[banterThemerPreset]` from `@banter/ui-tokens/themer-preset` and `defaultPreset={banterThemerPreset.id}` in `dev-themer-shell.tsx`, as module-level constants.                                                                         |
| Colours     | `ThemerConfig.extraColors` through the `ThemerDevShell` `extraColors` prop                                                                                                                                                                                                                                                                                                                                                                                                                        | Both hosts pass `banterThemerExtraColors` from `@banter/ui-tokens/themer-preset` (groups: brand accents, status, utility, and product, which lists only `evidence`, `evidence-foreground` and `interest-*`); `banterThemerPreset` carries their values. |
| Preview     | `ThemerConfig.previewTabs` / `previewWrapper` through `ThemerDevShell` props                                                                                                                                                                                                                                                                                                                                                                                                                      | Optional. A host adds tabs with its own pages and a wrapper for its providers (see [Host extension points](#host-extension-points)).                                                                                                                    |

CSS rules, pinned by
[themer-wiring.test.mjs](../../tests/config/themer-wiring.test.mjs):

- Never `@source` this package from a host `globals.css`: that shipped ~34 KB
  of editor CSS to every visitor.
- The shared `themer.css` compiles the editor's utilities inside
  `@layer themer`, and each host's `globals.css` declares
  `@layer theme, base, components, themer, utilities;` before Tailwind. In the
  same layer, the later editor sheet overrode the app's `dark:` and `md:`
  variants. It scans all of `@banter/ui` itself, because a host may scan only
  the components it uses (the CMS does).

Other invariants:

- The editor renders stock `@banter/ui` components only (never a host's
  brand layer, ADR-0080), so its own chrome and its built-in preview pages
  show stock shadcn and follow every token, radius included. The Live tab
  shows the host page with the host's own components. Its popups stack above
  the overlay through `host/themer.css`'s portal lift, not through
  positioner props.
- It switches to its mobile drawer below `breakpoints.wide` (1280px)
  ([use-is-mobile.ts](src/hooks/use-is-mobile.ts)), so its `@banter/ui`
  Sidebar (which becomes a Sheet below shadcn's 768px) only renders where it
  stays a sidebar.
- The host's `next-themes` owns the light/dark class; the editor only
  overrides variables.
- Every Base UI popup (menus, tooltips, preview dialogs) must sit above the
  overlay: the shared `themer.css` lifts `body > [data-base-ui-portal]` and its
  child to z-index 10060 while `[data-themer-overlay]` is mounted.
- The Live tab frames the page the editor was opened from. Each host answers
  `X-Frame-Options: SAMEORIGIN` / `frame-ancestors 'self'` only while its gate
  is on, and `DENY` / `'none'` otherwise: the `allowSameOriginFraming` option
  of [`apps/web/src/lib/security-headers.ts`](../../apps/web/src/lib/security-headers.ts)
  and [`apps/cms/src/security/headers.ts`](../../apps/cms/src/security/headers.ts),
  which each host's `next.config.ts` sets from `isThemerEnabled()`. The same
  option adds Google Fonts to the CSP, so the editor can load the fonts a theme
  picks. The mount skips the editor inside a frame, so the preview never shows
  a second editor.

## Host extension points

All are fields of `ThemerConfig` ([API](docs/API.md#themerconfig)) and props of
`ThemerDevShell`. Pass each as a **module-level constant**: a new identity per
render re-registers presets or rebuilds the tab list.

- `presets: readonly ThemePreset[]`: registered after the built-in presets; an
  id clash replaces the built-in one. The picker does not list them last:
  `getPresetIds` puts `default` first, then every preset alphabetically by
  label, so a host preset sits among the others. Only keys the preset changes
  are needed:
  light fills from the defaults, dark from the preset's light, then its own
  dark (`resolvePresetStyles`). Banter's own brand is `banterThemerPreset`
  (`@banter/ui-tokens/themer-preset`, built from the generated tokens).
- `defaultPreset: string`: the preset a fresh store (nothing in localStorage,
  nothing edited) starts on, applied without an undo entry
  (`adoptDefaultPreset`). Unknown id falls back to `"default"`. A restored
  theme that is still exactly its preset as last applied (`presetBaseline`)
  follows the preset's current source (`refreshUntouchedPreset`), so host
  token changes reach the page; an edited, imported or undone theme is kept.
- `extraColors: readonly ThemerExtraColorGroup[]`: `{ title, description?,
colors: [{ key, label }] }`, colour tokens beyond the 32 shadcn colours.
  Keys are CSS custom property names without `--` (kebab-case); a key that
  names a built-in style key or starts with `shadow-` is ignored. The groups follow the built-in ones
  in the Colors list (search, focus jumps and the inspector include them);
  values live in the same per-mode `styles` objects, so apply, undo/redo,
  "unsaved", HSL adjustments, CSS import and export treat them like built-in
  colours. A theme that does not set an extra leaves it unset: the picker
  shows the host's computed value, nothing is written for it, and editing it
  writes it into the theme. Presets may carry extra values (Banter's does).
- `previewTabs: readonly ThemerPreviewTab[]`: `{ id, label, component, scroll?,
order? }`. Merged with the built-in tabs (Live, Cards, Dashboard, Mail,
  Pricing, Color Palette, Typography); built-ins use order 0, 10, 20, ...; a
  host tab without `order` goes last; a host id equal to a built-in id
  replaces it. Use `React.lazy` components so host preview code loads only
  when the tab opens. The tab reads the live theme from the CSS variables on
  `<html>`.
- `previewWrapper: ComponentType<{ children }>`: wraps every **host** tab so
  it gets the host's providers (i18n, query client...), because the editor
  renders in a portal outside the host tree.

## Features

Layout: a sidebar (Colors, Typography, Other; AI Generate only with
`showTabAI`) beside a preview area. Below 1280 px a bottom drawer replaces the
sidebar and the preview is not shown.

- **Preset picker** (top of the sidebar): searchable list with swatches and a
  count; a "New" badge on recent tweakcn presets; previous/next arrows and the
  shuffle button (inside the popover, `data-testid="themer-preset-random"`)
  act on the **filtered** list. `*` after the label = the theme differs from
  its preset (`selectHasUnsavedChanges`). Local presets that shared an id
  with a tweakcn preset are `themer-<id>`; persisted old ids are migrated.
- **Colors**: grouped list with search (kept across panel switches, cleared
  on close), per-token pickers, host extra-colour groups after the built-in
  ones (`extraColors`), **Sidebar Sync** toggle (sidebar colours follow their
  base twins in both modes; one undo entry on toggle, re-aligned after
  preset/undo/import). With Sync on, the action bar's Reset counts the preset
  as aligned (`selectCanResetToPreset`), so it stays disabled on a freshly
  applied preset instead of offering to clear the undo history for nothing.
- **Typography**: font pickers for sans, heading, serif, mono (Google Fonts
  through the host's catalog route; no key needed) and letter spacing (shared
  by light and dark, like the fonts). Each picker names the font the theme
  sets: a Google family, a "Custom font" (a host `var()` font such as
  Banter's DM Sans, or a family Google does not serve, such as Georgia), or
  "System font (…)".
- **Other**: HSL adjustments, radius, base spacing, shadows (colour, opacity,
  blur, spread, offsets).
- **Action bar**: contrast checker dialog, light/dark toggle (circular
  View Transitions reveal when supported), undo/redo, reset to preset,
  **Import CSS** dialog, Code dialog, theme override switch (off = the page
  and Live frame show the production theme; the editor's variables and font
  links are removed).
- **Code dialog**: tabs `index.css`, `layout.tsx` and, for Tailwind v3 only,
  `tailwind.config.ts`; colour format and Tailwind v3/v4 switches (v3 maps
  oklch to hsl). An install command for tweakcn's registry
  (`shadcn@latest add https://tweakcn.com/r/themes/<id>.json` behind `npx`,
  `pnpm dlx`, `yarn dlx` or `bunx`, picked in the dialog) shows only for an
  unedited tweakcn-catalogue preset: its registry serves nothing else.
- **Import CSS**: paste a shadcn/tweakcn `index.css`, a Tailwind v3/v4 theme
  or `packages/ui-tokens/web.css`; parsed by `parseThemeCss` on submit (nested
  at-rules, comments, units; `.theme-inverse` and other selectors ignored;
  unknown properties reported). One undo entry, new checkpoint, HSL reset.
  A "replace" switch resets keys the CSS does not mention to the default
  preset.
- **Contrast checker**: rates the token pairs for the chosen mode (Light/Dark
  toggle inside the dialog does not flip the page) including the sidebar
  pairs (`sidebar`, `sidebar-primary`, `sidebar-accent` with their
  foregrounds). AAA >= 7, AA >= 4.5, AA Large >= 3 (large text only; fails
  normal text). Focus buttons jump to the colour control.
- **Preview tabs**: Live (the host page in a same-origin iframe, starts on the
  current page, device widths, refresh), Cards, Dashboard, Mail, Pricing,
  Color Palette, Typography (menu), plus host tabs. Selection is persisted.
- **Inspector**: hover a preview element to see its token classes; click pins
  it and focuses the matching colour control. Disabled on mobile and for a
  cross-origin Live frame.
- **Fullscreen preview**: the preview covers the editor chrome (and the page
  goes native fullscreen where allowed); a light/dark toggle shows in the
  preview bar meanwhile. `Esc` exits.
- **What reaches the page**: the editor writes `--font-sans`, `--font-heading`,
  `--font-serif`, `--font-mono`, `--radius`, `--spacing`, `letter-spacing` and
  `--tracking-*` on `<html>`; shadows rewire the `.shadow-*` utilities
  (ARCHITECTURE: "Applying a theme"). For fonts to follow, the host CSS must
  keep them runtime-overridable (see
  [ui-tokens README](../ui-tokens/README.md#source-layers), the font bullet).
- Not in this port: tweakcn's accounts, Save/Share and its AI theme
  generation (a mock panel stays behind `showTabAI`).

## Package facts

- **Source:** ported from the p0rtal monorepo's `@workspace/themer`, itself
  adapted from tweakcn. Files whose logic Banter wrote or changed open with a
  rationale header. A shadcn-example demo page under
  `src/components/preview/examples/` has one only where Banter changed its
  behavior or it carries a contract (for example `cards/payments.tsx`,
  `mail/components/mail.tsx`); the unchanged ports and the preset data
  (`tweakcn-presets.ts`) have none. Files derived from tweakcn add the line
  `Adapted from tweakcn (Apache-2.0, ...); modified by Banter.` Entry points:
  [themer-provider.tsx](src/components/themer-provider.tsx),
  [themer-root.tsx](src/components/themer-root.tsx),
  [editor-store.ts](src/stores/editor-store.ts).
- **Presets:** `themePresets` in [presets.ts](src/config/presets.ts), in
  registration order: `default`, tweakcn's catalogue
  ([tweakcn-presets.ts](src/config/tweakcn-presets.ts)), the local presets
  (`custom-1`, `rose-gold`, `midnight-blue` and the seven `themer-*`), then
  host presets. The picker's own order is `default`, then alphabetical.
- **Storage config:** Banter passes `storage: 'indexeddb'`. The type also
  accepts `'file'`, `'payload'` and `'auto'` (tries Payload, then
  `public/themes` files, then IndexedDB, then memory). Saved-theme storage has
  no UI in this port; editor state itself persists in localStorage.
- **AI generation:** [ai-generate.ts](src/api/ai-generate.ts) is a mock server
  action. Its Generate panel shows only with `showTabAI` (default `false`;
  `enableAI` is read by nothing). Nothing in Banter sets it.
- **Shared pieces:** `ActionButton` and `ModeToggle`
  (`src/components/ui/`), `useCopyFeedback` and `useSidebarSyncAlignment`
  (`src/hooks/`), `SectionContext` (`components/editor/section-context.ts`),
  `ImageAttachments` (`components/ai/`) and `generateThemeScript`
  (`utils/theme-script.ts`) are internal building blocks; their contracts are
  in [API: Building blocks](docs/API.md#building-blocks). Hooks, contexts and
  script text sit in files of their own so component files export only
  components (Fast Refresh keeps state).
- **Tests:** vitest, package-local (`pnpm --filter @banter/themer test`):
  stores (undo batching, presets, import, migrations), `apply-theme`,
  `parse-css`, `theme-generator`, shadows, font loader, contrast, sidebar
  sync, colour groups, inspector class regex, fullscreen, keyboard shortcuts,
  preview-tab registry, preset list, font catalogue, host flag and font route,
  dev shell, and the hooks and components above. The package has no vitest
  config, so tests run in node: a test that mounts into a DOM opens with
  `// @vitest-environment happy-dom` (see
  [DOM tests](../../docs/guides/testing.md#dom-tests)), and `apply-theme` and
  the font loader use the fake document in
  [fake-document.test-helper.ts](src/utils/fake-document.test-helper.ts).
  Lint keeps two upstream allowances (`_` unused names, `!`
  assertions); see [eslint.config.mjs](eslint.config.mjs).

## Keyboard shortcuts

Registered in code (`themerShortcuts` in
[use-keyboard-shortcut.ts](src/hooks/use-keyboard-shortcut.ts)). `Ctrl` also
matches `Cmd` on macOS. A shortcut is ignored while focus is in an input,
textarea or contenteditable element, and an extra modifier rejects a match.

| Shortcut       | Action                  | Active                                                               | Registered in                                               |
| -------------- | ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Ctrl+Shift+E` | Toggle the editor       | Always (configurable: `ThemerConfig.shortcut`)                       | [themer-provider.tsx](src/components/themer-provider.tsx)   |
| `Ctrl+Z`       | Undo                    | Editor open                                                          | themer-provider.tsx                                         |
| `Ctrl+Shift+Z` | Redo                    | Editor open                                                          | themer-provider.tsx                                         |
| `Ctrl+I`       | Toggle the inspector    | Preview mounted, desktop layout, frame not cross-origin              | [preview-tabs.tsx](src/components/preview/preview-tabs.tsx) |
| `Esc`          | Exit fullscreen preview | Fullscreen preview on (CSS fallback; native fullscreen exits itself) | [use-fullscreen.ts](src/hooks/use-fullscreen.ts)            |

The toggle default is `SHORTCUTS.toggle` (`config/constants.ts`). It avoids
combinations the browsers keep for themselves (`Cmd/Ctrl+Shift+T` reopens a
closed tab, `+N`, `+W` and `+Q` act on windows) and any Option/Alt chord.
`SHORTCUTS` / `themerShortcuts` also list `save` (`Ctrl+S`) and `export`
(`Ctrl+E`), but **nothing handles them**; there is no Save action in this
port and Export is the Code button.

## Documentation

- [Architecture](./ARCHITECTURE.md): stores, data flow, theme application and
  font loading.
- [API reference](./docs/API.md): components, hooks, config and types.
- [File storage](./docs/FILE-STORAGE.md): the generic `'file'` mode (unused in
  Banter).
- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md): repository-wide
  ownership and runtime boundaries.

## Credits and licences

Adapted from [tweakcn](https://github.com/jnsahaj/tweakcn) by
[@jnsahaj](https://github.com/jnsahaj), **Apache License 2.0** (not MIT),
commit `a3b47b37`; modified by Banter. The full licence is in
[LICENSES/tweakcn-Apache-2.0.txt](LICENSES/tweakcn-Apache-2.0.txt) and the
attribution in [NOTICE](NOTICE), which also carries the shadcn/ui (MIT,
[LICENSES/shadcn-ui-MIT.txt](LICENSES/shadcn-ui-MIT.txt)) notice for the demo
pages. Keep the header line on every ported file and keep NOTICE current when
porting more code.
