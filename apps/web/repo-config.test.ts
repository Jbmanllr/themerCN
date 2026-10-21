import { execFileSync } from "node:child_process"
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { parse } from "yaml"

// Repo-wide config assertions: the gates are only worth having if the config
// that wires them stays wired.
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

describe("formatting", () => {
  it("CI runs a format check", () => {
    const steps = [
      ...read("../../.github/workflows/ci.yml").matchAll(/run: (.+)/g),
    ].map((match) => match[1])
    expect(steps).toContain("pnpm format:check")
  })

  it("the root format check covers the whole repo", () => {
    const scripts = JSON.parse(read("../../package.json")).scripts
    expect(scripts["format:check"]).toBe("prettier --check .")
  })

  it("the root format writes exactly what the check checks", () => {
    const scripts = JSON.parse(read("../../package.json")).scripts
    expect(scripts.format).toBe(
      scripts["format:check"].replace("--check", "--write")
    )
  })

  it("format is an uncached write with no upstream chain", () => {
    const { format } = JSON.parse(read("../../turbo.json")).tasks
    expect(format.cache).toBe(false)
    expect(format.dependsOn ?? []).toEqual([])
  })

  it("lint does not wait on upstream lint", () => {
    const { lint } = JSON.parse(read("../../turbo.json")).tasks
    expect(lint.dependsOn ?? []).not.toContain("^lint")
  })
})

// TSX files under `dir`, skipping dependencies and dot-directories (build
// output such as .next).
const tsxFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".")
        ? []
        : tsxFiles(path)
    }
    return entry.name.endsWith(".tsx") ? [path] : []
  })

describe("linting", () => {
  // Every workspace with a lint script (apps/* and packages/*, per
  // pnpm-workspace.yaml).
  const linted = ["apps", "packages"]
    .flatMap((group) =>
      readdirSync(new URL(`../../${group}/`, import.meta.url)).map(
        (name) => `${group}/${name}`
      )
    )
    .filter((workspace) => {
      const manifest = new URL(
        `../../${workspace}/package.json`,
        import.meta.url
      )
      return (
        existsSync(manifest) &&
        JSON.parse(readFileSync(manifest, "utf8")).scripts?.lint
      )
    })

  it("covers the Playground, the Vite app, the ui package and themercn", () => {
    expect(linted).toEqual(
      expect.arrayContaining([
        "apps/vite",
        "apps/web",
        "packages/themer",
        "packages/ui",
      ])
    )
  })

  it.each(linted)("%s lint script forbids warnings", (workspace) => {
    const { scripts } = JSON.parse(read(`../../${workspace}/package.json`))
    expect(scripts.lint).toMatch(/--max-warnings[ =]0\b/)
  })

  it.each(linted)(
    "%s ESLint run lints its TSX files",
    async (workspace) => {
      const cwd = fileURLToPath(new URL(`../../${workspace}/`, import.meta.url))
      const eslint = new ESLint({ cwd })
      const ignored = await Promise.all(
        tsxFiles(cwd).map((file) => eslint.isPathIgnored(file))
      )
      expect(ignored.filter((isIgnored) => !isIgnored).length).toBeGreaterThan(
        0
      )
    },
    30_000
  )

  it("no shared ESLint config downgrades errors to warnings", async () => {
    const configs = await Promise.all([
      import("@workspace/eslint-config/base").then((m) => m.config),
      import("@workspace/eslint-config/react-internal").then((m) => m.config),
      import("@workspace/eslint-config/next-js").then((m) => m.nextJsConfig),
    ])
    const plugins = configs
      .flat()
      .flatMap((block) => Object.keys(block.plugins ?? {}))
    expect(plugins.filter((name) => /only-?warn/i.test(name))).toEqual([])
  })
})

const ROOT = fileURLToPath(new URL("../../", import.meta.url))
const TURBO = join(ROOT, "node_modules/.bin/turbo")

// The task graph `turbo run <args>` would run, without running it, from the
// repo root or from `cwd` (a copy of the repo) with `env` as its environment.
type DryTask = {
  taskId: string
  command: string
  hash: string
  dependencies: string[]
}
const dryRunWith = (
  { cwd = ROOT, env = process.env }: { cwd?: string; env?: NodeJS.ProcessEnv },
  ...args: string[]
): DryTask[] =>
  JSON.parse(
    execFileSync(TURBO, ["run", ...args, "--dry=json"], {
      cwd,
      env,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      // A copy has no node_modules, and turbo warns that it runs a global one.
      stdio: ["ignore", "pipe", "pipe"],
    })
  ).tasks
const dryRun = (...args: string[]) => dryRunWith({}, ...args)
const hashes = (tasks: DryTask[]) =>
  Object.fromEntries(tasks.map((t) => [t.taskId, t.hash]))
const APPS = ["web", "vite-app"]

