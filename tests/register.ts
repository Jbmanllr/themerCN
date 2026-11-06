// The register reader: the only code that knows the Markdown shape of the
// Quality register in TESTING.md and of the "Register rows" column in the
// paths ADR (docs/adr/0002-shared-paths-and-cost-contracts.md). The gate's
// checks (the register check, the count tests, the floor guard, the frame
// chunk count, the coverage command) read figures and caps through it, so no
// check writes a number of its own.
//
//   loadRegister().row("Store action", "stringifies")
//     -> { path, row, table: "Enforced" | "Measured", figure, command?, ... }
//   loadPathsAdr().caps("Store action")
//     -> [{ row: "stringifies", cap: Figure }, ...]
//
// A figure is "unmeasured", one count for every outcome ("3"), a count per
// outcome ("1 persisted change; 0 no change"), or a percentage ("87.4 %",
// project coverage). A cap is a figure without "unmeasured".
//
// The register's shape: under "## Quality register", each "### Enforced" or
// "### Measured, not yet enforced" table sits under a bold path label
// ("**Store action** (per `set`)"; "**Project**" for project-wide rows). The
// first column names the row, as written (backticks kept). The figure is the
// "Rule" column (Enforced) or the "Today" column (Measured); "Checked by",
// "Direction" and "Runs at" are read when present. "### Exceptions" has one
// row per exception: ID, Rule (the row's name), Path, Reason, Owner, Expires
// (YYYY-MM-DD).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export type Figure =
  | { kind: "unmeasured" }
  | { kind: "count"; value: number }
  | { kind: "outcomes"; values: Record<string, number> }
  | { kind: "percent"; value: number }

export type Table = "Enforced" | "Measured"

export type RegisterRow = {
  path: string
  row: string
  table: Table
  figure: Figure
  command?: string
  direction?: string
  runsAt?: string
}

export type RegisterException = {
  id: string
  rule: string
  path: string
  reason: string
  owner: string
  expires: string
}

export type Register = {
  /** The row, or a throw naming the path and row it lacks. */
  row(path: string, row: string): RegisterRow
  /** A path's rows, Enforced then Measured, in register order. */
  rows(path: string): RegisterRow[]
  /** Every path label, in the order it first appears ("Project" included). */
  paths(): string[]
  exceptions: RegisterException[]
}

export type PathCap = { row: string; cap: Figure }

export type PathsAdr = {
  /** The paths in the Decision table, in order. */
  paths(): string[]
  /** A path's "Register rows" entries, each row name with its cap. */
  caps(path: string): PathCap[]
}

const COUNT = /^(0|[1-9]\d*)$/

