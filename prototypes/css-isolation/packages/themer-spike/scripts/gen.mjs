// PROTOTYPE. Copies packages/ui + src/panel.tsx into two trees:
//   gen/plain  unchanged classes (variants none, scoped, scoped-container)
//   gen/tm     every class prefixed with `tm:` by an AST rewrite (variant prefix)
// and prints how much the prefix rewrite touched.
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const here = path.dirname(new URL(import.meta.url).pathname)
const pkg = path.resolve(here, "..")
const uiSrc = path.resolve(pkg, "../ui/src")
const PREFIX = "tm"

const sources = [
  ...fs.readdirSync(path.join(uiSrc, "components")).map((f) => [`ui/components/${f}`, path.join(uiSrc, "components", f)]),
  ...fs.readdirSync(path.join(uiSrc, "lib")).map((f) => [`ui/lib/${f}`, path.join(uiSrc, "lib", f)]),
  ["panel.tsx", path.join(pkg, "src/panel.tsx")],
]

function rewriteImports(code, rel) {
  const depth = rel.split("/").length - 1
  const up = depth === 0 ? "./" : "../".repeat(depth)
  return code
    .replace(/from "@workspace\/ui\/(components|lib)\/([\w-]+)"/g, (_, d, f) => `from "${up}ui/${d}/${f}"`)
    .replace(/from "cn"/g, `from "${up}cn"`)
}

const stats = { files: 0, literals: 0, tokens: 0, skippedTemplates: [] }

function prefixTokens(text) {
  return text.replace(/\S+/g, (t) => {
    if (t.startsWith(`${PREFIX}:`)) return t
    stats.tokens++
    return `${PREFIX}:${t}`
  })
}

function isClassContext(node) {
  // Walk up from a string literal to decide whether it holds classes.
  let child = node
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (ts.isPropertyAssignment(p) && p.name === child) return false // object key
    if (ts.isBinaryExpression(p) && /=/.test(ts.tokenToString(p.operatorToken.kind) ?? "") && p.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken)
      return false // `size === "sm"`
    if (ts.isPropertyAssignment(p)) {
      const name = p.name.getText()
      if (name === "defaultVariants") return false
      if (name === "compoundVariants") return false // handled below via class/className
      if (name === "class" || name === "className") return true
    }
    if (ts.isJsxAttribute(p)) return p.name.getText() === "className"
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText()
      if (callee === "cn" || callee === "cva") return true
      return false
    }
  }
  return false
}

function prefixClasses(code, file) {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isClassContext(node)) {
      if (node.text.trim()) edits.push([node.getStart() + 1, node.getEnd() - 1, prefixTokens(node.text)])
    } else if (ts.isTemplateExpression(node) && isClassContext(node)) {
      stats.skippedTemplates.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  if (edits.length) stats.files++
  stats.literals += edits.length
  let out = code
  for (const [s, e, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + text + out.slice(e)
  return out
}

for (const variant of ["plain", "tm"]) {
  const root = path.join(pkg, "gen", variant)
  fs.rmSync(root, { recursive: true, force: true })
  for (const [rel, abs] of sources) {
    let code = rewriteImports(fs.readFileSync(abs, "utf8"), rel)
    if (variant === "tm") code = prefixClasses(code, rel)
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), code)
  }
  fs.writeFileSync(
    path.join(root, "cn.ts"),
    variant === "tm"
      ? `import { createCn } from "cn/config"\n\n// tailwind-merge semantics, told about the prefix\nexport const cn = createCn({ prefix: "${PREFIX}" })\n`
      : `export { cn } from "cn"\n`
  )
}

console.log(
  `prefix rewrite: ${stats.files} files, ${stats.literals} class strings, ${stats.tokens} class tokens` +
    (stats.skippedTemplates.length ? `; SKIPPED template literals: ${stats.skippedTemplates.join(", ")}` : "")
)
