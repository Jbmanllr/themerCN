import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

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

  it("covers the Playground, the Vite app and the ui package", () => {
    expect(linted).toEqual(
      expect.arrayContaining(["apps/vite", "apps/web", "packages/ui"])
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