/** Parses a register figure or an ADR cap. Throws on any other text. */
export const parseFigure = (text: string): Figure => {
  const source = text.trim()
  if (source === "unmeasured") return { kind: "unmeasured" }
  if (COUNT.test(source)) return { kind: "count", value: Number(source) }
  const percent = source.match(/^(\d+(?:\.\d+)?) ?%$/)
  if (percent && Number(percent[1]) <= 100)
    return { kind: "percent", value: Number(percent[1]) }
  const values: Record<string, number> = {}
  for (const part of source.split(";")) {
    const match = part.trim().match(/^(0|[1-9]\d*) ([A-Za-z`].*)$/)
    if (!match || match[2]! in values)
      throw new Error(`unreadable figure: ${JSON.stringify(text)}`)
    values[match[2]!] = Number(match[1])
  }
  return { kind: "outcomes", values }
}

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim())

const isTableLine = (line: string) => line.trim().startsWith("|")
const isDivider = (line: string) => /^\|[\s|:-]+\|$/.test(line.trim())

/** Each Markdown table in `lines`, as records keyed by header, with the
 *  index of its header line. */
const tablesOf = (lines: string[]) => {
  const tables: { at: number; records: Record<string, string>[] }[] = []
  for (let at = 0; at < lines.length; at++) {
    if (!isTableLine(lines[at]!) || !isDivider(lines[at + 1] ?? "")) continue
    const header = cellsOf(lines[at]!)
    const records: Record<string, string>[] = []
    let end = at + 2
    for (; end < lines.length && isTableLine(lines[end]!); end++) {
      const cells = cellsOf(lines[end]!)
      records.push(Object.fromEntries(header.map((h, i) => [h, cells[i]!])))
    }
    tables.push({ at, records })
    at = end - 1
  }
  return tables
}

/** The lines of a `##`/`###` section, up to the next heading of its level
 *  or above. */
const sectionOf = (lines: string[], heading: RegExp) => {
  const start = lines.findIndex((line) => heading.test(line))
  if (start === -1) return undefined
  const level = lines[start]!.match(/^#+/)![0].length
  const end = lines.findIndex(
    (line, i) =>
      i > start && /^#+ /.test(line) && line.match(/^#+/)![0].length <= level
  )
  return lines.slice(start + 1, end === -1 ? undefined : end)
}

const unquote = (cell: string | undefined) =>
  cell?.replace(/^`(.*)`$/, "$1") || undefined

/** Reads the Quality register from TESTING.md's text. */
export const readRegister = (markdown: string): Register => {
  const register = sectionOf(markdown.split("\n"), /^## Quality register$/)
  if (!register) throw new Error("no ## Quality register section")
  const rows: RegisterRow[] = []
  const paths: string[] = []

  for (const [table, heading] of [
    ["Enforced", /^### Enforced$/],
    ["Measured", /^### Measured, not yet enforced$/],
  ] as const) {
    const lines = sectionOf(register, heading) ?? []
    for (const { at, records } of tablesOf(lines)) {
      const label = lines
        .slice(0, at)
        .reverse()
        .find((line) => line.trim() !== "")
        ?.match(/^\*\*(.+?)\*\*/)?.[1]
      if (!label)
        throw new Error(`a ${table} table has no bold path label above it`)
      if (!paths.includes(label)) paths.push(label)
      for (const record of records) {
        const [name] = Object.values(record)
        if (!name) continue
        if (rows.some((row) => row.path === label && row.row === name))
          throw new Error(`${label}: row ${name} is listed twice`)
        const figure = table === "Enforced" ? record.Rule : record.Today
        rows.push({
          path: label,
          row: name,
          table,
          figure: parseFigure(figure ?? ""),
          command: unquote(record["Checked by"]),
          direction: record.Direction || undefined,
          runsAt: record["Runs at"] || undefined,
        })
      }
    }
  }

  const exceptionLines = sectionOf(register, /^### Exceptions$/) ?? []
  const exceptions = tablesOf(exceptionLines).flatMap(({ records }) =>
    records.map((record) => ({
      id: record.ID ?? "",
      rule: record.Rule ?? "",
      path: record.Path ?? "",
      reason: record.Reason ?? "",
      owner: record.Owner ?? "",
      expires: record.Expires ?? "",
    }))
  )

  return {
    row(path, name) {
      const found = rows.find((row) => row.path === path && row.row === name)
      if (!found) throw new Error(`the register has no row ${path}: ${name}`)
      return found
    },
    rows: (path) => rows.filter((row) => row.path === path),
    paths: () => [...paths],
    exceptions,
  }
}

/** Splits a "Register rows" cell on the commas between entries: those
 *  outside backticks and parentheses. */
const entriesOf = (cell: string) => {
  const entries: string[] = []
  let depth = 0
  let quoted = false
  let start = 0
  for (let i = 0; i < cell.length; i++) {
    const char = cell[i]
    if (char === "`") quoted = !quoted
    else if (quoted) continue
    else if (char === "(") depth++
    else if (char === ")") depth--
    else if (char === "," && depth === 0) {
      entries.push(cell.slice(start, i).trim())
      start = i + 1
    }
  }
  entries.push(cell.slice(start).trim())
  return entries.filter(Boolean)
}

/** "name (cap)": the cap is the last parenthesised group, outside
 *  backticks. */
const capEntryOf = (path: string, entry: string): PathCap => {
  const match = entry.match(/^(.*?) \(([^()`]+)\)$/)
  const cap = match && parseFigure(match[2]!)
  if (!match || !cap || cap.kind === "unmeasured")
    throw new Error(`${path}: Register rows entry without a cap: ${entry}`)
  return { row: match[1]!, cap }
}

/** Reads the paths ADR's Decision table. The "Register rows" column lists
 *  `row name (cap)` entries, separated by commas. */
export const readPathsAdr = (markdown: string): PathsAdr => {
  const decision = sectionOf(markdown.split("\n"), /^## Decision$/) ?? []
  const [table] = tablesOf(decision)
  if (!table) throw new Error("the paths ADR has no Decision table")
  const caps = new Map(
    table.records.map((record) => {
      const path = record.Path ?? ""
      const cell = record["Register rows"] ?? ""
      return [path, entriesOf(cell).map((entry) => capEntryOf(path, entry))]
    })
  )
  return {
    paths: () => [...caps.keys()],
    caps(path) {
      const found = caps.get(path)
      if (!found) throw new Error(`the paths ADR has no path ${path}`)
      return found
    },
  }
}

// A path, not a URL: under happy-dom the global URL is happy-dom's, which
// node:fs does not accept.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/** The paths ADR, repo-relative. */
export const PATHS_ADR = "docs/adr/0002-shared-paths-and-cost-contracts.md"

/** Reads the Quality register from the repo's TESTING.md. */
export const loadRegister = () =>
  readRegister(readFileSync(join(ROOT, "TESTING.md"), "utf8"))

/** Reads the repo's paths ADR. */
export const loadPathsAdr = () =>
  readPathsAdr(readFileSync(join(ROOT, PATHS_ADR), "utf8"))
