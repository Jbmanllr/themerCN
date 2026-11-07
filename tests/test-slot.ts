// The clone's test slots (TESTING.md "Verification tiers"): every Vitest
// config names this file as its global setup, so any run, `vitest run` typed
// by hand included, waits for one of TEST_SLOTS slots shared by all the
// clone's worktrees before its workers start, and frees it when it ends.
// With each config's `maxWorkers: "50%"`, the machine runs at most two runs'
// workers, about one per core. CI (one job per runner) and watch mode skip it.
//
// A slot is the directory `test-slots/<n>` in git's common directory,
// holding its holder's pid; a slot whose holder has exited is taken over.
// A run that waits over WAIT_SECONDS fails without running.
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

import type { TestProject } from "vitest/node"

export const TEST_SLOTS = 2
const WAIT_SECONDS = 900

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}

// Takes a free slot under `dir`, waiting up to `wait` seconds, and returns
// the function that frees it.
export const takeTestSlot = async ({
  dir,
  slots,
  wait,
  poll = 500,
}: {
  dir: string
  slots: number
  wait: number
  poll?: number
}): Promise<() => void> => {
  mkdirSync(dir, { recursive: true })
  const deadline = Date.now() + wait * 1000
  for (;;) {
    const holders: string[] = []
    for (let n = 0; n < slots; n++) {
      const slot = join(dir, String(n))
      try {
        mkdirSync(slot)
      } catch {
        let holder = ""
        try {
          holder = readFileSync(join(slot, "pid"), "utf8").trim()
        } catch {
          // Its holder is still writing the pid.
        }
        if (holder && !alive(Number(holder))) {
          rmSync(slot, { recursive: true, force: true })
          n--
          continue
        }
        holders.push(holder || "unknown")
        continue
      }
      writeFileSync(join(slot, "pid"), `${process.pid}\n`)
      return () => rmSync(slot, { recursive: true, force: true })
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `test slots busy: all ${slots} held by pids ${holders.join(", ")}` +
          ` for over ${wait}s (${dir}); the tests did not run.`
      )
    }
    await sleep(poll)
  }
}

// Vitest's global setup: its return value is the teardown.
export default async function setup(project: TestProject) {
  if (process.env.CI || project.config.watch) return
  let common: string
  try {
    common = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: project.config.root, encoding: "utf8" }
    ).trim()
  } catch {
    return
  }
  return takeTestSlot({
    dir: join(common, "test-slots"),
    slots: TEST_SLOTS,
    wait: WAIT_SECONDS,
  })
}
