// Publishes the tarballs `changeset pack` wrote (release.yml, publish job).
//
// Changesets publishes with pnpm in a pnpm workspace; themercn publishes with
// npm so that npm trusted publishing (OIDC, automatic provenance) does the
// upload. The tarballs come from `pnpm pack`, which rewrites `workspace:*`
// ranges. After publishing, `changeset git-tag` creates the tags and reports
// them through CHANGESETS_OUTPUT, so changesets/action/publish pushes them and
// creates the GitHub Releases.
//
// Usage: PACK_DIR=<changeset pack --out-dir> node publish-packed.mjs
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// npm trusted publishing: https://docs.npmjs.com/trusted-publishers
const MIN_NODE = [22, 14, 0]
const MIN_NPM = [11, 5, 1]

function atLeast(version, min) {
  const parts = version.replace(/^v/, "").split(".").map(Number)
  for (let i = 0; i < min.length; i++) {
    if ((parts[i] ?? 0) !== min[i]) return (parts[i] ?? 0) > min[i]
  }
  return true
}

export function publishPacked({
  packDir,
  exec,
  nodeVersion = process.versions.node,
}) {
  const npmVersion = exec("npm", ["--version"]).stdout
  if (!atLeast(nodeVersion, MIN_NODE) || !atLeast(npmVersion, MIN_NPM))
    throw new Error(
      `trusted publishing needs Node >= ${MIN_NODE.join(".")} and npm >= ${MIN_NPM.join(".")} (have Node ${nodeVersion}, npm ${npmVersion})`
    )

  const { plan } = JSON.parse(
    fs.readFileSync(path.join(packDir, "publish-plan.json"), "utf8")
  )
  const releases = plan.flat().filter((r) => r.kind === "publish")

  for (const release of releases) {
    const spec = `${release.name}@${release.version}`
    if (exec("npm", ["view", spec, "version", "--json"]).status === 0) {
      console.log(`${spec} is already published, skipping`)
      continue
    }
    const tarball = path.join(packDir, release.tarball.path)
    const { status } = exec("npm", [
      "publish",
      tarball,
      "--access",
      release.access,
      "--tag",
      release.tag,
    ])
    if (status !== 0)
      throw new Error(
        `npm publish failed for ${release.name}@${release.version}`
      )
  }

  exec("changeset", ["git-tag"])
}

function exec(cmd, args) {
  const [bin, binArgs] =
    cmd === "changeset" ? ["pnpm", ["exec", "changeset", ...args]] : [cmd, args]
  const result = spawnSync(bin, binArgs, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  })
  if (result.error) throw result.error
  process.stdout.write(result.stdout)
  return { status: result.status, stdout: result.stdout.trim() }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packDir = process.env.PACK_DIR
  if (!packDir) throw new Error("PACK_DIR is not set")
  publishPacked({ packDir: path.resolve(packDir), exec })
}
