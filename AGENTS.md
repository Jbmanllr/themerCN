# themerCN

The home of [`themercn`](packages/themer), a live editor for a shadcn Theme's design tokens, and of the Playground that exercises it. Terms are defined in [`GLOSSARY.md`](GLOSSARY.md).

## Release status

`pre-release`

## Shipping

The owner authorizes finished work to ship without asking. Commit, push and open the pull request as ready (not draft). Set it to auto-merge into `main` with a merge commit once `ci-gate` is green. After the merge, check its commits are in `origin/main`, remove the worktree, delete its local and remote branch and fast-forward local `main`. When a change deletes tests, regenerates visual baselines or changes behaviour inside a refactor, run the `code-review` skill on its range (with the disprove pass) and ship the fixes the same way.

The owner keeps: the Changesets "Version Packages" pull request, loosening a Quality register row, force-pushes, and `packages/ui` (vendored shadcn components: leave every file there as it is, and fix from the consuming side).

## Architecture

Before changing code under `packages/themer/src`, read the part of [`packages/themer/ARCHITECTURE.md`](packages/themer/ARCHITECTURE.md) that covers the module you touch: it maps the modules and states their contracts.

## Testing standard

Read [`TESTING.md`](TESTING.md) before you verify or hand off a change: its "Verification tiers" say which checks run at each moment (T0 to T3), and describe the Stop hook that runs T1.

Before writing code on a shared path, read the paths ADR, [`docs/adr/0002-shared-paths-and-cost-contracts.md`](docs/adr/0002-shared-paths-and-cost-contracts.md), which lists the paths and their caps, and the Quality register in `TESTING.md`, which holds the limits; the project has no `CONSTRAINTS.md`. Change a limit only by the register's rules: tighten it in the same pull request, loosen it with the owner.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Jbmanllr/themerCN`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## TypeScript

- Before reading or editing `.ts` or `.tsx` files, read and follow [typescript-best-practices](/Users/jb/.agents/skills/typescript-best-practices/SKILL.md).

## React

- When writing, reviewing, or refactoring React web code, read and follow [vercel-react-best-practices](/Users/jb/.agents/skills/vercel-react-best-practices/SKILL.md).
- When creating components or changing effects, read and follow [writing-react-effects](/Users/jb/.agents/skills/writing-react-effects/SKILL.md).
- When designing component interfaces, compound components, or context providers, read and follow [vercel-composition-patterns](/Users/jb/.agents/skills/vercel-composition-patterns/SKILL.md).

## Next.js

- When writing or reviewing Next.js code, including routing, server/client boundaries, data fetching, metadata, and asset handling, read and follow [next-best-practices](/Users/jb/.agents/skills/next-best-practices/SKILL.md).

## shadcn/ui

- Before adding, updating, customizing, wrapping, or reviewing shadcn/ui components, forms, or registries, read and follow both [shadcn](/Users/jb/.agents/skills/shadcn/SKILL.md) and [shadcn-guardrails](/Users/jb/.agents/skills/shadcn-guardrails/SKILL.md).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
