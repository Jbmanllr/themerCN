# Shipping Tailwind v4 styles from a React library without clashing with the Host app

Research for [#3](https://github.com/Jbmanllr/themerCN/issues/3) (map [#1](https://github.com/Jbmanllr/themerCN/issues/1)). Checked 2026-10-13 against Tailwind CSS 4.3.3.

## Question

The Themer will bundle its own shadcn-based controls, styled with Tailwind v4, into the `themercn` npm package. Any React Host app can mount it, including apps that have their own Tailwind and shadcn Theme. How should the package ship its CSS?

## Starting point: how the Themer is styled today

The copied source (`packages/themer`, still named `@villa/themer` / `@banter/*`) relies on the **Host app scanning the package**:

- `src/host/themer.css` compiles the editor's utilities with `@tailwind utilities source(none)` inside `@layer themer`, and uses `@source` to scan the Themer and `@banter/ui`.
- Each Host app writes its own `themer.css`: an `@reference` to the Host app's `globals.css` (for the Host app's `@theme` and custom variants), then an `@import` of the shared sheet. The Host app's `globals.css` must declare `@layer theme, base, components, themer, utilities;`. The README notes why: in the same layer, the later editor sheet repeated classes such as `hidden` and `order-last` and overrode the Host app's `dark:` and `md:` variants.
- The Theme is written as inline custom properties (`--primary`, `--radius`, `--font-sans`, …) on `<html>` and on the Live iframe's document (`src/utils/apply-theme.ts`).
- The editor chrome and the built-in preview pages render stock shadcn components, which **follow every token of the edited Theme** (README, "Other invariants"). The overlay is portaled to `document.body` (`themer-root.tsx`). Base UI popups are portaled to `body > [data-base-ui-portal]`, and `themer.css` lifts them above the overlay with an unlayered z-index rule.
- Preflight comes from the Host app.

This works only for a Host app that uses Tailwind v4, uses shadcn token names, and agrees to the layer contract. That is what map #1 rules out ("Self-contained Themer … needs nothing from the Host app").

## Primary-source facts

**Tailwind v4**