describe("task graph", () => {
  const graph = dryRun("typecheck", "dev")
  const task = (id: string) => {
    const found = graph.find((t) => t.taskId === id)
    if (!found) throw new Error(`${id} is not in the task graph`)
    return found
  }

  it.each(APPS)(
    "%s typecheck waits for the package it type-checks against",
    (app) => {
      expect(task(`${app}#typecheck`).dependencies).toContain("themercn#build")
    }
  )

  it.each(APPS)("%s dev starts from a built package", (app) => {
    expect(task(`${app}#dev`).dependencies).toContain("themercn#build")
  })

  // `turbo dev --filter=<app>` too: the package watch comes along.
  it.each(APPS)(
    "%s dev runs alongside the package's watch tasks",
    (app) => {
      const watched = dryRun("dev", `--filter=${app}`)
        .filter((t) => t.taskId.startsWith("themercn#"))
        .map((t) => [t.taskId, t.command])
      expect(watched).toEqual(
        expect.arrayContaining([
          ["themercn#dev", expect.stringMatching(/watch/)],
          ["themercn#dev:css", expect.stringMatching(/watch/)],
        ])
      )
    },
    60_000
  )
})

// A task's hash is its cache key and what `--affected` compares: it changes
// with everything the task's result depends on, and with nothing else.
describe("task hashes", () => {
  it.each(["web#test", "vite-app#test", "themercn#test"])(
    "%s hashes CI, which turns off Vitest's allowOnly",
    (id) => {
      const env = { ...process.env }
      delete env.CI
      const local = hashes(dryRunWith({ env }, "test"))
      const ci = hashes(dryRunWith({ env: { ...env, CI: "1" } }, "test"))
      expect(ci[id]).toBeDefined()
      expect(ci[id]).not.toBe(local[id])
    },
    60_000
  )

  // Edits a scratch copy of the working tree (its tracked and unignored
  // files) one file at a time; the repo itself is never touched.
  describe("an edit changes the hashes of the tasks that read the file", () => {
    const TASKS = ["build", "build:css", "test", "e2e", "visual"]
    let copy: string
    let base: Record<string, string>
    beforeAll(() => {
      copy = mkdtempSync(join(tmpdir(), "themercn-hashes-"))
      execFileSync(
        "git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        { cwd: ROOT, encoding: "utf8" }
      )
        .split("\0")
        .filter((file) => file && existsSync(join(ROOT, file)))
        .forEach((file) => cpSync(join(ROOT, file), join(copy, file)))
      base = hashes(dryRunWith({ cwd: copy }, ...TASKS))
    }, 60_000)
    afterAll(() => rmSync(copy, { recursive: true, force: true }))

    // The tasks whose hash an edit to `file` (or creating it) changes.
    const changedBy = (file: string) => {
      const path = join(copy, file)
      const original = existsSync(path) ? readFileSync(path) : undefined
      appendFileSync(path, "\n// hash probe\n")
      try {
        const after = hashes(dryRunWith({ cwd: copy }, ...TASKS))
        return Object.keys(base).filter((id) => after[id] !== base[id])
      } finally {
        if (original) writeFileSync(path, original)
        else rmSync(path)
      }
    }

    it.each([
      {
        file: "packages/themer/src/utils/color-converter.test.ts",
        changes: ["themercn#test"],
        keeps: ["themercn#build", "themercn#build:css", "web#build"],
      },
      {
        file: "packages/ui/src/components/hash-probe.test.tsx",
        changes: [],
        keeps: ["themercn#build", "themercn#build:css", "web#build"],
      },
      {
        file: "apps/web/lib/shop.test.ts",
        changes: ["web#test"],
        keeps: ["web#build"],
      },
      {
        file: "apps/web/vitest.config.ts",
        changes: ["web#test"],
        keeps: ["web#build"],
      },
      {
        file: "apps/web/e2e/shop.spec.ts",
        changes: ["web#e2e"],
        keeps: ["web#build"],
      },
      {
        file: "apps/web/playwright.config.ts",
        changes: ["web#e2e"],
        keeps: ["web#build"],
      },
      {
        file: "apps/web/e2e/visual.spec.ts-snapshots/cart-dark-visual-linux.png",
        changes: ["web#visual"],
        keeps: ["web#build"],
      },
      {
        file: "apps/vite/e2e/hash-probe.spec.ts",
        changes: ["vite-app#e2e"],
        keeps: ["vite-app#build"],
      },
      // The e2e detector's tests live in web#test.
      {
        file: "scripts/e2e-affected.sh",
        changes: ["web#test"],
        keeps: ["web#build", "web#e2e"],
      },
      // So do the agents' Stop hook's, and its wiring's.
      {
        file: ".claude/hooks/stop-t1.sh",
        changes: ["web#test"],
        keeps: ["web#build", "web#e2e"],
      },
      {
        file: ".claude/settings.json",
        changes: ["web#test"],
        keeps: ["web#build", "web#e2e"],
      },
      {
        file: "packages/themer/README.md",
        changes: [],
        keeps: ["themercn#build", "themercn#build:css"],
      },
      // The control: a source edit still reaches every build that bundles it.
      {
        file: "packages/ui/src/components/button.tsx",
        changes: ["themercn#build", "themercn#build:css", "web#build"],
        keeps: [],
      },
    ])(
      "$file",
      ({ file, changes, keeps }) => {
        const changed = changedBy(file)
        expect(changed).toEqual(expect.arrayContaining(changes))
        expect(changed.filter((id) => keeps.includes(id))).toEqual([])
      },
      60_000
    )
  })
})

