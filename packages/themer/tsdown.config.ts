import { defineConfig, type UserConfig } from "tsdown"

import pkg from "./package.json" with { type: "json" }

// Two configs, as in nuqs: Rolldown keeps a top-level directive only on entry
// modules, so the client config adds 'use client' to each entry chunk with
// `outputOptions.intro`; the server config adds none.

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

const client = {
  ...common,
  clean: true,
  entry: { index: "src/index.ts" },
  deps: { ...common.deps, onlyImport: runtimeImports },
  outputOptions: {
    intro: ({ isEntry, fileName }) =>
      isEntry && !fileName.endsWith(".d.ts") ? "'use client';\n" : "",
  },
} satisfies UserConfig

// Entries with no directive (`head-script`, `next/server`) arrive with the
// Next Adapter (#21); tsdown needs at least one entry per config.
const server = {
  ...common,
  clean: false,
  entry: {} as Record<string, string>,
} satisfies UserConfig

export default defineConfig(
  [client, server].filter((config) => Object.keys(config.entry).length > 0)
)