1. **Source detection skips `node_modules`.** Tailwind scans the project but ignores `.gitignore`d files and `node_modules`. To pick up a UI library, the official advice is `@source "../node_modules/@acmecorp/ui-lib"`. `source(none)` turns off automatic detection. ([Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files))
2. **`prefix()` prefixes both classes and theme variables.** `@import "tailwindcss" prefix(tw);` gives classes such as `tw:text-red-500` and variables such as `--tw-color-red-500` ([Styling with utility classes → Using the prefix option](https://tailwindcss.com/docs/styling-with-utility-classes)). The prefix "looks like a variant" and always comes first, for example `tw:hover:bg-red-600`. Theme variables are still written without the prefix in `@theme` ([Upgrade guide → Using a prefix](https://tailwindcss.com/docs/upgrade-guide)).
3. **`important` is a boolean flag only.** `@import "tailwindcss" important;` marks every utility `!important`. The docs describe no selector form like v3's `important: '#app'` ([Styling with utility classes → Using the important flag](https://tailwindcss.com/docs/styling-with-utility-classes)).
4. **Preflight is a separate import in `layer(base)`.** You can leave it out by importing `tailwindcss/theme.css` and `tailwindcss/utilities.css` on their own ([Preflight → Disabling Preflight](https://tailwindcss.com/docs/preflight)). Tailwind has **no built-in way to scope Preflight to a subtree**.
5. **`@theme inline`** makes a utility use the variable's *value*. `--color-primary: var(--primary)` compiles to `background-color: var(--primary)`, so the variable resolves where the element is, not on `:root` ([Theme variables → Referencing other variables](https://tailwindcss.com/docs/theme)).
6. **Separately compiled stylesheets don't share `@theme`.** CSS modules and `<style>` blocks need `@reference` ([Compatibility](https://tailwindcss.com/docs/compatibility), [Upgrade guide](https://tailwindcss.com/docs/upgrade-guide)). The Themer uses `@reference` today, to borrow the Host app's theme.
7. **`@property` doesn't work inside shadow roots.** Tailwind v4 registers its internal `--tw-*` variables with `@property`, which shadow roots do not support. [tailwindlabs/tailwindcss#15005](https://github.com/tailwindlabs/tailwindcss/issues/15005) is **still open**. The workaround is to register the `@property` rules on the document. `:root`-only theme variables used to break in shadow DOM as well ([#15799](https://github.com/tailwindlabs/tailwindcss/issues/15799)). 4.3.3 now emits `:root, :host` (checked in the experiment below).

**Experiment (Tailwind 4.3.3 CLI, scratch only).** I compiled `theme.css` + `utilities.css` with `prefix(tm)`, nested layers (`themer.theme`, `themer.utilities`), `source(none)` + `@source`, and `@theme inline { --color-primary: var(--primary) }`. Results:

- Classes come out as `.tm\:bg-primary`, and the theme scale as `--tm-spacing` on `:root, :host`.
- `@theme inline` colours compile to `var(--primary)`. The prefixed library reads the shadcn variables the Themer writes on `<html>`, so its chrome keeps following the edited Theme.
- **The internal `--tw-*` variables are not prefixed** (`--tw-shadow`, `--tw-ring-*`, `--tw-border-style`). Their `@property` rules and the top-level `@layer properties` are therefore shared with the Host app's Tailwind. The definitions are the same between v4 builds, so this is harmless in practice, but `prefix()` does not fully isolate.
- Nested layer names work. The order of layers is fixed by the **first** stylesheet that declares them ([MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)). A library layer declared before the Host app's `@layer theme, base, components, utilities` ranks *below* the Host app's `base`. In that case the Host app's Preflight (`*{margin:0;padding:0;border:0 solid}`) beats the library's `p-4`. Unlayered rules beat every layered rule.

**Other primary sources**

- shadcn's official `next-monorepo` template has the app's stylesheet scan the shared package: `@source "../**/*.{ts,tsx}"`, `@source "../../../apps/**/*.{ts,tsx}"` ([templates/next-monorepo/packages/ui/src/styles/globals.css](https://github.com/shadcn-ui/ui/blob/main/templates/next-monorepo/packages/ui/src/styles/globals.css)).
- Base UI `Portal` takes `container: HTMLElement | ShadowRoot | Ref` and defaults to `<body>` ([Base UI Popover → Portal](https://base-ui.com/react/components/popover)).
- `@scope` reached Baseline in March 2026 (newly available) ([MDN: @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)).

## Options

### A. The Host app scans the package's source (today's approach)

The Host app adds `@source "../node_modules/themercn/dist"` and maps the shadcn tokens in its own `@theme inline`. The Themer ships no CSS of its own, apart from a few unlayered rules.

- **Pros:** no duplicate CSS; one Tailwind build; the chrome inherits the Host app's Theme with no extra work. Officially documented ([fact 1](#primary-source-facts)), and the pattern of shadcn's monorepo template and Turborepo's "consume from source" option.
- **Cons:** the Host app must run Tailwind v4 with shadcn token names. The Themer's classes compile against the Host app's theme, so a custom `--spacing`, radius scale, breakpoints, `prefix()` or `important` breaks or restyles the editor. Same-named classes need the layer-order contract (the `hidden`/`md:` bug in `themer.css`). The editor CSS ends up in the Host app's production stylesheet unless the Host app gates it (the README records about 34 KB shipped to every visitor before the gate). A plain Vite app without Tailwind cannot mount it.
- **Fit:** contradicts the "self-contained, nothing from the Host app" decision. Rejected for the npm package, though the Playground can still use it internally.
- **Examples:** shadcn monorepo template; [Turborepo `with-tailwind` README](https://github.com/vercel/turborepo/tree/main/examples/with-tailwind) ("Another option is to consume `packages/ui` directly from source…"); HeroUI, Flowbite and Tremor v3 (plugin plus a content path into `node_modules`).

### B. Precompiled CSS with `prefix()`

The package builds `dist/themer.css` with `@import "tailwindcss/theme.css" prefix(tm)` and `utilities.css`. Every class is written as `tm:…`.

- **Pros:** the official Tailwind mechanism ([fact 2](#primary-source-facts)). Class names and theme scale variables cannot collide with the Host app's, and portaled popups work anywhere because their classes are unique. Works whether the Host app uses Tailwind v3, v4 or none.
- **Cons:** every class string in the controls must carry `tm:`. That includes all of `packages/ui`'s shadcn components, `cva` variants and `tailwind-merge`, which needs the prefix configured. **The controls cannot reuse `packages/ui` source unchanged.** It takes a fork or a build-time class rewrite (fragile across `cn()`/`cva`). Some CSS is duplicated next to the Host app's Tailwind. Internal `--tw-*` `@property` rules are shared (see the experiment). Preflight still needs scoping (see E).
- **Examples:** [Turborepo `with-tailwind`](https://github.com/vercel/turborepo/blob/main/examples/with-tailwind/packages/ui/src/styles.css) (`@import "tailwindcss" prefix(ui);` built to `dist/index.css`, chosen to "ensure Tailwind classes do not overwrite each other"); [CopilotKit v2](https://github.com/CopilotKit/CopilotKit/blob/main/packages/react-core/src/v2/styles/globals.css) (`prefix(cpk)`, shadcn tokens under `[data-copilotkit]`, `@theme inline`); [Web3Auth modal](https://github.com/Web3Auth/web3auth-web/blob/master/packages/modal/src/ui/css/index.css) (`prefix(wta)`, dark variant keyed on its own `.w3a--dark` class).

### C. Precompiled CSS, unprefixed, scoped under a root attribute

The package compiles normal classes, then rewrites every selector (in a PostCSS step) to sit under `[data-themer]`. `:root, :host` theme variables are moved onto `[data-themer]` too. The result is shipped unlayered, or in a layer the Host app orders.

- **Pros:** `packages/ui` source is reused verbatim. Rules never reach outside the Themer subtree. `[data-themer] .p-4` (0,2,0), unlayered, beats the Host app's same-named layered utilities and its plain element rules.
- **Cons:** Tailwind v4 has no first-party selector scoping ([fact 3](#primary-source-facts)), so this needs a custom post-process; `@scope` is an option only from Baseline 2026. **Portals escape the scope.** Base UI popups render under `body`, outside `[data-themer]`, so they lose their styles unless every Portal targets a container inside the Themer root (the `container` prop exists, but shadcn components don't expose it, so `packages/ui` would need a context or a prop). The Host app's same-named classes still apply to Themer elements as well, so any Host app rule with higher specificity or `!important` leaks in.
- **Examples:** no library found that does this for all utilities. CopilotKit does it for Preflight only (see E). Tailwind v3's `important: '#app'` was the old first-party form.

### D. Shadow DOM

The Themer mounts into a shadow root and injects its compiled CSS there, either as a `<style>` element or as adopted stylesheets.

- **Pros:** the strongest isolation. Host app selectors, Preflight and utilities don't cross the boundary. Custom properties *do* inherit through it, so the Theme's `--primary` and the rest, written on `<html>`, still reach the chrome.
- **Cons:**
  - Tailwind's `@property` rules must be duplicated on the document (#15005 is still open).
  - `rem` units follow the Host app's `html` font size (react-scan converts rem to px at build time).
  - `dark:` written as `&:is(.dark *)` cannot see `html.dark` across the boundary, so the mode must be mirrored inside the shadow root.
  - Every Base UI Portal must target the shadow root.
  - Any dependency that injects CSS into `document.head` misses the shadow root.
  - `@font-face` must stay in the document.
  - The inspector and Live preview work across documents anyway, but the built-in preview pages, which use `.dark` wrappers to show light and dark side by side, need checking.
- **Examples:** [react-scan](https://github.com/aidenybai/react-scan) (Tailwind 4 compiled to `styles.css`, injected into `attachShadow({mode:"open"})`, with a `postcss.rem2px.mjs` plugin); [TanStack Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools) (`shadowDOMTarget` option).

### E. Cascade layers and Preflight (needed with B, C or D)

- **Layers.** Ship the library's utilities **unlayered**, or in one named layer and document an order for the Host app. Mantine ships `styles.layer.css` wrapped in `@layer mantine` "because some bundlers and frameworks do not allow you to control the order of stylesheets" ([Mantine styles](https://mantine.dev/styles/mantine-styles/)). A layered library sheet whose layer is declared before the Host app's Tailwind layers loses to the Host app's Preflight (see the experiment).
- **Preflight.** Never ship global Preflight. CopilotKit runs a PostCSS script after the Tailwind build: [`scope-preflight.mjs`](https://github.com/CopilotKit/CopilotKit/blob/main/packages/react-core/scripts/scope-preflight.mjs) rewrites every `@layer base` rule under `[data-copilotkit]` (`*` → `[data-copilotkit], [data-copilotkit] *`; `html`/`:host` → the scope; `body` removed). Portaled content needs the scope attribute too.
- **CSS variables.** Keep the shadcn semantic variables (`--primary`, …) **shared on purpose**. Map them with `@theme inline` so the chrome and the preview pages follow the edited Theme the Themer writes on `<html>`. Rename or scope the Themer's private scale variables (B does this with `--tm-*`; C has to move them onto `[data-themer]`) so they never overwrite the Host app's `--spacing`, `--radius-*` or `--font-*`. If the chrome must stay neutral rather than follow the Theme, take the CopilotKit approach of redefining the tokens on the root attribute. That is a product decision.

## Comparison

| | A. Host app scans | B. Prefix | C. Root scope | D. Shadow DOM |
|---|---|---|---|---|
| Self-contained (no Tailwind setup in the Host app) | No | Yes | Yes | Yes |
| Host app CSS leaking in | High | Low (Preflight and element rules only) | Medium (same class names) | None (only inherited properties) |
| Themer CSS leaking out | Layer contract | None (if Preflight is scoped) | None | None |
| Reuses `packages/ui` source unchanged | Yes | **No** (class rewrite) | Yes | Yes |
| Portaled popups | Fine | Fine | Need a container | Need a container |
| Follows the edited Theme | Yes | Yes (`@theme inline`) | Yes | Yes (variables inherit) |
| Official Tailwind support | Yes | Yes | No (post-process) | Partial (#15005 open) |

## Recommendation for the map

Ship **precompiled CSS in the package**, with these rules:

- **Preflight** scoped to the Themer root.
- **Utilities unlayered.**
- **Shadcn semantic variables** shared through `@theme inline`.
- **Private scale variables** isolated.

Isolate with **B (prefix)** or **C (root scope)**. Decide with a small prototype, because each one forces a change elsewhere:

- **B** is the officially supported route and handles portals, but means a prefixed copy or a build-time rewrite of the `packages/ui` controls.
- **C** keeps `packages/ui` untouched, but needs every Base UI Portal in the Themer routed to a container inside the Themer root, plus a custom PostCSS scoper.

Keep **D (shadow DOM)** as a fallback for Host apps with hostile global CSS. Its known gaps are listed above.

## Open points (not verified here)

- Whether shadcn's Base UI components can take a portal container from context without editing each component.
- How each third-party dependency of the Themer (Sonner, react-day-picker, Recharts, …) ships or injects CSS.
- Measured CSS size of a precompiled Themer sheet.