describe("shared dependency versions", () => {
  const dependencies = (workspace: string): Record<string, string> =>
    JSON.parse(read(`../../${workspace}/package.json`)).dependencies ?? {}

  it("runtime dependencies shared by packages/ui and themercn use the catalog", () => {
    const ui = dependencies("packages/ui")
    const themer = dependencies("packages/themer")
    const shared = Object.keys(ui).filter((name) => name in themer)
    expect(shared).toEqual(expect.arrayContaining(["lucide-react", "recharts"]))
    for (const name of shared) {
      expect({ name, ui: ui[name], themer: themer[name] }).toEqual({
        name,
        ui: "catalog:",
        themer: "catalog:",
      })
    }
  })

  // An app that renders packages/ui components and imports the same library
  // itself (recharts' chart parts, lucide icons) must resolve the copy ui
  // resolves: recharts couples a chart and its tooltip/legend through React
  // context, so a second copy silently drops the tooltip and legend.
  it("workspaces using packages/ui declare shared dependencies as ui does", () => {
    const ui = dependencies("packages/ui")
    const consumers = ["apps", "packages"]
      .flatMap((group) =>
        readdirSync(new URL(`../../${group}/`, import.meta.url)).map(
          (name) => `${group}/${name}`
        )
      )
      .filter((workspace) => "@workspace/ui" in dependencies(workspace))
    expect(consumers).toEqual(expect.arrayContaining(["apps/web", "apps/vite"]))
    for (const workspace of consumers) {
      const own = dependencies(workspace)
      for (const name of Object.keys(ui).filter((name) => name in own)) {
        expect({ workspace, name, version: own[name] }).toEqual({
          workspace,
          name,
          version: ui[name],
        })
      }
    }
  })
})

describe("toolchain", () => {
  it("the root does not depend on the shared ESLint config, so editing it does not invalidate every package", () => {
    const pkg = JSON.parse(read("../../package.json"))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(Object.keys(deps)).not.toContain("@workspace/eslint-config")
  })

  it("root engines.node matches the README's Node requirement", () => {
    const required = read("../../README.md").match(
      /Requires Node (\d+)\.(\d+) or later/
    )
    expect(required).not.toBeNull()
    const { engines } = JSON.parse(read("../../package.json"))
    expect(engines.node).toBe(`>=${required?.[1]}.${required?.[2]}.0`)
  })
  // CI's concurrency (S57) is evaluated per event in themercn's
  // scripts/release-workflow.test.ts, beside the release gate it protects.
})

type CiJob = {
  name?: string
  if?: string
  needs?: string | string[]
  permissions?: Record<string, string>
  steps: { uses?: string; with?: Record<string, string> }[]
}

// `ci-gate` is the single required check (README "Protect `main`"): it
// passes only when every other job passed, so jobs can be added, renamed or
// made conditional without touching branch protection.
describe("the CI gate", () => {
  const ciYml = parse(read("../../.github/workflows/ci.yml")) as {
    name: string
    jobs: Record<string, CiJob>
  }
  const entries = Object.entries(ciYml.jobs)
  const gateEntry = entries.find(([id, job]) => (job.name ?? id) === "ci-gate")
  const [gateId, gate] = gateEntry ?? []
  const others = entries.filter(([id]) => id !== gateId)
  const verdict = gate?.steps.find((step) =>
    step.uses?.startsWith("re-actors/alls-green@")
  )

  it("reports a ci-gate check even when needed jobs fail or are skipped", () => {
    expect(gate?.if).toBe("always()")
    expect(gate?.permissions).toEqual({})
  })

  it("needs every other job", () => {
    expect([gate?.needs ?? []].flat().sort()).toEqual(
      others.map(([id]) => id).sort()
    )
  })

  it("decides from every needed job's result", () => {
    expect(verdict?.with?.jobs).toBe("${{ toJSON(needs) }}")
  })

  it("allows no failure and only the e2e job's skip", () => {
    const e2e = others.find(([, job]) => job.name?.startsWith("E2E"))
    expect(e2e).toBeDefined()
    expect(verdict?.with?.["allowed-failures"] ?? "").toBe("")
    expect(verdict?.with?.["allowed-skips"]).toBe(e2e?.[0])
  })

  // Branch protection requires these until the owner swaps to ci-gate, and
  // release.yml listens for the workflow by name.
  it("keeps the workflow and job names branch protection and release.yml use", () => {
    expect(ciYml.name).toBe("CI")
    expect(others.map(([, job]) => job.name)).toEqual(
      expect.arrayContaining([
        "Lint, typecheck, test, build, package checks",
        "E2E (Playwright, Chromium)",
      ])
    )
  })

  it("the README's owner bootstrap requires only ci-gate", () => {
    const protect = read("../../README.md").match(
      /\*\*Protect `main`\.\*\*([\s\S]*?)\n\d+\. \*\*/
    )?.[1]
    expect(protect).toBeDefined()
    expect(protect).toContain("`ci-gate`")
    for (const [, job] of others) expect(protect).not.toContain(job.name)
  })
})

