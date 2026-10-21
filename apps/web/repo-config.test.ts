import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"
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

// The task graph `turbo run <args>` would run, without running it.
type DryTask = { taskId: string; command: string; dependencies: string[] }
const dryRun = (...args: string[]): DryTask[] =>
  JSON.parse(
    execFileSync("pnpm", ["exec", "turbo", "run", ...args, "--dry=json"], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  ).tasks
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
