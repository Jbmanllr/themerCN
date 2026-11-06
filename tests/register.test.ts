import { describe, expect, it } from "vitest"

import {
  loadPathsAdr,
  loadRegister,
  parseFigure,
  readPathsAdr,
  readRegister,
} from "./register"

const FIXTURE = `# Testing

## Quality register

### Enforced

**Project**

| Dimension   | Rule | Checked by                 | Runs at          |
| ----------- | ---- | -------------------------- | ---------------- |
| Type errors | 0    | \`pnpm turbo run typecheck\` | implementer done |

**Store action** (per \`set\`)

| Metric      | Rule                          | Checked by          | Runs at          |
| ----------- | ----------------------------- | ------------------- | ---------------- |
| stringifies | 1 persisted change; 0 no change | \`vitest run a.test.ts\` | implementer done |

### Measured, not yet enforced

**Store action** (per \`set\`)

| Metric         | Today      | Direction     | Runs at          |
| -------------- | ---------- | ------------- | ---------------- |
| storage reads  | 0          | must not grow | implementer done |
| storage writes | unmeasured | must not grow | implementer done |

**Inspector pointer move** (per \`mousemove\`)

| Metric                  | Today | Direction     | Checked by               | Runs at          |
| ----------------------- | ----- | ------------- | ------------------------ | ---------------- |
| \`closest(ignore)\` calls | 2     | must not grow | \`vitest run b.test.ts\` | implementer done |

### Exceptions

| ID  | Rule                    | Path                   | Reason      | Owner | Expires    |
| --- | ----------------------- | ---------------------- | ----------- | ----- | ---------- |
| E1  | \`closest(ignore)\` calls | Inspector pointer move | debt, #111  | owner | 2027-01-31 |

### Rules

- Not a table.
`

describe("parseFigure", () => {
  it("reads unmeasured", () => {
    expect(parseFigure("unmeasured")).toEqual({ kind: "unmeasured" })
  })

  it("reads one count for every outcome", () => {
    expect(parseFigure("3")).toEqual({ kind: "count", value: 3 })
  })

  it("reads a count per outcome", () => {
    expect(parseFigure("1 persisted change; 0 no change")).toEqual({
      kind: "outcomes",
      values: { "persisted change": 1, "no change": 0 },
    })
  })

  it("reads a percentage, project coverage's form", () => {
    expect(parseFigure("87.4 %")).toEqual({ kind: "percent", value: 87.4 })
  })

  it.each(["", "many", "1 a; 1 a", "1 a;", "-1", "1.5 a", "1.5", "101 %"])(
    "refuses %j",
    (text) => {
      expect(() => parseFigure(text)).toThrow()
    }
  )
})

describe("the register reader", () => {
  const register = readRegister(FIXTURE)

  it("returns a row's figure per outcome and its table", () => {
    expect(register.row("Store action", "stringifies")).toMatchObject({
      table: "Enforced",
      figure: {
        kind: "outcomes",
        values: { "persisted change": 1, "no change": 0 },
      },
      command: "vitest run a.test.ts",
      runsAt: "implementer done",
    })
    expect(register.row("Store action", "storage reads")).toMatchObject({
      table: "Measured",
      figure: { kind: "count", value: 0 },
      direction: "must not grow",
    })
    expect(register.row("Store action", "storage writes").figure).toEqual({
      kind: "unmeasured",
    })
  })

  it("names rows as the register writes them, backticks and all", () => {
    expect(
      register.row("Inspector pointer move", "`closest(ignore)` calls").figure
    ).toEqual({ kind: "count", value: 2 })
  })

  it("reads a measured row's command, and none where its table has no column", () => {
    expect(
      register.row("Inspector pointer move", "`closest(ignore)` calls")
    ).toMatchObject({ table: "Measured", command: "vitest run b.test.ts" })
    expect(register.row("Store action", "storage reads").command).toBe(
      undefined
    )
  })

  it("files a table under the bold path label above it", () => {
    expect(register.row("Project", "Type errors")).toMatchObject({
      table: "Enforced",
      command: "pnpm turbo run typecheck",
    })
    expect(register.paths()).toEqual([
      "Project",
      "Store action",
      "Inspector pointer move",
    ])
  })

  it("reads the exceptions", () => {
    expect(register.exceptions).toEqual([
      {
        id: "E1",
        rule: "`closest(ignore)` calls",
        path: "Inspector pointer move",
        reason: "debt, #111",
        owner: "owner",
        expires: "2027-01-31",
      },
    ])
  })

  it("throws on a row it doesn't hold, naming it", () => {
    expect(() => register.row("Store action", "parses")).toThrow(
      /Store action.*parses/
    )
  })

  it("refuses a register without a Quality register section", () => {
    expect(() => readRegister("# Testing\n")).toThrow(/Quality register/)
  })

  it("refuses a row listed twice in one path", () => {
    const twice = FIXTURE.replace(
      "| storage writes | unmeasured |",
      "| storage reads  | unmeasured |"
    )
    expect(() => readRegister(twice)).toThrow(/storage reads/)
  })

  it("refuses a table with no path label", () => {
    const unlabelled = FIXTURE.replace("**Project**\n", "")
    expect(() => readRegister(unlabelled)).toThrow(/label/)
  })
})

