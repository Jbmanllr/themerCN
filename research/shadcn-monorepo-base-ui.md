# What shadcn's monorepo template generates with Base UI

Research for issue #2 (parent map #1). Checked on 2026-10-13 against `shadcn@4.21.4` (latest on npm, published 2026-10-07).

## Sources

- **[CLI]** `npx shadcn@4.21.4 --help`, `init --help`, `add --help`, `apply --help`, `preset --help`.
- **[DOCS]** Official monorepo docs: https://ui.shadcn.com/docs/monorepo (fetched as `/docs/monorepo.md`).
- **[SCAFFOLD-NEXT]** A real scaffold in a temp dir: `npx shadcn@4.21.4 init -t next -b base -p nova --monorepo -n mono-next -y`.
- **[SCAFFOLD-VITE]** A real scaffold in a temp dir: `pnpm dlx shadcn@4.21.4 init -t vite -b base -p nova --monorepo -n mono-vite -y`. Then `add --all`, `add button --diff`, `apply luma`, `turbo typecheck` and `vite build` were run on it.

Both scaffolds were deleted after inspection.

## Answer in short

- **Yes, there is a Base UI monorepo template.** `init` and `create` are the same command. It takes `--monorepo`, `-b base` (the component library: `base`, `radix` or `aria`) and `-t` (the template: `next`, `start`, `vite`, `react-router`, `laravel`, `astro`). [CLI] The docs prompt lists Next.js, Vite, TanStack Start, React Router and Astro for monorepos. [DOCS]
- **A Vite monorepo variant exists** (`-t vite --monorepo`). [CLI][SCAFFOLD-VITE]
- **Layout:** the workspaces are `apps/web` (package `web`) and `packages/ui` (package `@workspace/ui`), plus a root `turbo.json`. The Next variant also adds `packages/eslint-config` and `packages/typescript-config` (`@workspace/eslint-config`, `@workspace/typescript-config`). The Vite variant does not add them. [SCAFFOLD-NEXT][SCAFFOLD-VITE]
- **The package manager is whichever one ran the CLI.** It is not fixed to pnpm. `npx` produced npm workspaces (`"workspaces"`, `package-lock.json`, `packageManager: npm@11.17.0`, deps as `"*"`). `pnpm dlx` produced `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packageManager: pnpm@11.25.0` and `workspace:*` deps. [SCAFFOLD-NEXT][SCAFFOLD-VITE] **To get pnpm, run it with `pnpm dlx`.**
- **Preset is required when not interactive.** Without `-p`, the CLI blocks on a "Which preset would you like to use?" prompt, even with `-y`. The options are **Nova** (Lucide / Geist, the default), **Vega, Maia, Lyra, Mira, Luma, Sera, Rhea** and **Custom**. `-d` means `--template=next --preset=base-nova`. [CLI][SCAFFOLD-NEXT] The existing Themer was built against **Luma**. `shadcn apply luma -y`, run in `apps/web`, switched both `components.json` files to `base-luma` and reinstalled every component in `packages/ui`. Typecheck still passed afterwards. [SCAFFOLD-VITE] So `-p luma` at init, or `apply luma` later, both work.

## Exact commands

```bash
# Next + Base UI + pnpm monorepo, non-interactive (Luma preset to match the Themer)
pnpm dlx shadcn@latest init -t next -b base -p luma --monorepo -n themercn -y

# Vite variant
pnpm dlx shadcn@latest init -t vite -b base -p luma --monorepo -n <name> -y

# Full component set: run in the APP, not in packages/ui [DOCS]
cd apps/web && pnpm dlx shadcn@latest add --all -y

# Workaround needed after --all (see Gotchas): put use-mobile in packages/ui
cd packages/ui && pnpm dlx shadcn@latest add use-mobile -y
```

Pass every choice as a flag and use `</dev/null` in automation. The npx run printed "Project initialization completed." but the process did not exit, so it had to be killed. The pnpm run exited cleanly. [SCAFFOLD-NEXT][SCAFFOLD-VITE]

## What gets generated (Next, Base UI)

All of the following comes from [SCAFFOLD-NEXT].

**Root**

