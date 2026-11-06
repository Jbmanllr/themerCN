// The counting helper: counts the counted work of one unit of a shared path
// and compares the counts with the Quality register (through the register
// reader, tests/register.ts). Test-only; shared by every path's count test.
//
//   const counts = await measure(counters, () => unit())
//   checkCounts({ path: "Store action", outcomes: ["Theme change"], counts })
//
// A counter names its register row and installs a pass-through for the
// duration of the unit: the wrapped work runs exactly as before, and each
// call bumps the row. Several counters may share a row; their counts add up.
// Count at the platform boundary where the work crosses one:
//
// - countCalls(row, target, key, when?): a method or function on an object
//   or prototype (JSON.stringify, getComputedStyle, getElementById,
//   Element.prototype.closest, CSSStyleDeclaration.prototype.setProperty,
//   DOMTokenList.prototype.toggle, head.appendChild, fetch).
// - countMethod(row, target, key, when): the same, deciding on the receiver
//   too (String.prototype.toLowerCase on a family name).
// - countGetter(row, target, key) and countSetter(row, target, key, when?):
//   a getter (clientLeft, clientTop) or a setter (textContent).
// - countConstructions(row, target, key): a constructor (MutationObserver,
//   RegExp).
// - countStorage(row, method): localStorage, through a stand-in object (a spy
//   on the storage instance would be stored as an item).
//
// Work that crosses no boundary is counted on the module export that does
// it: wrap the export with passThrough(name, fn) in a vi.mock factory, and
// count it with countExport(row, name, when?).
//
// `when` gets the call's arguments and decides whether the call counts.
// calledFrom(pattern) tells calls apart by the code anywhere on the stack,
// madeBy(pattern) by the code that made the call (the nearest frame outside
// the counting code), and readingStack() is true while either reads a stack:
// formatting one parses source maps, which is the check's work, not the
// unit's.
//
// Checking a count test file's units:
//
// - checkCounts compares one unit's counts with the register. A unit names
//   exactly one outcome for each row the register splits by outcome.
// - checkReach, the file's last test, fails each row whose register figure
//   the file's unseeded runs no longer reach: the figure is stale (the work
//   shrank and the lower figure was not written down) or the counter went
//   blind.
// - checkSeedCaught proves a counter can fail: a run seeded with one more
//   unit of the row's work must exceed the unseeded run on that row.

import { loadRegister, type Figure, type Register } from "./register"

export type Counts = Record<string, number>

export type Counter = {
  row: string
  /** Starts counting into `bump`; returns the function that stops it. */
  install(bump: () => void): () => void
}

/** Replaces `target[key]` with `descriptor`; returns the function that puts
 *  the original back (an own property, or none, so the inherited one shows
 *  again). */
export const override = (
  target: object,
  key: string,
  descriptor: PropertyDescriptor
): (() => void) => {
  const own = Object.getOwnPropertyDescriptor(target, key)
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: own?.enumerable ?? false,
    ...descriptor,
  })
  return () => {
    if (own) Object.defineProperty(target, key, own)
    else delete (target as Record<string, unknown>)[key]
  }
}

/** Wraps the method `target[key]`; `when` gets each call's receiver and
 *  arguments and decides whether it counts. */
const countCallsOf = (
  row: string,
  target: object,
  key: string,
  when?: (self: unknown, args: unknown[]) => boolean
): Counter => ({
  row,
  install(bump) {
    const original = (target as Record<string, unknown>)[key] as (
      ...args: unknown[]
    ) => unknown
    return override(target, key, {
      writable: true,
      value(this: unknown, ...args: unknown[]) {
        if (!when || when(this, args)) bump()
        return original.apply(this, args)
      },
    })
  },
})

type ArgsOf<F> = F extends (...a: infer A) => unknown ? A : never

/** Counts the calls of `target[key]`, a function or method. */
export const countCalls = <T extends object, K extends keyof T & string>(
  row: string,
  target: T,
  key: K,
  when?: (...args: ArgsOf<T[K]>) => boolean
): Counter =>
  countCallsOf(
    row,
    target,
    key,
    when && ((_self, args) => when(...(args as ArgsOf<T[K]>)))
  )

/** Counts the calls of the method `target[key]` whose receiver and
 *  arguments `when` accepts. */
