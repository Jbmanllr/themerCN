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
// - countGetter(row, target, key): a getter (clientLeft, clientTop).
// - countConstructions(row, target, key): a constructor (MutationObserver,
//   RegExp).
// - countStorage(row, method): localStorage, through a stand-in object (a spy
//   on the storage instance would be stored as an item).
//
// Work that crosses no boundary is counted on the module export that does
// it: wrap the export with passThrough(name, fn) in a vi.mock factory, and
// count it with countExport(row, name, when?).
//
// `when` gets the call's arguments and decides whether the call counts;
// calledFrom(pattern) tells calls apart by the code on the stack.

import { loadRegister, type Figure, type Register } from "./register"

export type Counts = Record<string, number>

export type Counter = {
  row: string
  /** Starts counting into `bump`; returns the function that stops it. */
  install(bump: () => void): () => void
}

type Predicate = (...args: never[]) => boolean

const counted = <F extends (...args: never[]) => unknown>(
  fn: F,
  bump: () => void,
  when?: Predicate
) =>
  function (this: unknown, ...args: Parameters<F>) {
    if (!when || when(...args)) bump()
    return fn.apply(this, args)
  }

/** Counts the calls of `target[key]`, a function or method. */
export const countCalls = <T extends object, K extends keyof T & string>(
  row: string,
  target: T,
  key: K,
  when?: (
    ...args: T[K] extends (...a: infer A) => unknown ? A : never
  ) => boolean
): Counter => ({
  row,
  install(bump) {
    const own = Object.getOwnPropertyDescriptor(target, key)
    const original = target[key] as (...args: never[]) => unknown
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      enumerable: own?.enumerable ?? false,
      value: counted(original, bump, when as Predicate | undefined),
    })
    return () => restore(target, key, own)
  },
})

/** Counts the reads of the getter `target[key]` (own or inherited). */
export const countGetter = (
  row: string,
  target: object,
  key: string
): Counter => ({
  row,
  install(bump) {
    const own = Object.getOwnPropertyDescriptor(target, key)
    const getter = findDescriptor(target, key)?.get
    if (!getter) throw new Error(`countGetter: ${key} has no getter`)
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: own?.enumerable ?? false,
      get() {
        bump()
        return getter.call(this)
      },
    })
    return () => restore(target, key, own)
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
    const own = Object.getOwnPropertyDescriptor(target, key)
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
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      enumerable: own?.enumerable ?? false,
      value: proxy,
    })
    return () => restore(target, key, own)
  },
})

type StorageMethod = "getItem" | "setItem" | "removeItem"

/** Counts the `localStorage[method]` calls, through a stand-in object that
 *  forwards everything to the storage it replaces. */
export const countStorage = (row: string, method: StorageMethod): Counter => ({
  row,
  install(bump) {
    const own = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
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
    standIn[method] = counted(standIn[method], bump)
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: standIn,
    })
    return () => restore(globalThis, "localStorage", own)
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

/** Whether code matching `pattern` (a file path) is on the current stack. */
export const calledFrom = (pattern: RegExp): boolean => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 100
  const stack = new Error().stack ?? ""
  Error.stackTraceLimit = limit
  return pattern.test(stack)
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

/** A stand-in register holding `counts` as a path's figures, for a failing
 *  seed to compare with the unseeded run. */
export const registerOf = (path: string, counts: Counts): RowLookup => {
  const rows = Object.entries(counts).map(([row, value]) => ({
    path,
    row,
    table: "Measured" as const,
    figure: { kind: "count", value } as Figure,
  }))
  return {
    row(rowPath, name) {
      const found = rows.find((row) => row.path === rowPath && row.row === name)
      if (!found) throw new Error(`no row ${rowPath}: ${name}`)
      return found
    },
    rows: (rowPath) => rows.filter((row) => row.path === rowPath),
  }
}

/**
 * Compares a unit's counts with the register's figures for `path`. The unit
 * is described by its outcomes, in the paths ADR's outcome names; a row
 * whose figure is split by outcome is compared with the one outcome the unit
 * names, or the first it lists when it names several. Throws one error
 * listing each row over its figure (the row, the outcome, the measured
 * figure, the register figure), each register row of the path without a
 * count, and each count without a row. A row still "unmeasured" is printed
 * and checks nothing else.
 */
export const checkCounts = ({
  path,
  outcomes,
  counts,
  register = loadRegister(),
}: {
  path: string
  outcomes: readonly string[]
  counts: Counts
  register?: RowLookup
}): void => {
  const failures: string[] = []
  const rows = register.rows(path)
  for (const { row, figure } of rows) {
    const measured = counts[row]
    if (measured === undefined) {
      failures.push(`${path}: ${row}: not measured`)
      continue
    }
    if (figure.kind === "unmeasured") {
      console.log(
        `${path}: ${row} (${outcomes.join(", ")}): measured ${measured}, register unmeasured`
      )
      continue
    }
    const allowed = allowedFor(figure, outcomes)
    if (!allowed) {
      failures.push(`${path}: ${row}: the unit names none of its outcomes`)
      continue
    }
    if (measured > allowed.value) {
      failures.push(
        `${path}: ${row} (${allowed.outcome}): measured ${measured}, register ${allowed.value}`
      )
    }
  }
  for (const row of Object.keys(counts)) {
    if (!rows.some((known) => known.row === row))
      failures.push(`${path}: ${row}: the register has no such row`)
  }
  if (failures.length > 0) throw new Error(failures.join("\n"))
}

const allowedFor = (figure: Figure, outcomes: readonly string[]) => {
  if (figure.kind === "count" || figure.kind === "percent")
    return { outcome: outcomes.join(", "), value: figure.value }
  if (figure.kind !== "outcomes") return undefined
  // A unit naming several of the row's outcomes (a load at another version
  // that restores nothing) is compared with the first it lists.
  const named = outcomes.find((outcome) => outcome in figure.values)
  if (named === undefined) return undefined
  return { outcome: named, value: figure.values[named]! }
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

const restore = (
  target: object,
  key: string,
  own: PropertyDescriptor | undefined
) => {
  if (own) Object.defineProperty(target, key, own)
  else delete (target as Record<string, unknown>)[key]
}