type CiStep = {
  id?: string
  if?: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
  "continue-on-error"?: boolean
}

// Pull requests run only the tasks their change affects; every other event
// (push to main, schedule, dispatch, merge queue) runs everything.
describe("CI task selection", () => {
  const ciYml = parse(read("../../.github/workflows/ci.yml")) as {
    on: Record<string, unknown>
    jobs: Record<
      string,
      {
        name?: string
        if?: string
        needs?: string | string[]
        outputs?: Record<string, string>
        steps: CiStep[]
      }
    >
  }
  const [e2eId, e2eJob] =
    Object.entries(ciYml.jobs).find(([, job]) => job.name?.startsWith("E2E")) ??
    []

  // Pushes to main, a weekly schedule, manual dispatch and the merge queue
  // are the backstop: each runs the full suite.
  it("runs on pull requests, pushes to main and the backstop events", () => {
    expect(ciYml.on).toEqual({
      pull_request: null,
      push: { branches: ["main"] },
      merge_group: null,
      schedule: [{ cron: "0 4 * * 1" }],
      workflow_dispatch: null,
    })
  })

  // The step conditions this workflow uses: none, or event-name tests
  // joined by `||`.
  const runsOn = (condition: string | undefined, event: string) => {
    if (condition === undefined) return true
    return condition.split(" || ").some((clause) => {
      const test = clause.match(/^github\.event_name (==|!=) '(\w+)'$/)
      if (!test) throw new Error(`unsupported step condition: ${condition}`)
      return (test[2] === event) === (test[1] === "==")
    })
  }
  const stepsFor = (event: string, job = "checks") =>
    ciYml.jobs[job]!.steps.filter(
      (step) => step.run !== undefined && runsOn(step.if, event)
    )
  const scriptFor = (event: string, job = "checks") =>
    stepsFor(event, job)
      .map((step) => step.run)
      .join("\n")
  // Each `pnpm turbo` command a step runs: its tasks, whether it selects
  // affected tasks, the arguments it passes to the tasks (after `--`), and
  // whether its failure fails the job.
  const commandsOf = (step: CiStep) =>
    (step.run ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("pnpm turbo "))
      .map((line) => {
        const words = line.split(/\s+/).slice(2)
        const end = words.includes("--") ? words.indexOf("--") : words.length
        return {
          tasks: words
            .slice(0, end)
            .filter((word) => word !== "run" && !word.startsWith("-")),
          affected: words.slice(0, end).includes("--affected"),
          args: words.slice(end + 1).join(" "),
          gating: step["continue-on-error"] !== true,
        }
      })
  const commandsFor = (event: string, job = "checks") =>
    stepsFor(event, job).flatMap(commandsOf)
  // The tasks `pnpm turbo` runs for an event, and whether each command
  // selects affected tasks.
  const turboFor = (event: string, job = "checks") => {
    const commands = commandsFor(event, job)
    return {
      tasks: [...new Set(commands.flatMap((command) => command.tasks))].sort(),
      selections: commands.map((command) => command.affected),
    }
  }
  const TASKS = ["build", "check:package", "lint", "test", "typecheck"]

  it("pull requests run every check on its affected tasks only", () => {
    const { tasks, selections } = turboFor("pull_request")
    expect(tasks).toEqual(TASKS)
    expect(selections).not.toContain(false)
  })

  // A pull request's checkout is GitHub's merge commit, whose first parent
  // is the base branch tip it was built on.
  it("pull requests compare against the merge commit's first parent", () => {
    expect(scriptFor("pull_request")).toMatch(
      /TURBO_SCM_BASE=\$\(git rev-parse HEAD\^1\)/
    )
  })

  it.each(["push", "schedule", "workflow_dispatch", "merge_group"])(
    "%s runs every task with no selection",
    (event) => {
      const { tasks, selections } = turboFor(event)
      expect(tasks).toEqual(TASKS)
      expect(selections).not.toContain(true)
      expect(scriptFor(event)).not.toContain("TURBO_SCM_BASE")
    }
  )

  it.each(["pull_request", "push"])(
    "%s format-checks the whole repo",
    (event) => {
      expect(scriptFor(event).split("\n")).toContain("pnpm format:check")
    }
  )

  // The detector job (`changes`) decides whether the e2e job runs at all;
  // it fails open (see "the e2e detector" below).
  const detector = Object.entries(ciYml.jobs).flatMap(([job, { steps }]) =>
    steps
      .filter((step) => step.run?.startsWith("scripts/e2e-affected.sh"))
      .map((step) => ({ job, step }))
  )

  it("one changes job runs the e2e detector and exposes its verdict", () => {
    expect(detector).toHaveLength(1)
    const [{ job, step }] = detector as [(typeof detector)[0]]
    expect(job).toBe("changes")
    expect(step.if).toBeUndefined()
    expect(ciYml.jobs.changes?.outputs?.e2e).toBe(
      `\${{ steps.${step.id}.outputs.e2e }}`
    )
  })

  it("the e2e job runs only when the detector says so", () => {
    expect([e2eJob?.needs ?? []].flat()).toContain("changes")
    expect(e2eJob?.if).toBe("needs.changes.outputs.e2e == 'true'")
  })

  it("the detector asks about every task the e2e job runs", () => {
    const asked = detector[0]?.step.run?.split(/\s+/).slice(1).sort()
    for (const event of ["pull_request", "push"]) {
      expect(turboFor(event, e2eId).tasks).toEqual(asked)
    }
  })

  // The visual baselines are their own task, in the same pinned image.
  it("pull requests run the affected e2e tasks, against the detector's base", () => {
    const { tasks, selections } = turboFor("pull_request", e2eId)
    expect(tasks).toEqual(["e2e", "visual"])
    expect(selections).not.toContain(false)
    expect(scriptFor("pull_request", e2eId)).toMatch(
      /TURBO_SCM_BASE=\$\(git rev-parse HEAD\^1\)/
    )
  })

  it.each(["push", "schedule", "workflow_dispatch", "merge_group"])(
    "%s runs every e2e task with no selection",
    (event) => {
      const { tasks, selections } = turboFor(event, e2eId)
      expect(tasks).toEqual(["e2e", "visual"])
      expect(selections).not.toContain(true)
    }
  )

  // Flaky tests are quarantined with `tag: "@quarantine"`: they stop gating
  // and run repeatedly on the schedule (and its manual dispatch) instead.
  const EVENTS = [
    "pull_request",
    "push",
    "merge_group",
    "schedule",
    "workflow_dispatch",
  ]
  const QUARANTINED = /(^| )--grep[= ]@quarantine( |$)/

  it.each(EVENTS)(
    "%s gates on every e2e task without quarantined tests",
    (event) => {
      const gating = commandsFor(event, e2eId).filter((c) => c.gating)
      expect([...new Set(gating.flatMap((c) => c.tasks))].sort()).toEqual([
        "e2e",
        "visual",
      ])
      for (const { args } of gating) {
        expect(args).toMatch(/(^| )--grep-invert[= ]@quarantine( |$)/)
      }
    }
  )

  it.each(["schedule", "workflow_dispatch"])(
    "%s repeats the quarantined tests of every e2e task, without gating",
    (event) => {
      const quarantined = commandsFor(event, e2eId).filter((c) =>
        QUARANTINED.test(c.args)
      )
      expect(quarantined.flatMap((c) => c.tasks).sort()).toEqual([
        "e2e",
        "visual",
      ])
      for (const { args, gating, affected } of quarantined) {
        expect({ gating, affected }).toEqual({ gating: false, affected: false })
        const repeats = Number(args.match(/--repeat-each[= ](\d+)/)?.[1])
        expect(repeats).toBeGreaterThan(1)
      }
    }
  )

  it.each(["pull_request", "push", "merge_group"])(
    "%s runs no non-gating command",
    (event) => {
      expect(commandsFor(event, e2eId).filter((c) => !c.gating)).toEqual([])
    }
  )

  // Its report is the only record of a quarantined test's failures.
  it("a failed quarantine run uploads its report", () => {
    const quarantine = e2eJob?.steps.find((step) =>
      commandsOf(step).some((c) => QUARANTINED.test(c.args))
    )
    const upload = e2eJob?.steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@")
    )
    expect(quarantine?.id).toBeDefined()
    expect(upload?.if).toContain(`steps.${quarantine?.id}.outcome == 'failure'`)
  })

  // Playwright accepts the arguments, and a run with no quarantined test
  // (the usual case) passes.
  it.each(["web", "vite"])(
    "%s's Playwright accepts the quarantine run's arguments",
    (app) => {
      const { args } = commandsFor("schedule", e2eId).find((c) =>
        QUARANTINED.test(c.args)
      )!
      const cwd = fileURLToPath(new URL(`../${app}/`, import.meta.url))
      expect(() =>
        execFileSync(
          join(cwd, "node_modules/.bin/playwright"),
          ["test", "--list", ...args.split(" ")],
          { cwd, stdio: "pipe" }
        )
      ).not.toThrow()
    },
    30_000
  )

  // A shallow clone makes Turbo treat every package as changed.
  it("every job that selects tasks checks out full history", () => {
    const selecting = Object.entries(ciYml.jobs).filter(([, job]) =>
      job.steps.some((step) =>
        /--affected|turbo query|e2e-affected/.test(step.run ?? "")
      )
    )
    expect(selecting.map(([id]) => id)).toEqual(
      expect.arrayContaining(["checks", "changes", e2eId])
    )
    for (const [id, job] of selecting) {
      const checkout = job.steps.find((step) =>
        step.uses?.startsWith("actions/checkout@")
      )
      expect({ id, with: checkout?.with }).toEqual({
        id,
        with: expect.objectContaining({
          "fetch-depth": 0,
          filter: "blob:none",
        }),
      })
    }
  })

  // Package-level selection ignores root files: a ci.yml-only change would
  // select no task, so the tests guarding ci.yml would not run.
  it("selection is task-level, on each task's inputs", () => {
    const { futureFlags } = JSON.parse(read("../../turbo.json"))
    expect(futureFlags?.affectedUsingTaskInputs).toBe(true)
  })
})

