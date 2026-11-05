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

- **T0, local loop (never a gate):** while editing, `pnpm --filter <pkg> exec vitest run --changed <base> --passWithNoTests`, and `pnpm --filter <app> exec playwright test --only-changed=<base>` while editing specs. A green T0 is feedback, not verification.
- **T1, ticket handoff:** `pnpm exec prettier --check --ignore-unknown <changed files>`, then `TURBO_SCM_BASE=<base> scripts/heavy-slot.sh pnpm turbo run lint lint:repo typecheck test test:repo build check:package --affected`, then `TURBO_SCM_BASE=<base> WEB_E2E_PORT=<port> VITE_E2E_PORT=<port> scripts/heavy-slot.sh pnpm turbo run e2e:smoke --affected` (in each affected app, the Themer's `@smoke` tests plus `a11y`, two workers, stops at the first failure; nothing runs when no app is affected; `@playground` tests never run without `PLAYGROUND_E2E=1`, see the README). No Docker visual at T1. A docs-only change (Markdown, comments) skips the smoke step, and Turbo selects only the tasks that read the changed docs (`test:repo` reads `README.md` and `AGENTS.md`); mark its pull request ready at once, without waiting on CI.
- **Merge into an integration branch:** the merger merges and runs no check; the ticket passed T1 against the integration tip it merged.
- **T2, the pull request to `main`:** CI ([`ci.yml`](.github/workflows/ci.yml)) runs the gate once, when the pull request is ready: format, the affected Turbo checks, e2e and the visual baselines. A draft runs nothing, so open the integration branch's pull request as a draft and mark it ready after its last merge. Don't run the full suite locally first.
- **T3, the backstop:** CI runs everything, untargeted, on every push to `main` and weekly. When it fails, find the culprit with `git bisect run` over the first-parent merges.

Rules for every tier:

- Make a red check green by fixing the code. Never edit, skip or delete a test to get green, unless the user asked for the behavior it encodes to change; a test you believe is wrong is a finding to report.
- A check that passed on this tree counts as passed, whoever ran it. Rerun an unchanged failing check at most once, and only after a diagnosed environment fault (a timing failure on a loaded machine is one), in a free slot.
- Give each worktree its own `WEB_E2E_PORT` and `VITE_E2E_PORT` (defaults 3100 and 4173), and run Playwright with two workers at most.
- Run at most one heavy suite (a build, Playwright, the Docker visual run: `pnpm e2e:visual`, `pnpm e2e:update-snapshots`) per host at a time: run it through `scripts/heavy-slot.sh`, which waits for the clone's one slot, shared by all its worktrees.

A Stop hook (`.claude/hooks/stop-t1.sh`, wired in `.claude/settings.json` on `Stop` and `SubagentStop`) runs T1's format check and Turbo command (in the heavy slot) when you or a subagent end a turn with changes against your base, and blocks the turn while either fails. That run is T1's: don't run them by hand first. A tree that passed against the same base is not checked again. It reads the base from `TURBO_SCM_BASE`, else `main`, else `origin/main`; set `TURBO_SCM_BASE` to your integration branch, or it checks everything the integration branch changed. If you stop again with nothing changed, it lets the turn end but warns that T1 is still red: the work is not done. It never runs e2e or visual, so the smoke step of T1 stays yours.

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
