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
// tags and releases.
const isGated = (job: Job) =>
  /github\.event\.workflow_run\.conclusion == 'success'/.test(job.if ?? "") &&
  /github\.event\.workflow_run\.event == 'push'/.test(job.if ?? "") &&
  /github\.event\.workflow_run\.head_sha == github\.sha/.test(job.if ?? "")

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

  it("pins every action to a full commit SHA with a version comment", () => {
    const uses = [
      ...readText("release.yml").matchAll(/^\s*(?:-\s+)?uses:\s*(.+)$/gm),
    ].map((match) => match[1]!.trim())
    expect(uses.length).toBeGreaterThan(0)
    for (const use of uses)
      expect(use).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
  })

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
