import { importLayers } from "@workspace/eslint-config/base"
import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  // The Playground's import layers: routes over components over lib.
  ...importLayers({
    root: "",
    alias: "@",
    layers: {
      lib: [],
      components: ["lib"],
      app: ["components", "lib"],
    },
  }),
  {
    ignores: ["playwright-report/**", "test-results/**"],
  },
]