- Scripts `build`, `dev`, `lint`, `format` and `typecheck` all run through `turbo`.
- `turbo` `^2.11.7` (2.11.8 installed), `typescript ^5`, `prettier` and `prettier-plugin-tailwindcss`.
- `engines.node >=20.9.0`.
- Root files: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.eslintrc.js`, `.prettierrc` and `.npmrc`.

**`turbo.json`**

- `build` depends on `^build`, with outputs `.next/**`, excluding `!.next/cache/**` and `!.next/dev/**`.
- `lint`, `format` and `typecheck` depend on their `^` equivalents.
- `dev` has `cache: false` and `persistent: true`.
- The Vite variant uses `outputs: ["dist/**"]`.

**`apps/web`**

- Next **16.4.0**, React **19.3.0**, `next-themes`, `lucide-react` and `@tailwindcss/postcss ^4`.
- `next.config.ts` sets `transpilePackages: ["@workspace/ui"]`.
- `postcss.config.mjs` re-exports `@workspace/ui/postcss.config`.
- `layout.tsx` imports `@workspace/ui/globals.css`, sets up Geist and Geist Mono through `next/font`, and wraps the app in `ThemeProvider`. The scaffold page notes that pressing `d` toggles dark mode.
- `tsconfig` paths are `@/*` mapped to `./*`, and `@workspace/ui/*` mapped to `../../packages/ui/src/*`.

**`packages/ui`**

- Package name `@workspace/ui`, private and not built (it ships source).
- `exports`:
  - `./globals.css`
  - `./postcss.config`
  - `./lib/*` resolves to `src/lib/*.ts`
  - `./components/*` resolves to `src/components/*.tsx`
  - `./hooks/*` resolves to `src/hooks/*.ts`
- Dependencies: `@base-ui/react ^1.9.0`, `class-variance-authority`, `cn ^0.4.0`, `shadcn ^4.21.4`, `tw-animate-css` and `zod`. Dev dependencies: `tailwindcss ^4` (4.3.3 installed) and `@turbo/gen`.

**Tailwind v4 setup**

- There is no Tailwind config file. `components.json` has `tailwind.config: ""`. [DOCS]
- `packages/ui/src/styles/globals.css` does the following:
  - imports `tailwindcss`, `tw-animate-css` and `shadcn/tailwind.css`;
  - declares `@custom-variant dark (&:is(.dark *))`;
  - adds `@source` entries for `../../../apps/**/*.{ts,tsx}` and the package itself;
  - contains a `@theme inline` block of token mappings.

**`components.json` per workspace** (matches [DOCS])

- **`apps/web`**
  - `tailwind.css`: `../../packages/ui/src/styles/globals.css`
  - `components`: `@/components`
  - `hooks`: `@/hooks`
  - `lib`: `@/lib`
  - `utils`: `@workspace/ui/lib/utils`
  - `ui`: `@workspace/ui/components`
- **`packages/ui`**
  - `tailwind.css`: `src/styles/globals.css`
  - all aliases point to `@workspace/ui/...`
- Both workspaces use `style: "base-nova"` (`base-<preset>`), `baseColor: neutral`, `iconLibrary: lucide`, `rsc: true` (`false` on Vite), `menuColor` and `menuAccent`.
- The docs require `style`, `iconLibrary` and `baseColor` to be the same in both files. [DOCS]

**Import alias between app and ui:** `import { Button } from "@workspace/ui/components/button"` and `import { cn } from "@workspace/ui/lib/utils"`. [DOCS][SCAFFOLD-NEXT]

**Change from older templates:** `src/lib/utils.ts` is now `export { cn } from "cn"`, so it comes from the `cn` npm package. Generated components import `cn` straight from `"cn"`. [SCAFFOLD-NEXT]

## Vite variant differences

All of the following comes from [SCAFFOLD-VITE].

- Vite `^8`, `@vitejs/plugin-react ^6`, `@tailwindcss/vite ^4` (no PostCSS), TypeScript `~6.0.2`, and `engines.node >=20.19.0`.
- `vite.config.ts` aliases `@` to `./src`.
- The app sits under `apps/web/src`. `components.json` has `rsc: false`.
- `packages/ui` adds `@fontsource-variable/geist` and drops `next-themes` and the `./postcss.config` export.
- There are no shared eslint or typescript-config packages.
- `pnpm-workspace.yaml` includes `allowBuilds: { esbuild: true, msw: false }`.

## Full component set and updates

- `add --all` (`-a`), run in `apps/web`, installed **61 components** into `packages/ui/src/components`. They include `sidebar`, `chart`, `calendar`, `carousel`, `combobox`, `toast`, `drawer` and newer items such as `attachment`, `bubble`, `message`, `message-scroller`, `marker` and `questionnaire`. [SCAFFOLD-VITE] After that, `vite build` passed.
- **Gotcha:** `add --all` from `apps/web` wrote the `use-mobile` hook to `apps/web/src/hooks/`. But `packages/ui/src/components/sidebar.tsx` imports `@workspace/ui/hooks/use-mobile`, so `@workspace/ui#typecheck` fails with TS2307. Fix it by running `add use-mobile` inside `packages/ui`. Typecheck is then clean. [SCAFFOLD-VITE] Delete or ignore the copy left in the app.
- **How updates flow:** components are copied source in `packages/ui`, so there is no runtime dependency to bump. To pull upstream changes:
  1. Run `shadcn add <component> --diff` (or `--dry-run`, `--view`) in `apps/web` to preview. On an unchanged button it reported `../../packages/ui/src/components/button.tsx (skip) No changes.`
  2. Run `shadcn add <component> -o` (or `add --all -o`) to overwrite.

  The old `shadcn diff` command is deprecated in favour of `add --diff`. `init --reinstall` re-installs existing components. `apply <preset>` re-themes the project and reinstalls components. [CLI][SCAFFOLD-VITE]
- Running `npx` in a pnpm workspace fails ("configured to use npm") when `packageManager` names npm. Keep to the package manager that created the project. [SCAFFOLD-NEXT]

## Implications for the map

- The charted skeleton holds: the monorepo is pnpm + Turborepo + Base UI, the full set lives in `packages/ui`, and `apps/web` becomes the Playground. It is created with `pnpm dlx … -t next -b base -p luma --monorepo`.
- A Vite smoke app can either be a second `apps/*` workspace inside this repo or come from the `-t vite` template. The template only creates `apps/web`, so a second app has to be added by hand: its own `components.json` with the same aliases as `apps/web`, `@tailwindcss/vite`, and a `@source` entry already covered by `apps/**`.
- `packages/ui` is source-only, private and not built. A published `themercn` that bundles controls "built from `packages/ui`" therefore has to compile or bundle that source into its own `dist/`. It cannot depend on `@workspace/ui` at runtime.
