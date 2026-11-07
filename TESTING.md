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
- No edit to the gate's own files without a `Quality-change` trailer. They are the count tests (`<name>.count.test.ts(x)` next to the path's owner module, `<name>.count.spec.ts` in Playwright), the counting helper (`counting.ts`), the register reader and the register check (`tests/register*.ts`), the floor guard (`tests/floor-guard*.ts`) and the coverage command (`tests/coverage.ts`), with their tests. The floor guard recognises them by these names.

**Prescribed forms:**

- In the vendored shadcn example pages under `packages/themer/src/components/preview/examples/`, a single-rule `eslint-disable-next-line <rule> -- <reason>` that keeps the code as the shadcn example wrote it.
- At the top of a visual-baseline spec, `test.skip(<platform condition>, <reason>)`, which skips on platforms whose renders the baselines don't cover.

**Recorded changes.** A change the Floor would flag but the rules allow carries a `Quality-change: <file or row>: <reason>` commit trailer. Examples: a test removed with its replacement named, a row raised within its contract, an edit to the gate's own files. The floor guard accepts a flagged change that a trailer, on a commit since the merge base, names: a file by its repo path, a register row as `<path>: <row>` (`Store action: stringifies`), an exception as `Exceptions: <ID>`, and a paths ADR cap as `<ADR file>: <path>: <row>`. `code-review` checks each trailer against the spec and the paths ADR.

### Enforced

Limits that fail the merge gate.

