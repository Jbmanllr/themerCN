import { config } from "@workspace/eslint-config/react-internal"
import globals from "globals"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    // Retired by a rename and excluded from tsconfig.json; the owner deletes it.
    ignores: ["src/components/preview/examples/typography/typography-demo.tsx"],
  },
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
]
