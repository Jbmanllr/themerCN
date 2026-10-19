// The README's Next and Vite quick starts are excerpts of the code the repo's
// apps run, so a Host developer can trust them. A recipe block is a fenced
// code block preceded by `<!-- recipe: <repo path> -->`; it must appear in
// that file as consecutive lines (indentation may differ as a whole). Fails
// when an app or a recipe changes without the other, or when a quick-start
// file loses its recipe.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(packageDir, "../..")

// Every file a quick start mirrors (each carries a "Mirrors the README" comment).
const MIRRORED = [
  "apps/web/app/layout.tsx",
  "apps/web/components/themer/playground-themer.tsx",
  "apps/web/lib/themer.ts",
  "apps/web/app/api/themer/fonts/route.ts",
  "apps/vite/src/main.tsx",
  "apps/vite/vite.config.ts",
]

interface Recipe {
  path: string
  lines: string[]
}

function readRecipes(): Recipe[] {
  const readme = readFileSync(join(packageDir, "README.md"), "utf8")
  const pattern = /<!-- recipe: (\S+) -->\s*\n```[^\n]*\n([\s\S]*?)\n```/g
  return [...readme.matchAll(pattern)].map(([, path, body]) => ({
    path: path!,
    lines: body!.split("\n"),
  }))
}

function dedent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.length - line.trimStart().length)
  const cut = Math.min(...indents)
  return lines.map((line) => line.slice(cut).trimEnd())
}

function containsExcerpt(fileLines: string[], excerpt: string[]): boolean {
  const wanted = dedent(excerpt).join("\n")
  for (let start = 0; start + excerpt.length <= fileLines.length; start++) {
    const window = fileLines.slice(start, start + excerpt.length)
    if (dedent(window).join("\n") === wanted) return true
  }
  return false
}

const recipes = readRecipes()

describe("README recipes", () => {
  it.each(MIRRORED)("has a recipe from %s", (path) => {
    expect(recipes.map((recipe) => recipe.path)).toContain(path)
  })

  it.each(recipes.map((recipe) => [recipe.path, recipe] as const))(
    "matches %s",
    (path, recipe) => {
      const fileLines = readFileSync(join(repoRoot, path), "utf8").split("\n")
      expect(containsExcerpt(fileLines, recipe.lines)).toBe(true)
    }
  )
})