First measured on 2026-11-06 (spec #119) on one machine: an Apple M3 Max under macOS 27.2, Node 24.22.1. The count tests ran in Vitest 5.0.4 with happy-dom 21.0.1 and React's development build; frame chunk imports ran in Playwright 1.64.0's Chromium at 1440 by 900 px against the web app's production build; project coverage is `pnpm coverage`'s pooled line coverage.

**Project**

| Dimension        | Rule    | Direction     | Checked by                 | Runs at          |
| ---------------- | ------- | ------------- | -------------------------- | ---------------- |
| Type errors      | 0       | must not grow | `pnpm turbo run typecheck` | implementer done |
| project coverage | 76.76 % | must not fall | `pnpm coverage`            | merge gate       |

**Store action** (per `set`)

| Metric                 | Rule                                            | Direction     | Checked by                                                                      | Runs at          |
| ---------------------- | ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------- | ---------------- |
| storage reads          | 0                                               | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| computed-style reads   | 1 unset extra colours; 0 no unset extra colours | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| stringifies            | 1 persisted change; 0 no change                 | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| storage writes         | 1 persisted change; 0 no change                 | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| store deep compares    | 1 Theme change; 0 history-only change           | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| selector deep compares | 1                                               | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |
| selector colour parses | 0                                               | must not grow | `pnpm --filter themercn exec vitest run src/stores/store-action.count.test.tsx` | implementer done |

**Theme apply** (per apply and document)

| Metric                  | Rule                                                             | Direction     | Checked by                                                                    | Runs at          |
| ----------------------- | ---------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
| CSSOM walks             | 0 one-token edit; 0 shadow-input edit; 1 stylesheet-count change | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| override sheet writes   | 0 one-token edit; 0 shadow-input edit; 1 stylesheet-count change | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| restore-sheet lookups   | 1                                                                | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| class toggles           | 0                                                                | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| Live frame font updates | 1                                                                | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| font link appends       | 1                                                                | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| font label parses       | 1                                                                | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |

**Page load** (per load; hydration rows also per `storageNamespace` switch)

| Metric                    | Rule                           | Direction     | Checked by                                                                       | Runs at          |
| ------------------------- | ------------------------------ | ------------- | -------------------------------------------------------------------------------- | ---------------- |
| head-script storage reads | 3                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| head-script parses        | 2                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| hydration storage reads   | 2                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| hydration parses          | 2                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| colour-mode writes        | 1                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| restore-sheet writes      | 0 nothing saved; 1 saved Theme | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| restore-sheet removals    | 1                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| stylesheet inserts        | 1                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| store sets                | 2                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |
| Preset deep compares      | 2                              | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx` | implementer done |

**Inspector pointer move** (per `mousemove`, and per measure where named)

| Metric                   | Rule                                        | Direction     | Checked by                                                                                             | Runs at          |
| ------------------------ | ------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| regex compiles           | 0                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| store sets               | 0                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| ancestor walks           | 1                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| class tests per class    | 1                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| `closest(ignore)` calls  | 1                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| other DOM queries        | 0 same element; 0 new element; 1 card shown | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| measures                 | 0 same element; 1 new element; 0 card shown | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| layout reads per measure | 5                                           | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |
| overlay renders          | 0 same element; 1 new element; 0 card shown | must not grow | `pnpm --filter themercn exec vitest run src/components/preview/inspector/use-inspector.count.test.tsx` | implementer done |

**Font catalog request** (per request)

| Metric               | Rule                                           | Direction     | Checked by                                                                   | Runs at          |
| -------------------- | ---------------------------------------------- | ------------- | ---------------------------------------------------------------------------- | ---------------- |
| Google downloads     | 0 cached; 1 uncached; 0 back-off; 1 concurrent | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| catalog parses       | 0 cached; 1 uncached; 0 back-off               | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| catalog code loads   | 1                                              | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| whole-catalog passes | 1                                              | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |

### Measured, not yet enforced

The ratchet. Each count is per unit of its path, as the paths ADR defines the unit, and per outcome where the contract splits it. A figure is `unmeasured`, one count for every outcome (`3`), a count per outcome in the outcome names of the paths ADR's Register rows column (`1 persisted change; 0 no change`), or a percentage (`87.4 %`). A row's figure may never exceed the cap in its path's cost contract. Each path row names the command that measures it in Checked by, as an enforced row does. A row moves to Enforced, with that figure as its rule, once the gate gives it a command and its figure is within its cap. A row measured over its cap stays here at its measured figure, and the register check fails on it until the owner adds an exception or amends the paths ADR.

**Theme apply** (per apply and document)

| Metric                  | Today                                                               | Direction     | Checked by                                                                    | Runs at          |
| ----------------------- | ------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
| property writes         | 54 one-token edit; 54 shadow-input edit; 54 stylesheet-count change | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| shadow colour parses    | 1 one-token edit; 1 shadow-input edit; 1 stylesheet-count change    | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| font label layout reads | 4                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |
| font label stringifies  | 5                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/utils/apply-theme.count.test.tsx` | implementer done |

**Page load** (per load; hydration rows also per `storageNamespace` switch)

| Metric               | Today                                                               | Direction     | Checked by                                                                                | Runs at          |
| -------------------- | ------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| head-script builds   | 3                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`          | implementer done |
| storage writes       | 1 nothing saved; 1 saved Theme; 3 other version; 2 namespace switch | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`          | implementer done |
| font links           | 7                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`          | implementer done |
| first applies        | 3                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`          | implementer done |
| frame chunk imports  | 1                                                                   | must not grow | `pnpm --filter web exec playwright test --project=chromium e2e/frame-chunk.count.spec.ts` | merge gate       |
| root-class observers | 2                                                                   | must not grow | `pnpm --filter themercn exec vitest run src/components/page-load.count.test.tsx`          | implementer done |

**Font catalog request** (per request)

| Metric               | Today | Direction     | Checked by                                                                   | Runs at          |
| -------------------- | ----- | ------------- | ---------------------------------------------------------------------------- | ---------------- |
| client round trips   | 2     | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| family lower-cases   | 132   | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| response stringifies | 2     | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| badge requests       | 2     | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |
| badge lower-cases    | 6     | must not grow | `pnpm --filter themercn exec vitest run src/api/font-catalog.count.test.tsx` | implementer done |

### Exceptions

| ID  | Rule                    | Path                 | Reason                                                                                                                                                 | Owner                    | Expires    |
| --- | ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ---------- |
| E6  | property writes         | Theme apply          | Debt: "every apply writes all 46 properties, 54 with own shadows, even for a one-token edit"; remediation map #111                                     | Jbmanllr (project owner) | 2027-02-04 |
| E7  | shadow colour parses    | Theme apply          | Debt: "The property map and the shadow colour parse run once per document and apply … even when the shadow inputs didn't change"; remediation map #111 | Jbmanllr (project owner) | 2027-02-04 |
| E8  | font label layout reads | Theme apply          | Debt: "A font label reads `getComputedStyle` once per `var()` hop, up to 4"; remediation map #111                                                      | Jbmanllr (project owner) | 2027-02-04 |
| E9  | font label stringifies  | Theme apply          | No debt line. Measured cause: 4 `getSnapshot` runs under React's development build, plus react-query's key hash; remediation map #111                  | Jbmanllr (project owner) | 2027-02-04 |
| E10 | head-script builds      | Page load            | Debt: "Next builds the head-script string 3 times per load (server render, hydration render, post-hydration render)"; remediation map #111             | Jbmanllr (project owner) | 2027-02-04 |
| E11 | storage writes          | Page load            | No debt line. Measured cause: the refresh's baseline write, and the mode-sync set persists `currentMode`; remediation map #111                         | Jbmanllr (project owner) | 2027-02-04 |
| E12 | font links              | Page load            | Debt: "The font loader adds a second `<link>` for each family the head script already linked: up to 7 links for 4 families"; remediation map #111      | Jbmanllr (project owner) | 2027-02-04 |
| E14 | first applies           | Page load            | Debt: "The first apply runs twice when the saved mode differs from the page's" (3 measured on a switch to an empty namespace); remediation map #111    | Jbmanllr (project owner) | 2027-02-04 |
| E15 | frame chunk imports     | Page load            | Debt: "Every Live frame navigation imports the Themer chunk only to render nothing"; remediation map #111                                              | Jbmanllr (project owner) | 2027-02-04 |
| E16 | root-class observers    | Page load            | Debt: "Every `useColorMode` caller and every font label adds its own `<html>` observer"; remediation map #111                                          | Jbmanllr (project owner) | 2027-02-04 |
| E19 | client round trips      | Font catalog request | No debt line. Measured cause: with the route disabled, the 404 plus the Themer's `retry: 1` asks twice; remediation map #111                           | Jbmanllr (project owner) | 2027-02-04 |
| E20 | family lower-cases      | Font catalog request | Debt: "every request with a query lower-cases every family name in the catalog"; remediation map #111                                                  | Jbmanllr (project owner) | 2027-02-04 |
| E21 | response stringifies    | Font catalog request | No debt line. Measured cause: with the route disabled, the 404 body is stringified twice because of the retry; remediation map #111                    | Jbmanllr (project owner) | 2027-02-04 |
| E22 | badge requests          | Font catalog request | No debt line. Measured cause: the same retry as E19; remediation map #111                                                                              | Jbmanllr (project owner) | 2027-02-04 |
| E23 | badge lower-cases       | Font catalog request | Debt: "every `FontValueLabel` render lower-cases up to 2 names per loaded font"; remediation map #111                                                  | Jbmanllr (project owner) | 2027-02-04 |

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
- **A register check runs with the merge gate.** The register check, `tests/register-check.test.ts`, runs in `test:repo` when the register or the paths ADR changes, and once more uncached in CI's checks job on every run, so an exception fails on its expiry date with nothing changed. It fails in any of these cases: an enforced row's command, or a measured path row's, names a test file that does not exist or does not name the row, an exception has expired, a path in the paths ADR has no row, a count in a path's cost contract has no row (the ADR's Register rows column and the register disagree on a row name), a row allows more than its contract's cap without an unexpired exception, or a path row still reads `unmeasured` while its path's count test exists.
- **Each counter proves it can fail.** A count's own tests seed one extra unit of each counted work it gates and expect a failure. Each count test file ends with a reach check: for each row and outcome whose figure is above 0, its unseeded runs must reach the figure, or the row fails as a stale figure or a blind counter. A feature-off run asserts that the work the feature removes counts 0.
- **A row changes in the pull request** that lowers its figure, raises it within its contract as its spec names, or amends its ADR.
