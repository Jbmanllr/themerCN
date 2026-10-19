// The Themer's precompiled CSS (scripts/build-css.mjs → src/generated/), as
// <Themer> injects it. It must style the Themer UI only and follow the
// page's Theme variables without declaring any of its own.
import postcss, { type AtRule, type Container, type Rule } from "postcss"
import { describe, expect, it } from "vitest"

import { THEMER_CSS } from "../generated/themer-css"

const SCOPE = "([data-themer]) to ([data-themer-host])"
const root = postcss.parse(THEMER_CSS)

/** Rules reached without crossing an `@scope` (the unscoped part). */
function unscopedRules(container: Container = root): Rule[] {
  const found: Rule[] = []
  container.each((node) => {
    if (node.type === "rule") found.push(node)
    const opaque = ["scope", "keyframes"]
    if (node.type === "atrule" && !opaque.includes(node.name) && node.nodes)
      found.push(...unscopedRules(node))
  })
  return found
}

/** The declarations of every rule with exactly this selector, merged. */
function utility(selector: string): Record<string, string> {
  const declarations: Record<string, string> = {}
  root.walkRules((rule) => {
    if (rule.selector !== selector) return
    rule.each((n) => {
      if (n.type === "decl") declarations[n.prop] = n.value
    })
  })
  if (!Object.keys(declarations).length)
    throw new Error(`no rule for ${selector}`)
  return declarations
}

describe("the Themer's CSS", () => {
  it("declares no custom property whose value reads itself", () => {
    const selfReferences: string[] = []
    root.walkDecls((decl) => {
      const own = new RegExp(`^var\\(\\s*${decl.prop}\\s*[,)]`)
      if (decl.prop.startsWith("--") && own.test(decl.value))
        selfReferences.push(`${decl.prop}: ${decl.value}`)
    })

    expect(selfReferences).toEqual([])
  })

  // Tailwind keeps a theme key as a variable only where a class names it
  // (`[--radius:var(--radius-xl)]`): it may hold the page's variables, never
  // a value of the Themer's own, and never lands on the Host page's root.
  it("declares Theme keys only on its scope root, as the page's variables", () => {
    const themeKey = /^--(color-|radius-|spacing$|font-|tracking-|shadow)/
    const declared: string[] = []
    root.walkDecls((decl) => {
      if (!themeKey.test(decl.prop)) return
      const rule = decl.parent as Rule
      const onScopeRoot =
        rule.selector === ":scope" &&
        (rule.parent as AtRule | undefined)?.name === "scope"
      if (!onScopeRoot || !/var\(--/.test(decl.value))
        declared.push(`${decl.prop}: ${decl.value}`)
    })
    const pageRoots: string[] = []
    root.walkRules((rule) => {
      if (rule.selectors.some((s) => /^(html|:root|:host)$/.test(s.trim())))
        pageRoots.push(rule.selector)
    })

    expect(declared).toEqual([])
    expect(pageRoots).toEqual([])
  })

  it("ships unlayered, with Preflight and utilities inside the Themer's scope", () => {
    const scopes: AtRule[] = []
    root.walkAtRules("scope", (rule) => {
      scopes.push(rule)
    })
    const layers: AtRule[] = []
    root.walkAtRules("layer", (rule) => {
      layers.push(rule)
    })

    expect(layers).toEqual([])
    expect(scopes.map((s) => s.params)).toEqual([SCOPE])
    // Only the light/dark reveal stays outside: it targets <html>.
    expect(
      unscopedRules().filter(
        (r) => !r.selector.startsWith("html[data-themer-vt]")
      )
    ).toEqual([])
    // Preflight, rooted at the scope root instead of <html>.
    expect(utility(":scope")).toMatchObject({ "line-height": "1.5" })
  })

  it("resolves Theme utilities to the page's own variables", () => {
    expect(utility(".bg-primary")).toEqual({
      "background-color": "var(--primary)",
    })
    expect(utility(".rounded-lg")).toEqual({ "border-radius": "var(--radius)" })
    expect(utility(".p-4")["padding"]).toMatch(/var\(--spacing\b/)
    expect(utility(".font-mono")["font-family"]).toMatch(/^var\(--font-mono\b/)
  })

  // `@keyframes` are document-wide: an unprefixed `spin` or `enter` would
  // replace the Host's own animation of that name while the Themer is
  // mounted.
  it("names every @keyframes it declares with the themer- prefix", () => {
    const keyframes: string[] = []
    root.walkAtRules("keyframes", (rule) => {
      keyframes.push(rule.params)
    })

    expect(keyframes).toContain("themer-spin")
    expect(keyframes.filter((name) => !name.startsWith("themer-"))).toEqual([])
  })

  it("animates only with its own, prefixed @keyframes", () => {
    const declared = new Set<string>()
    root.walkAtRules("keyframes", (rule) => {
      declared.add(rule.params)
    })
    const unprefixed = [...declared].map((name) => name.replace(/^themer-/, ""))
    const leaking: string[] = []
    root.walkDecls(/^animation(-name)?$/, (decl) => {
      for (const name of unprefixed)
        if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(decl.value))
          leaking.push(`${decl.prop}: ${decl.value}`)
    })

    expect(utility(".animate-spin")["animation"]).toMatch(/\bthemer-spin\b/)
    expect(leaking).toEqual([])
  })

  it("carries shadcn's base border rule", () => {
    expect(utility("*")).toMatchObject({ "border-color": "var(--border)" })
  })
})
