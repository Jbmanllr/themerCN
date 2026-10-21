import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

// release.yml publishes themercn with a token that can write to npm `latest`
// (README "Releasing"). These assertions keep its safety properties from
// drifting: only a commit CI verified on `main` is versioned or published,
// the version step's PR triggers CI, and no action or npm can be retagged
// under it.

type Step = {
  id?: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
}
type Job = {
  if?: string
  needs?: string | string[]
  permissions?: Record<string, string>
  steps: Step[]
}
type Workflow = {
  name: string
  on: Record<string, unknown>
  jobs: Record<string, Job>
}

const workflowsDir = new URL("../../../.github/workflows/", import.meta.url)
const readText = (file: string) =>
  readFileSync(new URL(file, workflowsDir), "utf8")
const readWorkflow = (file: string) => parse(readText(file)) as Workflow

const release = readWorkflow("release.yml")
const ci = readWorkflow("ci.yml")
const jobs = Object.entries(release.jobs)
const steps = jobs.flatMap(([, job]) => job.steps)

const HEAD_SHA = "${{ github.event.workflow_run.head_sha }}"

const needsOf = (job: Job) =>
  job.needs === undefined ? [] : [job.needs].flat()

// The CI gate: the triggering CI run succeeded, for a push (not a pull
// request whose head branch happens to be called `main`), and its commit is
// still main's tip, which is the `github.sha` changesets/action versions,
// tags and releases, from this repository (not a fork's run).
const isGated = (job: Job) =>
  /github\.event\.workflow_run\.conclusion == 'success'/.test(job.if ?? "") &&
  /github\.event\.workflow_run\.event == 'push'/.test(job.if ?? "") &&
  /github\.event\.workflow_run\.head_sha == github\.sha/.test(job.if ?? "") &&
  /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/.test(
    job.if ?? ""
  )

const runsOnlyBehindGate = (name: string): boolean => {
  const job = release.jobs[name]!
  return isGated(job) || needsOf(job).some(runsOnlyBehindGate)
}

describe("release.yml", () => {
  it("runs only when a CI run on main completes", () => {
    expect(release.on).toEqual({
      workflow_run: {
        workflows: [ci.name],
        types: ["completed"],
        branches: ["main"],
      },
    })
  })

  it("runs no job unless that CI run succeeded on main's current commit", () => {
    for (const [name] of jobs) expect(runsOnlyBehindGate(name), name).toBe(true)
  })

  it("checks out exactly the commit CI verified", () => {
    const checkouts = steps.filter((step) =>
      step.uses?.startsWith("actions/checkout@")
    )
    expect(checkouts).toHaveLength(jobs.length)
    for (const checkout of checkouts) expect(checkout.with?.ref).toBe(HEAD_SHA)
  })

  // CI is pinned too: it gates the release and writes the pnpm cache.
  it.each(["release.yml", "ci.yml"])(
    "pins every action in %s to a full commit SHA with a version comment",
    (file) => {
      const uses = [
        ...readText(file).matchAll(/^\s*(?:-\s+)?uses:\s*(.+)$/gm),
      ].map((match) => match[1]!.trim())
      expect(uses.length).toBeGreaterThan(0)
      for (const use of uses)
        expect(use).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
    }
  )

  it("installs an exact npm version for publishing", () => {
    const npmInstalls = steps
      .map((step) => step.run ?? "")
      .filter((run) => /npm (install|i) -g npm@/.test(run))
    expect(npmInstalls).toHaveLength(1)
    expect(npmInstalls[0]).toMatch(/npm@\d+\.\d+\.\d+(\s|$)/)
  })

  it("opens the Version Packages PR with a GitHub App installation token", () => {
    const uses = (step: Step, action: string) =>
      step.uses?.startsWith(`${action}@`) ?? false
    const versionJob = jobs
      .map(([, job]) => job)
      .find((job) =>
        job.steps.some((step) => uses(step, "changesets/action/version"))
      )
    const appToken = versionJob?.steps.find((step) =>
      uses(step, "actions/create-github-app-token")
    )
    expect(appToken?.id).toBeTruthy()
    const version = versionJob?.steps.find((step) =>
      uses(step, "changesets/action/version")
    )
    // Events from GITHUB_TOKEN don't trigger workflows, so a PR opened with
    // it would never get CI's required checks.
    expect(version?.with?.["github-token"]).toBe(
      `\${{ steps.${appToken?.id}.outputs.token }}`
    )
  })
})

