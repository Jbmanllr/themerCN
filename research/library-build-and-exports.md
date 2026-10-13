# Build tool and export layout for `themercn` (issue #4)

Research for [#4](https://github.com/Jbmanllr/themerCN/issues/4), under map [#1](https://github.com/Jbmanllr/themerCN/issues/1). Checked on 2026-10-13.

The question: which build tool and `exports` layout suit `themercn`? It is a React-only core plus a `themercn/next` Adapter that holds a route handler, a head script and a dev-only gate.

The Themer source this is grounded in is `packages/themer` at commit `107c7cc`.

## Answer

- **Build tool:** **tsdown** (0.23.x, built on Rolldown).
- **Output:** ESM-only, with bundled `.d.ts` files.
- **Configs:** two build configs, following nuqs.
  - The **client** config covers the core and the client half of `themercn/next`. Every client entry gets `'use client'` through `outputOptions.intro`.
  - The **server** config covers the route handler and the flag. It adds no directive.
- **CSS:** ship `themer.css` as a source file, copied with `copy` and not compiled.
- **UI components:** bundle `packages/ui` into `dist`.
- **`next`:** an optional peer dependency.
- **Checks:** a build-time check (`deps.onlyImport`) keeps `next` out of the core.

The map's charting decisions hold, with three constraints:

1. `themercn/next` cannot be a single client entry. The route handler must live in a separate server entry.
2. The core barrel must stop exporting `ThemeScript`, which imports `next/script`.
3. Tailwind v4 in the Host app is a real requirement of the CSS export.

## The package as it stands (`107c7cc`)

- `package.json` exports point at `src/*.ts` (no build). It has `"type": "module"` and `"sideEffects": ["**/*.css"]`, and lists `next` 16.4.0 as a hard dependency.
- **Directives are per file.** 96 source files start with `"use client"`. The barrels (`src/index.ts`, `src/components/index.ts`) have none.
- One file is `"use server"`: `src/api/ai-generate.ts`. It is the mock AI action that `components/ai/ai-chat.tsx` imports and the root barrel re-exports through `src/api/index.ts`.
- **`next` imports in the core:** only `components/theme-script.tsx`, which does `import Script from "next/script"`. The root barrel exports it (`components/index.ts:17`). The `next` strings in `utils/theme-generator.ts` sit inside template literals and are not imports.
- **`src/host/*`:**
  - `flag.ts` is pure.
  - `font-catalog-route.ts` builds a web `Request`→`Response` `GET` and does a lazy `import("../api/font-catalog")`.
  - `gate.tsx` and `head-script.tsx` are `"use client"`.
  - `passthrough.tsx` must import nothing else.
  - `themer.css` is Tailwind v4 source: `@tailwind utilities source(none)`, `@source ".."` and `@source "../../../ui/src"`. A Host app `@reference`s its own `globals.css` before it.
- `process.env.NODE_ENV` is read at runtime in `gate.tsx` and `head-script.tsx`. `process.env.GOOGLE_FONTS_API_KEY` is read in the route.

## Tool comparison

| | tsdown | tsup | Vite library mode | unbuild | bunchee |
|---|---|---|---|---|---|
| Latest (npm, 2026-10-13) | 0.23.1 (published 2026-10-10) | 8.5.1 | 8.3.4 | 3.6.1 (published 2025-08) | 7.0.1 |
| Status | Active. Vite's docs point library authors to it [V] | **Unmaintained**. Its README says to use tsdown [T] | Active, but scoped to "browser-oriented" libraries [V] | Rollup-based. The README points to `obuild` (Rolldown) as successor [U] | Active |
| Default format | ESM. CJS is "maintenance-only" and new libraries are told to ship ESM-only [D-fmt] | ESM/CJS | `es` and `cjs` for multiple entries [V] | ESM and CJS | Driven by `exports` [B] |
| `.d.ts` | Built in (rolldown-plugin-dts; oxc when `isolatedDeclarations` is on) [D-dts] | Built in | None (needs a plugin) | Built in | Built in |
| `"use client"` / `"use server"` | Rolldown keeps a top-level directive only in entry modules or with `preserveModules`. Others are dropped [R]. The fix is `outputOptions.intro`/`banner` per entry (nuqs) | Keeps them by default (tsdown#157) | Same Rolldown rules (Vite 8 uses `rolldownOptions`) [V] | Rollup: needs a plugin | **Splits client/server boundary chunks automatically** [B] |
| `exports` map | Can generate it (`exports: true`) and adds the CSS file when `css.splitting` is false [D-exp] | Manual | Manual (a recommended shape is documented) [V] | Read from `package.json` | `exports` is the source of truth for entries [B] |
| CSS | `@tsdown/css` (experimental). Lightning CSS, `@import` inlining [D-css]. `copy` for verbatim files [D-copy] | Experimental | Extracts one CSS file and documents exporting it [V] | Via mkdist | Injects a `<style>` tag at runtime [B]. sonner copies its CSS by hand: `bunchee && cp src/styles.css dist/styles.css` |
| Dependency control | `deps.neverBundle` / `alwaysBundle` / `onlyBundle` / **`onlyImport`** (fails the build if the output imports an unlisted package) [D-deps] | `external` / `noExternal` | `rolldownOptions.external` | Reports missing or unused dependencies | `dependencies` and `peerDependencies` are external [B] |
| Validation | `publint` and `attw` options [D-lint] | None | None | None | None |

**Why tsdown over bunchee.** bunchee is the only tool that handles directives with no setup. It is also a reasonable fallback. But it has three costs:

- Its CSS model (runtime `<style>` injection) is wrong for a Tailwind source sheet.
- Entries are inferred from file-name conventions.
- It has no import allow-list.

tsdown has three things in its favour:

- It is the tool Vite and tsup now point to.
- nuqs (the closest analogue: a React core plus a `next` adapter subpath) ships with it.
- Its `deps.onlyImport` check can enforce "the core never imports `next`" at build time.

## Real libraries

- **nuqs 2.10.2** is the closest analogue.
  - Build: `tsdown`, `format: ['esm']`, `dts: true`, `deps.neverBundle: ['next', 'react', …]`.
  - It uses two configs, client and server. The client entries get `'use client'` through `outputOptions.intro` (it leaves out `debug.js`, which is isomorphic).
  - The published `dist/adapters/next/app.js` starts with `"use client";`.
  - Exports: `{ types, import, default }` per subpath, including `./adapters/next/app`, plus `./package.json`.
  - `next` is an optional peer: `peerDependenciesMeta.next.optional: true`.
  - Source: the npm tarball and [`packages/nuqs/tsdown.config.ts`](https://github.com/47ng/nuqs/blob/next/packages/nuqs/tsdown.config.ts).
- **better-auth 1.7.7** builds with `tsdown`. `./next-js` (`toNextJsHandler`, a route handler) maps to `{ types, default }` plus a custom `dev-source` condition that points at `src` (tsdown's `exports.devExports` pattern [D-exp]). `next` is an optional peer.
- **uploadthing 7.7.4** has an ESM/CJS dual `./next` subpath that exports a route handler, and `next` as an optional peer.
- **sonner 2.0.8** builds with bunchee and copies its CSS into `dist` by hand, exporting it as `./dist/styles.css`.

## Findings by topic

### ESM-only or dual

Ship **ESM-only**:

- tsdown says new libraries "are encouraged to publish ESM-only" [D-fmt].
- Node unflagged `require(esm)` in v20.19.0 and v22.12.0, and marked it stable in v25.4.0 [N-mod].
- The consumers are Next 16 and Vite, which both resolve ESM.
- nuqs and better-auth ship ESM-only.

Dual output would double the `.d.ts` files and bring the dual-package hazard to React contexts, for no consumer that needs it.

### Directives

- **Rolldown's rule** [R]: a top-level directive survives only when its module is an entry module or `preserveModules` is on. Rolldown issue #7809 shows the effect: a `'use client'` module that is re-exported by an entry, or shared between entries, loses the directive. The Rolldown maintainers say keeping it would be wrong, because it would turn merged server code into client code.
- **Next's guidance** for component libraries: put `"use client"` at the entry points that rely on client-only features, and note that "some bundlers might strip out" directives [NX-sc].
- **App Router bundles packages** imported in Server Components and Route Handlers [NX-pkg], [NX-tp], so client and server boundaries inside `node_modules` are honoured. `transpilePackages` is not needed for a prebuilt ESM package.
- **Consequence 1:** a blanket `'use client'` on an entry marks everything it exports as a client reference.
  - That is fine for the core: React components, hooks, stores and config.
  - It is **not** fine for a route handler. `export const GET = fontCatalogRoute(...)` in `route.ts` would call a client reference.
  - So `themercn/next` must split into a client entry (gate, head script, passthrough) and a server entry (route handler factory, `isThemerOn`), each built by its own config. This is nuqs's client/server split.
- **Alternative:** `unbundle: true` with per-file directives.
  - Rolldown keeps directives under `preserveModules`, and tsdown#157 says "All directives will be preserved now". A mixed barrel would then work in Next, because the barrel itself carries no directive.
  - It is more fragile: tsdown#362 reported a regression in exactly this mode.
  - It also emits the bundled `packages/ui` files under odd paths.
  - Use it only if a spike shows it behaves.
- **Consequence 2:** `"use server"` in `api/ai-generate.ts` is not an entry. Rolldown drops the directive, and under a client entry the mock becomes a plain client function.
  - That is harmless for today's mock, which calls no provider.
  - A real Server Action would need its own server entry with a `'use server'` intro.
  - In a Vite Host app, `"use server"` means nothing anyway.
  - This belongs to the open "AI Generate panel" item on the map.

### The `exports` map with types

- Put `"types"` first in each condition object. Node's docs say it "should always be included first", and that `"default"` "should always come last" [N-pkg].
- Defining `exports` hides every subpath that is not listed [N-pkg]. The wildcard map in today's `package.json` (`./components/*`, `./stores/*`, and so on) would publish the whole internal tree as public API. Replace it with a small, explicit set.
- With ESM-only output, `{ "types", "default" }` per subpath is enough (better-auth). nuqs also adds an `"import"` key that duplicates `"default"`.
- Add `"./package.json"`, as nuqs does.

### CSS as an export

- `themer.css` is **Tailwind v4 source**, not compiled CSS. It compiles inside the Host app after the Host's `@reference` to its own `globals.css`, so it picks up the Host's theme and variants. Ship it **verbatim**:
  - Use tsdown `copy` [D-copy], which skips Rolldown transforms.
  - Do not use `@tsdown/css`, which would run Lightning CSS over `@tailwind`.
- `@source` paths resolve relative to the stylesheet [TW]. Once the sheet sits at `dist/themer.css`:
  - `@source "."` scans the built JS, where the class strings survive as literals.
  - `@source "../../../ui/src"` breaks in `node_modules`. Bundling `packages/ui` into `dist` (`deps.alwaysBundle`, or a `devDependency`, which tsdown bundles when used [D-deps]) removes the need for it.
  - Tailwind skips `node_modules` during automatic detection [TW], but an explicit `@source` still scans it.
- Export it as `"./themer.css": "./dist/themer.css"` (Vite documents the same pattern for library CSS [V]). Keep `"sideEffects": ["*.css"]` so that CSS imports survive tree-shaking.

### `next` as an optional peer

- Declare `next` in `peerDependencies` with `peerDependenciesMeta.next.optional: true` (nuqs, better-auth, uploadthing). tsdown keeps peers external by default [D-deps].
- **This is a hard rule:** nothing reachable from `"."` may import `next/*`. A Vite Host app resolves every static import in a chunk it loads, so the `import Script from "next/script"` in the core's `ThemeScript` would fail to resolve where `next` is not installed.
  - Move `ThemeScript` to `themercn/next`, or drop it, since `host/head-script.tsx` already replaces it.
  - Add `deps.onlyImport` to the core config, listing the core's runtime deps without `next`, so a regression fails the build [D-deps].
- `next-themes` is not `next`. It works in any React app and can stay a dependency of the core.

### Tree-shaking

- ESM plus `"sideEffects": ["*.css"]` lets Host bundlers drop unused re-exports from the large root barrel.
- tsdown's `treeshake.moduleSideEffects` can mark the rare module with a real side effect, as nuqs does for `debug.ts`.
- Per-entry bundling keeps private chunks shared between entries, so React contexts stay single-instance.
- `process.env.NODE_ENV` is left unreplaced in library output, which is what the gate needs. Vite's docs say library mode replaces only `import.meta.env.*` and leaves `process.env.*` for consumers [V]. tsdown applies no `define` by default.

## Example `exports` map

This map is an illustration. The exact names under `./next/*` belong to [#7](https://github.com/Jbmanllr/themerCN/issues/7).

```json
{
  "name": "themercn",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist", "NOTICE", "LICENSES"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./next": { "types": "./dist/next.d.ts", "default": "./dist/next.js" },
    "./next/server": { "types": "./dist/next/server.d.ts", "default": "./dist/next/server.js" },
    "./next/passthrough": { "types": "./dist/next/passthrough.d.ts", "default": "./dist/next/passthrough.js" },
    "./themer.css": "./dist/themer.css",
    "./package.json": "./package.json"
  },
  "peerDependencies": { "next": ">=16", "react": "^19.2.0", "react-dom": "^19.2.0" },
  "peerDependenciesMeta": { "next": { "optional": true } }
}
```

Which entries are which:

- **Client entries, with `'use client'`:** `.`, `./next` (gate, head script) and `./next/passthrough`.
- **Server entry, with no directive:** `./next/server` (`fontCatalogRoute`, `isThemerOn`).
  - A plain Node `next.config.ts` imports it, so it must stay free of React.
  - A Host's route is then `export const GET = fontCatalogRoute(...)`.

## Sketch `tsdown.config.ts`

```ts
import { defineConfig, type UserConfig } from 'tsdown'

const common = {
  format: ['esm'],
  platform: 'neutral',
  dts: true,
  publint: true,
  deps: { neverBundle: ['react', 'react-dom', /^next(\/|$)/], alwaysBundle: [/^@repo\/ui/] },
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
} satisfies UserConfig

export default defineConfig([
  {
    ...common,
    entry: { index: 'src/index.ts', next: 'src/next/index.ts', 'next/passthrough': 'src/next/passthrough.tsx' },
    outputOptions: { intro: ({ isEntry, fileName }) => (isEntry && !fileName.endsWith('.d.ts') ? "'use client';\n" : '') },
    copy: [{ from: 'src/themer.css', to: 'dist' }],
  },
  { ...common, entry: { 'next/server': 'src/next/server.ts' } },
])
```

Notes on the sketch:

- The `@repo/ui` name depends on the shadcn monorepo template.
- The core config also wants `deps.onlyImport` (its runtime deps without `next`).
- A spike should confirm three things:
  - The `intro` callback signature on tsdown 0.23 (nuqs uses it on 0.22).
  - `platform: 'neutral'` with React deps.
  - That `packages/ui` class strings survive into `dist`, so `@source "."` sees them.

## What this means for the map

- **Holds:** a single `themercn` package with a `themercn/next` subpath, built to `dist`, with `next` as an optional peer. nuqs and better-auth ship this exact shape.
- **Constraint for #7:** the Adapter needs at least a client subpath and a server subpath. A route handler cannot sit behind a `'use client'` entry.
- **Constraint for the core:** `ThemeScript`'s `next/script` import must leave the root barrel.
- **Constraint for the Vite smoke app and Host apps:** `themer.css` is Tailwind v4 source compiled against the Host's own `globals.css`. A Host app needs Tailwind v4 and must `@reference` its globals. This holds whatever build tool is chosen.
- **Open for the AI Generate item:** the `"use server"` mock does not survive bundling as a Server Action.
- **For #9:** use tsdown's `publint` / `attw` options as package checks.
- **For #10:** the tarball is `dist` (JS, `.d.ts`, `themer.css`) plus NOTICE and LICENSES.

## Sources

- [D-fmt] tsdown, Output Format: https://tsdown.dev/options/output-format (`docs/options/output-format.md`)
- [D-exp] tsdown, Package Exports: https://tsdown.dev/options/package-exports
- [D-css] tsdown, CSS: https://tsdown.dev/options/css
- [D-copy] tsdown, Copy: https://tsdown.dev/options/copy
- [D-deps] tsdown, Dependencies: https://tsdown.dev/options/dependencies
- [D-dts] tsdown, Declaration Files: https://tsdown.dev/options/dts
- [D-lint] tsdown, publint and attw: https://tsdown.dev/options/lint
- tsdown unbundle: https://tsdown.dev/options/unbundle. Directive issues: https://github.com/rolldown/tsdown/issues/157, https://github.com/rolldown/tsdown/issues/298, https://github.com/rolldown/tsdown/issues/362
- [R] Rolldown, Directives: https://rolldown.rs/in-depth/directives. Discussion: https://github.com/rolldown/rolldown/issues/7809
- [T] tsup README: https://github.com/egoist/tsup
- [V] Vite, Library Mode: https://vite.dev/guide/build#library-mode
- [U] unbuild README: https://github.com/unjs/unbuild
- [B] bunchee README: https://github.com/huozhi/bunchee (Server Components, CSS, External Dependencies)
- [N-pkg] Node.js, Packages (conditional exports, the `types` condition, subpath encapsulation): https://nodejs.org/api/packages.html
- [N-mod] Node.js, `require()` of ES modules history: https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require
- [NX-sc] Next.js, Server and Client Components, third-party / library section: https://nextjs.org/docs/app/getting-started/server-and-client-components
- [NX-pkg] Next.js, Package Bundling: https://nextjs.org/docs/app/guides/package-bundling
- [NX-tp] Next.js, `transpilePackages`: https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages
- [TW] Tailwind CSS v4, Detecting classes in source files: https://tailwindcss.com/docs/detecting-classes-in-source-files
- npm `peerDependenciesMeta`: https://docs.npmjs.com/cli/configuring-npm/package-json#peerdependenciesmeta
- Package metadata (versions, exports, peers, build scripts) from `npm view` on 2026-10-13: nuqs 2.10.2 (tarball inspected), better-auth 1.7.7, uploadthing 7.7.4, sonner 2.0.8.
