// Checks the built entries a Host app imports where the Themer may be off
// (run after `build`, as part of `check:package`): `loader`, `head-script`
// and `next` must reach no Themer code. Each is built by its own tsdown
// config (tsdown.config.ts), so each must be a single file: it fails if one
// imports another file of `dist` (statically or dynamically), imports a
// package outside its allow-list (a self-reference to `themercn` included),
// or outgrows its size budget.
//
// The imports are read with a regex over these small files, comments
// removed; anything else that looks like an import counts, so a false match
// fails the check rather than hiding a leak.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// Budgets are bytes of unminified output: today's size plus headroom.
// Hitting one means Themer code (or the font catalogue) leaked in; raise it
// only for a deliberate change to the entry itself.
const ISOLATED = {
  "dist/loader.js": { packages: ["react", "react/jsx-runtime"], budget: 3_000 },
  "dist/head-script.js": { packages: [], budget: 12_000 },
  "dist/next.js": { packages: ["react", "react/jsx-runtime"], budget: 12_000 },
}

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\1/g

const errors = []

for (const [entry, { packages, budget }] of Object.entries(ISOLATED)) {
  const file = path.join(pkgDir, entry)
  if (!fs.existsSync(file)) {
    errors.push(`${entry} is missing (run the build first)`)
    continue
  }
  const code = fs.readFileSync(file, "utf8")
  // JSDoc examples (`import("themercn")`) are kept in the output.
  const statements = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
  for (const [, , specifier] of statements.matchAll(IMPORT_RE)) {
    if (specifier.startsWith("."))
      errors.push(`${entry} imports ${specifier}: it must reach no other file`)
    else if (!packages.includes(specifier))
      errors.push(`${entry} imports ${specifier}`)
  }
  const size = Buffer.byteLength(code)
  if (size > budget)
    errors.push(`${entry} is ${size} bytes, over its ${budget} budget`)
}

if (errors.length) {
  console.error(`check-entries:\n  ${errors.join("\n  ")}`)
  process.exit(1)
}
console.log(`check-entries: ${Object.keys(ISOLATED).join(", ")} OK`)