// Evaluates the subset of GitHub Actions expressions the workflows use:
// `${{ }}` interpolation, string literals, `github.*` context paths, `==`,
// `!=`, `&&` and `||` (which, as on GitHub, return an operand, not a
// boolean), and parentheses.
function evaluate(template: string, github: Record<string, string>): unknown {
  const evalExpression = (source: string): unknown => {
    const tokens = source.match(/'[^']*'|==|!=|&&|\|\||[()]|[\w.]+/g) ?? []
    let at = 0
    const primary = (): unknown => {
      const token = tokens[at++]
      if (token === "(") {
        const value = or()
        at++
        return value
      }
      if (token?.startsWith("'")) return token.slice(1, -1)
      if (token?.startsWith("github.")) return github[token.slice(7)] ?? ""
      throw new Error(`unsupported expression token: ${token}`)
    }
    const comparison = (): unknown => {
      const left = primary()
      const op = tokens[at]
      if (op !== "==" && op !== "!=") return left
      at++
      const equal = left === primary()
      return op === "==" ? equal : !equal
    }
    const and = (): unknown => {
      let value = comparison()
      while (tokens[at] === "&&") {
        at++
        const right = comparison()
        value = value ? right : value
      }
      return value
    }
    const or = (): unknown => {
      let value = and()
      while (tokens[at] === "||") {
        at++
        const right = and()
        value = value ? value : right
      }
      return value
    }
    return or()
  }
  const whole = template.match(/^\$\{\{(.*)\}\}$/s)
  if (whole) return evalExpression(whole[1]!)
  return template.replace(/\$\{\{(.*?)\}\}/gs, (_, source: string) =>
    String(evalExpression(source))
  )
}

describe("ci.yml", () => {
  const { concurrency } = ci as unknown as {
    concurrency: { group: string; "cancel-in-progress": string }
  }
  const runFor = (github: Record<string, string>) => ({
    group: evaluate(concurrency.group, github),
    cancels: evaluate(concurrency["cancel-in-progress"], github),
  })

  it("cancels a pull request's superseded run", () => {
    const pr = { event_name: "pull_request", ref: "refs/pull/7/merge" }
    const first = runFor({ ...pr, sha: "a1" })
    const second = runFor({ ...pr, sha: "b2" })

    expect(second.group).toBe(first.group)
    expect(second.cancels).toBe(true)
  })

  // A run waiting behind a running one in the same group is cancelled by the
  // next one queued, whatever cancel-in-progress says, so every commit on
  // main needs a group of its own to get a verdict.
  it("gives every push to main a run of its own", () => {
    const pushes = ["a1", "b2", "c3"].map((sha) =>
      runFor({ event_name: "push", ref: "refs/heads/main", sha })
    )

    expect(new Set(pushes.map((run) => run.group)).size).toBe(3)
    for (const run of pushes) expect(run.cancels).toBe(false)
  })

  // The backstop runs: sharing a push run's group would cancel it, or have
  // it cancelled while waiting. A scheduled or dispatched run usually builds
  // main's tip, the very commit its push run builds.
  it.each(["schedule", "workflow_dispatch", "merge_group"])(
    "gives a %s run of main's tip a group apart from that commit's push run, that never cancels",
    (event_name) => {
      expect(Object.keys(ci.on)).toContain(event_name)
      const push = runFor({
        event_name: "push",
        ref: "refs/heads/main",
        sha: "a1",
      })
      const backstop = runFor({ event_name, ref: "refs/heads/main", sha: "a1" })

      expect(backstop.group).not.toBe(push.group)
      expect(backstop.cancels).toBe(false)
    }
  )
})

