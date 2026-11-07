import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"

import { takeTestSlot } from "./test-slot"

// TESTING.md "Verification tiers": at most two Vitest runs at a time per
// clone, each on at most half the cores, however they are started.

const scratch = mkdtempSync(join(tmpdir(), "themercn-test-slot-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))
const slotsDir = () => mkdtempSync(join(scratch, "slots-"))

describe("the test slots", () => {
  it("admits as many runs as there are slots, and holds the next until one frees", async () => {
    const dir = slotsDir()
    const take = () => takeTestSlot({ dir, slots: 2, wait: 0.2, poll: 20 })
    const first = await take()
    await take()
    await expect(take()).rejects.toThrow(
      new RegExp(`test slots busy: all 2 held by pids ${process.pid}`)
    )
    first()
    await expect(take()).resolves.toBeTypeOf("function")
  })

  it("takes over a slot whose holder has exited", async () => {
    const dir = slotsDir()
    mkdirSync(join(dir, "0"))
    writeFileSync(join(dir, "0", "pid"), `${spawnSync("true").pid}\n`)
    await expect(
      takeTestSlot({ dir, slots: 1, wait: 0.2, poll: 20 })
    ).resolves.toBeTypeOf("function")
  })

  it("frees its slot on release", async () => {
    const dir = slotsDir()
    const release = await takeTestSlot({ dir, slots: 1, wait: 0.2, poll: 20 })
    expect(existsSync(join(dir, "0"))).toBe(true)
    release()
    expect(existsSync(join(dir, "0"))).toBe(false)
  })
})

// Every Vitest config takes a slot in its global setup, so a bare
// `vitest run` queues like a Turbo task does, and caps its workers. Read as
// source: the Vite app's config loads the built package.
describe.each([
  "vitest.config.ts",
  "packages/themer/vitest.config.ts",
  "apps/web/vitest.config.ts",
  "apps/vite/vitest.config.ts",
])("%s", (file) => {
  const ROOT = fileURLToPath(new URL("..", import.meta.url))
  it("takes a test slot and runs on at most half the cores", () => {
    const source = readFileSync(join(ROOT, file), "utf8")
    expect(source).toMatch(/^\s*maxWorkers: "50%",$/m)
    const setup = source.match(/^\s*globalSetup: \["([^"]+)"\],$/m)?.[1]
    expect(setup && join(ROOT, file, "..", setup)).toBe(
      join(ROOT, "tests/test-slot.ts")
    )
  })
})
