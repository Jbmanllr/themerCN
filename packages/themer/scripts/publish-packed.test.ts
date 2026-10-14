import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { publishPacked } from "./publish-packed.mjs"

type Call = { cmd: string; args: string[] }

function packDirWith(plan: unknown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-packed-"))
  fs.writeFileSync(
    path.join(dir, "publish-plan.json"),
    JSON.stringify({ version: 1, plan })
  )
  return dir
}

const themercn010 = {
  kind: "publish",
  name: "themercn",
  version: "0.1.0",
  access: "public",
  tag: "latest",
  tarball: { path: "packages/themercn-0.1.0.tgz", integrity: "sha256-x" },
}

// Stands in for the npm and changeset CLIs: records every call and answers
// `npm view` from the set of versions already on the registry.
function fakeCli({
  published = [] as string[],
  versions = { node: "24.11.0", npm: "11.6.2" },
  failPublish = false,
} = {}) {
  const calls: Call[] = []
  const exec = (cmd: string, args: string[]) => {
    calls.push({ cmd, args })
    if (cmd === "npm" && args[0] === "--version")
      return { status: 0, stdout: versions.npm }
    if (cmd === "npm" && args[0] === "view")
      return published.includes(args[1]!)
        ? { status: 0, stdout: JSON.stringify(args[1]!.split("@")[1]) }
        : { status: 1, stdout: "" }
    if (cmd === "npm" && args[0] === "publish")
      return { status: failPublish ? 1 : 0, stdout: "" }
    return { status: 0, stdout: "" }
  }
  return { calls, exec, nodeVersion: versions.node }
}

const mutating = (calls: Call[]) =>
  calls.filter(
    (c) => (c.cmd === "npm" && c.args[0] === "publish") || c.cmd === "changeset"
  )

describe("publishPacked", () => {
  it("publishes each packed tarball with npm to its dist-tag, then creates the git tags", () => {
    const packDir = packDirWith([[themercn010]])
    const cli = fakeCli()

    publishPacked({ packDir, ...cli })

    expect(mutating(cli.calls)).toEqual([
      {
        cmd: "npm",
        args: [
          "publish",
          path.join(packDir, "packages/themercn-0.1.0.tgz"),
          "--access",
          "public",
          "--tag",
          "latest",
        ],
      },
      { cmd: "changeset", args: ["git-tag"] },
    ])
  })

  it("skips a version the registry already has, so a rerun only tags", () => {
    const packDir = packDirWith([[themercn010]])
    const cli = fakeCli({ published: ["themercn@0.1.0"] })

    publishPacked({ packDir, ...cli })

    expect(mutating(cli.calls)).toEqual([
      { cmd: "changeset", args: ["git-tag"] },
    ])
  })

  it.each([
    { node: "22.13.1", npm: "11.6.2" },
    { node: "24.11.0", npm: "11.5.0" },
    { node: "24.11.0", npm: "10.9.4" },
  ])(
    "refuses to publish below Node 22.14 / npm 11.5.1 ($node, npm $npm)",
    (versions) => {
      const packDir = packDirWith([[themercn010]])
      const cli = fakeCli({ versions })

      expect(() => publishPacked({ packDir, ...cli })).toThrow(
        /trusted publishing needs Node >= 22\.14\.0 and npm >= 11\.5\.1/
      )
      expect(mutating(cli.calls)).toEqual([])
    }
  )

  it("creates no git tags when a publish fails", () => {
    const packDir = packDirWith([[themercn010]])
    const cli = fakeCli({ failPublish: true })

    expect(() => publishPacked({ packDir, ...cli })).toThrow(
      /npm publish failed for themercn@0\.1\.0/
    )
    expect(cli.calls).not.toContainEqual({
      cmd: "changeset",
      args: ["git-tag"],
    })
  })
})
