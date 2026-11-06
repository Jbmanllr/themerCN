// The floor guard: the Floor of TESTING.md's Quality register as a command.
// Adapted from constraint-driven-development's reference floor guard: same
// contract, but it reads the Quality register and the paths ADR through the
// register reader (tests/register.ts) instead of CONSTRAINTS.md, and accepts
// `Quality-change` trailers.
//
//   node --experimental-strip-types tests/floor-guard.ts [--base <ref>]
//   (pnpm floor-guard; default base: origin/main)
//
// Input: the diff between the merge base and the working tree, plus
// untracked files. Exit 0 when clean (or every finding is accepted), 1 on a
// violation, 2 when it cannot run (not a git work tree, no merge base).
//
// A finding is accepted when a `Quality-change: <name>: <reason>` trailer, on
// a commit between the merge base and HEAD, names it: its file for a finding
// in a file, `<path>: <row>` for a register row, `Exceptions: <ID>` for an
// exception, `<paths ADR file>: <path>: <row>` for a cap. Secrets are
// reported by rule and location, never by value.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

import {
  PATHS_ADR,
  readPathsAdr,
  readRegister,
  type Figure,
  type Register,
  type RegisterRow,
} from "./register.ts"

const REGISTER_FILE = "TESTING.md"

// The gate's own files: the register reader, the register check, the floor
// guard, the counting helper (`counting.ts`), the count tests
// (`<path>.count.test.ts(x)`, `<name>.count.spec.ts`), the coverage command
// (`tests/coverage.ts`), and their tests.
const GATE_FILES = [
  /^tests\/register(-check)?(\.test)?\.ts$/,
  /^tests\/floor-guard(\.test)?\.ts$/,
  /(^|\/)counting(\.test)?\.tsx?$/,
  /^tests\/coverage(\.test)?\.ts$/,
  /\.count\.(test|spec)\.tsx?$/,
]

const CODE = /\.[cm]?[jt]sx?$/
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/

const SUPPRESSIONS =
  /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|prettier-ignore|biome-ignore|istanbul ignore|c8 ignore|v8 ignore|nosemgrep|gitleaks:allow|Stryker disable/
const STUBS = /throw new (Error|NotImplemented\w*)\(.*not implemented|\bTODO\b/i
const EMPTY_CATCH = /catch\s*(\([^)]*\))?\s*\{\s*\}/
const SKIPS = /\.(skip|todo)\b|\bx(it|describe|test)\(/
const ASSERTIONS = /\b(expect|assert|should)\b/

const SECRETS: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub token", /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_\w{22,})/],
  ["Vercel token", /\bvc[piark]_[A-Za-z0-9]{24,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}/],
]

// The register's prescribed forms (TESTING.md, Floor).
const SHADCN_EXAMPLES =
  /^packages\/themer\/src\/components\/preview\/examples\//
const SINGLE_RULE_DISABLE =
  /^\s*\/\/ eslint-disable-next-line [@\w/-]+ -- \S.*$|^\s*\{\/\* eslint-disable-next-line [@\w/-]+ -- \S.*\*\/\}$/
const VISUAL_SPEC = /(^|\/)e2e\/[^/]*visual[^/]*\.spec\.tsx?$/
const PLATFORM_SKIP = /^test\.skip\(\s*[^,]*process\.platform[^,]*,\s*["'`]/

type Line = { file: string; line: number; text: string }
type Finding = {
  rule: string
  /** What a trailer names to accept it. */
  name: string
  where: string
  text?: string
}

class CannotRun extends Error {}

const git = (args: string[], { diffExit = false } = {}) => {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    })
  } catch (error) {
    // `git diff --no-index` exits 1 when the sides differ: the normal case.
    const { status, stdout } = error as { status?: number; stdout?: unknown }
    if (diffExit && status === 1 && typeof stdout === "string") return stdout
    return null
  }
}

const must = (value: string | null, message: string) => {
  if (value === null) throw new CannotRun(message)
  return value
}

