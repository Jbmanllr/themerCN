# Testing

How to verify a change in themerCN, and the quality bar it has to meet.

## Verification tiers

Verify at the tier the moment calls for, scoped to what you changed. `<base>` is your integration branch (the branch your worktree was cut from), or `main` when you work on `main` directly.

- **T0, local loop (never a gate):** while editing, `pnpm --filter <pkg> exec vitest run --changed <base> --passWithNoTests`, and `pnpm --filter <app> exec playwright test --only-changed=<base>` while editing specs. A green T0 is feedback, not verification.
- **T1, ticket handoff:** `pnpm exec prettier --check --ignore-unknown <changed files>`, then `TURBO_SCM_BASE=<base> scripts/heavy-slot.sh pnpm turbo run lint lint:repo typecheck test test:repo build check:package --affected`, then `TURBO_SCM_BASE=<base> WEB_E2E_PORT=<port> VITE_E2E_PORT=<port> scripts/heavy-slot.sh pnpm turbo run e2e:smoke --affected` (in each affected app, the Themer's `@smoke` tests plus `a11y`, two workers, stops at the first failure; nothing runs when no app is affected; `@playground` tests never run without `PLAYGROUND_E2E=1`, see the README). No Docker visual at T1. A docs-only change (Markdown, comments) skips the smoke step, and Turbo selects only the tasks that read the changed docs (`test:repo` reads `README.md` and `TESTING.md`); mark its pull request ready at once, without waiting on CI.
- **Merge into an integration branch:** the merger merges and runs no check; the ticket passed T1 against the integration tip it merged.
- **T2, the pull request to `main`:** CI ([`ci.yml`](.github/workflows/ci.yml)) runs the gate once, when the pull request is ready: format, the affected Turbo checks, the project coverage ratchet (`pnpm coverage`), e2e and the visual baselines. A draft runs nothing, so open the integration branch's pull request as a draft and mark it ready after its last merge. Don't run the full suite locally first.
- **T3, the backstop:** CI runs everything, untargeted, on every push to `main` and weekly. When it fails, find the culprit with `git bisect run` over the first-parent merges.

Rules for every tier:

- Make a red check green by fixing the code. Never edit, skip or delete a test to get green, unless the user asked for the behavior it encodes to change; a test you believe is wrong is a finding to report.
- A check that passed on this tree counts as passed, whoever ran it. Rerun an unchanged failing check at most once, and only after a diagnosed environment fault (a timing failure on a loaded machine is one), in a free slot.
- Give each worktree its own `WEB_E2E_PORT` and `VITE_E2E_PORT` (defaults 3100 and 4173), and run Playwright with two workers at most.
- Run at most one heavy suite (a build, Playwright, the Docker visual run: `pnpm e2e:visual`, `pnpm e2e:update-snapshots`) per host at a time: run it through `scripts/heavy-slot.sh`, which waits for the clone's one slot, shared by all its worktrees.

A Stop hook (`.claude/hooks/stop-t1.sh`, wired in `.claude/settings.json` on `Stop` and `SubagentStop`) runs T1's format check and Turbo command (in the heavy slot) when you or a subagent end a turn with changes against your base, and blocks the turn while either fails. That run is T1's: don't run them by hand first. A tree that passed against the same base is not checked again. It reads the base from `TURBO_SCM_BASE`, else `main`, else `origin/main`; set `TURBO_SCM_BASE` to your integration branch, or it checks everything the integration branch changed. If you stop again with nothing changed, it lets the turn end but warns that T1 is still red: the work is not done. It never runs e2e or visual, so the smoke step of T1 stays yours.

## Quality register

The project's quality bar: the Floor, the enforced limits, the measured figures and the exceptions. The caps per unit of each shared path live in the paths ADR, [`docs/adr/0002-shared-paths-and-cost-contracts.md`](docs/adr/0002-shared-paths-and-cost-contracts.md). This register holds the figures and limits, and none of them may exceed their cap. Read both before writing code on a shared path. The project has no `CONSTRAINTS.md`. The gate reads both through the register reader, [`tests/register.ts`](tests/register.ts), and the register check, [`tests/register-check.test.ts`](tests/register-check.test.ts), compares them.

### Floor

The Floor is always enforced on the diff, and a breach is a hard violation in `code-review`. The floor guard, [`tests/floor-guard.ts`](tests/floor-guard.ts), checks it: CI's checks job runs it on every pull request, uncached, against the pull request's base, and `pnpm floor-guard [--base <ref>]` runs it locally (default base `origin/main`). It exits 0 when clean, 1 on a violation and 2 when it cannot run.

- No new suppression comment, except a prescribed form listed below. A listed form never expires.
- No unimplemented stub, or empty catch, standing in for the work.
- No skipped or deleted test without a `Quality-change` trailer. A test replaced at a deepened module's interface names its replacement.
- No secret in source.
- No register row weakened outside the rules below.
- No edit to the gate's own files without a `Quality-change` trailer. They are the count tests (`<name>.count.test.ts(x)` next to the path's owner module, `<name>.count.spec.ts` in Playwright), the counting helper (`counting.ts`), the register reader and the register check (`tests/register*.ts`), the floor guard (`tests/floor-guard*.ts`) and the coverage command (`coverage-ratchet.ts`), with their tests. The floor guard recognises them by these names.

