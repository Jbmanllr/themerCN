import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { checkRegister, type RegisterCheckInput } from "./register-check"
import { PATHS_ADR } from "./register"

// The register check (TESTING.md, Quality register, Rules): the register and
// the paths ADR can't drift apart, an enforced row's command can't stop
// existing, and an exception fails the gate on its expiry date. CI's checks
// job runs this file once more, uncached, on every run, so an expiry fails
// with nothing changed.

const TESTING = `## Quality register

### Enforced

**Project**

| Dimension   | Rule | Checked by                 | Runs at          |
| ----------- | ---- | -------------------------- | ---------------- |
| Type errors | 0    | \`pnpm turbo run typecheck\` | implementer done |

**Store action** (per \`set\`)

| Metric      | Rule                            | Checked by                                                     | Runs at          |
| ----------- | ------------------------------- | -------------------------------------------------------------- | ---------------- |
| stringifies | 1 persisted change; 0 no change | \`pnpm --filter themercn exec vitest run src/store.count.test.ts\` | implementer done |

### Measured, not yet enforced

**Store action** (per \`set\`)

| Metric        | Today      | Direction     | Runs at          |
| ------------- | ---------- | ------------- | ---------------- |
| storage reads | unmeasured | must not grow | implementer done |

**Inspector pointer move** (per \`mousemove\`)

| Metric                  | Today | Direction     | Checked by                                                         | Runs at          |
| ----------------------- | ----- | ------------- | ------------------------------------------------------------------ | ---------------- |
| \`closest(ignore)\` calls | 1     | must not grow | \`pnpm --filter themercn exec vitest run src/inspector.count.test.ts\` | implementer done |
| measures                | 0 same element; 1 new element | must not grow | \`pnpm --filter themercn exec vitest run src/inspector.count.test.ts\` | implementer done |

**Project**

| Metric           | Today      | Direction     | Runs at    |
| ---------------- | ---------- | ------------- | ---------- |
| project coverage | unmeasured | must not fall | merge gate |

### Exceptions

| ID  | Rule | Path | Reason | Owner | Expires |
| --- | ---- | ---- | ------ | ----- | ------- |
`

const ADR = `## Decision

| Path                   | Benchmark  | Register rows |
| ---------------------- | ---------- | ------------- |
| Store action           | count test | stringifies (1 persisted change; 0 no change), storage reads (0) |
| Inspector pointer move | count test | \`closest(ignore)\` calls (1), measures (0 same element; 1 new element) |
`

const FILES: Record<string, string> = {
  "packages/themer/src/store.count.test.ts": `it("stringifies", () => {})`,
  "packages/themer/src/inspector.count.test.ts": `"\`closest(ignore)\` calls", "measures"`,
}

const input = (
  overrides: Partial<RegisterCheckInput> = {}
): RegisterCheckInput => ({
  testing: TESTING,
  adr: ADR,
  today: "2026-11-06",
  readFile: (path) => FILES[path],
  workspaces: { themercn: "packages/themer" },
  countTests: [],
  ...overrides,
})

const withException = (path: string, rule: string, expires: string) =>
  TESTING.replace(
    "| --- | ---- | ---- | ------ | ----- | ------- |",
    `| --- | ---- | ---- | ------ | ----- | ------- |\n| E1  | ${rule} | ${path} | debt, #111 | owner | ${expires} |`
  )