/** Walks a unified diff (`--unified=0`) into added and removed lines. */
const walk = (diff: string) => {
  const added: Line[] = []
  const removed: Line[] = []
  const deleted: string[] = []
  const pathOf = (s: string) => s.replace(/^[ab]\//, "")
  let file = ""
  let oldFile = ""
  let inHeader = false
  let oldLine = 0
  let newLine = 0
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff ")) inHeader = true
    else if (line.startsWith("@@")) {
      inHeader = false
      const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/)
      oldLine = Number(m?.[1] ?? 0)
      newLine = Number(m?.[2] ?? 0)
    } else if (inHeader) {
      if (line.startsWith("--- ")) oldFile = pathOf(line.slice(4))
      else if (line.startsWith("+++ ")) {
        const newFile = pathOf(line.slice(4))
        file = newFile === "/dev/null" ? oldFile : newFile
        if (newFile === "/dev/null") deleted.push(file)
      }
    } else if (line.startsWith("+"))
      added.push({ file, line: newLine++, text: line.slice(1) })
    else if (line.startsWith("-"))
      removed.push({ file, line: oldLine++, text: line.slice(1) })
  }
  return { added, removed, deleted }
}

/** Consecutive added lines of one file, joined. */
const blocksOf = (added: Line[]) => {
  const blocks: Line[] = []
  for (const l of added) {
    const last = blocks.at(-1)
    const lastLine = last ? last.line + last.text.split("\n").length - 1 : 0
    if (last && last.file === l.file && lastLine + 1 === l.line)
      last.text += "\n" + l.text
    else blocks.push({ ...l })
  }
  return blocks
}

type Direction = "max" | "min"

/** Each outcome's figure, `*` for one count for every outcome. */
const valuesOf = (figure: Figure): Record<string, number> | undefined =>
  figure.kind === "count"
    ? { "*": figure.value }
    : figure.kind === "outcomes"
      ? figure.values
      : undefined

/** Whether `now` allows more than `was`, read in `direction`. Moving off
 *  "unmeasured" is the first measurement: silent. Adding an outcome extends
 *  the count: silent. */
const loosened = (was: Figure, now: Figure, direction: Direction) => {
  if (was.kind === "unmeasured") return false
  if (now.kind === "unmeasured") return true
  const looser = (a: number, b: number) => (direction === "max" ? b > a : b < a)
  if (was.kind === "percent" && now.kind === "percent")
    return looser(was.value, now.value)
  if (was.kind === "percent" || now.kind === "percent") return true
  const before = valuesOf(was)!
  const after = valuesOf(now)!
  return Object.entries(before).some(([outcome, value]) => {
    if (outcome === "*")
      return Object.values(after).some((next) => looser(value, next))
    const next = after[outcome] ?? after["*"]
    return next === undefined || looser(value, next)
  })
}

const directionOf = (...rows: (RegisterRow | undefined)[]): Direction =>
  rows.some((row) => row?.direction?.includes("fall")) ? "min" : "max"

/** A weakened register row, exception, or paths ADR cap. */
const compareRegister = (was: Register, now: Register, report: Flag) => {
  const flag: Flag = (f) => report({ ...f, where: `${f.where}: ${f.name}` })
  const where = REGISTER_FILE
  for (const path of was.paths()) {
    for (const before of was.rows(path)) {
      const name = `${path}: ${before.row}`
      const after = now.rows(path).find((row) => row.row === before.row)
      if (!after) {
        flag({ rule: "row-removed", name, where })
        continue
      }
      if (before.table === "Enforced" && after.table === "Measured")
        flag({ rule: "row-demoted", name, where })
      const direction = directionOf(before, after)
      if (loosened(before.figure, after.figure, direction))
        flag({ rule: "row-loosened", name, where })
      if (before.command && after.command !== before.command)
        flag({ rule: "row-command-changed", name, where })
      if (before.runsAt && after.runsAt !== before.runsAt)
        flag({ rule: "row-runs-at-changed", name, where })
      if (
        before.direction &&
        after.direction &&
        after.direction !== before.direction
      )
        flag({ rule: "row-direction-changed", name, where })
    }
  }
  for (const exception of now.exceptions) {
    const name = `Exceptions: ${exception.id}`
    const before = was.exceptions.find((e) => e.id === exception.id)
    if (!before) flag({ rule: "exception-added", name, where })
    else if (
      exception.expires > before.expires ||
      exception.rule !== before.rule ||
      exception.path !== before.path
    )
      flag({ rule: "exception-extended", name, where })
  }
}

