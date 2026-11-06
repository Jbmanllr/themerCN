// The register check: compares the Quality register in TESTING.md with the
// paths ADR and the repo, by the register's rules (TESTING.md, "Rules"), and
// returns one reason per failure. It fails when:
//
// - an enforced row's command names a test file that doesn't exist, or one
//   that doesn't name the row;
// - an exception has expired (on its expiry date);
// - a path in the paths ADR has no section in the register;
// - the ADR's Register rows column and the register disagree on a row name;
// - a row's figure exceeds its ADR cap for any outcome, unless an unexpired
//   exception names that row. An outcome the cap doesn't name has no number
//   in the contract to compare with; a cap with one count bounds every
//   outcome;
// - a path row still reads "unmeasured" while its path's count test exists
//   (a count test file naming the path, as its `"<path>"` string).

import {
  readPathsAdr,
  readRegister,
  type Figure,
  type RegisterRow,
} from "./register"

export type RegisterCheckInput = {
  /** TESTING.md's text. */
  testing: string
  /** The paths ADR's text. */
  adr: string
  /** Today, as YYYY-MM-DD. */
  today: string
  /** A repo-relative file's text, or undefined when it doesn't exist. */
  readFile: (path: string) => string | undefined
  /** Workspace package names to their repo-relative directories, to resolve
   *  a command's `--filter <name>`. */
  workspaces: Record<string, string>
  /** The repo-relative count test files (`<name>.count.test.ts(x)`,
   *  `<name>.count.spec.ts`). */
  countTests: string[]
}

const PROJECT = "Project"
const TEST_FILE = /[\w./@-]+\.(?:test|spec)\.[cm]?[jt]sx?/g

const unquote = (name: string) => name.replaceAll("`", "")

/** The test files a command names, repo-relative: under the `--filter`
 *  workspace's directory when it names one. */
const testFilesOf = (command: string, workspaces: Record<string, string>) => {
  const filter = command.match(/--filter[= ](\S+)/)?.[1]
  const dir = filter ? workspaces[filter] : undefined
  return [...command.matchAll(TEST_FILE)].map(([file]) =>
    dir ? `${dir}/${file}` : file
  )
}

/** Each outcome's figure that exceeds its cap, as "<figure> exceeds ... <cap>"
 *  text. */
const excesses = (figure: Figure, cap: Figure) => {
  const capFor = (outcome: string | undefined) =>
    cap.kind === "count"
      ? cap.value
      : cap.kind === "outcomes" && outcome !== undefined
        ? cap.values[outcome]
        : undefined
  // [outcome, count]: one count for every outcome is compared with each
  // outcome the cap names.
  const measured: [string | undefined, number][] =
    figure.kind === "outcomes"
      ? Object.entries(figure.values)
      : figure.kind !== "count"
        ? []
        : cap.kind === "outcomes"
          ? Object.keys(cap.values).map((outcome) => [outcome, figure.value])
          : [[undefined, figure.value]]
  return measured.flatMap(([outcome, value]) => {
    const limit = capFor(outcome)
    if (limit === undefined || value <= limit) return []
    const text = outcome === undefined ? `${value}` : `${value} ${outcome}`
    return [`${text} exceeds the paths ADR's cap of ${limit}`]
  })
}

/** The register check's failures, one reason each; [] when it passes. */
export const checkRegister = (input: RegisterCheckInput): string[] => {
  let register, adr
  try {
    register = readRegister(input.testing)
    adr = readPathsAdr(input.adr)
  } catch (error) {
    return [(error as Error).message]
  }
  const failures: string[] = []

  const allRows = register.paths().flatMap((path) => register.rows(path))
  for (const row of allRows.filter((row) => row.table === "Enforced")) {
    for (const file of testFilesOf(row.command ?? "", input.workspaces)) {
      const text = input.readFile(file)
      if (text === undefined)
        failures.push(
          `${row.path}: ${row.row}: its command names ${file}, which does not exist`
        )
      else if (!text.includes(unquote(row.row)))
        failures.push(`${row.path}: ${row.row}: ${file} does not name the row`)
    }
  }

  for (const row of allRows) {
    if (row.path === PROJECT || row.figure.kind !== "unmeasured") continue
    const tests = input.countTests.filter((file) =>
      input.readFile(file)?.includes(JSON.stringify(row.path))
    )
    if (tests.length > 0)
      failures.push(
        `${row.path}: ${row.row}: unmeasured while its path's count test exists (${tests.join(", ")})`
      )
  }

  const live = register.exceptions.filter((exception) => {
    const label = `exception ${exception.id} (${exception.path}: ${exception.rule})`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
      failures.push(`${label} has no YYYY-MM-DD expiry: ${exception.expires}`)
      return false
    }
    if (input.today >= exception.expires) {
      failures.push(`${label} expired on ${exception.expires}`)
      return false
    }
    return true
  })
  const excepted = (row: RegisterRow) =>
    live.some((e) => e.path === row.path && e.rule === row.row)

  const registerPaths = register.paths().filter((path) => path !== PROJECT)
  for (const path of adr.paths()) {
    if (!registerPaths.includes(path)) {
      failures.push(
        `${path}: the paths ADR's path has no section in the register`
      )
      continue
    }
    const caps = adr.caps(path)
    const rows = register.rows(path)
    for (const { row } of caps)
      if (!rows.some((r) => r.row === row))
        failures.push(
          `${path}: ${row}: in the paths ADR's Register rows, not in the register`
        )
    for (const row of rows) {
      const cap = caps.find((c) => c.row === row.row)?.cap
      if (!cap) {
        failures.push(
          `${path}: ${row.row}: in the register, not in the paths ADR's Register rows`
        )
        continue
      }
      if (excepted(row)) continue
      for (const excess of excesses(row.figure, cap))
        failures.push(`${path}: ${row.row}: ${excess}`)
    }
  }
  for (const path of registerPaths)
    if (!adr.paths().includes(path))
      failures.push(`${path}: the register's path is not in the paths ADR`)

  return failures
}
