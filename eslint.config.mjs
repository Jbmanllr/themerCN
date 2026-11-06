// The root's own TypeScript: the repo-wide config tests in tests/ and the
// root configs (the `//#lint:repo` task). Every workspace lints its own files
// with its own config. Imported by path: the root doesn't depend on
// @workspace/eslint-config (see tests/repo-config.test.ts, "toolchain").
import { config } from "./packages/eslint-config/base.js"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  { ignores: ["apps/**", "packages/**"] },
  {
    // The repo tests put stand-in tools first on PATH for the scripts they
    // run. PATH is an input of no task, so it stays out of turbo.json.
    files: ["tests/**"],
    rules: {
      "turbo/no-undeclared-env-vars": ["error", { allowList: ["^PATH$"] }],
    },
  },
]
