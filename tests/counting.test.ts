// Proves the counting helper: each counter counts its work and leaves its
// behaviour unchanged (a pass-through), is removed after the unit, and the
// register comparison fails naming the row, the outcome, the measured figure
// and the register figure, and only prints while a row is unmeasured.
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  calledFrom,
  checkCounts,
  checkReach,
  checkSeedCaught,
  countCalls,
  countConstructions,
  countExport,
  countGetter,
  countMethod,
  countSetter,
  countStorage,
  madeBy,
  measure,
  passThrough,
  readingStack,
  registerOf,
} from "./counting"
import { readRegister } from "./register"

const REGISTER = `
## Quality register

### Enforced

**Path A** (per unit)

| Dimension | Rule | Checked by | Runs at |
| --------- | ---- | ---------- | ------- |
| parses | 1 | \`vitest run a.count.test.ts\` | implementer done |
| writes | 1 changed; 0 no change | \`vitest run a.count.test.ts\` | implementer done |

### Measured, not yet enforced

**Path A** (per unit)

| Metric | Today | Direction | Runs at |
| ------ | ----- | --------- | ------- |
| reads | unmeasured | must not grow | implementer done |
`

const register = readRegister(REGISTER)

afterEach(() => {
  vi.restoreAllMocks()
})

describe("measure", () => {
  it("counts each counter's work during the unit, and nothing after it", async () => {
    const target = { parse: (text: string) => text.length }
    const counts = await measure(
      [countCalls("parses", target, "parse")],
      () => {
        target.parse("ab")
        target.parse("abc")
      }
    )
    target.parse("after")

    expect(counts).toEqual({ parses: 2 })
  })

  it("sums the counters that share a row", async () => {
    const target = { a: () => 1, b: () => 2 }
    const counts = await measure(
      [countCalls("queries", target, "a"), countCalls("queries", target, "b")],
      () => {
        target.a()
        target.b()
      }
    )

    expect(counts).toEqual({ queries: 2 })
  })

  it("waits for an async unit and removes the counters when it throws", async () => {
    const original = JSON.stringify
    await expect(
      measure([countCalls("stringifies", JSON, "stringify")], async () => {
        await Promise.resolve()
        throw new Error("unit failed")
      })
    ).rejects.toThrow("unit failed")

    expect(JSON.stringify).toBe(original)
  })
})

