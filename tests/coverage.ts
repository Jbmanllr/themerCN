// The project coverage ratchet (TESTING.md, Quality register): project line
// coverage, pooled over every workspace package with a `test:coverage` task,
// must not fall more than 0.5 % (relative) below the register's figure, read
// through the register reader. While the row reads "unmeasured", the command
// prints the figure and checks nothing else.
//
// `pnpm coverage` runs each package's `test:coverage` (Vitest with V8
// coverage, writing coverage/coverage-summary.json), then this file:
// exit 0 at or above the floor, 1 below it, 2 when it could not measure.
// CI runs it at the merge gate (T2) and the backstop (T3), not at T1.

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { loadRegister, type RegisterRow } from "./register.ts"

export const COVERAGE_PATH = "Project"
export const COVERAGE_ROW = "project coverage"
/** Coverage varies run to run; the register's default tolerance. */
export const TOLERANCE = 0.005

const WORKSPACE_DIRS = ["apps", "packages"]
const SUMMARY = "coverage/coverage-summary.json"

const percent = (value: number) => `${value.toFixed(2)} %`

/** Project line coverage, in percent: the covered lines of every package
 *  with a `test:coverage` task over their total lines. Throws when a
 *  package's summary is missing. */
export const measureProject = (root: string): number => {
  let covered = 0
  let total = 0
  for (const group of WORKSPACE_DIRS) {
    const groupDir = join(root, group)
    if (!existsSync(groupDir)) continue
    for (const name of readdirSync(groupDir).sort()) {
      const dir = `${group}/${name}`
      const manifest = join(root, dir, "package.json")
      if (!existsSync(manifest)) continue
      const { scripts } = JSON.parse(readFileSync(manifest, "utf8"))
      if (!scripts?.["test:coverage"]) continue
      const summary = join(root, dir, SUMMARY)
      if (!existsSync(summary))
        throw new Error(
          `${dir} has no ${SUMMARY}: run \`pnpm turbo run test:coverage\` first`
        )
      const { lines } = JSON.parse(readFileSync(summary, "utf8")).total
      covered += lines.covered
      total += lines.total
    }
  }
  if (total === 0) throw new Error("no package reported any line")
  return (covered / total) * 100
}

export type CoverageVerdict = { ok: boolean; message: string }

/** Compares a measured coverage with the register's row. */
export const checkCoverage = (
  measured: number,
  row: RegisterRow
): CoverageVerdict => {
  const label = `${row.path}: ${row.row}`
  const { figure } = row
  if (figure.kind === "unmeasured")
    return {
      ok: true,
      message: `${label}: ${percent(measured)} (the register reads unmeasured; nothing checked)`,
    }
  if (figure.kind !== "percent")
    throw new Error(`${label}: the register's figure is not a percentage`)
  const floor = figure.value * (1 - TOLERANCE)
  const recorded = `${figure.value} %`
  return measured >= floor
    ? {
        ok: true,
        message: `${label}: ${percent(measured)}, at or above the register's ${recorded} less ${TOLERANCE * 100} %`,
      }
    : {
        ok: false,
        message: `${label}: ${percent(measured)} fell below the register's ${recorded} less ${TOLERANCE * 100} % (${percent(floor)})`,
      }
}

const main = () => {
  const root = fileURLToPath(new URL("../", import.meta.url))
  let measured
  try {
    measured = measureProject(root)
  } catch (error) {
    console.error(
      `${COVERAGE_ROW}: could not measure: ${(error as Error).message}`
    )
    return 2
  }
  const verdict = checkCoverage(
    measured,
    loadRegister().row(COVERAGE_PATH, COVERAGE_ROW)
  )
  ;(verdict.ok ? console.log : console.error)(verdict.message)
  return verdict.ok ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main()
