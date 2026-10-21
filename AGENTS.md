# themerCN

## Release status

`pre-release`

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Jbmanllr/themerCN`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Verification tiers

Verify at the tier the moment calls for, scoped to what you changed. `<base>` is your integration branch (the branch your worktree was cut from), or `main` when you work on `main` directly.

- **T0, local loop (never a gate):** while editing, `pnpm --filter <pkg> exec vitest run --changed origin/main --passWithNoTests`, and `pnpm --filter <app> exec playwright test --only-changed=origin/main` while editing specs. A green T0 is feedback, not verification.
- **T1, ticket handoff:** `TURBO_SCM_BASE=<base> pnpm turbo run lint lint:repo typecheck test test:repo build check:package --affected`. Then `pnpm exec turbo query affected --tasks e2e --base <base> --exit-code`; when it exits nonzero (1 affected, 2 error), also run `TURBO_SCM_BASE=<base> WEB_E2E_PORT=<port> VITE_E2E_PORT=<port> pnpm turbo run e2e:smoke --affected` (the Themer's `@smoke` tests plus `a11y`, two workers, stops at the first failure; `@playground` tests never run without `PLAYGROUND_E2E=1`, see the README). No Docker visual at T1.
- **T2, per merge into an integration branch:** T1 on the merged result. Escalate to `pnpm e2e` when global inputs changed (root `turbo.json`, `package.json`, the lockfile) or the merge's affected set overlaps a recent merge's.
- **T3, batch, before the integration→`main` PR:** the full suite once: `pnpm turbo run lint lint:repo typecheck test test:repo build check:package`, `pnpm format:check`, `pnpm e2e`, `pnpm e2e:visual`. On a failure, rerun it once; if it fails again, find the culprit with `git bisect run` over the first-parent merges.

Rules for every tier:

- Make a red check green by fixing the code. Never edit, skip or delete a test to get green; a test that is wrong is a finding to report.
- Give each worktree its own `WEB_E2E_PORT` and `VITE_E2E_PORT` (defaults 3100 and 4173), and run Playwright with two workers at most.
- Run at most one Docker visual run (`pnpm e2e:visual`, `pnpm e2e:update-snapshots`) per host at a time.

A Stop hook (`.claude/hooks/stop-t1.sh`, wired in `.claude/settings.json` on `Stop` and `SubagentStop`) runs T1's Turbo command when you or a subagent end a turn with changes against your base, and blocks the turn while it fails. It reads the base from `TURBO_SCM_BASE`, else `main`, else `origin/main`; set `TURBO_SCM_BASE` to your integration branch. If you stop again with nothing changed, it lets the turn end but warns that T1 is still red: the work is not done. It never runs e2e or visual, so the smoke step of T1 stays yours.

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