const compareAdr = (wasText: string, nowText: string, flag: Flag) => {
  const was = readPathsAdr(wasText)
  const now = readPathsAdr(nowText)
  for (const path of was.paths()) {
    const after = now.paths().includes(path) ? now.caps(path) : []
    for (const { row, cap } of was.caps(path)) {
      const name = `${PATHS_ADR}: ${path}: ${row}`
      const next = after.find((entry) => entry.row === row)
      if (!next) flag({ rule: "cap-removed", name, where: name })
      else if (loosened(cap, next.cap, "max"))
        flag({ rule: "cap-raised", name, where: name })
    }
  }
}

type Flag = (finding: Finding) => void

const scan = (base: string) => {
  const top = git(["rev-parse", "--show-toplevel"])?.trim()
  if (!top) throw new CannotRun("not inside a git work tree")
  process.chdir(top)

  const mergeBase = git(["merge-base", base, "HEAD"])?.trim()
  if (!mergeBase) throw new CannotRun(`no merge base against ${base}`)

  const tracked = must(
    git([
      "diff",
      "--unified=0",
      "--no-color",
      "--no-ext-diff",
      mergeBase,
      "--",
    ]),
    `could not diff against ${mergeBase}`
  )
  const untrackedFiles = must(
    git(["ls-files", "--others", "--exclude-standard", "-z"]),
    "could not list untracked files"
  )
    .split("\0")
    .filter(Boolean)
  const untracked = untrackedFiles.map((f) =>
    must(
      git(["diff", "--no-index", "--unified=0", "--no-color", "/dev/null", f], {
        diffExit: true,
      }),
      `could not diff untracked file ${f}`
    )
  )
  const changed = [
    ...must(
      git(["diff", "--name-only", "--no-renames", "-z", mergeBase, "--"]),
      `could not list changes against ${mergeBase}`
    )
      .split("\0")
      .filter(Boolean),
    ...untrackedFiles,
  ]
  const trailers = must(
    git([
      "log",
      "--format=%(trailers:key=Quality-change,valueonly,unfold)",
      `${mergeBase}..HEAD`,
    ]),
    "could not read commit trailers"
  )
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)

  const findings: Finding[] = []
  const flag: Flag = (finding) => findings.push(finding)
  const { added, removed, deleted } = walk([tracked, ...untracked].join("\n"))
  const at = (l: Line) => `${l.file}:${l.line}`
  const short = (text: string) => text.trim().slice(0, 120)

  for (const l of added) {
    for (const [kind, pattern] of SECRETS)
      if (pattern.test(l.text))
        flag({ rule: `secret (${kind})`, name: l.file, where: at(l) })
    if (!CODE.test(l.file)) continue
    if (
      SUPPRESSIONS.test(l.text) &&
      !(SHADCN_EXAMPLES.test(l.file) && SINGLE_RULE_DISABLE.test(l.text))
    )
      flag({
        rule: "silenced-checker",
        name: l.file,
        where: at(l),
        text: short(l.text),
      })
    if (STUBS.test(l.text))
      flag({
        rule: "unfinished-work",
        name: l.file,
        where: at(l),
        text: short(l.text),
      })
  }
  for (const block of blocksOf(added.filter((l) => CODE.test(l.file)))) {
    const lineAt = (index: number) =>
      block.line + block.text.slice(0, index).split("\n").length - 1
    for (const m of block.text.matchAll(new RegExp(EMPTY_CATCH, "g")))
      flag({
        rule: "unfinished-work",
        name: block.file,
        where: `${block.file}:${lineAt(m.index)}`,
        text: "empty catch",
      })
    const lines = block.text.split("\n")
    lines.forEach((text, i) => {
      if (!SKIPS.test(text)) return
      const call = lines.slice(i).join(" ")
      if (VISUAL_SPEC.test(block.file) && PLATFORM_SKIP.test(call)) return
      flag({
        rule: "test-skipped",
        name: block.file,
        where: `${block.file}:${block.line + i}`,
        text: short(text),
      })
    })
  }

  for (const f of deleted)
    if (TEST.test(f)) flag({ rule: "test-deleted", name: f, where: f })
  const files = new Set(removed.map((l) => l.file))
  for (const f of files) {
    if (!TEST.test(f) || deleted.includes(f)) continue
    const gone = removed.filter((l) => l.file === f && ASSERTIONS.test(l.text))
    const came = added.filter((l) => l.file === f && ASSERTIONS.test(l.text))
    if (gone.length > came.length)
      for (const l of gone)
        flag({
          rule: "assertion-removed",
          name: f,
          where: `${f}:${l.line} (old)`,
          text: short(l.text),
        })
  }

  for (const f of new Set(changed))
    if (GATE_FILES.some((pattern) => pattern.test(f)))
      flag({ rule: "gate-file-changed", name: f, where: f })

  const atBase = (file: string) =>
    git(["cat-file", "-e", `${mergeBase}:${file}`]) === null
      ? undefined
      : must(git(["show", `${mergeBase}:${file}`]), `could not read ${file}`)
  const inTree = (file: string) =>
    existsSync(file) ? readFileSync(file, "utf8") : ""

  const register = { was: atBase(REGISTER_FILE), now: inTree(REGISTER_FILE) }
  if (register.was !== undefined && register.was !== register.now) {
    let was: Register | undefined
    try {
      was = readRegister(register.was)
    } catch (error) {
      flag({
        rule: "register-baseline-unreadable",
        name: REGISTER_FILE,
        where: REGISTER_FILE,
        text: (error as Error).message,
      })
    }
    try {
      const now = readRegister(register.now)
      if (was) compareRegister(was, now, flag)
    } catch (error) {
      flag({
        rule: "register-unreadable",
        name: REGISTER_FILE,
        where: REGISTER_FILE,
        text: (error as Error).message,
      })
    }
  }
  const adr = { was: atBase(PATHS_ADR), now: inTree(PATHS_ADR) }
  if (adr.was !== undefined && adr.was !== adr.now) {
    try {
      compareAdr(adr.was, adr.now, flag)
    } catch (error) {
      flag({
        rule: "paths-adr-unreadable",
        name: PATHS_ADR,
        where: PATHS_ADR,
        text: (error as Error).message,
      })
    }
  }

  return { findings, trailers }
}