describe("pass-through counters leave behaviour unchanged", () => {
  it("calls: same result, same this, same arguments, original restored", async () => {
    const target = {
      factor: 3,
      times(value: number) {
        return this.factor * value
      },
    }
    const original = target.times
    let result = 0
    const counts = await measure([countCalls("calls", target, "times")], () => {
      result = target.times(2)
    })

    expect(result).toBe(6)
    expect(counts).toEqual({ calls: 1 })
    expect(target.times).toBe(original)
  })

  it("calls: counts only the calls `when` accepts", async () => {
    const target = { closest: (selector: string) => selector }
    const counts = await measure(
      [countCalls("ignore", target, "closest", (s) => s === "[data-ignore]")],
      () => {
        target.closest("[data-ignore]")
        target.closest(".card")
      }
    )

    expect(counts).toEqual({ ignore: 1 })
  })

  it("calls on a prototype: counts every instance, and restores the prototype", async () => {
    class Box {
      constructor(readonly size: number) {}
      measure() {
        return this.size
      }
    }
    const original = Box.prototype.measure
    let sizes: number[] = []
    const counts = await measure(
      [countCalls("measures", Box.prototype, "measure")],
      () => {
        sizes = [new Box(1).measure(), new Box(2).measure()]
      }
    )

    expect(sizes).toEqual([1, 2])
    expect(counts).toEqual({ measures: 2 })
    expect(Box.prototype.measure).toBe(original)
    expect(Object.hasOwn(Box.prototype, "measure")).toBe(true)
  })

  it("JSON: the same text and value as without the counter", async () => {
    const value = { a: [1, "two", null], b: { c: true } }
    let text = ""
    let parsed: unknown
    const counts = await measure(
      [
        countCalls("stringifies", JSON, "stringify"),
        countCalls("parses", JSON, "parse"),
      ],
      () => {
        text = JSON.stringify(value, null, 2)
        parsed = JSON.parse(text)
      }
    )

    expect(text).toBe(JSON.stringify(value, null, 2))
    expect(parsed).toEqual(value)
    expect(counts).toEqual({ stringifies: 1, parses: 1 })
  })

  it("getters: the same value, and an inherited getter restored as inherited", async () => {
    class Frame {
      get clientLeft() {
        return 4
      }
    }
    const frame = new Frame()
    let left = 0
    const counts = await measure(
      [countGetter("layout reads", Frame.prototype, "clientLeft")],
      () => {
        left = frame.clientLeft
      }
    )

    expect(left).toBe(4)
    expect(counts).toEqual({ "layout reads": 1 })
    expect(frame.clientLeft).toBe(4)
  })

  it("constructions: real instances, static members kept, original restored", async () => {
    const original = RegExp
    let matched = false
    let instance: unknown
    const counts = await measure(
      [countConstructions("regex compiles", globalThis, "RegExp")],
      () => {
        instance = new RegExp("a+b")
        matched = /c/.test("c") && (instance as RegExp).test("aab")
      }
    )

    expect(instance).toBeInstanceOf(original)
    expect(matched).toBe(true)
    // A literal compiles no RegExp through the constructor.
    expect(counts).toEqual({ "regex compiles": 1 })
    expect(globalThis.RegExp).toBe(original)
  })

  it("storage: a stand-in object that reads and writes the real storage", async () => {
    const items = new Map<string, string>()
    const real = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    }
    vi.stubGlobal("localStorage", real)
    let read: string | null = null
    const counts = await measure(
      [
        countStorage("storage reads", "getItem"),
        countStorage("storage writes", "setItem"),
      ],
      () => {
        localStorage.setItem("key", "value")
        read = localStorage.getItem("key")
        localStorage.removeItem("key")
      }
    )
    vi.unstubAllGlobals()

    expect(read).toBe("value")
    expect(items.size).toBe(0)
    expect(counts).toEqual({ "storage reads": 1, "storage writes": 1 })
    // Nothing of the counter was stored as an item.
    expect([...items.keys()]).toEqual([])
  })

  it("methods: counts only the receivers and arguments `when` accepts", async () => {
    const original = String.prototype.toLowerCase
    let lowered: string[] = []
    const counts = await measure(
      [
        countMethod(
          "lower-cases",
          String.prototype,
          "toLowerCase",
          (self) => String(self) === "Inter"
        ),
      ],
      () => {
        lowered = ["Inter".toLowerCase(), "Lora".toLowerCase()]
      }
    )

    expect(lowered).toEqual(["inter", "lora"])
    expect(counts).toEqual({ "lower-cases": 1 })
    expect(String.prototype.toLowerCase).toBe(original)
  })

  it("setters: the value written, counted for the receivers `when` accepts, inherited setter restored", async () => {
    class Sheet {
      text = ""
      constructor(readonly id: string) {}
      get textContent() {
        return this.text
      }
      set textContent(value: string) {
        this.text = value
      }
    }
    const restore = new Sheet("restore")
    const other = new Sheet("other")
    const counts = await measure(
      [
        countSetter(
          "sheet writes",
          Sheet.prototype,
          "textContent",
          (self) => (self as Sheet).id === "restore"
        ),
      ],
      () => {
        restore.textContent = "a"
        other.textContent = "b"
      }
    )

    expect([restore.textContent, other.textContent]).toEqual(["a", "b"])
    expect(counts).toEqual({ "sheet writes": 1 })
    expect(Object.hasOwn(Sheet.prototype, "textContent")).toBe(true)
  })

  it("module exports: the wrapped export returns the real result, counted only while measured", async () => {
    const double = passThrough("double", (value: number) => value * 2)
    let result = 0
    const counts = await measure([countExport("doubles", "double")], () => {
      result = double(4)
    })

    expect(result).toBe(8)
    expect(double(5)).toBe(10)
    expect(counts).toEqual({ doubles: 1 })
  })
})