describe("the register check", () => {
  it("passes a register that agrees with its ADR and repo", () => {
    expect(checkRegister(input())).toEqual([])
  })

  describe("a row's command", () => {
    it("fails when it names a test file that doesn't exist", () => {
      const files: Record<string, string | undefined> = {
        ...FILES,
        "packages/themer/src/store.count.test.ts": undefined,
      }
      expect(checkRegister(input({ readFile: (p) => files[p] }))).toEqual([
        "Store action: stringifies: its command names packages/themer/src/store.count.test.ts, which does not exist",
      ])
    })

    it("fails when its test file doesn't name the row", () => {
      const files: Record<string, string> = {
        ...FILES,
        "packages/themer/src/store.count.test.ts": "it()",
      }
      expect(checkRegister(input({ readFile: (p) => files[p] }))).toEqual([
        "Store action: stringifies: packages/themer/src/store.count.test.ts does not name the row",
      ])
    })

    it("fails when a measured path row's command names a test file that doesn't exist, or one that doesn't name the row", () => {
      const files: Record<string, string> = {
        "packages/themer/src/store.count.test.ts": `it("stringifies", () => {})`,
        "packages/themer/src/inspector.count.test.ts": `"measures"`,
      }
      expect(checkRegister(input({ readFile: (p) => files[p] }))).toEqual([
        "Inspector pointer move: `closest(ignore)` calls: packages/themer/src/inspector.count.test.ts does not name the row",
      ])
      const testing = TESTING.replaceAll(
        "src/inspector.count.test.ts",
        "src/gone.count.test.ts"
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "Inspector pointer move: `closest(ignore)` calls: its command names packages/themer/src/gone.count.test.ts, which does not exist",
        "Inspector pointer move: measures: its command names packages/themer/src/gone.count.test.ts, which does not exist",
      ])
    })

    it("resolves a repo-relative test file without a --filter", () => {
      const testing = TESTING.replace(
        "pnpm --filter themercn exec vitest run src/store.count.test.ts",
        "pnpm exec vitest run packages/themer/src/store.count.test.ts"
      )
      expect(checkRegister(input({ testing }))).toEqual([])
    })
  })

  describe("an exception", () => {
    it("fails on its expiry date", () => {
      const testing = withException(
        "Inspector pointer move",
        "measures",
        "2026-11-06"
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "exception E1 (Inspector pointer move: measures) expired on 2026-11-06",
      ])
    })

    it("passes the day before", () => {
      const testing = withException(
        "Inspector pointer move",
        "measures",
        "2026-11-07"
      )
      expect(checkRegister(input({ testing }))).toEqual([])
    })

    it("fails on an expiry that isn't a date", () => {
      const testing = withException(
        "Inspector pointer move",
        "measures",
        "soon"
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "exception E1 (Inspector pointer move: measures) has no YYYY-MM-DD expiry: soon",
      ])
    })
  })

  it("fails when an ADR path has no register section", () => {
    const adr = `${ADR}| Page load | count test | first applies (1) |\n`
    expect(checkRegister(input({ adr }))).toEqual([
      "Page load: the paths ADR's path has no section in the register",
    ])
  })

  describe("the ADR's Register rows column and the register", () => {
    it("fails on an ADR row the register lacks", () => {
      const adr = ADR.replace(
        "storage reads (0)",
        "storage reads (0), parses (0)"
      )
      expect(checkRegister(input({ adr }))).toEqual([
        "Store action: parses: in the paths ADR's Register rows, not in the register",
      ])
    })

    it("fails on a register row the ADR lacks", () => {
      const adr = ADR.replace(", storage reads (0)", "")
      expect(checkRegister(input({ adr }))).toEqual([
        "Store action: storage reads: in the register, not in the paths ADR's Register rows",
      ])
    })

    it("fails on a register path the ADR lacks", () => {
      const adr = ADR.split("\n")
        .filter((line) => !line.startsWith("| Inspector"))
        .join("\n")
      expect(checkRegister(input({ adr }))).toEqual([
        "Inspector pointer move: the register's path is not in the paths ADR",
      ])
    })
  })

  describe("a figure over its ADR cap", () => {
    const over = TESTING.replace(
      "| `closest(ignore)` calls | 1     |",
      "| `closest(ignore)` calls | 2     |"
    )

    it("fails, naming the figure and the cap", () => {
      expect(checkRegister(input({ testing: over }))).toEqual([
        "Inspector pointer move: `closest(ignore)` calls: 2 exceeds the paths ADR's cap of 1",
      ])
    })

    it("passes with an unexpired exception naming the row", () => {
      const testing = withException(
        "Inspector pointer move",
        "`closest(ignore)` calls",
        "2027-01-31"
      ).replace(
        "| `closest(ignore)` calls | 1     |",
        "| `closest(ignore)` calls | 2     |"
      )
      expect(checkRegister(input({ testing }))).toEqual([])
    })

    it("fails per outcome", () => {
      const testing = TESTING.replace(
        "0 same element; 1 new element",
        "1 same element; 1 new element"
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "Inspector pointer move: measures: 1 same element exceeds the paths ADR's cap of 0",
      ])
    })

    it("compares one count for every outcome with each outcome's cap", () => {
      const testing = TESTING.replace(
        "0 same element; 1 new element",
        "1                            "
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "Inspector pointer move: measures: 1 same element exceeds the paths ADR's cap of 0",
      ])
    })

    it("compares an enforced row's rule too", () => {
      const testing = TESTING.replace(
        "| 1 persisted change; 0 no change |",
        "| 1 persisted change; 1 no change |"
      )
      expect(checkRegister(input({ testing }))).toEqual([
        "Store action: stringifies: 1 no change exceeds the paths ADR's cap of 0",
      ])
    })

    it("leaves an outcome the cap doesn't name to the contract text", () => {
      const testing = TESTING.replace(
        "0 same element; 1 new element",
        "0 same element; 1 new element; 3 card shown"
      )
      expect(checkRegister(input({ testing }))).toEqual([])
    })
  })

  describe("a path row still unmeasured", () => {
    const files: Record<string, string> = {
      ...FILES,
      "packages/themer/src/store.count.test.ts": `const PATH = "Store action"\nit("stringifies", () => {})`,
      "packages/themer/src/page.count.test.ts": `const PATH = "Page load"`,
      "tests/project.count.test.ts": `const PATH = "Project"`,
    }
    const withCountTests = (countTests: string[]) =>
      input({ readFile: (path) => files[path], countTests })

    it("fails while its path's count test exists", () => {
      expect(
        checkRegister(
          withCountTests(["packages/themer/src/store.count.test.ts"])
        )
      ).toEqual([
        "Store action: storage reads: unmeasured while its path's count test exists (packages/themer/src/store.count.test.ts)",
      ])
    })

    it("passes while its path has no count test", () => {
      expect(
        checkRegister(
          withCountTests(["packages/themer/src/page.count.test.ts"])
        )
      ).toEqual([])
    })

    it("leaves project rows to their own command", () => {
      expect(
        checkRegister(withCountTests(["tests/project.count.test.ts"]))
      ).toEqual([])
    })
  })

  it("reports a register or ADR it can't read instead of throwing", () => {
    expect(checkRegister(input({ adr: "# no decision" }))).toEqual([
      "the paths ADR has no Decision table",
    ])
  })
})

