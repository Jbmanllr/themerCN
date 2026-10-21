// The root's own TypeScript: the repo-wide config tests in tests/ and the
// root configs (the `//#lint:repo` task). Every workspace lints its own files
// with its own config. Imported by path: the root doesn't depend on
// @workspace/eslint-config (see tests/repo-config.test.ts, "toolchain").
import { config } from "./packages/eslint-config/base.js"

/** @type {import("eslint").Linter.Config[]} */
export default [...config, { ignores: ["apps/**", "packages/**"] }]
