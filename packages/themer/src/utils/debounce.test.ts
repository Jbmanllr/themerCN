// Proves debounce runs once with the last call's arguments, that `cancel`
// drops the pending call without disabling the debouncer, and that `flush`
// runs the pending call immediately (and only once).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { debounce } from "./debounce"

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("flush runs the pending call once with its latest arguments", () => {
    const func = vi.fn<(value: string) => void>()
    const debounced = debounce(func, 150)

    debounced("a")
    debounced("b")
    debounced.flush()
    expect(func).toHaveBeenCalledTimes(1)
    expect(func).toHaveBeenCalledWith("b")

    vi.advanceTimersByTime(150)
    debounced.flush()
    expect(func).toHaveBeenCalledTimes(1)
  })

  it("flush after cancel does nothing", () => {
    const func = vi.fn<(value: string) => void>()
    const debounced = debounce(func, 150)

    debounced("a")
    debounced.cancel()
    debounced.flush()
    vi.advanceTimersByTime(150)
    expect(func).not.toHaveBeenCalled()
  })

  it("runs once, after the wait, with the last call's arguments", () => {
    const func = vi.fn<(value: string) => void>()
    const debounced = debounce(func, 150)

    debounced("a")
    vi.advanceTimersByTime(100)
    debounced("b")
    vi.advanceTimersByTime(100)
    expect(func).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)

    expect(func).toHaveBeenCalledExactlyOnceWith("b")
  })

  it("cancel drops the pending call, and a later call still runs", () => {
    const func = vi.fn<(value: string) => void>()
    const debounced = debounce(func, 150)

    debounced("a")
    debounced.cancel()
    vi.advanceTimersByTime(300)
    expect(func).not.toHaveBeenCalled()

    debounced("b")
    vi.advanceTimersByTime(150)
    expect(func).toHaveBeenCalledExactlyOnceWith("b")
  })

  it("flush with nothing pending does nothing", () => {
    const func = vi.fn<(value: string) => void>()
    const debounced = debounce(func, 150)

    debounced.flush()
    expect(func).not.toHaveBeenCalled()
  })
})
