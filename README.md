# themerCN

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