describe("the real register", () => {
  const register = loadRegister()
  const PATHS = {
    "Store action": 7,
    "Theme apply": 11,
    "Page load": 16,
    "Inspector pointer move": 9,
    "Font catalog request": 9,
  }

  it("holds the 52 path rows, each with a parsed figure", () => {
    for (const [path, count] of Object.entries(PATHS)) {
      expect({ path, rows: register.rows(path).length }).toEqual({
        path,
        rows: count,
      })
    }
    const pathRows = Object.keys(PATHS).flatMap((path) => register.rows(path))
    expect(pathRows).toHaveLength(52)
    for (const row of pathRows) expect(row.figure.kind).toBeDefined()
  })

  it("holds project coverage", () => {
    expect(register.row("Project", "project coverage").direction).toBe(
      "must not fall"
    )
  })
})

const ADR = `# Shared paths

## Decision

| Path                   | Unit   | Owner module | Benchmark  | Register rows |
| ---------------------- | ------ | ------------ | ---------- | ------------- |
| Store action           | a set  | the store    | count test | stringifies (1 persisted change; 0 no change), storage reads (0) |
| Inspector pointer move | a move | inspector    | count test | \`closest(ignore)\` calls (1), measures (0 same element; 1 new element) |

### Store action

- **Cost contract per set:** text.
`

describe("the paths ADR reader", () => {
  const adr = readPathsAdr(ADR)

  it("lists the Decision table's paths", () => {
    expect(adr.paths()).toEqual(["Store action", "Inspector pointer move"])
  })

  it("reads each Register rows entry as a row name and its cap", () => {
    expect(adr.caps("Store action")).toEqual([
      {
        row: "stringifies",
        cap: {
          kind: "outcomes",
          values: { "persisted change": 1, "no change": 0 },
        },
      },
      { row: "storage reads", cap: { kind: "count", value: 0 } },
    ])
  })

  it("keeps parentheses inside a backticked row name", () => {
    expect(adr.caps("Inspector pointer move")).toEqual([
      { row: "`closest(ignore)` calls", cap: { kind: "count", value: 1 } },
      {
        row: "measures",
        cap: {
          kind: "outcomes",
          values: { "same element": 0, "new element": 1 },
        },
      },
    ])
  })

  it("refuses an entry without a cap, naming it", () => {
    const capless = ADR.replace("storage reads (0)", "storage reads")
    expect(() => readPathsAdr(capless)).toThrow(/storage reads/)
  })

  it("refuses a cap of unmeasured", () => {
    const unmeasured = ADR.replace("(0)", "(unmeasured)")
    expect(() => readPathsAdr(unmeasured)).toThrow(/storage reads/)
  })

  it("throws on a path it doesn't hold", () => {
    expect(() => adr.caps("Page load")).toThrow(/Page load/)
  })
})

describe("the real paths ADR", () => {
  it("lists the five shared paths, each with a cap per row", () => {
    const adr = loadPathsAdr()
    expect(adr.paths()).toEqual([
      "Store action",
      "Theme apply",
      "Page load",
      "Inspector pointer move",
      "Font catalog request",
    ])
    for (const path of adr.paths()) expect(adr.caps(path)).not.toEqual([])
  })
})
