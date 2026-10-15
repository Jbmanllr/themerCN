import { defineConfig, type UserConfig } from "tsdown"

import pkg from "./package.json" with { type: "json" }

// One config per group of entries, so Rolldown never shares a chunk between
// the core and the entries a Host app imports where the Themer is off.
// Rolldown keeps a top-level directive only on entry modules: the core's
// entry (src/index.ts) has none, so its config adds 'use client' with
// `outputOptions.intro`; `loader` and `next` carry their own.

// `packages/ui` (a workspace devDependency, outside node_modules) is bundled
// into `dist`; nothing from node_modules may be (`onlyBundle: []`), so
// everything else stays an import, and only these packages may be imported.
// `next` is deliberately absent: the core must work without it.
const runtimeImports = [...Object.keys(pkg.dependencies), "react", "react-dom"]

const common = {
  format: ["esm"],
  platform: "neutral",
  dts: true,
  outDir: "dist",
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: {
    alwaysBundle: [/^@workspace\/ui(\/|$)/],
    onlyBundle: [],
  },
  inputOptions: {
    // The source keeps per-file "use client" (for the tests and editors);
    // Rolldown drops them by design, and the entry intro replaces them.
    onLog(level, log, handler) {
      if (log.code === "MODULE_LEVEL_DIRECTIVE") return
      handler(level, log)
    },
  },
} satisfies UserConfig

// The core: `<Themer>` and everything it loads.
const core = {
  ...common,
  clean: true,
  entry: { index: "src/index.ts" },
  deps: { ...common.deps, onlyImport: runtimeImports },
  outputOptions: {
    intro: ({ isEntry, fileName }) =>
      isEntry && !fileName.endsWith(".d.ts") ? "'use client';\n" : "",
  },
} satisfies UserConfig

// The entries a Host app imports where the Themer may be off. Each config
// builds alone, so Rolldown cannot share a chunk between them and the core:
// `loader`, `head-script` and `next` must reach no Themer code
// (scripts/check-entries.mjs checks the output).
const adapters = {
  ...common,
  clean: false,
  entry: { loader: "src/loader.tsx", next: "src/next/index.tsx" },
  // Their sources start with 'use client', which Rolldown keeps on an entry
  // module, so they need no intro.
  deps: { ...common.deps, onlyImport: ["react"] },
} satisfies UserConfig

// No directive, no imports: callable from a Vite config or a server.
const headScript = {
  ...common,
  clean: false,
  entry: { "head-script": "src/head-script.ts" },
  deps: { ...common.deps, onlyImport: [] },
} satisfies UserConfig

// No directive; its catalog code loads lazily, after the `enabled` check.
const nextServer = {
  ...common,
  clean: false,
  entry: { "next/server": "src/next/server.ts" },
  deps: { ...common.deps, onlyImport: [] },
} satisfies UserConfig

export default defineConfig([core, adapters, headScript, nextServer])
