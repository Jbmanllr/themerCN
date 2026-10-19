// Every public export of themercn carries TSDoc, so a Host developer's editor
// shows the same docs on hover as the README. "Public" means what the five
// `exports` subpaths in package.json resolve to (their source entries below),
// plus the members of the exported interfaces (the props a Host passes).
// Fails when a new export, or a new member of an exported interface, lands
// without a doc comment.
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { expect, it } from "vitest"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// Source entry of each public subpath (tsdown.config.ts builds them).
const ENTRIES = {
  themercn: "src/index.ts",
  "themercn/loader": "src/loader.tsx",
  "themercn/head-script": "src/head-script.ts",
  "themercn/next": "src/next/index.tsx",
  "themercn/next/server": "src/next/server.ts",
}

function undocumented(): string[] {
  const files = Object.values(ENTRIES).map((file) => join(root, file))
  const program = ts.createProgram(files, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    noEmit: true,
  })
  const checker = program.getTypeChecker()
  const missing: string[] = []
  const hasDocs = (symbol: ts.Symbol) =>
    ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
      .length > 0

  for (const [subpath, file] of Object.entries(ENTRIES)) {
    const source = program.getSourceFile(join(root, file))
    const moduleSymbol = source && checker.getSymbolAtLocation(source)
    if (!moduleSymbol) throw new Error(`Cannot read ${file}`)

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported
      const name = `${subpath}: ${exported.name}`
      if (!hasDocs(symbol)) missing.push(name)

      if (symbol.flags & ts.SymbolFlags.Interface) {
        const type = checker.getDeclaredTypeOfSymbol(symbol)
        for (const member of checker.getPropertiesOfType(type)) {
          if (!hasDocs(member)) missing.push(`${name}.${member.name}`)
        }
      }
    }
  }
  return missing
}

// Type-checks the whole package (several seconds alone); under a loaded,
// parallel run it overran the 20s default.
it(
  "documents every public export and every member of its interfaces",
  { timeout: 90_000 },
  () => {
    expect(undocumented()).toEqual([])
  }
)