**Prescribed forms:**

- In the vendored shadcn example pages under `packages/themer/src/components/preview/examples/`, a single-rule `eslint-disable-next-line <rule> -- <reason>` that keeps the code as the shadcn example wrote it.
- At the top of a visual-baseline spec, `test.skip(<platform condition>, <reason>)`, which skips on platforms whose renders the baselines don't cover.

**Recorded changes.** A change the Floor would flag but the rules allow carries a `Quality-change: <file or row>: <reason>` commit trailer. Examples: a test removed with its replacement named, a row raised within its contract, an edit to the gate's own files. The floor guard accepts a flagged change that a trailer, on a commit since the merge base, names: a file by its repo path, a register row as `<path>: <row>` (`Store action: stringifies`), an exception as `Exceptions: <ID>`, and a paths ADR cap as `<ADR file>: <path>: <row>`. `code-review` checks each trailer against the spec and the paths ADR.

### Enforced

Limits that fail the merge gate.

**Project**

| Dimension   | Rule | Checked by                 | Runs at          |
| ----------- | ---- | -------------------------- | ---------------- |
| Type errors | 0    | `pnpm turbo run typecheck` | implementer done |

### Measured, not yet enforced

The ratchet. Each count is per unit of its path, as the paths ADR defines the unit, and per outcome where the contract splits it. A figure is `unmeasured`, one count for every outcome (`3`), a count per outcome in the outcome names of the paths ADR's Register rows column (`1 persisted change; 0 no change`), or a percentage (`87.4 %`). A row's figure may never exceed the cap in its path's cost contract. A row moves to Enforced, with that figure as its rule, once the gate gives it a command.

**Store action** (per `set`)

| Metric                 | Today      | Direction     | Runs at          |
| ---------------------- | ---------- | ------------- | ---------------- |
| stringifies            | unmeasured | must not grow | implementer done |
| storage writes         | unmeasured | must not grow | implementer done |
| storage reads          | unmeasured | must not grow | implementer done |
| store deep compares    | unmeasured | must not grow | implementer done |
| selector deep compares | unmeasured | must not grow | implementer done |
| selector colour parses | unmeasured | must not grow | implementer done |
| computed-style reads   | unmeasured | must not grow | implementer done |

**Theme apply** (per apply and document)

| Metric                  | Today      | Direction     | Runs at          |
| ----------------------- | ---------- | ------------- | ---------------- |
| property writes         | unmeasured | must not grow | implementer done |
| shadow colour parses    | unmeasured | must not grow | implementer done |
| CSSOM walks             | unmeasured | must not grow | implementer done |
| override sheet writes   | unmeasured | must not grow | implementer done |
| restore-sheet lookups   | unmeasured | must not grow | implementer done |
| class toggles           | unmeasured | must not grow | implementer done |
| Live frame font updates | unmeasured | must not grow | implementer done |
| font link appends       | unmeasured | must not grow | implementer done |
| font label layout reads | unmeasured | must not grow | implementer done |
| font label stringifies  | unmeasured | must not grow | implementer done |
| font label parses       | unmeasured | must not grow | implementer done |

**Page load** (per load; hydration rows also per `storageNamespace` switch)

| Metric                    | Today      | Direction     | Runs at          |
| ------------------------- | ---------- | ------------- | ---------------- |
| head-script builds        | unmeasured | must not grow | merge gate       |
| head-script storage reads | unmeasured | must not grow | implementer done |
| head-script parses        | unmeasured | must not grow | implementer done |
| hydration storage reads   | unmeasured | must not grow | implementer done |
| hydration parses          | unmeasured | must not grow | implementer done |
| storage writes            | unmeasured | must not grow | implementer done |
| colour-mode writes        | unmeasured | must not grow | implementer done |
| restore-sheet writes      | unmeasured | must not grow | implementer done |
| restore-sheet removals    | unmeasured | must not grow | implementer done |
| stylesheet inserts        | unmeasured | must not grow | implementer done |
| font links                | unmeasured | must not grow | implementer done |
| Preset deep compares      | unmeasured | must not grow | implementer done |
| store sets                | unmeasured | must not grow | implementer done |
| first applies             | unmeasured | must not grow | implementer done |
| frame chunk imports       | unmeasured | must not grow | merge gate       |
| root-class observers      | unmeasured | must not grow | implementer done |

**Inspector pointer move** (per `mousemove`, and per measure where named)

