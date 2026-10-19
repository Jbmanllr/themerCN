// Proves isDeepEqual separates objects whose own key sets differ even when
// both hold `undefined` values.
import { describe, expect, it } from "vitest"

import { isDeepEqual } from "./deep-equal"

describe("isDeepEqual", () => {
  it("tells apart key sets of the same size when one side holds undefined", () => {
    expect(isDeepEqual({ a: undefined, z: 1 }, { b: "red", z: 1 })).toBe(false)
    expect(isDeepEqual({ b: "red", z: 1 }, { a: undefined, z: 1 })).toBe(false)
  })

  it("treats an explicit undefined on both sides as equal", () => {
    expect(
      isDeepEqual(
        { currentMode: undefined, s: [1] },
        { currentMode: undefined, s: [1] }
      )
    ).toBe(true)
  })
})