// CI reuses Turbo's local cache across runs. Only a push to main writes it,
// so a pull request's (or a fork's) task outputs never reach main's runs or
// the release.
describe("CI's Turbo cache", () => {
  type CiStep = Step & { if?: string }
  const ciJobs = Object.entries(
    (ci as unknown as { jobs: Record<string, { steps: CiStep[] }> }).jobs
  )
  const action = (step: CiStep) => step.uses?.split("@")[0]
  const turboJobs = ciJobs.filter(([, job]) =>
    job.steps.some((step) => /\bturbo\b/.test(step.run ?? ""))
  )
  const cacheSteps = (job: { steps: CiStep[] }, name: string) =>
    job.steps.filter((step) => action(step) === `actions/cache/${name}`)

  it("is restored before every job's first Turbo run", () => {
    expect(turboJobs.map(([id]) => id)).toEqual(
      expect.arrayContaining(["checks", "e2e"])
    )
    for (const [id, job] of turboJobs) {
      const [restore] = cacheSteps(job, "restore")
      const firstTurbo = job.steps.findIndex((step) =>
        /\bturbo\b/.test(step.run ?? "")
      )
      expect({ id, restored: restore?.if }).toEqual({ id, restored: undefined })
      expect(job.steps.indexOf(restore!), id).toBeLessThan(firstTurbo)
      expect(restore?.with?.path, id).toBe(".turbo/cache")
      // The exact key never exists yet; the prefix picks main's latest save.
      const key = String(restore?.with?.key)
      const prefix = String(restore?.with?.["restore-keys"]).trim()
      expect(key, id).toMatch(/\$\{\{ github\.sha \}\}$/)
      expect(key.startsWith(prefix), id).toBe(true)
      expect(prefix.length, id).toBeGreaterThan(0)
    }
  })

  it("each job saves under its own restore key, after its last Turbo run", () => {
    for (const [id, job] of turboJobs) {
      const [restore] = cacheSteps(job, "restore")
      const saves = cacheSteps(job, "save")
      expect(saves, id).toHaveLength(1)
      const save = saves[0]!
      expect(save.with?.path, id).toBe(restore?.with?.path)
      expect(save.with?.key, id).toBe(restore?.with?.key)
      const lastTurbo = Math.max(
        ...job.steps.map((step, at) =>
          /\bturbo\b/.test(step.run ?? "") ? at : -1
        )
      )
      expect(job.steps.indexOf(save), id).toBeGreaterThan(lastTurbo)
    }
    // Two jobs saving one key: the second save would be refused.
    const keys = turboJobs.map(
      ([, job]) => cacheSteps(job, "save")[0]?.with?.key
    )
    const resolved = keys.map((key) => evaluate(String(key), { sha: "a1" }))
    expect(new Set(resolved).size).toBe(keys.length)
  })

  const saveRuns = (github: Record<string, string>) =>
    turboJobs.map(([, job]) => {
      const condition = cacheSteps(job, "save")[0]?.if
      return condition === undefined
        ? true
        : evaluate(`\${{ ${condition} }}`, github)
    })

  it("is saved by a push to main", () => {
    expect(saveRuns({ event_name: "push", ref: "refs/heads/main" })).toEqual(
      turboJobs.map(() => true)
    )
  })

  it.each([
    { event_name: "pull_request", ref: "refs/pull/7/merge" },
    { event_name: "pull_request", ref: "refs/heads/main" },
    { event_name: "push", ref: "refs/heads/feature" },
    { event_name: "merge_group", ref: "refs/heads/gh-readonly-queue/main/x" },
    { event_name: "schedule", ref: "refs/heads/main" },
    { event_name: "workflow_dispatch", ref: "refs/heads/main" },
  ])("is never saved by $event_name on $ref", (github) => {
    expect(saveRuns(github)).toEqual(turboJobs.map(() => false))
  })

  // Each save carries forward everything it restored, so without a bound
  // the cache would grow with every push to main.
  it("bounds the size of the cache each run carries forward", () => {
    const { env } = ci as unknown as { env?: Record<string, string> }
    expect(env?.TURBO_CACHE_MAX_SIZE).toMatch(/^\d+(\.\d+)?(MB|GB)$/)
  })

  it("is the only actions/cache use in CI", () => {
    const uses = ciJobs.flatMap(([, job]) =>
      job.steps.map(action).filter((name) => name?.startsWith("actions/cache"))
    )
    expect(uses.sort()).toEqual(
      turboJobs
        .flatMap(() => ["actions/cache/restore", "actions/cache/save"])
        .sort()
    )
  })

  // The release builds and publishes from a clean slate: no restored task
  // output or dependency store can reach the publish job.
  it("never reaches release.yml", () => {
    expect(
      steps.filter((step) => step.uses?.startsWith("actions/cache"))
    ).toEqual([])
    const setupNode = steps.filter((step) =>
      step.uses?.startsWith("actions/setup-node@")
    )
    expect(setupNode.length).toBeGreaterThan(0)
    for (const step of setupNode) expect(step.with?.cache).toBeUndefined()
    expect(readText("release.yml")).toMatch(
      /# No dependency cache in this workflow/
    )
    expect(readText("release.yml")).not.toMatch(/TURBO_CACHE|\.turbo/)
  })
})

describe("release.yml for CI's backstop runs", () => {
  const selectMode = release.jobs["select-mode"]!
  // A successful CI run of main's current commit, from this repository.
  const releasesFrom = (event: string) =>
    evaluate(`\${{ ${selectMode.if} }}`, {
      "event.workflow_run.conclusion": "success",
      "event.workflow_run.event": event,
      "event.workflow_run.head_sha": "a1",
      sha: "a1",
      "event.workflow_run.head_repository.full_name": "Jbmanllr/themerCN",
      repository: "Jbmanllr/themerCN",
    })

  it("releases from a push run", () => {
    expect(releasesFrom("push")).toBe(true)
  })

  it.each(["schedule", "workflow_dispatch", "merge_group"])(
    "never releases from a %s run",
    (event) => {
      expect(releasesFrom(event)).toBe(false)
    }
  )
})
