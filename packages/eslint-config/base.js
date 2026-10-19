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
