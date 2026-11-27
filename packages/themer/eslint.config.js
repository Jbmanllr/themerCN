import { importLayers } from "@workspace/eslint-config/base"
import { config } from "@workspace/eslint-config/react-internal"
import globals from "globals"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  // The import layers of src/ (ARCHITECTURE.md, "File Structure"): imports
  // point down, and only the Next Adapter reaches an entry (the head script).
  ...importLayers({
    root: "src/",
    entries: ["index", "loader", "head-script"],
    layers: {
      types: [],
      config: ["types"],
      utils: ["config", "types"],
      selectors: ["config", "types", "utils"],
      stores: ["config", "selectors", "types", "utils"],
      hooks: ["config", "selectors", "stores", "types", "utils"],
      api: ["types", "utils"],
      components: ["config", "hooks", "selectors", "stores", "types", "utils"],
      next: ["api", "config", "hooks", "head-script"],
    },
  }),
  {
    // Build, packaging and release scripts run in Node.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // release.yml runs this script directly, never through a turbo task, so
    // no turbo.json can declare the variable it reads.
    files: ["scripts/publish-packed.mjs"],
    rules: {
      "turbo/no-undeclared-env-vars": ["error", { allowList: ["^PACK_DIR$"] }],
    },
  },
  {
    // The Host's bundler replaces NODE_ENV when it builds the Host app; no
    // turbo task of this package reads it.
    files: ["src/utils/is-production.ts"],
    rules: {
      "turbo/no-undeclared-env-vars": ["error", { allowList: ["^NODE_ENV$"] }],
    },
  },
]
