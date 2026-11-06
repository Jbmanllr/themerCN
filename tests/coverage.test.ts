import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  checkCoverage,
  COVERAGE_PATH,
  COVERAGE_ROW,
  measureProject,
} from "./coverage"
import { loadRegister, readRegister } from "./register"

// The project coverage ratchet (TESTING.md, Quality register, "Coverage is a
// ratchet"): `pnpm coverage` measures project line coverage across every
// package with a `test:coverage` task, and fails when it falls more than
// 0.5 % (relative) below the register's figure.

const registerWith = (today: string) =>
  readRegister(`## Quality register

### Measured, not yet enforced

**Project**

| Metric           | Today | Direction     | Runs at    |
| ---------------- | ----- | ------------- | ---------- |
| project coverage | ${today} | must not fall | merge gate |
`).row(COVERAGE_PATH, COVERAGE_ROW)

describe("the coverage check", () => {
  // 80 % less 0.5 % of it: 79.6 %.
  it("fails below the register's figure minus the tolerance", () => {
    const verdict = checkCoverage(79.59, registerWith("80 %"))
    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain("79.59 %")
    expect(verdict.message).toContain("80 %")
  })

  it.each([79.6, 80, 91.2])("passes at %s % against 80 %", (measured) => {
    expect(checkCoverage(measured, registerWith("80 %")).ok).toBe(true)
  })

  it("only prints the figure while the row reads unmeasured", () => {
    const verdict = checkCoverage(12.345, registerWith("unmeasured"))
    expect(verdict.ok).toBe(true)
    expect(verdict.message).toContain("12.35 %")
  })

  it("refuses a figure that isn't a percentage", () => {
    expect(() => checkCoverage(80, registerWith("3"))).toThrow(
      /project coverage/
    )
  })

  it("reads the real register's row", () => {
    const row = loadRegister().row(COVERAGE_PATH, COVERAGE_ROW)
    expect(["percent", "unmeasured"]).toContain(row.figure.kind)
    expect(row.direction).toBe("must not fall")
  })
})

describe("measuring the project", () => {
  let root: string
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const workspace = (
    dir: string,
    scripts: Record<string, string>,
    lines?: { covered: number; total: number }
  ) => {
    mkdirSync(join(root, dir, "coverage"), { recursive: true })
    writeFileSync(join(root, dir, "package.json"), JSON.stringify({ scripts }))
    if (lines)
      writeFileSync(
        join(root, dir, "coverage/coverage-summary.json"),
        JSON.stringify({ total: { lines: { ...lines, pct: 0 } } })
      )
  }

  it("pools the covered lines of every package with a test:coverage task", () => {
    root = mkdtempSync(join(tmpdir(), "coverage-"))
    workspace(
      "packages/a",
      { "test:coverage": "vitest" },
      {
        covered: 30,
        total: 40,
      }
    )
    workspace(
      "apps/b",
      { "test:coverage": "vitest" },
      {
        covered: 10,
        total: 60,
      }
    )
    // No test:coverage task: its stale summary is not the project's.
    workspace("apps/c", { test: "vitest" }, { covered: 0, total: 1000 })
    expect(measureProject(root)).toBe(40)
  })

  it("refuses to measure when a package's summary is missing", () => {
    root = mkdtempSync(join(tmpdir(), "coverage-"))
    workspace("packages/a", { "test:coverage": "vitest" })
    expect(() => measureProject(root)).toThrow(/packages\/a/)
  })
})