// The detector CI's `changes` job runs to decide whether the e2e job runs.
// It fails open: only a pull request whose base resolves and on which Turbo
// reports no affected e2e task skips the job. Each case runs the real script
// in a scratch repository, with a stand-in `pnpm` whose `turbo query
// affected --exit-code` exits as given.
describe("the e2e detector", () => {
  const DETECTOR = join(ROOT, "scripts/e2e-affected.sh")
  let scratch: string
  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), "themercn-e2e-detector-"))
    mkdirSync(join(scratch, "bin"))
    writeFileSync(
      join(scratch, "bin/pnpm"),
      '#!/bin/sh\necho "$@" > "$PNPM_ARGS"\nexit "$PNPM_EXIT"\n',
      { mode: 0o755 }
    )
  })
  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  // A repository whose HEAD has `commits - 1` ancestors, like the merge
  // commit a pull request checks out (its first parent is the base tip).
  const repo = (commits: number) => {
    const dir = mkdtempSync(join(scratch, "repo-"))
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim()
    git("init", "--quiet")
    for (let i = 0; i < commits; i++) {
      git(
        "-c",
        "user.name=probe",
        "-c",
        "user.email=probe@example.invalid",
        "commit",
        "--quiet",
        "--allow-empty",
        `--message=${i}`
      )
    }
    return { dir, git }
  }

  // What the detector tells the e2e job, and the command it ran (if any).
  const detect = ({
    event,
    turboExit = 0,
    commits = 2,
  }: {
    event: string
    turboExit?: number
    commits?: number
  }) => {
    const { dir, git } = repo(commits)
    const output = join(dir, "github-output")
    const args = join(dir, "pnpm-args")
    writeFileSync(output, "")
    execFileSync(DETECTOR, ["e2e"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // The stand-in pnpm first; PATH is not an input of any task.
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        PATH: `${join(scratch, "bin")}:${process.env.PATH}`,
        GITHUB_EVENT_NAME: event,
        GITHUB_OUTPUT: output,
        PNPM_ARGS: args,
        PNPM_EXIT: String(turboExit),
      },
    })
    return {
      outputs: readFileSync(output, "utf8").trim().split("\n"),
      ran: existsSync(args) ? readFileSync(args, "utf8").trim() : undefined,
      base: commits > 1 ? git("rev-parse", "HEAD^1") : undefined,
    }
  }

  it("skips e2e on a pull request with no affected e2e task", () => {
    expect(detect({ event: "pull_request", turboExit: 0 }).outputs).toEqual([
      "e2e=false",
    ])
  })

  it("asks Turbo about the given tasks against the merge commit's first parent", () => {
    const { ran, base } = detect({ event: "pull_request" })
    expect(ran).toBe(
      `exec turbo query affected --tasks e2e --base ${base} --exit-code`
    )
  })

  it.each([
    { reason: "an e2e task is affected", turboExit: 1 },
    { reason: "the query fails", turboExit: 2 },
  ])("runs e2e on a pull request when $reason", ({ turboExit }) => {
    expect(detect({ event: "pull_request", turboExit }).outputs).toEqual([
      "e2e=true",
    ])
  })

  it("runs e2e on a pull request whose base is missing", () => {
    expect(detect({ event: "pull_request", commits: 1 })).toMatchObject({
      outputs: ["e2e=true"],
      ran: undefined,
    })
  })

  it.each(["push", "schedule", "workflow_dispatch", "merge_group"])(
    "runs e2e on %s without asking Turbo",
    (event) => {
      expect(detect({ event, turboExit: 0 })).toMatchObject({
        outputs: ["e2e=true"],
        ran: undefined,
      })
    }
  )
})

