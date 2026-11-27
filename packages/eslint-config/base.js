import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

/** Every source file ESLint checks: JS and TS, with or without JSX. */
export const sourceFiles = ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"]

/**
 * Gives every config block that has no `files` of its own an explicit
 * `files`. Without one, ESLint only lints .js/.mjs/.cjs, so TS and TSX
 * would silently go unchecked. Blocks already scoped (typescript-eslint's
 * TS-only overrides, for one) keep their own `files`.
 *
 * @param {import("eslint").Linter.Config[]} configs
 * @param {string[]} files
 * @returns {import("eslint").Linter.Config[]}
 */
export const scoped = (configs, files = sourceFiles) =>
  configs.map((block) => ({ ...block, files: block.files ?? files }))

/**
 * Config blocks that keep a source tree's import layers
 * (docs/adr/0003-import-layers.md): a file under a layer directory may
 * import, among the layers and entries, only the ones listed for its layer.
 * Imports are matched by specifier (`../<name>/…`, or `<alias>/<name>/…`),
 * not resolved; test files are exempt, since a test may mount any layer.
 *
 * @param {object} options
 * @param {string} options.root Directory holding the layer directories,
 *   relative to the ESLint config, with a trailing slash (`"src/"`, `""`).
 * @param {Record<string, string[]>} options.layers Each layer directory and
 *   the layers and entries it may import.
 * @param {string[]} [options.entries] Entry modules beside the layer
 *   directories (`"index"`): import targets no layer reaches unless listed.
 * @param {string} [options.alias] Path alias of `root` (`"@"`).
 * @returns {import("eslint").Linter.Config[]}
 */
export const importLayers = ({ root, layers, entries = [], alias }) =>
  Object.entries(layers).flatMap(([layer, allowed]) => {
    const forbidden = [...Object.keys(layers), ...entries].filter(
      (name) => name !== layer && !allowed.includes(name)
    )
    if (forbidden.length === 0) return []
    const prefix = alias ? `((\\.\\./)+|${alias}/)` : "(\\.\\./)+"
    return {
      files: [`${root}${layer}/**/*.{ts,tsx}`],
      ignores: ["**/*.test.{ts,tsx}", "**/*.test-helper.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                regex: `^${prefix}(${forbidden.join("|")})(/|$)`,
                message: `${root}${layer} imports only ${
                  allowed.join(", ") || "its own modules"
                } (docs/adr/0003-import-layers.md).`,
              },
            ],
          },
        ],
      },
    }
  })

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  { ignores: ["dist/**"] },
  ...scoped([
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      plugins: {
        turbo: turboPlugin,
      },
      rules: {
        "turbo/no-undeclared-env-vars": "error",
      },
    },
    eslintConfigPrettier,
  ]),
]
