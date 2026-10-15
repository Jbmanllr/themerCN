import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ScriptedReply } from "../mock"

import { answer, streamReply } from "./brew-assistant"

describe("answer", () => {
  it("answers with the first scripted reply whose pattern matches", () => {
    const reply = answer("Why is my espresso so sour?")
    expect(reply.reply[0]).toEqual({
      type: "p",
      text: "Taste is the best gauge. Sour means grind finer; bitter means grind coarser.",
    })
  })

  it("falls back when nothing matches", () => {
    expect(answer("Tell me a joke").match).toBe("fallback")
  })
})

describe("streamReply", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const reply: ScriptedReply = {
    match: "fallback",
    delayMs: 100,
    reply: [
      { type: "p", text: "one" },
      { type: "p", text: "two" },
    ],
  }

  it("emits the reply's blocks one by one, delayMs apart, then finishes", async () => {
    const seen: string[] = []
    const done = streamReply(reply, (block) =>
      seen.push(block.type === "p" ? block.text : block.type)
    )

    await vi.advanceTimersByTimeAsync(99)
    expect(seen).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(seen).toEqual(["one"])
    await vi.advanceTimersByTimeAsync(100)
    expect(seen).toEqual(["one", "two"])
    await expect(done).resolves.toBe(true)
  })

  it("stops emitting once aborted", async () => {
    const seen: unknown[] = []
    const controller = new AbortController()
    const done = streamReply(
      reply,
      (block) => seen.push(block),
      controller.signal
    )

    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await vi.advanceTimersByTimeAsync(500)
    expect(seen).toHaveLength(1)
    await expect(done).resolves.toBe(false)
  })
})