// The real register, ADR and repo.
const ROOT = fileURLToPath(new URL("../", import.meta.url))
const read = (path: string) => {
  try {
    return readFileSync(join(ROOT, path), "utf8")
  } catch {
    return undefined
  }
}
const workspaces = Object.fromEntries(
  ["apps", "packages"].flatMap((group) =>
    readdirSync(join(ROOT, group)).flatMap((dir) => {
      const manifest = read(`${group}/${dir}/package.json`)
      return manifest ? [[JSON.parse(manifest).name, `${group}/${dir}`]] : []
    })
  )
)

// The count test files: `<name>.count.test.ts(x)` and `<name>.count.spec.ts`.
const COUNT_TEST = /\.count\.(test|spec)\.tsx?$/
const filesUnder = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.name === "node_modules" || entry.name.startsWith(".")
      ? []
      : entry.isDirectory()
        ? filesUnder(`${dir}/${entry.name}`)
        : [`${dir}/${entry.name}`]
  )
const countTests = ["apps", "packages"]
  .flatMap(filesUnder)
  .filter((file) => COUNT_TEST.test(file))

describe("the repo's register", () => {
  it("passes the register check", () => {
    expect(
      checkRegister({
        testing: read("TESTING.md")!,
        adr: read(PATHS_ADR)!,
        today: new Date().toISOString().slice(0, 10),
        readFile: read,
        workspaces,
        countTests,
      })
    ).toEqual([])
  })
})
