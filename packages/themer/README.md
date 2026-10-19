# themercn

A live editor for a shadcn Theme's design tokens. Mount one `<Themer>` next to
your app, open it with the floating button or `Ctrl+Shift+E`, and edit
colours, fonts, radius, spacing, letter spacing and shadows on the page you are
looking at. When you like the result, copy the CSS from the Code dialog into
your project.

- **React only, self-contained.** The Themer brings its own precompiled CSS,
  scoped to its own root, and its own providers. Your app compiles nothing of
  the Themer's.
- **Out of your bundle when off.** A loader keeps every byte of the Themer out
  of builds where you turn it off.
- **Next Adapter.** `themercn/next` paints a saved Theme before React runs;
  `themercn/next/server` serves the font catalog.

Adapted from [tweakcn](https://github.com/jnsahaj/tweakcn) (Apache-2.0); see
[Credits and licences](#credits-and-licences).

## Requirements

- React and React DOM `^19.2.0`. Next `>=16` only for the Next Adapter.
- A shadcn setup on Tailwind v4: the Theme's tokens are CSS variables on
  `:root` and `.dark` (`--background`, `--primary`, `--radius`, …), mapped to
  utilities with `@theme inline { --color-primary: var(--primary); … }`. The
  Themer writes those variables on `<html>`, so whatever reads them follows
  the edit. Font edits reach the page through `--font-sans`, `--font-heading`,
  `--font-serif` and `--font-mono`, so map the font utilities you use to them.
- A browser with [`@scope`](#styles-and-browser-support) (Chrome 118, Safari 17.4,
  Firefox 146).
- Light/dark is the `.dark` class on `<html>`.

## Install

```sh
pnpm add themercn
```

## Next quick start

Three pieces, all from the [Playground](https://github.com/Jbmanllr/themerCN/tree/main/apps/web), the Next app in this
repository that runs them.

**1. A client component that loads the Themer.** Create the loader once, at
module level. Pass `null` instead of the import to keep the Themer out of a
build (for example
`createThemerLoader(process.env.NEXT_PUBLIC_THEMER === "1" ? () => import("themercn") : null)`).
The Playground ships it everywhere, uses `next-themes` for light/dark (so it
passes `colorMode` and `onColorModeChange`), and adds its own brand Preset:

<!-- recipe: apps/web/components/themer/playground-themer.tsx -->

```tsx
import { useTheme } from "next-themes"
import { createThemerLoader } from "themercn/loader"

import { NIGHTJAR_PRESET_ID, playgroundPresets } from "@/lib/brand/nightjar"

// Unconditional: the Playground always ships the Themer. A Host app that
// wants it off in some builds passes `null` here instead.
const ThemerLoader = createThemerLoader(() => import("themercn"))

/** The route `createFontCatalogRoute` answers on. */
export const FONT_CATALOG_ENDPOINT = "/api/themer/fonts"

export function PlaygroundThemer() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <ThemerLoader
      presets={playgroundPresets}
      defaultPreset={NIGHTJAR_PRESET_ID}
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      onColorModeChange={setTheme}
      fontCatalogEndpoint={FONT_CATALOG_ENDPOINT}
    />
  )
}
```

The file starts with `"use client"`. Without a theme library, render
`<ThemerLoader />` with no props: the Themer toggles `.dark` on `<html>`
itself.

**2. The root layout.** `<ThemerHeadScript>` (from `themercn/next`) goes in
`<head>`; the loader goes beside the page, never around it:

<!-- recipe: apps/web/app/layout.tsx -->

```tsx
<head>
  {/* Restores the saved Theme before first paint (README, Next quick
      start). Without a saved Theme, app/nightjar.css is the first paint. */}
  <ThemerHeadScript />
</head>
<body>
  <ThemeProvider>
    {children}
    {/* A sibling of the page, never around it. */}
    <PlaygroundThemer />
  </ThemeProvider>
</body>
```

If you set `storageNamespace` on the Themer, pass the same value to
`<ThemerHeadScript storageNamespace="…">`.

**3. The font catalog route** (optional; without it the font picker searches
the bundled list of 130 families). `app/api/themer/fonts/route.ts`:

<!-- recipe: apps/web/app/api/themer/fonts/route.ts -->

```ts
import { createFontCatalogRoute } from "themercn/next/server"

export const { GET } = createFontCatalogRoute({
  enabled: true,
  googleFontsApiKey: process.env.GOOGLE_FONTS_API_KEY,
})
```

Set `enabled` to the same switch as the loader: disabled, the route answers
`404` without loading any catalog code. The key is optional and stays on the
server; the package reads no environment variables.

## Vite quick start

From the [Vite smoke app](https://github.com/Jbmanllr/themerCN/tree/main/apps/vite), which turns the Themer on with
`VITE_THEMER=1`. In `src/main.tsx`, render the loader beside your app:

<!-- recipe: apps/vite/src/main.tsx -->

```tsx
const ThemerLoader = createThemerLoader(
  import.meta.env.VITE_THEMER === "1" ? () => import("themercn") : null
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <ThemerLoader />
  </StrictMode>
)
```

The condition is static, so a build with `VITE_THEMER` unset drops the import
and ships no Themer code. In `vite.config.ts`, a `transformIndexHtml` plugin
inlines the head script under the same condition
(`import { getThemerHeadScript } from "themercn/head-script"`):

<!-- recipe: apps/vite/vite.config.ts -->

```ts
function themerHeadScript(): Plugin {
  return {
    name: "themer-head-script",
    transformIndexHtml: () => [
      {
        tag: "script",
        children: getThemerHeadScript(),
        injectTo: "head-prepend",
      },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const themer = env.VITE_THEMER === "1"

  return {
    plugins: [react(), tailwindcss(), themer && themerHeadScript()],
    test: { include: ["src/**/*.test.{ts,tsx}"] },
  }
})
```

Any other React setup works the same way: render the loader (or `<Themer>`
itself) beside your tree, and put `getThemerHeadScript()` in an inline
`<script>` at the top of `<head>`.

## Entry points

| Import                 | Exports                                                                                                   | Notes                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `themercn`             | `Themer`; types `ThemerProps`, `ThemePreset`, `ThemerExtraColorGroup`, `ThemerLayout`, `ThemerPreviewTab` | The Themer itself (client only). Usually loaded through the loader.          |
| `themercn/loader`      | `createThemerLoader`, type `ThemerModule`                                                                 | About 1 kB. Reaches no Themer code; with `null` nothing of the Themer ships. |
| `themercn/head-script` | `getThemerHeadScript`, type `ThemerHeadScriptOptions`                                                     | A string generator with no imports: safe in a build config or on a server.   |
| `themercn/next`        | `ThemerHeadScript`, type `ThemerHeadScriptProps`                                                          | Client component for the root layout's `<head>`.                             |
| `themercn/next/server` | `createFontCatalogRoute`, type `FontCatalogRouteOptions`                                                  | Route handler for an App Router `route.ts`.                                  |

ESM only. Every export carries TSDoc, so your editor shows these docs on
hover.

## `<Themer>` props

`createThemerLoader`'s component takes the same props. Every prop is optional.
Pass `presets`, `extraColors`, `previewTabs` and `previewWrapper` as stable,
module-level values: a new identity re-registers or rebuilds them.

| Prop                  | Type                                              | Default          | Description                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultPreset`       | `string`                                          | `"default"`      | The Preset a fresh Themer starts on (nothing saved yet). An unknown id falls back to `"default"`.                                                                                                                                                              |
| `presets`             | `readonly ThemePreset[]`                          | none             | Your Presets, added to the built-in ones. On an id clash yours wins.                                                                                                                                                                                           |
| `extraColors`         | `readonly ThemerExtraColorGroup[]`                | none             | Colour tokens beyond shadcn's: `{ title, description?, colors: [{ key, label }] }`, `key` a kebab-case custom property name without `--`. Edited, exported and imported like the built-in ones.                                                                |
| `previewTabs`         | `readonly ThemerPreviewTab[]`                     | none             | Preview tabs of your own: `{ id, label, component, scroll?, order? }`. Use `React.lazy` components. A built-in id replaces that tab.                                                                                                                           |
| `previewWrapper`      | `ComponentType<{ children: ReactNode }>`          | none             | Wraps your preview tabs (not the built-in ones) with the providers your components need: the Themer renders outside your tree.                                                                                                                                 |
| `shortcut`            | `string`                                          | `"ctrl+shift+e"` | Toggles the Themer. Modifiers `ctrl`, `alt`, `shift`, `meta`, joined with `+`; `ctrl` also matches Cmd on macOS.                                                                                                                                               |
| `layout`              | `"workspace" \| "overlay" \| "push" \| "toolbar"` | `"workspace"`    | The [Themer layout](#themer-layouts) the Themer opens in. The user's own choice, made in the Themer, wins over it.                                                                                                                                             |
| `showTrigger`         | `boolean`                                         | `true`           | Shows the floating button.                                                                                                                                                                                                                                     |
| `zIndex`              | `number`                                          | `9990` / `10000` | Layer of the trigger and the Themer UI (by default 9990 and 10000). Popups sit one layer above the Themer UI.                                                                                                                                                  |
| `storageNamespace`    | `string`                                          | `"themercn"`     | Prefix of the localStorage keys `<ns>:editor`, `<ns>:preferences` and `<ns>:color-mode`. Give the head script the same value.                                                                                                                                  |
| `colorMode`           | `"light" \| "dark"`                               | none             | Controlled light/dark, for an app with its own mode state. Pass it with `onColorModeChange`; your app keeps the `.dark` class. Unset, the Themer toggles `.dark` on `<html>`, follows changes made by others, and the head script restores the mode on reload. |
| `onColorModeChange`   | `(mode: "light" \| "dark") => void`               | none             | Called with the mode the user switched to, in controlled mode.                                                                                                                                                                                                 |
| `fontCatalogEndpoint` | `string`                                          | none             | URL of a [font catalog](#font-catalog). Unset, the font picker searches the bundled list in the browser.                                                                                                                                                       |

`<Themer>` takes no children and renders nothing on the server, during
hydration and inside an iframe (its own Live preview frames your page).

A `ThemePreset` is `{ id, label, description?, source?, createdAt?, styles: { light, dark } }`.
`styles` holds token values by custom property name without `--`
(`primary`, `font-sans`, `radius`, your extra colours) and needs only the keys
the Preset changes: light is laid over the defaults, dark over the Preset's
light values.

## Saved Themes and the head script

The edited Theme and the Themer's preferences persist in the browser's
localStorage under `<storageNamespace>:editor` and
`<storageNamespace>:preferences` (and, when the Themer owns light/dark,
its mode under `<storageNamespace>:color-mode`); nothing is sent anywhere. The Themer never
writes your source files: copy the Code dialog's CSS into your project to keep
a Theme.

Without the head script, a reload paints your own Theme first and switches to
the saved edit once the Themer loads after hydration. The head script applies
the saved Theme while the HTML is parsed (and requests its Google Fonts), in
whichever mode the page is in: when your app owns the `.dark` class
(`colorMode`), its own script may set the class before or after this one.
When the Themer owns light/dark, the head script also restores the mode it
saved. With nothing saved, or the Theme override switched off in the Themer,
it changes nothing, so it is safe to render even in builds where the Themer is
off.

## Font catalog

The font picker pages through `fontCatalogEndpoint` with:

```
GET <endpoint>?q=<search>&limit=<n>&offset=<n>[&category=<category>]
```

`category` is one of `sans-serif`, `serif`, `display`, `handwriting`,
`monospace` (left out for all). The answer is:

```ts
{
  fonts: { family: string; category: string; variants: string[]; variable: boolean }[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}
```

`createFontCatalogRoute` implements it: with `googleFontsApiKey`, the Google
Fonts Developer API list (cached a day); without one, Google's public catalog
(held in memory a day); if Google fails, the bundled list. It clamps `limit` to
1–100 (default 50) and `offset` to 0 or more. Any endpoint that answers this
contract works, in any framework.

## Content Security Policy

CSP is your app's job; the package adds no headers. With a CSP, allow:

| Directive         | Source                                       | Why                                                                                       |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `style-src`       | `https://fonts.googleapis.com`               | Font stylesheets for the fonts a Theme picks (Themer and head script).                    |
| `font-src`        | `https://fonts.gstatic.com`                  | The font files those stylesheets load.                                                    |
| `style-src`       | `'unsafe-inline'`                            | The Themer injects its CSS as a `<style>` element.                                        |
| `script-src`      | `'unsafe-inline'` or the head script's hash  | The head script is an inline `<script>`.                                                  |
| `frame-ancestors` | `'self'` (and `X-Frame-Options: SAMEORIGIN`) | The Live preview tab frames your own page; a page that refuses framing shows empty there. |

The font catalog route calls Google from your server, not from the browser.

## Keyboard shortcuts

`Ctrl` also matches `Cmd` on macOS. Shortcuts are ignored while focus is in an
input, a textarea or a contenteditable element, and an extra modifier rejects a
match.

| Shortcut       | Action                   | When                                                                |
| -------------- | ------------------------ | ------------------------------------------------------------------- |
| `Ctrl+Shift+E` | Open or close the Themer | Always (change it with `shortcut`)                                  |
| `Ctrl+Z`       | Undo                     | Themer open                                                         |
| `Ctrl+Shift+Z` | Redo                     | Themer open                                                         |
| `Ctrl+I`       | Toggle the inspector     | Desktop; in Workspace, a Preview shown and a same-origin Live frame |
| `Esc`          | Exit fullscreen preview  | Fullscreen preview on                                               |

## Styles and browser support

The Themer injects one `<style data-themer-style>` while it is mounted. All of
its CSS (Tailwind's Preflight, shadcn's base rules, the utilities it uses)
sits inside `@scope ([data-themer]) to ([data-themer-host])`: it styles the
Themer UI and nothing else, and your preview tabs render inside
`[data-themer-host]` with your own styles. Its popups render in its own
container, not in `<body>`. The Themer UI reads the page's Theme variables, so
it shows the Theme being edited.

`@scope` with a lower boundary needs Chrome 118, Safari 17.4 or Firefox 146.

Known leak: your unlayered element rules (for example
`button { border: 3px dashed red }`) still reach the Themer's elements on
properties Preflight does not reset, because they win on specificity. Layered
CSS, which is what Tailwind emits, does not leak.

## Themer layouts

How the Themer UI sits on screen while it is open:

- **Workspace** (default): covers the whole page, the sidebar beside the
  Preview tabs.
- **Overlay**: the sidebar floats over your real page, on the left, with the
  actions at its foot (collapsed to its icon rail, they are in the rail's
  `…` menu). Your page stays usable beside it: it scrolls (Lenis
  included) and takes clicks. The inspector (its toggle is in the sidebar's
  header) works on your real page instead of a Preview.
- **Push**: the sidebar sits beside your real page and shifts it aside
  instead of covering it. See [Push and your page](#push-and-your-page).
  The inspector works on your real page here too.
- **Toolbar**: no sidebar; a bar centred at the top of your real page holds
  every control. Colors, Typography and Other each open in their own popup,
  which stays open while you click or scroll the page (Escape, its button or
  another group closes it); Code, CSS import, reset, the contrast checker,
  the Theme override and the layout menu are in its `…` menu. The inspector
  (its toggle is in the bar) works on your real page too.

`layout` sets the default. The user switches from the layout menu in the
Themer UI's header (Toolbar: its `…` menu); the choice is saved in `<storageNamespace>:preferences`
and wins over `layout` on the next visit. Switching keeps the Theme, undo
history and open panel (it turns the inspector off), and the sidebar stays
collapsed or expanded across layouts. Expanding or collapsing it is instant.
Collapsed to its icon rail, the sidebar stays usable: each icon opens its
panel in a popup beside the rail, which behaves like the Toolbar's. Below
1280 px every layout opens as the same bottom drawer.

### Push and your page

The Themer never wraps your app, so Push moves your page with
`margin-left` on `<html>`, set to the sidebar's width (320 px
expanded, 48 px collapsed). Like the sidebar, it moves at once, with no
animation. The same width is exposed as the CSS variable
`--themer-inset-left` on `<html>`. The margin and the variable are
inline styles on `<html>`. When the Themer closes, switches to another layout, opens as the
drawer, or unmounts, any inline values your app had set for them come back
as they were, and the rest are removed.

The Themer UI is laid out left-to-right in every Host direction, with its
sidebar pinned to the left. That is why the margin and the variable are
physical (left), not logical: in a right-to-left page (`<html dir="rtl">`)
Push still shifts the page on the left, the side the sidebar covers. Host
preview tabs keep your page's `dir`.

Two limits, by design:

- **`position: fixed` elements stay on the viewport**, so they sit under the
  sidebar (sticky ones follow the page). Opt one in by offsetting it with the
  variable, with a fallback for when the Themer is not in Push:

  ```css
  .my-fixed-sidebar {
    left: var(--themer-inset-left, 0px);
  }
  ```

  In Tailwind: `left-[var(--themer-inset-left,0px)]`.

- **The viewport does not shrink**, so your breakpoints, media queries and
  viewport units (`100vw`, `w-screen`) do not react to Push. To see the Theme
  at other widths, use the Workspace's Live preview.

## What you can edit

- **Presets**: a searchable picker with the built-in tweakcn catalogue plus
  yours, previous/next/shuffle, and a `*` while the Theme differs from its
  Preset. Reset returns to the Preset.
- **Colours**: every shadcn colour token plus your extra colours, with search,
  Tailwind palette picks and Sidebar Sync (sidebar colours follow their base
  twins).
- **Typography**: sans, heading, serif and mono fonts from Google Fonts, and
  letter spacing.
- **Other**: HSL adjustments of the whole palette, radius, spacing and
  shadows.
- **Actions**: contrast checker (WCAG AA/AAA), light/dark toggle, undo/redo,
  Import CSS (a shadcn or tweakcn `index.css`), the Code dialog (`index.css`
  for Tailwind v3 or v4 in hex, rgb, hsl or oklch, plus a `layout.tsx` for the
  fonts), and a switch that turns the edited Theme off to compare.
- **Preview**: Live (your page in a same-origin frame, at several device
  widths), Cards, Dashboard, Mail, Pricing, Color Palette and Typography
  pages, plus your own tabs; an inspector that shows an element's token
  classes and jumps to the colour; fullscreen.

Below 1280 px wide the Themer opens as a bottom drawer without the preview,
whatever the [Themer layout](#themer-layouts).

## Credits and licences

themercn is licensed under the [Apache License 2.0](LICENSE).

Adapted from [tweakcn](https://github.com/jnsahaj/tweakcn) by
[@jnsahaj](https://github.com/jnsahaj), **Apache License 2.0**, commit
`a3b47b37`; modified for themercn. The full licence is in
[LICENSES/tweakcn-Apache-2.0.txt](LICENSES/tweakcn-Apache-2.0.txt) and the
attribution in [NOTICE](NOTICE). The preview pages derive from the
[shadcn/ui](https://github.com/shadcn-ui/ui) examples, MIT
([LICENSES/shadcn-ui-MIT.txt](LICENSES/shadcn-ui-MIT.txt)).

Contributing: see the [repository](https://github.com/Jbmanllr/themerCN/) and the package's
[ARCHITECTURE.md](https://github.com/Jbmanllr/themerCN/blob/main/packages/themer/ARCHITECTURE.md).