// Visual baselines are rendered only in the pinned Playwright image, so a
// plain `pnpm e2e` never runs them on any host; the `visual` task (and the
// Docker wrapper) select the project explicitly.
describe("Playwright tiers", () => {
  const WEB = fileURLToPath(new URL("./", import.meta.url))
  // The Playwright projects `playwright test --list <args>` would run.
  const listedProjects = (...args: string[]) =>
    new Set(
      [
        ...execFileSync(
          join(WEB, "node_modules/.bin/playwright"),
          ["test", "--list", ...args],
          { cwd: WEB, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
        ).matchAll(/^\s+\[([\w-]+)\] › /gm),
      ].map((match) => match[1])
    )

  // A retry-pass fails a CI run, and every attempt keeps its trace.
  describe.each([
    ["web", () => import("./playwright.config")],
    ["vite", () => import("../vite/playwright.config")],
  ])("%s's Playwright config", (_app, importConfig) => {
    // The config as Playwright loads it in a run with this CI value.
    const load = async (ci: string | undefined) => {
      vi.stubEnv("CI", ci)
      vi.resetModules()
      try {
        return (await importConfig()).default
      } finally {
        vi.unstubAllEnvs()
      }
    }

    it("fails a CI run on a flaky test, and only a CI run", async () => {
      expect((await load("1")).failOnFlakyTests).toBe(true)
      expect((await load(undefined)).failOnFlakyTests).toBe(false)
    })

    it("keeps the trace of every failed attempt and every retry", async () => {
      expect((await load("1")).use?.trace).toBe("retain-on-failure-and-retries")
    })
  })

  it("a plain run lists no visual test", () => {
    const projects = listedProjects()
    expect(projects).toContain("chromium")
    expect(projects).not.toContain("visual")
  }, 30_000)

  it("the visual project lists its tests when named", () => {
    expect([...listedProjects("--project=visual")]).toEqual(["visual"])
  }, 30_000)

  it("the web visual task runs only the visual project, after the build", () => {
    const [visual] = dryRun("visual", "--filter=web").filter(
      (t) => t.taskId === "web#visual"
    )
    expect(visual?.command).toMatch(/playwright test --project=visual\b/)
    expect(visual?.dependencies).toContain("web#build")
  }, 60_000)

  it("the visual task hashes and passes through what e2e does, and caches its report", () => {
    const { e2e, visual } = JSON.parse(read("../../turbo.json")).tasks
    expect({
      env: visual?.env,
      passThroughEnv: visual?.passThroughEnv,
      outputs: visual?.outputs,
    }).toEqual({
      env: e2e.env,
      passThroughEnv: e2e.passThroughEnv,
      outputs: e2e.outputs,
    })
  })
})

// AGENTS.md "Verification tiers": a Stop hook keeps an agent's turn from
// ending while T1 (the affected lint, typecheck, test, build and package
// checks) fails. Each case runs the real hook in a scratch repository, with
// a stand-in `pnpm` that records what it ran and exits as given.
describe("the T1 Stop hook", () => {
  const HOOK = join(ROOT, ".claude/hooks/stop-t1.sh")
  const T1 = "turbo run lint typecheck test build check:package --affected"
  let scratch: string
  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), "themercn-stop-hook-"))
    mkdirSync(join(scratch, "bin"))
    writeFileSync(
      join(scratch, "bin/pnpm"),
      [
        "#!/bin/sh",
        'echo "TURBO_SCM_BASE=$TURBO_SCM_BASE $*" >> "$PNPM_ARGS"',
        'echo "T1 output: lint failed"',
        'exit "$PNPM_EXIT"',
        "",
      ].join("\n"),
      { mode: 0o755 }
    )
  })
  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  // A repository whose `main` holds one commit, checked out on a branch
  // from it, like an agent's worktree off its integration branch.
  const repo = () => {
    const dir = mkdtempSync(join(scratch, "repo-"))
    const git = (...args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          "user.name=probe",
          "-c",
          "user.email=probe@example.invalid",
          ...args,
        ],
        { cwd: dir, encoding: "utf8" }
      ).trim()
    git("init", "--quiet", "--initial-branch=main")
    writeFileSync(join(dir, "a.ts"), "export const a = 1\n")
    git("add", ".")
    git("commit", "--quiet", "--message=base")
    git("switch", "--quiet", "--create", "ticket")
    return { dir, git }
  }

  // The hook's verdict on stopping in `dir`, given the hook input fields and
  // the exit code of the stand-in T1.
  const stop = (
    dir: string,
    {
      t1Exit = 0,
      input = {},
      env = {},
    }: {
      t1Exit?: number
      input?: Record<string, unknown>
      env?: Record<string, string>
    } = {}
  ) => {
    const args = join(scratch, `pnpm-args-${Math.random()}`)
    const inherited = { ...process.env }
    delete inherited.TURBO_SCM_BASE
    let status = 0
    let stderr = ""
    try {
      execFileSync(HOOK, [], {
        // The hook works in the session's cwd from its input, not its own.
        cwd: scratch,
        input: JSON.stringify({
          hook_event_name: "Stop",
          cwd: dir,
          stop_hook_active: false,
          ...input,
        }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...inherited,
          // The stand-in pnpm first; PATH is not an input of any task.
          // eslint-disable-next-line turbo/no-undeclared-env-vars
          PATH: `${join(scratch, "bin")}:${process.env.PATH}`,
          PNPM_ARGS: args,
          PNPM_EXIT: String(t1Exit),
          ...env,
        },
      })
    } catch (error) {
      const failed = error as { status: number; stderr: string }
      status = failed.status
      stderr = failed.stderr
    }
    return {
      status,
      stderr,
      ran: existsSync(args)
        ? readFileSync(args, "utf8").trim().split("\n")
        : [],
    }
  }

  it("allows stopping at once, without running T1, when nothing changed", () => {
    const { dir } = repo()
    expect(stop(dir, { t1Exit: 1 })).toMatchObject({ status: 0, ran: [] })
  })

  it("runs T1 on the affected tasks against the branch's base when files changed", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { status, ran } = stop(dir)
    expect(status).toBe(0)
    expect(ran).toEqual([
      `TURBO_SCM_BASE=${git("rev-parse", "main")} ${T1} --output-logs=errors-only`,
    ])
  })

  it("counts committed and untracked changes against the base", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "b.ts"), "export const b = 1\n")
    expect(stop(dir).ran).toHaveLength(1)
    git("add", ".")
    git("commit", "--quiet", "--message=ticket")
    expect(stop(dir).ran).toHaveLength(1)
  })

  it("compares against TURBO_SCM_BASE when it is set", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    git("commit", "--quiet", "--all", "--message=integration")
    git("branch", "integration")
    // Changed against main, unchanged against the integration branch.
    expect(stop(dir, { env: { TURBO_SCM_BASE: "integration" } }).ran).toEqual(
      []
    )
  })

  it("blocks stopping while T1 fails, with T1's output as the reason", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { status, stderr } = stop(dir, { t1Exit: 1 })
    expect(status).toBe(2)
    expect(stderr).toContain("T1 output: lint failed")
  })

  it("never runs e2e or the visual baselines", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const [command] = stop(dir, { t1Exit: 1 }).ran
    expect(command).not.toMatch(/e2e|visual|smoke|playwright/)
  })

  // Claude Code sets stop_hook_active on the stop that follows a block.
  it("does not block again when nothing changed since the block", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir, { t1Exit: 1 }).status).toBe(2)
    expect(
      stop(dir, { t1Exit: 1, input: { stop_hook_active: true } })
    ).toMatchObject({ status: 0, ran: [] })
  })

  it("re-runs T1 and blocks again when files changed since the block", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir, { t1Exit: 1 }).status).toBe(2)
    writeFileSync(join(dir, "a.ts"), "export const a = 3\n")
    expect(
      stop(dir, { t1Exit: 1, input: { stop_hook_active: true } })
    ).toMatchObject({ status: 2, ran: [expect.stringContaining(T1)] })
  })

  it("Claude Code runs it on Stop, from the project's settings", () => {
    const settings = JSON.parse(read("../../.claude/settings.json"))
    const handlers = (settings.hooks?.Stop ?? []).flatMap(
      (group: { hooks: { type: string; command: string }[] }) => group.hooks
    )
    expect(handlers).toEqual([
      expect.objectContaining({
        type: "command",
        command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/stop-t1.sh',
      }),
    ])
  })
})

