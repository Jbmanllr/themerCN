import { execFileSync } from "node:child_process"
import {
  appendFileSync,
  cpSync,
  existsSync,
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
import { afterAll, beforeAll, describe, expect, it } from "vitest"
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
    const TASKS = ["build", "build:css", "test", "e2e"]
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
        changes: ["web#e2e"],
        keeps: ["web#build"],
      },
      {
        file: "apps/vite/e2e/hash-probe.spec.ts",
        changes: ["vite-app#e2e"],
        keeps: ["vite-app#build"],
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
  if?: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
}

// Pull requests run only the tasks their change affects; every other event
// (push to main, schedule, dispatch, merge queue) runs everything.
describe("CI task selection", () => {
  const ciYml = parse(read("../../.github/workflows/ci.yml")) as {
    jobs: Record<string, { steps: CiStep[] }>
  }
  const checks = ciYml.jobs.checks!

  // The step conditions this workflow uses: none, or an event-name test.
  const runsOn = (condition: string | undefined, event: string) => {
    if (condition === undefined) return true
    const test = condition.match(/^github\.event_name (==|!=) '(\w+)'$/)
    if (!test) throw new Error(`unsupported step condition: ${condition}`)
    return (test[2] === event) === (test[1] === "==")
  }
  const scriptFor = (event: string) =>
    checks.steps
      .filter((step) => step.run !== undefined && runsOn(step.if, event))
      .map((step) => step.run)
      .join("\n")
  // The tasks `pnpm turbo` runs for an event, and whether each command
  // selects affected tasks.
  const turboFor = (event: string) => {
    const commands = scriptFor(event)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("pnpm turbo "))
      .map((line) => line.split(/\s+/).slice(2))
    return {
      tasks: commands
        .flat()
        .filter((word) => word !== "run" && !word.startsWith("-"))
        .sort(),
      selections: commands.map((words) => words.includes("--affected")),
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

  // A shallow clone makes Turbo treat every package as changed.
  it("every job that selects tasks checks out full history", () => {
    const selecting = Object.entries(ciYml.jobs).filter(([, job]) =>
      job.steps.some((step) => /--affected|turbo query/.test(step.run ?? ""))
    )
    expect(selecting.map(([id]) => id)).toContain("checks")
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