| Metric                   | Today      | Direction     | Runs at          |
| ------------------------ | ---------- | ------------- | ---------------- |
| regex compiles           | unmeasured | must not grow | implementer done |
| store sets               | unmeasured | must not grow | implementer done |
| ancestor walks           | unmeasured | must not grow | implementer done |
| class tests per class    | unmeasured | must not grow | implementer done |
| `closest(ignore)` calls  | unmeasured | must not grow | implementer done |
| other DOM queries        | unmeasured | must not grow | implementer done |
| measures                 | unmeasured | must not grow | implementer done |
| layout reads per measure | unmeasured | must not grow | implementer done |
| overlay renders          | unmeasured | must not grow | implementer done |

**Font catalog request** (per request)

| Metric               | Today      | Direction     | Runs at          |
| -------------------- | ---------- | ------------- | ---------------- |
| client round trips   | unmeasured | must not grow | implementer done |
| Google downloads     | unmeasured | must not grow | implementer done |
| catalog parses       | unmeasured | must not grow | implementer done |
| catalog code loads   | unmeasured | must not grow | implementer done |
| family lower-cases   | unmeasured | must not grow | implementer done |
| whole-catalog passes | unmeasured | must not grow | implementer done |
| response stringifies | unmeasured | must not grow | implementer done |
| badge requests       | unmeasured | must not grow | implementer done |
| badge lower-cases    | unmeasured | must not grow | implementer done |

**Project**

| Metric           | Today      | Direction     | Runs at    |
| ---------------- | ---------- | ------------- | ---------- |
| project coverage | unmeasured | must not fall | merge gate |

### Exceptions

| ID  | Rule | Path | Reason | Owner | Expires |
| --- | ---- | ---- | ------ | ----- | ------- |

### Rules

- **Runs at names one of two moments:** implementer done (T1) or the merge gate (T2). Cost decides: a count a Vitest run takes in under a minute runs at implementer done; a count that needs a real browser load, or a full-suite run, runs at the merge gate.
- **Every enforced row has a number and a command.** A dimension with a number and no command is an aspiration. It stays in the Measured table until a command exists.
- **Counters only.** An enforced row counts counted work (parses, compiles, storage reads and writes, stringifies, layout reads, round trips, as the paths ADR lists them), or instructions, allocations, bytes and system calls. Wall time and resident memory stay targets. They are reported to the owner, each figure with the setup it was measured on (machine, browser, input), and compared only with a figure from the same setup. Count work per unit of the outcome that does it, not as a ratio over the sample's mix, and make each count's input produce every outcome the path has.
- **A ceiling is the measured value,** or the value an ADR sets, never a round number above it. For work the paths ADR plans but no code does yet, the row starts at the ADR's value. The ticket that adds the work then writes its measured value in the same change, which is a tightening. Raising a row up to the paths ADR's contract, in the pull request whose spec names the added count, is not a loosening: the commit records it with a `Quality-change:` trailer. Above the contract, it is a loosening.
- **The ratchet.** A measured figure is compared with its recorded Today value, not with the previous commit. The pull request that improves a figure writes the new value in the same change. Counted work has zero tolerance: one more count per unit is a regression. A figure that varies (coverage, instructions, bytes) may carry a tolerance, 0.5 % by default. In parallel runs, only the merger writes a new Today value.
- **Coverage is a ratchet.** Project coverage must not fall. `pnpm coverage` runs every package's `test:coverage` (Vitest, V8 coverage), pools their line coverage and fails when it falls more than 0.5 % below the register's figure; while the row reads `unmeasured`, it prints the figure and checks nothing else. CI runs it at T2 and T3, never at T1. There is no per-changed-line threshold.
- **Tightening is silent; loosening is loud.** These need no approval: lowering a number, adding a row, promoting a measured row to enforced, or extending a count's input or counters to a new outcome or feature. These need the owner: raising a number (outside the contract case above), removing or demoting a row, changing a row's command or Runs at, narrowing a count's input or what its counters see, or adding or extending an exception. Raising a contract cap also needs a paths ADR change. A loosening never rides in the pull request of the feature that failed the limit.
- **Exceptions expire.** Each has an owner and an expiry date, 90 days by default. On expiry the gate fails again, with no action from anyone.
- **The register is the source of the numbers.** The gate's code reads the register, or a check compares the two and fails on a difference.
- **A register check runs with the merge gate.** The register check, `tests/register-check.test.ts`, runs in `test:repo` when the register or the paths ADR changes, and once more uncached in CI's checks job on every run, so an exception fails on its expiry date with nothing changed. It fails in any of these cases: an enforced row's command names a test file that does not exist or does not name the row, an exception has expired, a path in the paths ADR has no row, a count in a path's cost contract has no row (the ADR's Register rows column and the register disagree on a row name), or a row allows more than its contract's cap without an unexpired exception.
- **Each counter proves it can fail.** A count's own tests seed one extra unit of each counted work it gates and expect a failure.
- **A row changes in the pull request** that lowers its figure, raises it within its contract as its spec names, or amends its ADR.