// The project's Claude Code settings and hooks are committed; everything
// else under .claude/ (worktrees, reports, reviews, local settings) is local
// state that git and Prettier never see.
describe("local Claude Code state", () => {
  const ignoredByGit = (path: string) => {
    try {
      execFileSync("git", ["check-ignore", "--quiet", "--no-index", path], {
        cwd: ROOT,
      })
      return true
    } catch {
      return false
    }
  }
  const ignoredByPrettier = (path: string) =>
    JSON.parse(
      execFileSync(
        join(ROOT, "node_modules/.bin/prettier"),
        ["--file-info", path],
        { cwd: ROOT, encoding: "utf8" }
      )
    ).ignored as boolean

  it.each([
    ".claude/worktrees/agent-1/README.md",
    ".claude/research/reports/report.md",
    ".claude/reviews/review.md",
    ".claude/settings.local.json",
    ".claude/launch.json",
  ])("%s stays untracked and unformatted", (path) => {
    expect({ path, git: ignoredByGit(path) }).toEqual({ path, git: true })
    expect({ path, prettier: ignoredByPrettier(path) }).toEqual({
      path,
      prettier: true,
    })
  })

  it.each([".claude/settings.json", ".claude/hooks/stop-t1.sh"])(
    "%s is committed",
    (path) => {
      expect(ignoredByGit(path)).toBe(false)
    }
  )
})
