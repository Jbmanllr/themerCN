import { execFileSync, spawnSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { PATHS_ADR } from "./register"

// The floor guard (tests/floor-guard.ts), run as CI and the root script run
// it, in scratch git repositories: a base commit on `main`, then a change on
// a `work` branch, committed or left in the work tree.

const GUARD = fileURLToPath(new URL("./floor-guard.ts", import.meta.url))

const REGISTER = `# Testing

## Quality register

### Floor

Prose the guard does not read.

### Enforced

**Project**

| Dimension   | Rule | Checked by                 | Runs at          |
| ----------- | ---- | -------------------------- | ---------------- |
| Type errors | 0    | \`pnpm turbo run typecheck\` | implementer done |

**Store action** (per \`set\`)

| Metric      | Rule                            | Checked by                       | Runs at          |
| ----------- | ------------------------------- | -------------------------------- | ---------------- |
| stringifies | 1 persisted change; 0 no change | \`src/store-action.count.test.ts\` | implementer done |

### Measured, not yet enforced

**Store action** (per \`set\`)

| Metric        | Today      | Direction     | Runs at          |
| ------------- | ---------- | ------------- | ---------------- |
| storage reads | 2          | must not grow | implementer done |
| deep compares | unmeasured | must not grow | implementer done |

**Project**

| Metric           | Today | Direction     | Runs at    |
| ---------------- | ----- | ------------- | ---------- |
| project coverage | 80 %  | must not fall | merge gate |

### Exceptions

| ID  | Rule          | Path         | Reason | Owner | Expires    |
| --- | ------------- | ------------ | ------ | ----- | ---------- |
| E1  | storage reads | Store action | debt   | owner | 2027-01-01 |
`

const ADR = `# Shared paths

## Decision

| Path         | Unit    | Register rows                                                                       |
| ------------ | ------- | ----------------------------------------------------------------------------------- |
| Store action | one set | stringifies (1 persisted change; 0 no change), storage reads (3), deep compares (3) |
`

let scratch = ""
beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "themercn-floor-guard-"))
})
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

// A repository whose `main` holds the register, the paths ADR and a test
// file, checked out on a new `work` branch.
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
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: dir, encoding: "utf8", env: gitless() }
    ).trim()
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  const read = (path: string) => readFileSync(join(dir, path), "utf8")
  const edit = (path: string, from: string, to: string) => {
    const text = read(path)
    if (!text.includes(from)) throw new Error(`${path} lacks ${from}`)
    write(path, text.replace(from, to))
  }
  const commit = (message = "Change", ...trailers: string[]) => {
    git("add", "--all")
    git(
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      [message, ...(trailers.length ? ["", ...trailers] : [])].join("\n")
    )
  }
  git("init", "--quiet", "--initial-branch=main")
  write("TESTING.md", REGISTER)
  write(PATHS_ADR, ADR)
  write(
    "src/math.test.ts",
    [
      'import { expect, it } from "vitest"',
      "",
      'it("adds", () => {',
      "  expect(1 + 1).toBe(2)",
      "  expect(2 + 2).toBe(4)",
      "})",
      "",
    ].join("\n")
  )
  write("src/math.ts", "export const add = (a: number, b: number) => a + b\n")
  commit("Base")
  git("checkout", "--quiet", "-b", "work")
  return { dir, git, write, read, edit, commit }
}

/** The environment without git's own variables, which a hook (pre-push)
 *  sets and which would point git at the real repository. */
const gitless = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
  )

const guard = (cwd: string, base = "main") => {
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      GUARD,
      "--base",
      base,
    ],
    { cwd, encoding: "utf8", env: gitless() }
  )
  return { status, output: stdout + stderr }
}

