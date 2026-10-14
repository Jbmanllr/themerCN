// Checks the packed tarball of the built package (run after `build`, as part
// of `check:package`): `npm pack --dry-run` must list only publishable files,
// every `exports` target must be in it, and each entry must carry exactly the
// directive its tsdown config gives it.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// Entries built by the client config (tsdown.config.ts) start with
// 'use client'; every other `.js` entry must not.
const CLIENT_ENTRIES = new Set(["dist/index.js"])

const ALLOWED = [
  /^package\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^NOTICE$/,
  /^CHANGELOG\.md$/,
  /^LICENSES\/[^/]+\.txt$/,
  /^dist\/.+\.(js|d\.ts)$/,
]
const REQUIRED = ["package.json", "README.md", "LICENSE", "NOTICE"]

const pkg = JSON.parse(
  fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")
)
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: pkgDir,
    encoding: "utf8",
  })
)
const files = new Set(pack.files.map((f) => f.path))
const errors = []

// 0.0.0 is the unreleased version: `changeset version` writes the first
// CHANGELOG.md along with the first real version.
if (pkg.version !== "0.0.0") REQUIRED.push("CHANGELOG.md")

// The package's LICENSE is a copy of the repository's (npm only packs files
// from the package directory).
const rootLicense = path.join(pkgDir, "../../LICENSE")
const pkgLicense = path.join(pkgDir, "LICENSE")
if (
  fs.existsSync(pkgLicense) &&
  fs.readFileSync(pkgLicense, "utf8") !== fs.readFileSync(rootLicense, "utf8")
)
  errors.push("LICENSE differs from the repository root LICENSE")

for (const file of files) {
  if (!ALLOWED.some((re) => re.test(file)))
    errors.push(`stray file in tarball: ${file}`)
}

function exportTargets(value) {
  if (typeof value === "string") return [value]
  return Object.values(value).flatMap(exportTargets)
}
const targets = Object.values(pkg.exports ?? {})
  .flatMap(exportTargets)
  .map((t) => t.replace(/^\.\//, ""))
for (const file of [...REQUIRED, ...targets]) {
  if (!files.has(file)) errors.push(`missing from tarball: ${file}`)
}
if (![...files].some((f) => f.startsWith("LICENSES/")))
  errors.push("missing from tarball: LICENSES/")

for (const file of targets.filter((t) => t.endsWith(".js"))) {
  const abs = path.join(pkgDir, file)
  if (!fs.existsSync(abs)) continue
  const isClient = /^(['"])use client\1;?\s/.test(fs.readFileSync(abs, "utf8"))
  if (CLIENT_ENTRIES.has(file) && !isClient)
    errors.push(`${file} must start with 'use client'`)
  if (!CLIENT_ENTRIES.has(file) && isClient)
    errors.push(`${file} must not start with 'use client'`)
}
for (const file of CLIENT_ENTRIES) {
  if (!targets.includes(file))
    errors.push(`client entry ${file} is not in "exports"`)
}

if (errors.length) {
  console.error(`check-pack: ${pack.filename}\n  ${errors.join("\n  ")}`)
  process.exit(1)
}
console.log(`check-pack: ${pack.filename}, ${files.size} files OK`)
