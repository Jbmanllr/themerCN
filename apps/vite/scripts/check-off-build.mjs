// Proves that a production build with the Themer off ships none of it.
//
// Builds the app twice into a temporary directory: with VITE_THEMER=1, whose
// output must contain the `data-themer` marker (so the probe can see the
// Themer at all), then with VITE_THEMER unset, whose output must not.
// Fails (exit 1) naming the files that carry the marker.

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { build } from "vite"

const MARKER = "data-themer"
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

async function filesWithMarker(themer) {
  const outDir = await mkdtemp(path.join(tmpdir(), `vite-app-${themer}-`))
  const saved = process.env.VITE_THEMER
  if (themer === "on") process.env.VITE_THEMER = "1"
  else delete process.env.VITE_THEMER
  try {
    await build({
      root,
      logLevel: "warn",
      build: { outDir, emptyOutDir: true },
    })
    const hits = []
    for (const entry of await readdir(outDir, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile()) continue
      const file = path.join(entry.parentPath, entry.name)
      if ((await readFile(file, "utf8")).includes(MARKER))
        hits.push(path.relative(outDir, file))
    }
    return hits
  } finally {
    if (saved === undefined) delete process.env.VITE_THEMER
    else process.env.VITE_THEMER = saved
    await rm(outDir, { recursive: true, force: true })
  }
}

const on = await filesWithMarker("on")
if (on.length === 0) {
  console.error(
    `check-off-build: the Themer-on build has no "${MARKER}"; the probe can't see the Themer.`
  )
  process.exit(1)
}

const off = await filesWithMarker("off")
if (off.length > 0) {
  console.error(
    `check-off-build: the Themer-off build ships "${MARKER}" in:\n  ${off.join("\n  ")}`
  )
  process.exit(1)
}

console.log(
  `check-off-build: ok (on build: ${on.length} file(s) with "${MARKER}", off build: none)`
)