export const countMethod = (
  row: string,
  target: object,
  key: string,
  when: (self: unknown, ...args: unknown[]) => boolean
): Counter =>
  countCallsOf(row, target, key, (self, args) => when(self, ...args))

/** Counts the reads of the getter `target[key]` (own or inherited). */
export const countGetter = (
  row: string,
  target: object,
  key: string
): Counter => ({
  row,
  install(bump) {
    const getter = findDescriptor(target, key)?.get
    if (!getter) throw new Error(`countGetter: ${key} has no getter`)
    return override(target, key, {
      get() {
        bump()
        return getter.call(this)
      },
    })
  },
})

/** Counts the writes of the setter `target[key]` (own or inherited) whose
 *  receiver `when` accepts. */
export const countSetter = (
  row: string,
  target: object,
  key: string,
  when?: (self: unknown) => boolean
): Counter => ({
  row,
  install(bump) {
    const { get, set } = findDescriptor(target, key) ?? {}
    if (!get || !set) throw new Error(`countSetter: ${key} has no setter`)
    return override(target, key, {
      get,
      set(this: unknown, value: unknown) {
        if (!when || when(this)) bump()
        set.call(this, value)
      },
    })
  },
})

/** Counts the `new target[key](...)` constructions. */
export const countConstructions = (
  row: string,
  target: object,
  key: string
): Counter => ({
  row,
  install(bump) {
    const original = (target as Record<string, unknown>)[key] as new (
      ...args: unknown[]
    ) => object
    const proxy: typeof original = new Proxy(original, {
      construct(constructor, args, newTarget): object {
        bump()
        return Reflect.construct(
          constructor,
          args,
          newTarget === proxy ? constructor : newTarget
        )
      },
    })
    return override(target, key, { writable: true, value: proxy })
  },
})

type StorageMethod = "getItem" | "setItem" | "removeItem"

/** Counts the `localStorage[method]` calls, through a stand-in object that
 *  forwards everything to the storage it replaces. */
export const countStorage = (row: string, method: StorageMethod): Counter => ({
  row,
  install(bump) {
    const real = globalThis.localStorage
    const forward =
      <K extends keyof Storage>(key: K) =>
      (...args: unknown[]) =>
        (real[key] as (...args: unknown[]) => unknown).apply(real, args)
    const standIn = {
      getItem: forward("getItem"),
      setItem: forward("setItem"),
      removeItem: forward("removeItem"),
      clear: forward("clear"),
      key: forward("key"),
      get length() {
        return real.length
      },
    }
    const counted = countCalls(row, standIn, method)
    counted.install(bump)
    return override(globalThis, "localStorage", {
      writable: true,
      value: standIn,
    })
  },
})

// The module exports wrapped by passThrough, each with the listeners that
// count it. On globalThis, so a vi.mock factory and the test share it.
const exportListeners: Map<string, Set<(args: unknown[]) => void>> = ((
  globalThis as { __countingExports?: Map<string, Set<() => void>> }
).__countingExports ??= new Map())

/** Wraps a module export (in a vi.mock factory) so countExport can count
 *  its calls. It calls the real function, so behaviour is unchanged. */
export const passThrough = <F extends (...args: never[]) => unknown>(
  name: string,
  fn: F
): F =>
  function (this: unknown, ...args: Parameters<F>) {
    exportListeners.get(name)?.forEach((listener) => listener(args))
    return fn.apply(this, args)
  } as F