describe("checkCounts", () => {
  it("passes when every row is at or under its figure for the unit's outcome", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        counts: { parses: 1, writes: 1, reads: 7 },
        register,
      })
    ).not.toThrow()
  })

  it("fails naming the row, the outcome, the measured figure and the register figure", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["no change"],
        counts: { parses: 2, writes: 1, reads: 0 },
        register,
      })
    ).toThrow(
      [
        "Path A: parses (no change): measured 2, register 1",
        "Path A: writes (no change): measured 1, register 0",
      ].join("\n")
    )
  })

  it("prints an unmeasured row's figure and checks nothing else", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    checkCounts({
      path: "Path A",
      outcomes: ["changed"],
      counts: { parses: 0, writes: 0, reads: 99 },
      register,
    })

    expect(log).toHaveBeenCalledWith(
      "Path A: reads (changed): measured 99, register unmeasured"
    )
  })

  it("fails when a row of the path has no count, or a count names no row", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        counts: { parses: 0, reads: 0, stray: 1 },
        register,
      })
    ).toThrow(
      [
        "Path A: writes: not measured",
        "Path A: stray: the register has no such row",
      ].join("\n")
    )
  })

  it("fails when the unit names none of a row's outcomes", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["elsewhere"],
        counts: { parses: 0, writes: 0, reads: 0 },
        register,
      })
    ).toThrow("Path A: writes: the unit names none of its outcomes")
  })

  it("fails when the unit names several of a row's outcomes", () => {
    // A cap of 0 on one outcome would not hold if the unit could pick the
    // other one.
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed", "no change"],
        counts: { parses: 0, writes: 1, reads: 0 },
        register,
      })
    ).toThrow(
      "Path A: writes: the unit names several of its outcomes (changed, no change)"
    )
  })

  it("compares a row named in perRow with that outcome alone", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        perRow: { writes: "no change" },
        counts: { parses: 0, writes: 1, reads: 0 },
        register,
      })
    ).toThrow("Path A: writes (no change): measured 1, register 0")
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["elsewhere"],
        perRow: { writes: "changed" },
        counts: { parses: 1, writes: 1, reads: 0 },
        register,
      })
    ).not.toThrow()
  })

  it("checks only the rows `only` keeps", () => {
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        counts: { parses: 1 },
        register,
        only: (row) => row === "parses",
      })
    ).not.toThrow()
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        counts: { parses: 1, writes: 0 },
        register,
        only: (row) => row === "parses",
      })
    ).toThrow("Path A: writes: the register has no such row")
  })

  it("compares with figures recorded from an earlier run (a seed's baseline)", () => {
    const baseline = registerOf("Path A", { parses: 1, writes: 0 })
    expect(() =>
      checkCounts({
        path: "Path A",
        outcomes: ["changed"],
        counts: { parses: 1, writes: 1 },
        register: baseline,
      })
    ).toThrow("Path A: writes (changed): measured 1, register 0")
  })
})

