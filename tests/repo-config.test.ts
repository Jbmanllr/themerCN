import { execFileSync, spawnSync } from "node:child_process"
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
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { parse } from "yaml"

import { runsIf, type Status } from "./github-expression"

// Repo-wide config assertions: the gates are only worth having if the config
// that wires them stays wired.
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

type CiStep = {
  id?: string
  if?: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
  "continue-on-error"?: boolean
}
type CiJob = {
  name?: string
  if?: string
  needs?: string | string[]
  outputs?: Record<string, string>
  container?: unknown
  permissions?: Record<string, string>
  steps: CiStep[]
}
const ciYml = parse(read("../.github/workflows/ci.yml")) as {
  name: string
  on: Record<string, unknown>
  jobs: Record<string, CiJob>
}

describe("formatting", () => {
  it("CI runs a format check", () => {
    const steps = [
      ...read("../.github/workflows/ci.yml").matchAll(/run: (.+)/g),
    ].map((match) => match[1])
    expect(steps).toContain("pnpm format:check")
  })

  it("the root format check covers the whole repo", () => {
    const scripts = JSON.parse(read("../package.json")).scripts
    expect(scripts["format:check"]).toBe("prettier --check .")
  })

  it("the root format writes exactly what the check checks", () => {
    const scripts = JSON.parse(read("../package.json")).scripts
    expect(scripts.format).toBe(
      scripts["format:check"].replace("--check", "--write")
    )
  })

  it("format is an uncached write with no upstream chain", () => {
    const { format } = JSON.parse(read("../turbo.json")).tasks
    expect(format.cache).toBe(false)
    expect(format.dependsOn ?? []).toEqual([])
  })

  it("lint does not wait on upstream lint", () => {
    const { lint } = JSON.parse(read("../turbo.json")).tasks
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
      readdirSync(new URL(`../${group}/`, import.meta.url)).map(
        (name) => `${group}/${name}`
      )
    )
    .filter((workspace) => {
      const manifest = new URL(`../${workspace}/package.json`, import.meta.url)
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
    const { scripts } = JSON.parse(read(`../${workspace}/package.json`))
    expect(scripts.lint).toMatch(/--max-warnings[ =]0\b/)
  })

  it.each(linted)(
    "%s ESLint run lints its TSX files",
    async (workspace) => {
      const cwd = fileURLToPath(new URL(`../${workspace}/`, import.meta.url))
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

  // The root's own TypeScript (these tests, the root configs) has no
  // workspace to lint it, so the root task //#lint:repo does.
  it("the root's lint:repo lints the repo tests and forbids warnings", async () => {
    const { scripts } = JSON.parse(read("../package.json"))
    expect(scripts["lint:repo"]).toMatch(/^eslint .*--max-warnings[ =]0\b/)
    const eslint = new ESLint({ cwd: ROOT })
    const files = ["tests/repo-config.test.ts", "vitest.config.ts"].map(
      (file) => join(ROOT, file)
    )
    for (const file of files) {
      expect(await eslint.isPathIgnored(file), file).toBe(false)
      const config = await eslint.calculateConfigForFile(file)
      expect(Object.keys(config?.rules ?? {}), file).toContain(
        "turbo/no-undeclared-env-vars"
      )
    }
    const results = await eslint.lintFiles(
      scripts["lint:repo"]
        .split(/\s+/)
        .slice(1)
        .filter((word: string) => !word.startsWith("-") && !/^\d+$/.test(word))
    )
    expect(results.map((result) => result.filePath)).toEqual(
      expect.arrayContaining(files)
    )
  }, 60_000)

  it("no shared ESLint config downgrades errors to warnings", async () => {
    const configs = await Promise.all([
      import("../packages/eslint-config/base.js").then((m) => m.config),
      import("../packages/eslint-config/react-internal.js").then(
        (m) => m.config
      ),
      import("../packages/eslint-config/next.js").then((m) => m.nextJsConfig),
    ])
    const plugins = configs
      .flat()
      .flatMap((block) => Object.keys(block.plugins ?? {}))
    expect(plugins.filter((name) => /only-?warn/i.test(name))).toEqual([])
  })
})

const ROOT = fileURLToPath(new URL("../", import.meta.url))
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
  it.each(["web#test", "vite-app#test", "themercn#test", "//#test:repo"])(
    "%s hashes CI, which turns off Vitest's allowOnly",
    (id) => {
      const env = { ...process.env }
      delete env.CI
      const run = (env: NodeJS.ProcessEnv) =>
        hashes(dryRunWith({ env }, "test", "test:repo"))
      const local = run(env)
      const ci = run({ ...env, CI: "1" })
      expect(ci[id]).toBeDefined()
      expect(ci[id]).not.toBe(local[id])
    },
    60_000
  )

  // Edits a scratch copy of the working tree (its tracked and unignored
  // files) one file at a time; the repo itself is never touched.
  describe("an edit changes the hashes of the tasks that read the file", () => {
    const HASHED_TASKS = [
      "lint",
      "lint:repo",
      "build",
      "build:css",
      "test",
      "test:repo",
      "e2e",
      "visual",
    ]
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
      base = hashes(dryRunWith({ cwd: copy }, ...HASHED_TASKS))
    }, 60_000)
    afterAll(() => rmSync(copy, { recursive: true, force: true }))

    // The tasks whose hash an edit to `file` (or creating it) changes.
    const changedBy = (file: string) => {
      const path = join(copy, file)
      const original = existsSync(path) ? readFileSync(path) : undefined
      // The first directory the probe creates, if any, to remove after.
      const created = mkdirSync(dirname(path), { recursive: true })
      appendFileSync(path, "\n// hash probe\n")
      try {
        const after = hashes(dryRunWith({ cwd: copy }, ...HASHED_TASKS))
        return Object.keys(base).filter((id) => after[id] !== base[id])
      } finally {
        if (original) writeFileSync(path, original)
        else rmSync(created ?? path, { recursive: true })
      }
    }

    it.each([
      {
        file: "packages/themer/src/utils/color-converter.test.ts",
        changes: ["themercn#test"],
        keeps: [
          "themercn#build",
          "themercn#build:css",
          "web#build",
          "themercn#e2e",
          "web#e2e",
          "vite-app#e2e",
        ],
      },
      {
        file: "packages/ui/src/components/hash-probe.test.tsx",
        changes: [],
        keeps: ["themercn#build", "themercn#build:css", "web#build"],
      },
      {
        file: "apps/web/lib/shop.test.ts",
        changes: ["web#test"],
        keeps: ["web#build", "web#e2e", "web#visual"],
      },
      {
        file: "apps/web/vitest.config.ts",
        changes: ["web#test"],
        keeps: ["web#build", "web#e2e", "web#visual"],
      },
      {
        file: "apps/vite/src/__snapshots__/hash-probe.test.tsx.snap",
        changes: ["vite-app#test"],
        keeps: ["vite-app#build", "vite-app#e2e", "vite-app#visual"],
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
      // The repo-wide config checks (these tests) live in //#test:repo: it
      // re-runs when the config they read changes, and no workspace's test
      // does.
      {
        file: ".github/workflows/ci.yml",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      {
        file: "apps/vite/eslint.config.js",
        changes: ["//#test:repo"],
        keeps: ["web#test"],
      },
      // The shared ESLint config re-runs every lint that uses it, and no
      // test or build: nothing builds it.
      {
        file: "packages/eslint-config/base.js",
        changes: [
          "//#test:repo",
          "//#lint:repo",
          "web#lint",
          "vite-app#lint",
          "themercn#lint",
          "@workspace/ui#lint",
        ],
        keeps: [
          "web#test",
          "vite-app#test",
          "themercn#test",
          "web#build",
          "themercn#build",
          "@workspace/ui#build",
        ],
      },
      {
        file: "apps/vite/playwright.config.ts",
        changes: ["//#test:repo", "vite-app#e2e"],
        keeps: ["web#test"],
      },
      {
        file: "tests/repo-config.test.ts",
        changes: ["//#test:repo", "//#lint:repo"],
        keeps: ["web#test", "web#lint", "web#build"],
      },
      // So do the e2e detector's tests.
      {
        file: "scripts/e2e-affected.sh",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      // And the agents' Stop hook's, and its wiring's.
      {
        file: ".claude/hooks/stop-t1.sh",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      {
        file: ".claude/settings.json",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      // TESTING.md's T1, which these tests compare with the hook's, and the
      // heavy slot's script, which they run.
      {
        file: "TESTING.md",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      {
        file: "scripts/heavy-slot.sh",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      // The register check compares TESTING.md's register with the paths
      // ADR.
      {
        file: "docs/adr/0002-shared-paths-and-cost-contracts.md",
        changes: ["//#test:repo"],
        keeps: ["web#test", "web#build", "web#e2e"],
      },
      // The build-exclusion checks read the Tailwind entries, which the
      // builds read too.
      {
        file: "packages/ui/src/styles/globals.css",
        changes: ["//#test:repo", "web#build"],
        keeps: [],
      },
      {
        file: "packages/themer/src/styles/themer.css",
        changes: ["//#test:repo", "themercn#build:css"],
        keeps: [],
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

// What a build reads is kept out of it in two places that must agree: the
// build tasks' Turbo inputs (the hash) and Tailwind's `@source not` entries
// (what the CSS can pick up). One list, root build:css's exclusions, is the
// reference; a file it excludes must reach no build's hash and no CSS.
describe("build input exclusions", () => {
  const root = JSON.parse(read("../turbo.json")).tasks
  const themer = JSON.parse(read("../packages/themer/turbo.json")).tasks
  const exclusions = (inputs: string[]) =>
    inputs.filter((glob) => glob.startsWith("!")).map((glob) => glob.slice(1))
  const SHARED: string[] = exclusions(root["build:css"].inputs)
  // Globs that match below any directory (`**/...`), not just a package's.
  const NESTED = SHARED.filter((glob) => glob.startsWith("**/"))
  const UI_SRC = "$TURBO_ROOT$/packages/ui/src"
  const lists: [string, string[]][] = [
    ["build", root.build.inputs],
    ["build:css", root["build:css"].inputs],
    ["themercn build", themer.build.inputs],
    ["themercn build:css", themer["build:css"].inputs],
  ]

  it("excludes the tests, specs, snapshots, docs and test configs", () => {
    expect(SHARED).toEqual(
      expect.arrayContaining([
        "**/*.test.{ts,tsx}",
        "e2e/**",
        "**/__snapshots__/**",
        "**/*-snapshots/**",
        "*.md",
        "vitest.config.*",
        "playwright.config.*",
      ])
    )
  })

  // themercn's own lists replace the root's, so they repeat it; they also
  // keep out their generated CSS and packages/ui's own test files.
  it.each(lists)("%s excludes exactly the shared globs", (_name, inputs) => {
    const own = exclusions(inputs).filter(
      (glob) => glob !== "src/generated/**" && !glob.startsWith(UI_SRC)
    )
    expect(own).toEqual(SHARED)
  })

  it.each(lists.slice(2))(
    "%s excludes them from packages/ui's sources too",
    (_name, inputs) => {
      expect(inputs).toContain(`${UI_SRC}/**`)
      expect(exclusions(inputs).filter((g) => g.startsWith(UI_SRC))).toEqual(
        NESTED.map((glob) => `${UI_SRC}/${glob}`)
      )
    }
  )

  // A Tailwind source path for a Turbo glob under `dir`: `@source not`
  // takes a directory for a `/**` glob.
  const under = (dir: string, glob: string) =>
    `${dir}/${glob.replace(/\/\*\*$/, "")}`
  const sourceNots = (css: string) =>
    [...css.matchAll(/^@source not "([^"]+)";$/gm)].map((match) => match[1])

  // The apps import it: their automatic source detection scans each app's
  // whole directory, and its own `@source` adds packages/ui's sources.
  it("globals.css keeps every excluded file of the apps and ui out of the CSS", () => {
    const css = read("../packages/ui/src/styles/globals.css")
    expect(css).toContain('@source "../**/*.{ts,tsx}";')
    expect(sourceNots(css)).toEqual(
      expect.arrayContaining([
        ...SHARED.map((glob) =>
          glob.startsWith("**/")
            ? under("../../../../apps", glob)
            : under("../../../../apps/*", glob)
        ),
        ...NESTED.map((glob) => under("..", glob)),
      ])
    )
  })

  // A source that names no directory scans nothing, and reads as coverage.
  it.each([
    "../packages/ui/src/styles/globals.css",
    "../packages/themer/src/styles/themer.css",
  ])("every @source in %s names an existing directory", (file) => {
    const sources = [...read(file).matchAll(/^@source "([^"]+)";$/gm)].map(
      (match) => match[1]!.split(/[*{]/)[0]!
    )
    expect(sources.length).toBeGreaterThan(0)
    const missing = sources.filter(
      (path) => !existsSync(new URL(path, new URL(file, import.meta.url)))
    )
    expect(missing).toEqual([])
  })

  it("themer.css keeps every excluded file of its sources out of the CSS", () => {
    const css = read("../packages/themer/src/styles/themer.css")
    expect(css).toMatch(/^@source "\.\.";$/m)
    expect(css).toMatch(/^@source "\.\.\/\.\.\/\.\.\/ui\/src";$/m)
    expect(sourceNots(css)).toEqual(
      expect.arrayContaining(
        ["..", "../../../ui/src"].flatMap((dir) =>
          NESTED.map((glob) => under(dir, glob))
        )
      )
    )
  })
})

describe("shared dependency versions", () => {
  const dependencies = (workspace: string): Record<string, string> =>
    JSON.parse(read(`../${workspace}/package.json`)).dependencies ?? {}

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
        readdirSync(new URL(`../${group}/`, import.meta.url)).map(
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
    const pkg = JSON.parse(read("../package.json"))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(Object.keys(deps)).not.toContain("@workspace/eslint-config")
  })

  it("root engines.node matches the README's Node requirement", () => {
    const required = read("../README.md").match(
      /Requires Node (\d+)\.(\d+) or later/
    )
    expect(required).not.toBeNull()
    const { engines } = JSON.parse(read("../package.json"))
    expect(engines.node).toBe(`>=${required?.[1]}.${required?.[2]}.0`)
  })
  // CI's concurrency (S57) is evaluated per event in themercn's
  // scripts/release-workflow.test.ts, beside the release gate it protects.
})

// `ci-gate` is the single required check (README "Protect `main`"): it
// passes only when every other job passed, so jobs can be added, renamed or
// made conditional without touching branch protection.
describe("the CI gate", () => {
  const entries = Object.entries(ciYml.jobs)
  const gateEntry = entries.find(([id, job]) => (job.name ?? id) === "ci-gate")
  const [gateId, gate] = gateEntry ?? []
  const others = entries.filter(([id]) => id !== gateId)
  const verdict = gate?.steps.find((step) =>
    step.uses?.startsWith("re-actors/alls-green@")
  )

  it("reports a ci-gate check even when needed jobs fail or are skipped", () => {
    for (const status of ["success", "failure", "cancelled"] as const) {
      expect(runsIf(gate?.if, { status }), status).toBe(true)
    }
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
    const protect = read("../README.md").match(
      /\*\*Protect `main`\.\*\*([\s\S]*?)\n\d+\. \*\*/
    )?.[1]
    expect(protect).toBeDefined()
    expect(protect).toContain("`ci-gate`")
    for (const [, job] of others) expect(protect).not.toContain(job.name)
  })
})

// Each Turbo command a step runs (`turbo`, `pnpm turbo` or `pnpm exec
// turbo`, alone on its line): its tasks, whether it selects affected tasks,
// the arguments it passes to the tasks (after `--`), and whether its failure
// fails the job. Any other line naming turbo throws, so a new spelling can't
// slip past the assertions built on this.
const turboCommandsOf = (step: CiStep) =>
  (step.run ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(^|[^\w$-])turbo\b/.test(line))
    .map((line) => {
      const prefix = line.match(/^(?:pnpm (?:exec )?)?turbo /)
      if (!prefix || /&&|\|\||;|\|/.test(line))
        throw new Error(`unrecognised Turbo invocation: ${line}`)
      const words = line.slice(prefix[0].length).split(/\s+/)
      const end = words.includes("--") ? words.indexOf("--") : words.length
      return {
        tasks: words
          .slice(0, end)
          .filter((word) => word !== "run" && !word.startsWith("-")),
        affected: words.slice(0, end).includes("--affected"),
        args: words.slice(end + 1).join(" "),
        raw: line,
        gating: step["continue-on-error"] !== true,
      }
    })

// Pull requests run only the tasks their change affects; every other event
// (push to main, schedule, dispatch, merge queue) runs everything.
describe("CI task selection", () => {
  const [e2eId, e2eJob] =
    Object.entries(ciYml.jobs).find(([, job]) => job.name?.startsWith("E2E")) ??
    []

  // Pushes to main, a weekly schedule, manual dispatch and the merge queue
  // are the backstop: each runs the full suite.
  it("runs on pull requests, pushes to main and the backstop events", () => {
    expect(ciYml.on).toEqual({
      pull_request: {
        types: ["opened", "synchronize", "reopened", "ready_for_review"],
      },
      push: { branches: ["main"] },
      merge_group: null,
      schedule: [{ cron: "0 4 * * 1" }],
      workflow_dispatch: null,
    })
  })

  // A draft pull request (an integration branch while its tickets land)
  // runs no job: the gate runs once, when the pull request is marked ready.
  // The e2e job needs `changes`, so it skips with it.
  it.each([
    [true, false],
    [false, true],
  ])("a pull request with draft %s runs its jobs: %s", (draft, runs) => {
    const github = {
      event_name: "pull_request",
      event: { pull_request: { draft } },
    }
    for (const id of ["checks", "changes", "ci-gate"]) {
      expect({ id, runs: runsIf(ciYml.jobs[id]?.if, { github }) }).toEqual({
        id,
        runs,
      })
    }
    expect(ciYml.jobs[e2eId!]?.needs).toBe("changes")
  })

  it.each(["push", "merge_group", "schedule", "workflow_dispatch"])(
    "%s runs every job",
    (event) => {
      for (const id of ["checks", "changes", "ci-gate"]) {
        expect({
          id,
          runs: runsIf(ciYml.jobs[id]?.if, { github: { event_name: event } }),
        }).toEqual({ id, runs: true })
      }
    }
  )

  // The step conditions this workflow uses: none, or event-name tests
  // joined by `||`.
  // The steps with a `run` that a job runs for an event, given how the job
  // has gone so far (a gating step's failure makes it "failure").
  const stepsFor = (
    event: string,
    job = "checks",
    status: Status = "success"
  ) =>
    ciYml.jobs[job]!.steps.filter(
      (step) =>
        step.run !== undefined &&
        runsIf(step.if, { github: { event_name: event }, status })
    )
  const scriptFor = (event: string, job = "checks") =>
    stepsFor(event, job)
      .map((step) => step.run)
      .join("\n")
  const commandsFor = (
    event: string,
    job = "checks",
    status: Status = "success"
  ) => stepsFor(event, job, status).flatMap(turboCommandsOf)
  // The tasks Turbo runs for an event, and whether each command selects
  // affected tasks.
  const turboFor = (event: string, job = "checks") => {
    const commands = commandsFor(event, job)
    return {
      tasks: [...new Set(commands.flatMap((command) => command.tasks))].sort(),
      selections: commands.map((command) => command.affected),
    }
  }
  // The tasks the checks job runs: everything but the browser tests.
  const CHECK_TASKS = [
    "build",
    "check:package",
    "lint",
    "lint:repo",
    "test",
    "test:repo",
    "typecheck",
  ]

  it("reads every way a step can invoke Turbo, and refuses the rest", () => {
    const step = (run: string): CiStep => ({ run })
    expect(
      turboCommandsOf(
        step(
          [
            "pnpm turbo lint --affected",
            "turbo run build -- --grep x",
            "pnpm exec turbo e2e",
          ].join("\n")
        )
      ).map(({ tasks, affected, args }) => ({ tasks, affected, args }))
    ).toEqual([
      { tasks: ["lint"], affected: true, args: "" },
      { tasks: ["build"], affected: false, args: "--grep x" },
      { tasks: ["e2e"], affected: false, args: "" },
    ])
    expect(() => turboCommandsOf(step("npx turbo lint"))).toThrow()
    expect(() => turboCommandsOf(step("pnpm lint && turbo test"))).toThrow()
  })

  // A container runs as a different user from the checkout's owner, and git
  // refuses such a repository ("dubious ownership"): `git rev-parse` and
  // Turbo's `--affected` both need it trusted first.
  it("container jobs trust their checkout before any step uses git", () => {
    const trust = 'git config --global --add safe.directory "$GITHUB_WORKSPACE"'
    const containerJobs = Object.entries(ciYml.jobs).filter(
      ([, job]) => job.container !== undefined
    )
    expect(containerJobs).not.toEqual([])
    for (const [id, job] of containerJobs) {
      const isTrust = (step: CiStep) => step.run?.trim() === trust
      const usesGit = (step: CiStep) =>
        !isTrust(step) && /\bgit |--affected/.test(step.run ?? "")
      const trustAt = job.steps.findIndex(isTrust)
      expect(trustAt, id).toBeGreaterThan(-1)
      expect(job.steps.findIndex(usesGit), id).toBeGreaterThan(trustAt)
    }
  })

  it("pull requests run every check on its affected tasks only", () => {
    const { tasks, selections } = turboFor("pull_request")
    expect(tasks).toEqual(CHECK_TASKS)
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
      expect(tasks).toEqual(CHECK_TASKS)
      expect(selections).not.toContain(true)
      expect(scriptFor(event)).not.toContain("TURBO_SCM_BASE")
    }
  )

  // A red register check (an over-cap row awaiting the owner, an expired
  // exception) must not hide the rest of the gate: every check still runs
  // and reports after a failed step, and one failing Turbo task doesn't
  // cancel the tasks that don't depend on it.
  it.each([
    "pull_request",
    "push",
    "schedule",
    "workflow_dispatch",
    "merge_group",
  ])("%s runs every check after a failed step", (event) => {
    const commands = commandsFor(event, "checks", "failure")
    expect(
      [...new Set(commands.flatMap((command) => command.tasks))].sort()
    ).toEqual(CHECK_TASKS)
    expect(
      stepsFor(event, "checks", "failure").map((step) => step.run)
    ).toContain("pnpm coverage")
    for (const command of commands) {
      expect(command.raw).toContain("--continue=dependencies-successful")
    }
  })

  // An exception expires with nothing changed, so a Turbo cache hit must not
  // replay the register check's last pass: CI runs it outside Turbo, on
  // every event.
  it.each([
    "pull_request",
    "push",
    "schedule",
    "workflow_dispatch",
    "merge_group",
  ])("%s runs the register check uncached", (event) => {
    expect(scriptFor(event).split("\n")).toContain(
      "pnpm exec vitest run tests/register-check.test.ts"
    )
  })

  // A reviewer reads both outputs: the floor guard runs on a pull request
  // even after the register check failed, but not in a cancelled job.
  it.each(["success", "failure"] as const)(
    "pull_request runs the floor guard after a %s",
    (status) => {
      expect(
        stepsFor("pull_request", "checks", status).map((step) => step.run)
      ).toContain("pnpm floor-guard --base HEAD^1")
    }
  )

  it("the floor guard runs on pull requests only, and not in a cancelled job", () => {
    const runs = (event: string, status: Status) =>
      stepsFor(event, "checks", status).map((step) => step.run)
    expect(runs("pull_request", "cancelled")).not.toContain(
      "pnpm floor-guard --base HEAD^1"
    )
    expect(runs("push", "failure")).not.toContain(
      "pnpm floor-guard --base HEAD^1"
    )
  })

  // The coverage ratchet runs at the merge gate (T2) and the backstop (T3);
  // it pools every package's coverage, so it runs whole, never --affected.
  it.each([
    "pull_request",
    "push",
    "schedule",
    "workflow_dispatch",
    "merge_group",
  ])("%s runs the project coverage command", (event) => {
    expect(scriptFor(event).split("\n")).toContain("pnpm coverage")
    expect(JSON.parse(read("../package.json")).scripts.coverage).toMatch(
      /^turbo run test:coverage && node (--[\w=-]+ )*tests\/coverage\.ts$/
    )
  })

  it("keeps the coverage run out of T1", () => {
    for (const t1 of [
      read("../TESTING.md").match(/\*\*T1, ticket handoff:\*\*.*/)?.[0],
      read("../.claude/hooks/stop-t1.sh"),
    ]) {
      expect(t1).toBeDefined()
      expect(t1).not.toMatch(/coverage/)
    }
  })

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
    const runsWhen = (e2e: string) =>
      runsIf(e2eJob?.if, {
        github: { event_name: "pull_request" },
        needs: { changes: { outputs: { e2e } } },
      })
    expect({ true: runsWhen("true"), false: runsWhen("false") }).toEqual({
      true: true,
      false: false,
    })
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

  // However the gating run went, short of a cancelled job: a quarantined
  // test's record must not depend on the gate passing.
  it.each(
    ["schedule", "workflow_dispatch"].flatMap((event) =>
      (["success", "failure"] as const).map((status) => ({ event, status }))
    )
  )(
    "$event repeats the quarantined tests of every e2e task, without gating, after a gating $status",
    ({ event, status }) => {
      const quarantined = commandsFor(event, e2eId, status).filter((c) =>
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

  it("a cancelled job runs no quarantined test", () => {
    expect(
      commandsFor("schedule", e2eId, "cancelled").filter((c) =>
        QUARANTINED.test(c.args)
      )
    ).toEqual([])
  })

  // The quarantine steps, each with the commands it runs.
  const quarantineSteps = () =>
    (e2eJob?.steps ?? []).filter((step) =>
      turboCommandsOf(step).some((c) => QUARANTINED.test(c.args))
    )

  // A failing step ends its own run: one task's quarantined failures must
  // not skip the other's.
  it("runs each task's quarantined tests in a step of its own", () => {
    const steps = quarantineSteps()
    expect(steps.map((step) => turboCommandsOf(step).length)).toEqual(
      steps.map(() => 1)
    )
  })

  // Its report is the only record of a quarantined test's failures.
  it("a failed quarantine run uploads its report, whichever task failed", () => {
    const upload = e2eJob?.steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@")
    )
    const steps = quarantineSteps()
    expect(steps.length).toBeGreaterThan(1)
    for (const failed of steps) {
      expect(failed.id).toBeDefined()
      const outcomes = Object.fromEntries(
        steps.map((step) => [
          step.id,
          { outcome: step === failed ? "failure" : "success" },
        ])
      )
      expect(
        runsIf(upload?.if, {
          github: { event_name: "schedule" },
          steps: outcomes,
        }),
        failed.id
      ).toBe(true)
    }
    expect(
      runsIf(upload?.if, { github: { event_name: "schedule" }, steps: {} })
    ).toBe(false)
  })

  it.each(["pull_request", "push", "merge_group"])(
    "%s runs no non-gating command",
    (event) => {
      expect(commandsFor(event, e2eId).filter((c) => !c.gating)).toEqual([])
    }
  )

  // Playwright accepts the arguments, and a run with no quarantined test
  // (the usual case) passes.
  it.each(["web", "vite"])(
    "%s's Playwright accepts the quarantine run's arguments",
    (app) => {
      const { args } = commandsFor("schedule", e2eId).find((c) =>
        QUARANTINED.test(c.args)
      )!
      const cwd = fileURLToPath(new URL(`../apps/${app}/`, import.meta.url))
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
    const { futureFlags } = JSON.parse(read("../turbo.json"))
    expect(futureFlags?.affectedUsingTaskInputs).toBe(true)
  })
})

// Runs a repo script (the e2e detector, the Stop hook, the heavy slot) as
// CI, Claude Code or an agent would, in scratch git repositories, with a
// stand-in `pnpm` first on PATH.
// The stand-in appends the command it was given, prefixed with
// `TURBO_SCM_BASE=<base>` when that is set, to a log; prints `stdout`; and
// exits with `exit`. A command containing `fails.on` instead prints
// `fails.stdout` and exits 1.
const scriptSandbox = (name: string) => {
  let scratch = ""
  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), `themercn-${name}-`))
    mkdirSync(join(scratch, "bin"))
    writeFileSync(
      join(scratch, "bin/pnpm"),
      [
        "#!/bin/sh",
        'echo "${TURBO_SCM_BASE:+TURBO_SCM_BASE=$TURBO_SCM_BASE }$*" >> "$PNPM_ARGS"',
        'if [ -n "$PNPM_FAIL_ON" ]; then case "$*" in *"$PNPM_FAIL_ON"*)',
        '  printf "%s\\n" "$PNPM_FAIL_STDOUT"; exit 1;; esac; fi',
        'printf "%s\\n" "$PNPM_STDOUT"',
        'exit "$PNPM_EXIT"',
        "",
      ].join("\n"),
      { mode: 0o755 }
    )
  })
  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  // An empty git repository in the scratch directory.
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
    return { dir, git }
  }

  // The script's exit status and output, and each command the stand-in pnpm
  // ran.
  const run = (
    script: string,
    {
      args = [],
      cwd = scratch,
      input = "",
      env = {},
      pnpm = {},
    }: {
      args?: string[]
      cwd?: string
      input?: string
      env?: Record<string, string>
      pnpm?: {
        exit?: number
        stdout?: string
        fails?: { on: string; stdout: string }
      }
    } = {}
  ) => {
    const log = join(scratch, `pnpm-args-${Math.random()}`)
    const inherited = { ...process.env }
    delete inherited.TURBO_SCM_BASE
    const { status, stdout, stderr, error } = spawnSync(script, args, {
      cwd,
      input,
      encoding: "utf8",
      env: {
        ...inherited,
        // The stand-in pnpm first.
        PATH: `${join(scratch, "bin")}:${process.env.PATH}`,
        PNPM_ARGS: log,
        PNPM_EXIT: String(pnpm.exit ?? 0),
        PNPM_STDOUT: pnpm.stdout ?? "",
        PNPM_FAIL_ON: pnpm.fails?.on ?? "",
        PNPM_FAIL_STDOUT: pnpm.fails?.stdout ?? "",
        ...env,
      },
    })
    if (error) throw error
    return {
      status,
      stdout,
      stderr,
      ran: existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [],
    }
  }

  return { repo, run }
}

// The detector CI's `changes` job runs to decide whether the e2e job runs.
// It fails open: only a pull request whose base resolves and on which Turbo
// reports no affected e2e task that has a script skips the job. Each case
// runs the real script in a scratch repository, with a stand-in `pnpm` whose
// `turbo query` prints the given affected tasks and exits as given.
describe("the e2e detector", () => {
  const DETECTOR = join(ROOT, "scripts/e2e-affected.sh")
  const sandbox = scriptSandbox("e2e-detector")

  // A repository whose HEAD has `commits - 1` ancestors, like the merge
  // commit a pull request checks out (its first parent is the base tip).
  const repo = (commits: number) => {
    const { dir, git } = sandbox.repo()
    for (let i = 0; i < commits; i++) {
      git("commit", "--quiet", "--allow-empty", `--message=${i}`)
    }
    return { dir, git }
  }

  // `turbo query`'s answer listing these affected tasks: [fullName, script].
  const answer = (...items: [string, string | null][]) =>
    JSON.stringify({
      data: {
        affectedTasks: {
          items: items.map(([fullName, script]) => ({
            fullName,
            name: fullName.split("#")[1],
            script,
          })),
        },
      },
    })

  // What the detector tells the e2e job, and the command it ran (if any).
  const detect = ({
    event,
    tasks = ["e2e"],
    turboExit = 0,
    turboStdout = answer(),
    commits = 2,
  }: {
    event: string
    tasks?: string[]
    turboExit?: number
    turboStdout?: string
    commits?: number
  }) => {
    const { dir, git } = repo(commits)
    const output = join(dir, "github-output")
    writeFileSync(output, "")
    const { status, ran } = sandbox.run(DETECTOR, {
      args: tasks,
      cwd: dir,
      env: { GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output },
      pnpm: { exit: turboExit, stdout: turboStdout },
    })
    expect(status).toBe(0)
    return {
      outputs: readFileSync(output, "utf8").trim().split("\n"),
      ran: ran[0],
      base: commits > 1 ? git("rev-parse", "HEAD^1") : undefined,
    }
  }

  it("skips e2e on a pull request with no affected e2e task", () => {
    expect(detect({ event: "pull_request" }).outputs).toEqual(["e2e=false"])
  })

  it("asks Turbo about the given tasks against the merge commit's first parent", () => {
    const { ran, base } = detect({
      event: "pull_request",
      tasks: ["e2e", "visual"],
    })
    expect(ran).toMatch(/^exec turbo query /)
    expect(ran).toContain(
      `affectedTasks(base: "${base}", head: "HEAD", tasks: ["e2e", "visual"])`
    )
  })

  it("runs e2e on a pull request when an e2e task with a script is affected", () => {
    const turboStdout = answer(
      ["web#build", "next build"],
      ["web#e2e", "playwright test"]
    )
    expect(detect({ event: "pull_request", turboStdout }).outputs).toEqual([
      "e2e=true",
    ])
  })

  // `turbo query` lists every package's e2e task, scripted or not, and the
  // tasks the affected ones need: neither is an e2e run.
  it("skips e2e when the affected e2e tasks have no script, or are prerequisites", () => {
    const turboStdout = answer(
      ["themercn#build", "tsdown"],
      ["themercn#e2e", null],
      ["@workspace/ui#e2e", null]
    )
    expect(detect({ event: "pull_request", turboStdout }).outputs).toEqual([
      "e2e=false",
    ])
  })

  it.each([
    { reason: "the query exits 1", turboExit: 1, turboStdout: answer() },
    { reason: "the query exits 2", turboExit: 2, turboStdout: "" },
    { reason: "the query prints no JSON", turboExit: 0, turboStdout: "oops" },
    {
      reason: "the query reports errors",
      turboExit: 0,
      turboStdout: JSON.stringify({ data: null, errors: [{ message: "x" }] }),
    },
  ])("runs e2e on a pull request when $reason", (query) => {
    expect(detect({ event: "pull_request", ...query }).outputs).toEqual([
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
      expect(detect({ event })).toMatchObject({
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
  const WEB = fileURLToPath(new URL("../apps/web/", import.meta.url))
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
    ["web", () => import("../apps/web/playwright.config")],
    ["vite", () => import("../apps/vite/playwright.config")],
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

  // The gate covers the Themer. Tests of the Playground's own pages are
  // tagged `@playground` and run only with PLAYGROUND_E2E=1, which CI never
  // sets.
  describe("the @playground tests", () => {
    type Listed = { project: string; title: string; tags: string[] }
    type Suite = {
      title: string
      suites?: Suite[]
      specs?: {
        title: string
        tags: string[]
        tests: { projectName: string }[]
      }[]
    }
    // The tests `playwright test --list <args>` would run in `app`.
    const listed = (
      app: "web" | "vite",
      args: string[],
      env: Record<string, string> = {}
    ): Listed[] => {
      const cwd = fileURLToPath(new URL(`../apps/${app}/`, import.meta.url))
      // A flag set in the shell running these checks must not leak in.
      const inherited = { ...process.env, PLAYGROUND_E2E: "" }
      const report = JSON.parse(
        execFileSync(
          join(cwd, "node_modules/.bin/playwright"),
          ["test", "--list", "--reporter=json", ...args],
          {
            cwd,
            encoding: "utf8",
            env: { ...inherited, ...env },
            stdio: ["ignore", "pipe", "pipe"],
            maxBuffer: 64 * 1024 * 1024,
          }
        )
      ) as { suites: Suite[] }
      const walk = (suite: Suite, path: string[]): Listed[] => [
        ...(suite.specs ?? []).flatMap((spec) =>
          spec.tests.map((test) => ({
            project: test.projectName,
            title: [...path, spec.title].join(" › "),
            tags: spec.tags.map((tag) => `@${tag.replace(/^@/, "")}`),
          }))
        ),
        ...(suite.suites ?? []).flatMap((child) =>
          walk(child, [...path, child.title])
        ),
      ]
      return report.suites.flatMap((suite) => walk(suite, [suite.title]))
    }
    const playground = (tests: Listed[]) =>
      tests.filter((test) => test.tags.includes("@playground"))

    // A plain run, the visual task, smoke, and CI's gating arguments.
    const GATING_RUNS: Record<"web" | "vite", string[][]> = {
      web: [
        [],
        ["--project=visual"],
        ["--project=chromium", "--grep", "@smoke"],
        ["--project=a11y"],
        ["--grep-invert", "@quarantine"],
        ["--project=visual", "--grep-invert", "@quarantine"],
      ],
      vite: [[], ["--grep", "@smoke"], ["--grep-invert", "@quarantine"]],
    }

    it.each(
      Object.entries(GATING_RUNS).flatMap(([app, runs]) =>
        runs.map((args) => [app as "web" | "vite", args] as const)
      )
    )(
      "%s's %j run leaves them out",
      (app, args) => {
        const tests = listed(app, args)
        expect(tests.length).toBeGreaterThan(0)
        expect(playground(tests)).toEqual([])
      },
      60_000
    )

    it.each([[[] as string[]], [["--project=visual"]], [["--project=a11y"]]])(
      "PLAYGROUND_E2E=1 adds them to web's %j run",
      (args) => {
        const gated = listed("web", args)
        const all = listed("web", args, { PLAYGROUND_E2E: "1" })
        expect(playground(all).length).toBeGreaterThan(0)
        expect(all.length).toBe(gated.length + playground(all).length)
      },
      60_000
    )

    // Smoke is one test per gated journey: none of them is a Playground's.
    it.each(["web", "vite"] as const)(
      "no %s @smoke test is a @playground test",
      (app) => {
        const all = listed(app, [], { PLAYGROUND_E2E: "1" })
        expect(
          playground(all).filter((test) => test.tags.includes("@smoke"))
        ).toEqual([])
      },
      60_000
    )

    it("CI never sets PLAYGROUND_E2E", () => {
      expect(read("../.github/workflows/ci.yml")).not.toMatch(/PLAYGROUND_E2E/)
    })

    it.each(["e2e", "visual", "e2e:smoke"])(
      "the %s task hashes PLAYGROUND_E2E",
      (name) => {
        const { tasks } = JSON.parse(read("../turbo.json"))
        expect(tasks[name].env).toContain("PLAYGROUND_E2E")
      }
    )
  })

  it.each(["visual", "e2e:smoke"])(
    "the %s task hashes, passes through and caches what e2e does",
    (name) => {
      const { tasks } = JSON.parse(read("../turbo.json"))
      const pick = (task: Record<string, unknown>) => ({
        env: task.env,
        passThroughEnv: task.passThroughEnv,
        inputs: task.inputs,
        outputs: task.outputs,
      })
      expect(pick(tasks[name])).toEqual(pick(tasks.e2e))
    }
  )
})

// TESTING.md "Verification tiers": a Stop hook keeps an agent's turn from
// ending while T1 (the changed files' formatting, the affected lint,
// typecheck, test, build and package checks, the floor guard and the
// register check) fails. Each case runs the real hook in a scratch repository, with
// a stand-in `pnpm` that records what it ran and exits as given.
describe("the T1 Stop hook", () => {
  const HOOK = join(ROOT, ".claude/hooks/stop-t1.sh")
  const T1 =
    "turbo run lint lint:repo typecheck test test:repo build check:package --affected"
  // Prettier on the changed files, which CI checks first.
  const format = (...files: string[]) =>
    `exec prettier --check --ignore-unknown -- ${files.join(" ")}`
  // The Floor and the register, uncached, after Turbo.
  const floorGuard = (base: string) => `-s floor-guard --base ${base}`
  const REGISTER_CHECK = "exec vitest run tests/register-check.test.ts"
  const sandbox = scriptSandbox("stop-hook")

  // A repository whose `main` holds one commit, checked out on a branch
  // from it, like an agent's worktree off its integration branch.
  const repo = () => {
    const { dir, git } = sandbox.repo()
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
      fails,
    }: {
      t1Exit?: number
      input?: Record<string, unknown>
      env?: Record<string, string>
      fails?: { on: string; stdout: string }
    } = {}
  ) =>
    sandbox.run(HOOK, {
      // The hook works in the session's cwd from its input, not its own.
      input: JSON.stringify({
        hook_event_name: "Stop",
        cwd: dir,
        stop_hook_active: false,
        ...input,
      }),
      env,
      pnpm: { exit: t1Exit, stdout: "T1 output: lint failed", fails },
    })

  it("allows stopping at once, without running T1, when nothing changed", () => {
    const { dir } = repo()
    expect(stop(dir, { t1Exit: 1 })).toMatchObject({ status: 0, ran: [] })
  })

  it("runs T1 on the affected tasks against the branch's base when files changed", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { status, ran } = stop(dir)
    const base = git("rev-parse", "main")
    expect(status).toBe(0)
    expect(ran).toEqual([
      format("a.ts"),
      `TURBO_SCM_BASE=${base} ${T1} --output-logs=errors-only`,
      floorGuard(base),
      REGISTER_CHECK,
    ])
  })

  // Neither reads Turbo's cache: an assertion deleted without a trailer, or
  // an exception past its expiry, blocks the turn before handoff.
  it.each([
    ["floor guard", "floor-guard", "assertion-removed: a.test.ts"],
    ["register check", "register-check", "exception E1 expired"],
  ])(
    "blocks stopping while the %s fails, with its own message",
    (_, on, message) => {
      const { dir } = repo()
      writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
      const { status, stderr } = stop(dir, { fails: { on, stdout: message } })
      expect(status).toBe(2)
      expect(stderr).toContain(message)
    }
  )

  // A floor-guard block is fixed by a `Quality-change:` trailer, which
  // changes the commits but not the tree.
  it("checks again after a block when only the commits changed", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    git("commit", "--quiet", "--all", "--message=ticket")
    const fails = { on: "floor-guard", stdout: "assertion-removed: a.ts" }
    expect(stop(dir, { fails }).status).toBe(2)
    git(
      "commit",
      "--quiet",
      "--amend",
      "--message=ticket\n\nQuality-change: a.ts: replaced"
    )
    const { status, ran, stdout } = stop(dir, {
      input: { stop_hook_active: true },
    })
    expect({ status, stdout }).toEqual({ status: 0, stdout: "" })
    expect(ran).toContain(floorGuard(git("rev-parse", "main")))
  })

  it("counts untracked changes against the base", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "b.ts"), "export const b = 1\n")
    expect(stop(dir).ran.slice(0, 2)).toEqual([
      format("b.ts"),
      expect.stringContaining(T1),
    ])
  })

  it("counts committed changes against the base, and leaves out deleted files", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "b.ts"), "export const b = 1\n")
    git("add", ".")
    git("rm", "--quiet", "a.ts")
    git("commit", "--quiet", "--message=ticket")
    expect(stop(dir).ran.slice(0, 2)).toEqual([
      format("b.ts"),
      expect.stringContaining(T1),
    ])
  })

  // A tree that passed against this base is not gated again, whoever's
  // turn ends on it (the session, a subagent, a later turn).
  it("does not run T1 again on a tree that passed against the same base", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir).ran).toHaveLength(4)
    expect(stop(dir)).toMatchObject({ status: 0, ran: [] })
    writeFileSync(join(dir, "a.ts"), "export const a = 3\n")
    expect(stop(dir).ran).toHaveLength(4)
  })

  it("runs T1 again on a passed tree when the base moved", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir).ran).toHaveLength(4)
    git("switch", "--quiet", "main")
    git("commit", "--quiet", "--allow-empty", "--message=main moved")
    git("switch", "--quiet", "ticket")
    git("merge", "--quiet", "--no-edit", "main")
    expect(stop(dir).ran).toHaveLength(4)
  })

  it("does not count a failing tree as passed", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir, { t1Exit: 1 }).status).toBe(2)
    expect(stop(dir, { t1Exit: 1 })).toMatchObject({ status: 2 })
  })

  // T1 builds: it waits for the clone's heavy slot (scripts/heavy-slot.sh),
  // and blocks with the reason when the slot stays busy.
  it("runs T1's Turbo tasks in the heavy slot", () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const slot = join(dir, git("rev-parse", "--git-common-dir"), "heavy-slot")
    mkdirSync(slot)
    writeFileSync(join(slot, "pid"), `${process.pid}\n`)
    const { status, ran, stderr } = stop(dir, {
      env: { HEAVY_SLOT_WAIT: "1" },
    })
    expect({ status, ran }).toEqual({
      status: 2,
      ran: [
        format("a.ts"),
        floorGuard(git("rev-parse", "main")),
        REGISTER_CHECK,
      ],
    })
    expect(stderr).toMatch(/heavy slot busy/)
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

  // A pushed branch's upstream is its own remote copy, so against it a
  // pushed ticket would look unchanged and T1 would never run.
  it("compares against main, not the branch's upstream, after a push", () => {
    const { dir, git } = repo()
    const remote = mkdtempSync(join(dir, "..", "remote-"))
    execFileSync("git", ["init", "--quiet", "--bare", remote])
    git("remote", "add", "origin", remote)
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    git("commit", "--quiet", "--all", "--message=ticket")
    git("push", "--quiet", "--set-upstream", "origin", "ticket")
    expect(stop(dir).ran.slice(0, 2)).toEqual([
      format("a.ts"),
      `TURBO_SCM_BASE=${git("rev-parse", "main")} ${T1} --output-logs=errors-only`,
    ])
  })

  it("falls back to origin/main when there is no local main", () => {
    const { dir, git } = repo()
    const remote = mkdtempSync(join(dir, "..", "remote-"))
    execFileSync("git", ["init", "--quiet", "--bare", remote])
    git("remote", "add", "origin", remote)
    git("push", "--quiet", "origin", "main")
    git("fetch", "--quiet", "origin")
    git("branch", "--quiet", "-D", "main")
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir).ran.slice(0, 2)).toEqual([
      format("a.ts"),
      `TURBO_SCM_BASE=${git("rev-parse", "origin/main")} ${T1} --output-logs=errors-only`,
    ])
  })

  it("says why it lets the turn end when no base resolves", () => {
    const { dir, git } = repo()
    git("branch", "--quiet", "-m", "main", "trunk")
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { status, ran, stderr } = stop(dir, { t1Exit: 1 })
    expect({ status, ran }).toEqual({ status: 0, ran: [] })
    expect(stderr).toMatch(/no base.*T1 not run/i)
  })

  it("blocks stopping when the base shares no history with HEAD", () => {
    const { dir, git } = repo()
    git("switch", "--quiet", "--orphan", "unrelated")
    git("commit", "--quiet", "--allow-empty", "--message=unrelated")
    git("switch", "--quiet", "ticket")
    const { status, stderr } = stop(dir, {
      env: { TURBO_SCM_BASE: "unrelated" },
    })
    expect(status).toBe(2)
    expect(stderr).toMatch(/unrelated shares no history with HEAD/)
  })

  it("blocks stopping while T1 fails, with T1's output as the reason", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { status, stderr } = stop(dir, { t1Exit: 1 })
    expect(status).toBe(2)
    expect(stderr).toContain("T1 output: lint failed")
  })

  // SubagentStop carries the same cwd and stop_hook_active fields.
  it("blocks a subagent from stopping the same way", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const input = {
      hook_event_name: "SubagentStop",
      agent_id: "def456",
      agent_type: "general-purpose",
    }
    expect(stop(dir, { t1Exit: 1, input })).toMatchObject({
      status: 2,
      stderr: expect.stringContaining("T1 output: lint failed"),
    })
    expect(
      stop(dir, { t1Exit: 1, input: { ...input, stop_hook_active: true } })
    ).toMatchObject({ status: 0, ran: [] })
  })

  it("never runs e2e or the visual baselines", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    const { ran } = stop(dir, { t1Exit: 1 })
    expect(ran).toHaveLength(4)
    for (const command of ran) {
      // Past the base SHA, whose hex digits can spell "e2e".
      expect(command.replace(/^TURBO_SCM_BASE=\S+ /, "")).not.toMatch(
        /e2e|visual|smoke|playwright/
      )
    }
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

  // Letting the turn end is no pass: the user is told T1 is still red.
  it("warns the user that T1 still fails when it lets the turn end", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    stop(dir, { t1Exit: 1 })
    const { stdout, stderr } = stop(dir, {
      t1Exit: 1,
      input: { stop_hook_active: true },
    })
    const { systemMessage } = JSON.parse(stdout) as { systemMessage: string }
    for (const message of [systemMessage, stderr]) {
      expect(message).toMatch(/T1 still fails/)
      expect(message).toMatch(/not done/)
    }
  })

  it("re-runs T1 and blocks again when files changed since the block", () => {
    const { dir } = repo()
    writeFileSync(join(dir, "a.ts"), "export const a = 2\n")
    expect(stop(dir, { t1Exit: 1 }).status).toBe(2)
    writeFileSync(join(dir, "a.ts"), "export const a = 3\n")
    expect(
      stop(dir, { t1Exit: 1, input: { stop_hook_active: true } })
    ).toMatchObject({
      status: 2,
      ran: [
        format("a.ts"),
        expect.stringContaining(T1),
        expect.stringContaining("floor-guard"),
        REGISTER_CHECK,
      ],
    })
  })

  // TESTING.md's T1 runs the same tasks the hook does.
  it("TESTING.md's T1 runs the hook's tasks", () => {
    const line = read("../TESTING.md")
      .split("\n")
      .find((text) => text.startsWith("- **T1,"))
    const command = line?.match(
      /`(?:TURBO_SCM_BASE=\S+ )?(?:scripts\/heavy-slot\.sh )?pnpm (turbo run [^`]+)`/
    )
    const tasks = (text: string) =>
      text
        .split(/\s+/)
        .slice(2)
        .filter((word) => !word.startsWith("-"))
        .sort()
    expect(command?.[1]).toBeDefined()
    expect(tasks(command![1]!)).toEqual(tasks(T1))
    expect(line).toContain("`pnpm -s floor-guard --base <base>`")
    expect(line).toContain(`\`pnpm ${REGISTER_CHECK}\``)
  })

  // Subagents too: agents in parallel worktrees are gated like the session.
  it.each(["Stop", "SubagentStop"])(
    "Claude Code runs it on %s, from the project's settings",
    (event) => {
      const settings = JSON.parse(read("../.claude/settings.json"))
      const handlers = (settings.hooks?.[event] ?? []).flatMap(
        (group: { hooks: { type: string; command: string }[] }) => group.hooks
      )
      expect(handlers).toEqual([
        expect.objectContaining({
          type: "command",
          command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/stop-t1.sh',
        }),
      ])
    }
  )
})