const main = () => {
  const i = process.argv.indexOf("--base")
  const base = i > -1 ? process.argv[i + 1] : "origin/main"
  if (!base) throw new CannotRun("--base needs a ref")
  const { findings, trailers } = scan(base)
  const acceptedBy = (f: Finding) =>
    trailers.find((t) => t.startsWith(`${f.name}:`))
  const describe = (f: Finding) =>
    `[${f.rule}] ${f.where}${f.text ? `: ${f.text}` : ""}`

  const accepted = findings.filter(acceptedBy)
  const violations = findings.filter((f) => !acceptedBy(f))
  for (const f of accepted)
    console.log(
      `floor-guard: accepted ${describe(f)}\n  (Quality-change: ${acceptedBy(f)})`
    )
  if (violations.length === 0) {
    console.log(
      accepted.length
        ? `floor-guard: clean, ${accepted.length} accepted finding(s)`
        : "floor-guard: clean"
    )
    return 0
  }
  console.error(`floor-guard: ${violations.length} floor violation(s):`)
  for (const f of violations) console.error(`  ${describe(f)}`)
  console.error(
    [
      "",
      "Each lowers the bar (TESTING.md, Quality register, Floor). Fix the code,",
      "or, when the register's rules allow the change, record it with a",
      "`Quality-change: <name>: <reason>` commit trailer naming the file,",
      "the register row (`<path>: <row>`), the exception (`Exceptions: <ID>`)",
      `or the cap (\`${PATHS_ADR}: <path>: <row>\`).`,
    ].join("\n")
  )
  return 1
}

try {
  process.exitCode = main()
} catch (error) {
  // Anything that stops the scan is "could not check", never "clean".
  const known = error instanceof CannotRun
  console.error(`floor-guard: cannot run: ${known ? error.message : error}`)
  process.exitCode = 2
}
