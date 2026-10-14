# themerCN

The home of [`themercn`](packages/themer), a live editor for a shadcn Theme's
design tokens, and of the Playground that exercises it. **To use the Themer in
your app, read the [package README](packages/themer/README.md).** The words
used here (Themer, Theme, Preset, Host app, Playground, …) are defined in
[GLOSSARY.md](GLOSSARY.md).

## Workspace

A pnpm + Turborepo monorepo.

| Path                                                       | Package                        | What it is                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`packages/themer`](packages/themer)                       | `themercn`                     | The published package. Internals: [ARCHITECTURE.md](packages/themer/ARCHITECTURE.md).                                                            |
| [`packages/ui`](packages/ui)                               | `@workspace/ui`                | The shadcn components (Base UI, style Luma) shared by the apps and bundled into `themercn`.                                                      |
| [`apps/web`](apps/web)                                     | `web`                          | The Playground: Nightjar Coffee Co., a Next app whose screens show every surface a Theme affects, with the Themer on everywhere. Runs the README's Next quick start. |
| [`apps/vite`](apps/vite)                                   | `vite-app`                     | A React-only smoke app. Runs the README's Vite quick start and checks that nothing of the Themer ships when it is off.                           |
| [`packages/eslint-config`](packages/eslint-config), [`packages/typescript-config`](packages/typescript-config) | `@workspace/*-config` | Shared lint and TypeScript settings.                                                                                                             |

Only `themercn` is published; everything else is private.

## Develop

Requires Node 22.13 or later (pnpm 11) and the pnpm version pinned in
`package.json` (`corepack enable` picks it up).

```sh
pnpm install
pnpm dev                          # every app: web on :3000, vite on :5173 (Themer on)
pnpm --filter web dev             # the Playground only
```

The Playground's font picker uses Google's public catalog; set
`GOOGLE_FONTS_API_KEY` (server-only) to use the Fonts Developer API instead.

| Command                    | Runs                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                | ESLint in every workspace.                                                                               |
| `pnpm typecheck`           | `tsc` (and `next typegen` for the Playground).                                                           |
| `pnpm test`                | Vitest: the package's unit and DOM tests (TSDoc and README-recipe checks included), the apps' tests.    |
| `pnpm build`               | The package (`tsdown`, after its CSS build), the Playground and the Vite app.                            |
| `pnpm check:package`       | After the build: publint, attw, the tarball and entry checks, and the Vite app's off-build check.        |
| `pnpm e2e`                 | Playwright (Chromium) for both apps, after a build. First run: `pnpm --filter vite-app exec playwright install chromium`. |

CI ([`ci.yml`](.github/workflows/ci.yml)) runs
`pnpm turbo lint typecheck test build`, then `pnpm turbo check:package`, and
the e2e job. Run the same before opening a PR.

Things to know:

- The package's CSS is generated (`packages/themer/src/generated/`, not
  committed). Turbo builds it before `typecheck`, `test` and `build`; to run
  `vitest` directly, run `pnpm --filter themercn build:css` once.
- The Playground's brand Preset lives in `apps/web/lib/brand/nightjar.ts`;
  `apps/web/app/nightjar.css` is a snapshot of it. After editing the Preset,
  run `pnpm --filter web test -u`.
- The package README's quick-start code blocks are excerpts of the apps
  (`<!-- recipe: <path> -->` markers); `pnpm test` fails when they drift.
  Change both together.

## Releasing

[Changesets](https://changesets.dev) versions and publishes `themercn`
(`packages/themer`), the only published package; every other workspace is
private and ignored.

1. A PR that changes `themercn` for users adds a changeset:
   `pnpm changeset`. Changesets are optional: CI doesn't require one. While
   themercn is on `0.x`, a breaking change is a `minor` bump.
2. On every push to `main`, [`release.yml`](.github/workflows/release.yml)
   opens or updates the **Version Packages** PR, which bumps the version and
   writes `packages/themer/CHANGELOG.md` (with
   `@changesets/changelog-github`).
3. Merging that PR publishes the new version to npm `latest` through npm
   trusted publishing (OIDC, with provenance; no `NPM_TOKEN`), pushes the
   `themercn@<version>` tag and creates the GitHub Release. The package is
   packed with `pnpm pack` and published with npm (Node 24, npm ≥ 11.5.1);
   only the publish job holds `id-token: write`.

The first release is `0.1.0` (`.changeset/first-release.md`).

### Owner-only bootstrap

These need the npm and GitHub owner accounts, once:

1. **Publish a `0.0.0` placeholder** (trusted publishing can only be linked to
   a package that exists). Logged in to npm with 2FA:
   ```sh
   pnpm install --frozen-lockfile
   pnpm turbo build --filter themercn
   cd packages/themer
   pnpm pack
   npm publish themercn-0.0.0.tgz --access public
   rm themercn-0.0.0.tgz
   ```
2. **Link the trusted publisher** on npmjs.com (package settings → Trusted
   publishing → GitHub Actions): owner `Jbmanllr`, repository `themerCN`,
   workflow `release.yml`, no environment. With npm ≥ 11.15.0 the CLI does the
   same: `npm trust github themercn --repo Jbmanllr/themerCN --file release.yml --allow-publish`.
3. **Run the first CI publish within 2 days** of linking it (npm expires an
   unused trusted publisher): merge the Version Packages PR for `0.1.0`.
   Under repository Settings → Actions → General, enable "Allow GitHub
   Actions to create and approve pull requests" so `release.yml` can open it.
4. **Enable branch protection on `main`** requiring both CI jobs' status
   checks.

## Licence

themerCN is licensed under the [Apache License 2.0](LICENSE). See
[`packages/themer/NOTICE`](packages/themer/NOTICE) for the tweakcn and shadcn/ui
attributions.