// Each case builds a repository and runs a Node process: seconds, not
// milliseconds, on a loaded machine.
describe("floor guard", { timeout: 30_000 }, () => {
  it("passes a change that lowers no bar", () => {
    const { dir, write, commit } = repo()
    write("src/math.ts", "export const add = (a: number, b: number) => b + a\n")
    commit()
    expect(guard(dir)).toEqual({ status: 0, output: "floor-guard: clean\n" })
  })

  describe("flags a new suppression comment", () => {
    it.each([
      ["@ts-ignore", "// @ts-ignore"],
      ["@ts-expect-error", "// @ts-expect-error"],
      ["@ts-nocheck", "// @ts-nocheck"],
      ["eslint-disable", "// eslint-disable-next-line no-console"],
      ["prettier-ignore", "// prettier-ignore"],
    ])("%s", (_, comment) => {
      const { dir, write, commit } = repo()
      write("src/math.ts", `${comment}\nexport const add = 1\n`)
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[silenced-checker] src/math.ts:1")
    })

    it("in an untracked file", () => {
      const { dir, write } = repo()
      write("src/new.ts", "// @ts-ignore\nexport const x = 1\n")
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[silenced-checker] src/new.ts:1")
    })

    it("but not in Markdown, which suppresses nothing", () => {
      const { dir, write, commit } = repo()
      write("NOTES.md", "Never add `// @ts-ignore`.\n")
      commit()
      expect(guard(dir).status).toBe(0)
    })
  })

  describe("flags unfinished work", () => {
    it.each([
      ["a not-implemented stub", 'throw new Error("Not implemented")'],
      ["a TODO", "// TODO: the real thing"],
      ["an empty catch", "try { run() } catch {}"],
      ["an empty catch over lines", "try {\n  run()\n} catch (error) {\n}"],
    ])("%s", (_, code) => {
      const { dir, write, commit } = repo()
      write("src/work.ts", `export const work = () => {\n${code}\n}\n`)
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[unfinished-work] src/work.ts:")
    })
  })

  describe("flags a test made easier", () => {
    it("a skipped test", () => {
      const { dir, edit, commit } = repo()
      edit("src/math.test.ts", 'it("adds"', 'it.skip("adds"')
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[test-skipped] src/math.test.ts:3")
    })

    it("a deleted test file", () => {
      const { dir, git, commit } = repo()
      git("rm", "--quiet", "src/math.test.ts")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[test-deleted] src/math.test.ts")
    })

    it("an assertion removed from a test that remains", () => {
      const { dir, edit, commit } = repo()
      edit("src/math.test.ts", "  expect(2 + 2).toBe(4)\n", "")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[assertion-removed] src/math.test.ts:5")
    })

    it("but not an assertion rewritten in place", () => {
      const { dir, edit, commit } = repo()
      edit("src/math.test.ts", "toBe(4)", "toStrictEqual(4)")
      commit()
      expect(guard(dir).status).toBe(0)
    })
  })

  describe("flags a secret by location, never by value", () => {
    it.each([
      ["private key", "-----BEGIN RSA PRIVATE KEY-----"],
      ["GitHub token", `ghp_${"a1B2".repeat(9)}`],
      ["Vercel token", `vcp_${"Zx9Y".repeat(6)}`],
      ["Google API key", `AIza${"Sy0_-k".repeat(6)}abcde`],
    ])("%s", (kind, secret) => {
      const { dir, write, commit } = repo()
      write("config/keys.txt", `first\nkey = ${secret}\n`)
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain(`[secret (${kind})] config/keys.txt:2`)
      expect(output).not.toContain(secret)
    })
  })

  describe("flags a weakened register row", () => {
    it.each([
      [
        "a raised Rule",
        "| 1 persisted change; 0 no change | `src",
        "| 2 persisted change; 0 no change | `src",
        "row-loosened",
        "Store action: stringifies",
      ],
      [
        "a raised Today on a must-not-grow row",
        "| storage reads | 2 ",
        "| storage reads | 3 ",
        "row-loosened",
        "Store action: storage reads",
      ],
      [
        "a lowered Today on a must-not-fall row",
        "| 80 %  | must not fall",
        "| 79 %  | must not fall",
        "row-loosened",
        "Project: project coverage",
      ],
      [
        "a removed row",
        "| deep compares | unmeasured | must not grow | implementer done |\n",
        "",
        "row-removed",
        "Store action: deep compares",
      ],
      [
        "a changed Checked by",
        "`src/store-action.count.test.ts`",
        "`src/other.count.test.ts`       ",
        "row-command-changed",
        "Store action: stringifies",
      ],
      [
        "a changed Runs at",
        "| 2          | must not grow | implementer done |",
        "| 2          | must not grow | merge gate       |",
        "row-runs-at-changed",
        "Store action: storage reads",
      ],
      [
        "a new Exceptions row",
        "| 2027-01-01 |\n",
        "| 2027-01-01 |\n| E2  | deep compares | Store action | debt | owner | 2027-02-01 |\n",
        "exception-added",
        "Exceptions: E2",
      ],
      [
        "an extended exception",
        "| 2027-01-01 |",
        "| 2027-06-01 |",
        "exception-extended",
        "Exceptions: E1",
      ],
    ])("%s", (_, from, to, rule, name) => {
      const { dir, edit, commit } = repo()
      edit("TESTING.md", from, to)
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain(`[${rule}] TESTING.md: ${name}\n`)
    })

    it("names the row, which a trailer can accept", () => {
      const { dir, edit, commit } = repo()
      edit("TESTING.md", "| storage reads | 2 ", "| storage reads | 3 ")
      commit(
        "Raise within the contract",
        "Quality-change: Store action: storage reads: within the cap, #123"
      )
      const { status, output } = guard(dir)
      expect(status).toBe(0)
      expect(output).toContain(
        "accepted [row-loosened] TESTING.md: Store action: storage reads"
      )
    })

    it.each([
      ["a lowered figure", "| storage reads | 2 ", "| storage reads | 1 "],
      ["a raised must-not-fall figure", "| 80 %  |", "| 81 %  |"],
      [
        "an added row",
        "| deep compares | unmeasured | must not grow | implementer done |\n",
        "| deep compares | unmeasured | must not grow | implementer done |\n| measures | 1 | must not grow | implementer done |\n",
      ],
      [
        "a first measurement",
        "| deep compares | unmeasured |",
        "| deep compares | 3          |",
      ],
      [
        "a dropped exception",
        "| E1  | storage reads | Store action | debt   | owner | 2027-01-01 |\n",
        "",
      ],
    ])("but passes %s", (_, from, to) => {
      const { dir, edit, commit } = repo()
      edit("TESTING.md", from, to)
      commit()
      expect(guard(dir)).toEqual({ status: 0, output: "floor-guard: clean\n" })
    })

    it("but passes a promotion to Enforced at the measured figure", () => {
      const { dir, edit, commit } = repo()
      edit(
        "TESTING.md",
        "| storage reads | 2          | must not grow | implementer done |\n",
        ""
      )
      edit(
        "TESTING.md",
        "| implementer done |\n\n### Measured",
        "| implementer done |\n| storage reads | 1 | `src/store-action.count.test.ts` | implementer done |\n\n### Measured"
      )
      commit()
      expect(guard(dir)).toEqual({ status: 0, output: "floor-guard: clean\n" })
    })

    it("flags a register the reader cannot read", () => {
      const { dir, edit, commit } = repo()
      edit("TESTING.md", "| storage reads | 2 ", "| storage reads | two ")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain("[register-unreadable] TESTING.md")
    })
  })

  describe("flags a raised cap in the paths ADR", () => {
    it("a raised cap", () => {
      const { dir, edit, commit } = repo()
      edit(PATHS_ADR, "storage reads (3)", "storage reads (4)")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain(
        `[cap-raised] ${PATHS_ADR}: Store action: storage reads\n`
      )
    })

    it("a raised outcome cap, accepted by a trailer naming it", () => {
      const { dir, edit, commit } = repo()
      edit(PATHS_ADR, "0 no change", "1 no change")
      commit(
        "Amend the ADR",
        `Quality-change: ${PATHS_ADR}: Store action: stringifies: amended`
      )
      const { status, output } = guard(dir)
      expect(status).toBe(0)
      expect(output).toContain(`accepted [cap-raised] ${PATHS_ADR}`)
    })

    it("but passes a lowered cap", () => {
      const { dir, edit, commit } = repo()
      edit(PATHS_ADR, "storage reads (3)", "storage reads (2)")
      commit()
      expect(guard(dir).status).toBe(0)
    })
  })

  describe("flags a change to the gate's own files", () => {
    it.each([
      "tests/register.ts",
      "tests/register-check.test.ts",
      "tests/floor-guard.ts",
      "packages/themer/src/test/counting.ts",
      "packages/themer/src/stores/store-action.count.test.ts",
      "apps/web/e2e/frame-chunk.count.spec.ts",
    ])("%s", (file) => {
      const { dir, write, commit } = repo()
      write(file, "export {}\n")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(1)
      expect(output).toContain(`[gate-file-changed] ${file}`)
    })

    it("accepted by a Quality-change trailer naming the file", () => {
      const { dir, write, commit } = repo()
      write("tests/register.ts", "export {}\n")
      commit("Gate", "Quality-change: tests/register.ts: gate spec #119")
      const { status, output } = guard(dir)
      expect(status).toBe(0)
      expect(output).toContain(
        "accepted [gate-file-changed] tests/register.ts\n  (Quality-change: tests/register.ts: gate spec #119)"
      )
    })
  })

  describe("accepts the register's prescribed forms", () => {
    const EXAMPLES = "packages/themer/src/components/preview/examples/chart.tsx"

    it("a single-rule eslint-disable-next-line with a reason in the shadcn examples", () => {
      const { dir, write, commit } = repo()
      write(
        EXAMPLES,
        "// eslint-disable-next-line react-hooks/set-state-in-effect -- as shadcn wrote it\nsetRange(1)\n"
      )
      commit()
      expect(guard(dir).status).toBe(0)
    })

    it.each([
      ["without a reason", "// eslint-disable-next-line no-console"],
      [
        "with two rules",
        "// eslint-disable-next-line no-console, no-alert -- why",
      ],
    ])("but not one %s", (_, comment) => {
      const { dir, write, commit } = repo()
      write(EXAMPLES, `${comment}\nsetRange(1)\n`)
      commit()
      expect(guard(dir).status).toBe(1)
    })

    it("a platform test.skip with a reason at the top of a visual-baseline spec", () => {
      const { dir, write, commit } = repo()
      write(
        "apps/web/e2e/visual.spec.ts",
        [
          'import { test } from "@playwright/test"',
          "",
          "test.skip(",
          '  process.platform !== "linux",',
          '  "visual baselines are Linux-only"',
          ")",
          "",
        ].join("\n")
      )
      commit()
      expect(guard(dir).status).toBe(0)
    })

    it("but not a named test skipped in a visual-baseline spec", () => {
      const { dir, write, commit } = repo()
      write(
        "apps/web/e2e/visual.spec.ts",
        'test.skip("home", async () => {})\n'
      )
      commit()
      expect(guard(dir).status).toBe(1)
    })
  })

  it("accepts a finding a Quality-change trailer names, and prints it", () => {
    const { dir, git, commit } = repo()
    git("rm", "--quiet", "src/math.test.ts")
    commit(
      "Replace the test at the deepened interface",
      "Quality-change: src/math.test.ts: replaced by src/calc.test.ts"
    )
    const { status, output } = guard(dir)
    expect(status).toBe(0)
    expect(output).toContain("floor-guard: accepted [test-deleted]")
    expect(output).toContain("floor-guard: clean, 1 accepted finding(s)")
  })

  it("ignores a trailer on a commit before the merge base", () => {
    const { dir, git, write, commit } = repo()
    git("checkout", "--quiet", "main")
    commit("Old", "Quality-change: src/math.ts: long ago")
    git("checkout", "--quiet", "work")
    git("merge", "--quiet", "main")
    write("src/math.ts", "// @ts-ignore\nexport const add = 1\n")
    commit()
    expect(guard(dir).status).toBe(1)
  })

  describe("exits 2 when it cannot run", () => {
    it("with no merge base", () => {
      const { dir, git, write, commit } = repo()
      git("checkout", "--quiet", "--orphan", "unrelated")
      write("other.ts", "export {}\n")
      commit()
      const { status, output } = guard(dir)
      expect(status).toBe(2)
      expect(output).toContain("no merge base against main")
    })

    it("with a base that does not exist", () => {
      const { dir } = repo()
      expect(guard(dir, "origin/main").status).toBe(2)
    })

    it("outside a git work tree", () => {
      const dir = mkdtempSync(join(scratch, "plain-"))
      const { status, output } = guard(dir)
      expect(status).toBe(2)
      expect(output).toContain("not inside a git work tree")
    })
  })

  it("reads the work tree, committed or not", () => {
    const { dir, write } = repo()
    unlinkSync(join(dir, "src/math.test.ts"))
    write("src/math.ts", "export const add = 0\n")
    const { status, output } = guard(dir)
    expect(status).toBe(1)
    expect(output).toContain("[test-deleted] src/math.test.ts")
  })
})
