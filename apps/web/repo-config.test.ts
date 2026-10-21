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
