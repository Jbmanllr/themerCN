// `pnpm dev`'s CSS half: reruns scripts/build-css.mjs whenever a file it
// reads changes (the Tailwind sources of src/styles/themer.css: this
// package's src and packages/ui/src). The rewritten src/generated module is
// what `tsdown --watch` (the `dev` script) then rebundles.
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const buildScript = path.join(pkg, "scripts/build-css.mjs")
const roots = [path.join(pkg, "src"), path.resolve(pkg, "../ui/src")]
const generated = path.join(pkg, "src/generated")

// The build's own output and the files themer.css excludes from its sources.
const ignored = (file) =>
  file === generated ||
  file.startsWith(generated + path.sep) ||
  /\.test\.tsx?$/.test(file)

let running = false
let pending = false
let timer

function rebuild() {
  if (running) {
    pending = true
    return
  }
  running = true
  spawn(process.execPath, [buildScript], { stdio: "inherit" }).on(
    "exit",
    () => {
      running = false
      if (pending) {
        pending = false
        rebuild()
      }
    }
  )
}

for (const root of roots) {
  fs.watch(root, { recursive: true }, (_event, name) => {
    if (!name || ignored(path.join(root, name))) return
    clearTimeout(timer)
    timer = setTimeout(rebuild, 100)
  })
}
console.log("themer css: watching src and packages/ui/src")