describe("checkReach", () => {
  // Each case its own path, so the counts recorded for one stay out of the
  // others.
  const reachRegister = (path: string) =>
    readRegister(REGISTER.replaceAll("Path A", path))

  it("passes when the unseeded runs reach every figure above 0", () => {
    const path = "Reach passes"
    const lookup = reachRegister(path)
    vi.spyOn(console, "log").mockImplementation(() => {})
    record(path, lookup, ["changed"], { parses: 1, writes: 1, reads: 0 })
    record(path, lookup, ["no change"], { parses: 0, writes: 0, reads: 0 })

    expect(() => checkReach({ path, register: lookup })).not.toThrow()
  })

  it("fails a row and outcome whose figure no unseeded run reaches", () => {
    const path = "Reach fails"
    const lookup = reachRegister(path)
    vi.spyOn(console, "log").mockImplementation(() => {})
    record(path, lookup, ["no change"], { parses: 0, writes: 0, reads: 0 })

    expect(() => checkReach({ path, register: lookup })).toThrow(
      [
        `${path}: parses: register 1, the unseeded runs reach 0: figure stale or counter blind`,
        `${path}: writes (changed): register 1, the unseeded runs reach 0: figure stale or counter blind`,
      ].join("\n")
    )
  })

  it("ignores a seed's comparison and the rows `only` drops", () => {
    const path = "Reach seeds"
    const lookup = reachRegister(path)
    vi.spyOn(console, "log").mockImplementation(() => {})
    checkCounts({
      path,
      outcomes: ["changed"],
      counts: { parses: 1, writes: 1 },
      register: registerOf(path, { parses: 1, writes: 1 }),
    })
    record(path, lookup, ["changed"], { writes: 1 }, (row) => row === "writes")

    expect(() =>
      checkReach({ path, register: lookup, only: (row) => row === "writes" })
    ).not.toThrow()
    expect(() => checkReach({ path, register: lookup })).toThrow(
      `${path}: parses: register 1, the unseeded runs reach 0`
    )
  })
})

/** An unseeded run's checkCounts against `lookup`: recorded for checkReach,
 *  as every comparison but a seed's is. */
function record(
  path: string,
  lookup: ReturnType<typeof readRegister>,
  outcomes: string[],
  counts: Record<string, number>,
  only?: (row: string) => boolean
) {
  checkCounts({ path, outcomes, counts, register: lookup, only })
}

describe("checkSeedCaught", () => {
  it("passes when the seeded run exceeds the unseeded one on the row", () => {
    expect(() =>
      checkSeedCaught({
        path: "Path A",
        row: "writes",
        unseeded: { parses: 1, writes: 1 },
        seeded: { parses: 1, writes: 2 },
      })
    ).not.toThrow()
  })

  it("fails when the seed went uncaught, or caught on another row only", () => {
    expect(() =>
      checkSeedCaught({
        path: "Path A",
        row: "writes",
        unseeded: { parses: 1, writes: 1 },
        seeded: { parses: 1, writes: 1 },
      })
    ).toThrow("the seed for Path A: writes went uncaught")
    expect(() =>
      checkSeedCaught({
        path: "Path A",
        row: "writes",
        unseeded: { parses: 1, writes: 1 },
        seeded: { parses: 2, writes: 1 },
      })
    ).toThrow("the seed for Path A: writes went uncaught")
  })
})

describe("stacks", () => {
  it("calledFrom finds a function on the stack; madeBy only the nearest caller", () => {
    function outerCaller() {
      return innerCaller()
    }
    function innerCaller() {
      return [calledFrom(/outerCaller/), madeBy(/outerCaller/)]
    }

    expect(outerCaller()).toEqual([true, false])
  })

  it("readingStack is true only while a stack is read", () => {
    const seen: boolean[] = []
    const target = { parse: (text: string) => text }
    const remove = countMethod("parses", target, "parse", () => {
      seen.push(readingStack())
      return true
    }).install(() => {})
    const prepare = Error.prepareStackTrace
    Error.prepareStackTrace = (error, frames) => {
      target.parse("source map")
      return prepare ? prepare(error, frames) : String(error)
    }
    try {
      calledFrom(/nothing/)
    } finally {
      Error.prepareStackTrace = prepare
      remove()
    }
    target.parse("after")

    expect(seen).toEqual([true])
    expect(readingStack()).toBe(false)
  })
})