/** Counts the calls of the export wrapped as passThrough(name, ...). */
export const countExport = (
  row: string,
  name: string,
  when?: (...args: never[]) => boolean
): Counter => ({
  row,
  install(bump) {
    const listener = (args: unknown[]) => {
      if (!when || when(...(args as never[]))) bump()
    }
    let listeners = exportListeners.get(name)
    if (!listeners) exportListeners.set(name, (listeners = new Set()))
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
})

// How many frames a stack read keeps: enough to reach a React component
// from a platform call made under the fake DOM's dispatch.
const STACK_DEPTH = 100

let stackReads = 0

/** The current stack's frames, from the caller of this function down. */
const readStack = (): string[] => {
  stackReads++
  const limit = Error.stackTraceLimit
  try {
    Error.stackTraceLimit = STACK_DEPTH
    return (new Error().stack ?? "").split("\n").slice(1)
  } finally {
    Error.stackTraceLimit = limit
    stackReads--
  }
}

/** Whether a stack is being read now: work done meanwhile (the source-map
 *  parses of the stack's formatting) is the check's own, never the unit's. */
export const readingStack = (): boolean => stackReads > 0

/** Whether code matching `pattern` (a file path, or a function's name) is on
 *  the current stack. False for a call made while a stack is read. */
export const calledFrom = (pattern: RegExp): boolean =>
  !readingStack() && readStack().some((frame) => pattern.test(frame))

// The counting code: this helper and the count test files, whose counters
// and predicates sit between a counted call and the code that made it.
const COUNTING_CODE = /\/tests\/counting\.ts|\.count\.(?:test|spec)\.tsx?/

/** Whether the code that made the current call matches `pattern`: the
 *  nearest stack frame outside the counting code. Under the fake DOM every
 *  listener runs inside its dispatch, so only the nearest frame tells its
 *  work apart. */
export const madeBy = (pattern: RegExp): boolean => {
  const caller = readStack().find((frame) => !COUNTING_CODE.test(frame))
  return caller !== undefined && pattern.test(caller)
}

/** Runs one unit with the counters installed and returns the count per
 *  row. The counters are removed when the unit ends, even on a throw. */
export const measure = async (
  counters: readonly Counter[],
  unit: () => unknown
): Promise<Counts> => {
  const counts: Counts = {}
  const removers: (() => void)[] = []
  try {
    for (const counter of counters) {
      counts[counter.row] ??= 0
      removers.push(counter.install(() => counts[counter.row]!++))
    }
    await unit()
  } finally {
    // Reverse order: a counter installed over another restores it first.
    for (const remove of removers.reverse()) remove()
  }
  return counts
}

type RowLookup = Pick<Register, "row" | "rows">

// Marks a seed's baseline register: a comparison with it is not recorded
// for checkReach.
const BASELINE = Symbol("seed baseline")

/** A stand-in register holding `counts` as a path's figures, for a failing
 *  seed to compare with the unseeded run. */
export const registerOf = (
  path: string,
  counts: Counts
): RowLookup & { [BASELINE]: true } => {
  const rows = Object.entries(counts).map(([row, value]) => ({
    path,
    row,
    table: "Measured" as const,
    figure: { kind: "count", value } as Figure,
  }))
  return {
    [BASELINE]: true,
    row(rowPath, name) {
      const found = rows.find((row) => row.path === rowPath && row.row === name)
      if (!found) throw new Error(`no row ${rowPath}: ${name}`)
      return found
    },
    rows: (rowPath) => rows.filter((row) => row.path === rowPath),
  }
}

/** The register's rows a count test measures; the default is every row of
 *  its path (the frame chunk count measures one Page load row, the page-load
 *  count test the others). */
type RowFilter = { only?: (row: string) => boolean }

const rowsOf = (register: RowLookup, path: string, { only }: RowFilter) =>
  register.rows(path).filter(({ row }) => !only || only(row))

// The key under which a row whose figure is one count for every outcome
// records its highest count.
const EVERY_OUTCOME = ""

// The highest count each path's unseeded runs reached, per row and outcome:
// what checkReach compares with the register.
const reached = new Map<string, Map<string, Map<string, number>>>()

const record = (path: string, row: string, outcome: string, value: number) => {
  const rows = reached.get(path) ?? new Map<string, Map<string, number>>()
  reached.set(path, rows)
  const outcomes = rows.get(row) ?? new Map<string, number>()
  rows.set(row, outcomes)
  outcomes.set(outcome, Math.max(outcomes.get(outcome) ?? 0, value))
}

/**
 * Compares a unit's counts with the register's figures for `path`. The unit
 * is described by its outcomes, in the paths ADR's outcome names: for each
 * row whose figure is split by outcome, it names exactly one of the row's
 * outcomes, either in `outcomes` or, for that row alone, in `perRow` (a
 * load at another version restores nothing: its storage writes are "other
 * version", its restore-sheet writes "nothing saved"). Throws one error
 * listing each row over its figure (the row, the outcome, the measured
 * figure, the register figure), each row whose outcome the unit names none
 * or several of, each register row of the path without a count, and each
 * count without a row. A row still "unmeasured" is printed and checks
 * nothing else. Each count is recorded for checkReach, unless `register` is
 * a seed's baseline (registerOf).
 */
export const checkCounts = ({
  path,
  outcomes,
  perRow = {},
  counts,
  register = loadRegister(),
  only,
}: {
  path: string
  outcomes: readonly string[]
  perRow?: Readonly<Record<string, string>>
  counts: Counts
  register?: RowLookup
} & RowFilter): void => {
  const recording = !(BASELINE in register)
  const failures: string[] = []
  const rows = rowsOf(register, path, { only })
  for (const { row, figure } of rows) {
    const measured = counts[row]
    if (measured === undefined) {
      failures.push(`${path}: ${row}: not measured`)
      continue
    }
    const named = row in perRow ? [perRow[row]!] : outcomes
    if (figure.kind === "unmeasured") {
      console.log(
        `${path}: ${row} (${named.join(", ")}): measured ${measured}, register unmeasured`
      )
      continue
    }
    if (figure.kind === "count" || figure.kind === "percent") {
      if (recording) record(path, row, EVERY_OUTCOME, measured)
      if (measured > figure.value)
        failures.push(
          `${path}: ${row} (${named.join(", ")}): measured ${measured}, register ${figure.value}`
        )
      continue
    }
    const mine = named.filter((outcome) => outcome in figure.values)
    if (mine.length !== 1) {
      failures.push(
        mine.length === 0
          ? `${path}: ${row}: the unit names none of its outcomes`
          : `${path}: ${row}: the unit names several of its outcomes (${mine.join(", ")})`
      )
      continue
    }
    const outcome = mine[0]!
    const allowed = figure.values[outcome]!
    if (recording) record(path, row, outcome, measured)
    if (measured > allowed)
      failures.push(
        `${path}: ${row} (${outcome}): measured ${measured}, register ${allowed}`
      )
  }
  for (const row of Object.keys(counts)) {
    if (!rows.some((known) => known.row === row))
      failures.push(`${path}: ${row}: the register has no such row`)
  }
  if (failures.length > 0) throw new Error(failures.join("\n"))
}

/**
 * Fails each row and outcome of `path` whose register figure is above 0 but
 * above the highest count the file's unseeded runs reached through
 * checkCounts: the figure is stale (a lower figure must be written down, the
 * ratchet) or the counter went blind. Run it as the file's last test, after
 * every unit's checkCounts.
 */
export const checkReach = ({
  path,
  register = loadRegister(),
  only,
}: { path: string; register?: RowLookup } & RowFilter): void => {
  const failures: string[] = []
  for (const { row, figure } of rowsOf(register, path, { only })) {
    const figures: [string, number][] =
      figure.kind === "outcomes"
        ? Object.entries(figure.values)
        : figure.kind === "count"
          ? [[EVERY_OUTCOME, figure.value]]
          : []
    for (const [outcome, value] of figures) {
      const most = reached.get(path)?.get(row)?.get(outcome) ?? 0
      if (value === 0 || most >= value) continue
      const label = outcome === EVERY_OUTCOME ? row : `${row} (${outcome})`
      failures.push(
        `${path}: ${label}: register ${value}, the unseeded runs reach ${most}: figure stale or counter blind`
      )
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"))
}

/** Throws unless the seeded run exceeds the unseeded run's figure on `row`,
 *  as the comparison names it: the row's counter sees one more unit of its
 *  work. */
export const checkSeedCaught = ({
  path,
  row,
  unseeded,
  seeded,
}: {
  path: string
  row: string
  unseeded: Counts
  seeded: Counts
}): void => {
  const expected = `${path}: ${row} (seeded): measured`
  let failure = ""
  try {
    checkCounts({
      path,
      outcomes: ["seeded"],
      counts: seeded,
      register: registerOf(path, unseeded),
    })
  } catch (error) {
    failure = (error as Error).message
  }
  if (!failure.split("\n").some((line) => line.startsWith(expected)))
    throw new Error(
      `the seed for ${path}: ${row} went uncaught: unseeded ${JSON.stringify(unseeded)}, seeded ${JSON.stringify(seeded)}${failure ? `\n${failure}` : ""}`
    )
}

const findDescriptor = (
  target: object | null,
  key: string
): PropertyDescriptor | undefined => {
  for (let at = target; at; at = Object.getPrototypeOf(at)) {
    const found = Object.getOwnPropertyDescriptor(at, key)
    if (found) return found
  }
  return undefined
}
