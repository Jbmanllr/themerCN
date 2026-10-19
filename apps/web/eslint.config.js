import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: [
      "playwright-report/**",
      "test-results/**",
      // Retired with the `shiki` dependency; the owner deletes them.
      "hooks/use-highlighted-code.ts",
      "lib/highlighter.tsx",
    ],
  },
]
