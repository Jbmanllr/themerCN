// PROTOTYPE. Precompiles the Themer's CSS once per variant into dist/<variant>.css.
//   none    naive library: `@import "tailwindcss"` as-is (global Preflight, layered)
//   prefix  `prefix(tm)` utilities, unlayered; Preflight under @scope
//   scoped  unprefixed utilities + Preflight, all under @scope([data-themer])
// Theme values are inlined (`theme(inline)`), so the Themer declares no
// private custom properties: nothing to collide with or inherit into the Host.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import postcss from "postcss"

const here = path.dirname(new URL(import.meta.url).pathname)
const pkg = path.resolve(here, "..")
const tw = path.join(pkg, "node_modules/.bin/tailwindcss")
fs.mkdirSync(path.join(pkg, "dist"), { recursive: true })

// The Theme owns these: the Themer UI must follow them (ticket #5), so they
// resolve to the Host page's custom properties, never to Themer defaults.
const themeOwned = `
@theme inline {
  --spacing: var(--spacing);
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);
  --font-heading: var(--font-heading, var(--font-sans));
  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
@custom-variant dark (&:is(.dark *));
@import "tw-animate-css";
@import "shadcn/tailwind.css";
/* shadcn's app-level base rule; the Themer has to ship its own copy. */
@layer base {
  * {
    border-color: var(--border);
    outline-color: color-mix(in oklab, var(--ring) 50%, transparent);
  }
}
`

const inputs = {
  none: `@import "tailwindcss" source(none);\n@source "../gen/plain";\n${themeOwned}`,
  prefix: `@import "tailwindcss/theme.css" layer(theme) theme(inline) prefix(tm);
@import "tailwindcss/preflight.css" layer(base);
@tailwind utilities source(none);
@source "../gen/tm";
${themeOwned}`,
  scoped: `@import "tailwindcss/theme.css" layer(theme) theme(inline);
@import "tailwindcss/preflight.css" layer(base);
@tailwind utilities source(none);
@source "../gen/plain";
${themeOwned}`,
}

const SCOPE_END = "to ([data-themer-host])"
const scopes = {
  // Preflight must also reach popups portalled to <body>: their elements carry tm: classes.
  prefix: { base: `(:where([data-themer], [class*="tm:"])) ${SCOPE_END}`, utilities: null },
  scoped: { base: `([data-themer]) ${SCOPE_END}`, utilities: `([data-themer]) ${SCOPE_END}` },
}

const isLayer = (n, name) => n.type === "atrule" && n.name === "layer" && n.params === name

function wrapInScope(nodes, prelude) {
  const scope = postcss.atRule({ name: "scope", params: prelude })
  for (const n of nodes) {
    n.walkRules?.((r) => {
      r.selectors = r.selectors.map((s) => (/^(html|:root|:host)$/.test(s.trim()) ? ":scope" : s))
    })
    if (n.type === "rule") n.selectors = n.selectors.map((s) => (/^(html|:root|:host)$/.test(s.trim()) ? ":scope" : s))
    scope.append(n)
  }
  return scope
}

const report = {}
for (const [variant, input] of Object.entries(inputs)) {
  const entry = path.join(pkg, "css", `${variant}.src.css`)
  fs.writeFileSync(entry, input)
  const out = execFileSync(tw, ["-i", entry], { cwd: pkg, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  const root = postcss.parse(out)
  const scope = scopes[variant]
  if (scope) {
    // FINDING: Theme-owned keys compile to `:root { --spacing: var(--spacing) }`
    // in @layer theme. Unprefixed, that later same-layer declaration makes a
    // cycle that invalidates the Host's own --spacing. Strip self-references.
    const stripped = []
    root.each((n) => {
      if (!isLayer(n, "theme")) return
      n.walkDecls((d) => {
        if (d.value.startsWith(`var(${d.prop}`)) (stripped.push(d.prop), d.remove())
      })
      n.walkRules((r) => r.nodes.length === 0 && r.remove())
      if (!n.nodes.length) n.remove()
    })
    report[`${variant} stripped`] = { kb: 0, customPropsDeclared: stripped.length }
    // Preflight: lift out of @layer base and put it under @scope.
    root.each((n) => {
      if (isLayer(n, "base")) n.replaceWith(wrapInScope(n.nodes.slice(), scope.base))
    })
    if (scope.utilities) {
      const loose = root.nodes.filter((n) => n.type === "rule" || (n.type === "atrule" && ["media", "supports", "container"].includes(n.name)))
      if (loose.length) {
        const s = wrapInScope([], scope.utilities)
        loose[0].before(s)
        for (const n of loose) s.append(n)
      }
    }
  }
  const css = root.toString()
  fs.writeFileSync(path.join(pkg, "dist", `${variant}.css`), css)
  const decls = css.match(/(^|[{;\s])--[\w-]+\s*:/g) ?? []
  report[variant] = {
    kb: +(css.length / 1024).toFixed(1),
    customPropsDeclared: new Set(decls.map((d) => d.replace(/[{;\s:]/g, ""))).size,
  }
}
console.table(report)