// TESTING.md "Verification tiers": one heavy suite (a build, Playwright, the
// Docker visual run) at a time per host. scripts/heavy-slot.sh runs a
// command in the clone's one slot, shared by all its worktrees.
describe("the heavy slot", () => {
  const SLOT_SCRIPT = join(ROOT, "scripts/heavy-slot.sh")
  const sandbox = scriptSandbox("heavy-slot")
  const slotOf = (dir: string, git: (...args: string[]) => string) =>
    join(dir, git("rev-parse", "--git-common-dir"), "heavy-slot")
  const hold = (slot: string, pid: number) => {
    mkdirSync(slot)
    writeFileSync(join(slot, "pid"), `${pid}\n`)
  }
  const run = (dir: string, exit = 0) =>
    sandbox.run(SLOT_SCRIPT, {
      args: ["pnpm", "e2e:smoke"],
      cwd: dir,
      env: { HEAVY_SLOT_WAIT: "1" },
      pnpm: { exit },
    })

  it("runs the command, exits with its status and frees the slot", () => {
    const { dir, git } = sandbox.repo()
    expect(run(dir, 3)).toMatchObject({ status: 3, ran: ["e2e:smoke"] })
    expect(existsSync(slotOf(dir, git))).toBe(false)
    expect(run(dir)).toMatchObject({ status: 0, ran: ["e2e:smoke"] })
  })

  it("does not run the command while a live process holds the slot", () => {
    const { dir, git } = sandbox.repo()
    hold(slotOf(dir, git), process.pid)
    const { status, ran, stderr } = run(dir)
    expect({ status, ran }).toEqual({ status: 75, ran: [] })
    expect(stderr).toMatch(new RegExp(`heavy slot busy.*pid ${process.pid}`))
  })

  it("takes over a slot whose holder has exited", () => {
    const { dir, git } = sandbox.repo()
    const exited = spawnSync("true").pid!
    hold(slotOf(dir, git), exited)
    expect(run(dir)).toMatchObject({ status: 0, ran: ["e2e:smoke"] })
  })

  // Worktrees of one clone share the slot.
  it("is shared by the clone's worktrees", () => {
    const { dir, git } = sandbox.repo()
    git("commit", "--quiet", "--allow-empty", "--message=base")
    const worktree = `${dir}-worktree`
    git("worktree", "add", "--quiet", worktree)
    hold(slotOf(dir, git), process.pid)
    expect(run(worktree)).toMatchObject({ status: 75, ran: [] })
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
