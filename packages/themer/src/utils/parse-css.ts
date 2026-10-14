// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Reads a pasted stylesheet (a shadcn/tweakcn `index.css`, a Tailwind v3 or v4
// theme, a host's generated token CSS) into the editor's per-mode style props. Pure: no
// DOM, no I/O, so it runs in tests and on the server alike.
//
// Why a scanner and not tweakcn's regexes (parse-css-input.ts): `/:root\s*\{([^}]+)\}/`
// stops at the first `}` (a brace in a comment or string truncates the block),
// reads only the first `:root`/`.dark` block, ignores @layer/@media/@theme, and
// would accept `.theme-inverse` values as if they were the root theme. Here
// comments and strings are skipped structurally, braces are balanced, at-rules
// are walked, and only exact root selectors count.
//
// Host extra colours (ThemerConfig.extraColors) are imported when the caller
// passes their keys (`extraColorKeys`); the parser reads no registry.
//
// Contract: bad input is reported in `warnings` and `ignored`, never thrown
// (parse-css.test.ts pins it). Colours culori reads are kept verbatim; lengths
// are normalised (radius and spacing to rem, letter spacing to em, shadow
// lengths to px). Non-colour keys set only for light are mirrored into dark;
// colours never are.
//
// See: packages/themer/docs/API.md ("CSS Import, Sidebar Sync, Shadows, Colour
// Groups").
import * as culori from "culori";
import type {
  PartialThemeStyleProps,
  ThemeStyleProps,
  ThemeStyles,
} from "../types";
import { NON_COLOR_KEYS } from "../types";
import {
  COLOR_STYLE_KEYS,
  defaultLightStyles,
  defaultDarkStyles,
} from "../config/defaults";

export interface ParseThemeCssOptions {
  /**
   * Host extra colour keys (without `--`) to import as colours, like the
   * built-in ones; `--color-<key>` in @theme maps to them too.
   */
  extraColorKeys?: readonly string[];
}

export interface ParsedThemeCss {
  light: PartialThemeStyleProps;
  dark: PartialThemeStyleProps;
  /** Custom properties the editor has no control for (deduplicated, `--name`). */
  ignored: string[];
  /** Problems worth showing the user: unreadable values, skipped selectors... */
  warnings: string[];
}

type Mode = "light" | "dark";

// ---------------------------------------------------------------------------
// Editor key mapping
// ---------------------------------------------------------------------------

const COLOR_KEYS = new Set<string>(COLOR_STYLE_KEYS);
// The three font stacks plus `font-heading` (ThemeStyleProps, types/theme.ts).
const FONT_KEYS = new Set([
  "font-sans",
  "font-serif",
  "font-mono",
  "font-heading",
]);
const SHADOW_LENGTH_KEYS = new Set([
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
]);
const EDITOR_KEYS = new Set<string>([
  ...COLOR_KEYS,
  ...FONT_KEYS,
  ...SHADOW_LENGTH_KEYS,
  "shadow-opacity",
  "radius",
  "spacing",
  "letter-spacing",
]);
// tweakcn / shadcn themes write the shadow knobs as --shadow-x, --shadow-y...
const SHADOW_ALIASES: Record<string, string> = {
  x: "shadow-offset-x",
  y: "shadow-offset-y",
  "offset-x": "shadow-offset-x",
  "offset-y": "shadow-offset-y",
  blur: "shadow-blur",
  spread: "shadow-spread",
  opacity: "shadow-opacity",
  color: "shadow-color",
};
// Tailwind's derived radius scale (`--radius-lg: calc(var(--radius) + ...)`) is
// computed from `--radius`; listing eight of them as "ignored" is only noise.
const DERIVED_RADIUS = /^--radius-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)$/;

/** The colour and editor key sets for one parse (built-ins plus extras). */
interface KeySets {
  colors: ReadonlySet<string>;
  editor: ReadonlySet<string>;
}

const BUILT_IN_KEY_SETS: KeySets = { colors: COLOR_KEYS, editor: EDITOR_KEYS };

function keySetsFor(extraColorKeys: readonly string[]): KeySets {
  const extras = extraColorKeys.filter((key) => !EDITOR_KEYS.has(key));
  if (extras.length === 0) return BUILT_IN_KEY_SETS;
  return {
    colors: new Set([...COLOR_KEYS, ...extras]),
    editor: new Set([...EDITOR_KEYS, ...extras]),
  };
}

/** Editor key for a custom property name (`--primary`, `--color-primary`...). */
function toEditorKey(name: string, keys: KeySets): string | null {
  const bare = name.slice(2);
  if (bare === "tracking-normal") return "letter-spacing";
  if (bare.startsWith("shadow-")) {
    const alias = SHADOW_ALIASES[bare.slice(7)];
    if (alias) return alias;
  }
  if (keys.editor.has(bare)) return bare;
  if (bare.startsWith("color-") && keys.colors.has(bare.slice(6))) {
    return bare.slice(6);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

type Item =
  | { kind: "statement"; text: string }
  | { kind: "block"; prelude: string; body: string };

/** Index just past the string starting at `start` (a quote character). */
function skipString(text: string, start: number): number {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") i += 2;
    else if (c === quote) return i + 1;
    else if (c === "\n")
      return i; // unterminated: CSS ends strings at a newline
    else i++;
  }
  return text.length;
}

/** Removes comments, leaving strings (and braces inside them) untouched. */
function stripComments(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const end = skipString(css, i);
      out += css.slice(i, end);
      i = end;
    } else if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      out += " ";
      i = end < 0 ? css.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Index of the `}` closing the `{` at `open`, or -1 when unbalanced. */
function findClosingBrace(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipString(text, i);
      continue;
    }
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
    i++;
  }
  return -1;
}

/**
 * Splits one nesting level into `;` statements and `{}` blocks. Semicolons
 * inside strings or parentheses (`url(data:...;base64)`) do not end a
 * statement; the same scan serves stylesheets, at-rule bodies and declaration
 * lists.
 */
function scan(text: string, warnings: string[]): Item[] {
  const items: Item[] = [];
  let start = 0;
  let paren = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipString(text, i);
      continue;
    }
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "(") paren++;
    else if (c === ")") paren = Math.max(0, paren - 1);
    else if (c === ";" && paren === 0) {
      const stmt = text.slice(start, i).trim();
      if (stmt) items.push({ kind: "statement", text: stmt });
      start = i + 1;
    } else if (c === "{" && paren === 0) {
      const end = findClosingBrace(text, i);
      if (end < 0) {
        warnings.push("Unbalanced braces: a block is never closed.");
      }
      items.push({
        kind: "block",
        prelude: text.slice(start, i).trim(),
        body: text.slice(i + 1, end < 0 ? text.length : end),
      });
      i = end < 0 ? text.length : end + 1;
      start = i;
      continue;
    } else if (c === "}" && paren === 0) {
      warnings.push("Unbalanced braces: a closing brace has no opening one.");
      start = i + 1;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) items.push({ kind: "statement", text: tail });
  return items;
}

/** Splits at top-level commas (not inside parentheses, brackets or strings). */
function splitTopLevel(text: string, separator = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipString(text, i);
      continue;
    }
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

function normalizeSelector(selector: string): string {
  return selector
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*=\s*/g, "=")
    .replace(/'/g, '"');
}

const LIGHT_ROOT =
  /^(?:(?::root|html|:host)(?:\.light|\[data-theme="?light"?\])?|\.light|\[data-theme="?light"?\])$/;
const DARK_ROOT =
  /^(?:(?::root|html|:host)?(?:\.dark|\[data-theme="?dark"?\]))$/;

function classifySelector(selector: string): Mode | null {
  const normalized = normalizeSelector(selector);
  if (DARK_ROOT.test(normalized)) return "dark";
  if (LIGHT_ROOT.test(normalized)) return "light";
  return null;
}

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

interface Declaration {
  mode: Mode;
  /** Declared inside @theme: names are Tailwind theme variables. */
  theme: boolean;
  name: string;
  value: string;
}

interface WalkContext {
  /** Forced by `@media (prefers-color-scheme: ...)`; null = by selector. */
  mode: Mode | null;
  theme: boolean;
}

const SKIPPED_AT_RULES = new Set([
  "keyframes",
  "font-face",
  "property",
  "utility",
  "custom-variant",
  "variant",
  "import",
  "source",
  "plugin",
  "config",
  "starting-style",
  "page",
  "counter-style",
  "font-feature-values",
]);
const MAX_SKIPPED_SELECTORS = 6;

function parseDeclaration(
  text: string,
): { name: string; value: string } | null {
  const colon = text.indexOf(":");
  if (colon < 0) return null;
  const name = text.slice(0, colon).trim();
  if (!name.startsWith("--") || name.length < 3) return null;
  const value = text
    .slice(colon + 1)
    .replace(/\s*!important\s*$/i, "")
    .trim();
  return value ? { name, value } : null;
}

function walk(
  items: Item[],
  context: WalkContext,
  out: Declaration[],
  warnings: string[],
  skippedSelectors: Set<string>,
): void {
  for (const item of items) {
    if (item.kind === "statement") continue; // @import, @layer a, b; stray text
    const prelude = item.prelude;
    if (prelude.startsWith("@")) {
      const match = /^@([\w-]+)\s*(.*)$/s.exec(prelude);
      const name = match?.[1]?.toLowerCase() ?? "";
      const params = match?.[2] ?? "";
      if (SKIPPED_AT_RULES.has(name)) continue;
      const body = scan(item.body, warnings);
      if (name === "theme") {
        // `@theme`, `@theme inline`, `@theme static` all declare theme variables.
        for (const inner of body) {
          if (inner.kind !== "statement") continue;
          const decl = parseDeclaration(inner.text);
          if (decl) {
            out.push({ mode: context.mode ?? "light", theme: true, ...decl });
          }
        }
      } else if (name === "layer" || name === "supports") {
        walk(body, context, out, warnings, skippedSelectors);
      } else if (name === "media") {
        let mode = context.mode;
        if (/prefers-color-scheme\s*:\s*dark/i.test(params)) mode = "dark";
        else if (/prefers-color-scheme\s*:\s*light/i.test(params))
          mode = "light";
        walk(body, { ...context, mode }, out, warnings, skippedSelectors);
      }
      continue;
    }

    // Style rule: only exact root selectors carry the theme.
    const selectors = splitTopLevel(prelude);
    const modes = new Set<Mode>();
    for (const selector of selectors) {
      const mode = classifySelector(selector);
      if (mode) modes.add(context.mode ?? mode);
      else skippedSelectors.add(normalizeSelector(selector));
    }
    if (modes.size === 0) continue;
    for (const inner of scan(item.body, warnings)) {
      if (inner.kind !== "statement") continue; // nested rules are not theme roots
      const decl = parseDeclaration(inner.text);
      if (!decl) continue;
      for (const mode of modes) {
        out.push({ mode, theme: false, ...decl });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** Replaces `var(--x[, fallback])` using `lookup`; unknown names are collected. */
function resolveVars(
  value: string,
  lookup: (name: string) => string | undefined,
  unresolved: Set<string>,
  depth = 0,
): string {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf("var(", i);
    if (at < 0 || (at > 0 && /[\w-]/.test(value[at - 1]!))) {
      if (at < 0) {
        out += value.slice(i);
        break;
      }
      out += value.slice(i, at + 4);
      i = at + 4;
      continue;
    }
    out += value.slice(i, at);
    let level = 0;
    let end = -1;
    for (let k = at + 3; k < value.length; k++) {
      if (value[k] === "(") level++;
      else if (value[k] === ")" && --level === 0) {
        end = k;
        break;
      }
    }
    if (end < 0) {
      out += value.slice(at);
      break;
    }
    const inner = value.slice(at + 4, end);
    const [ref = "", ...rest] = splitTopLevel(inner);
    const fallback = rest.length ? rest.join(",") : undefined;
    const name = ref.trim();
    const found = depth < 10 ? lookup(name) : undefined;
    if (found !== undefined) {
      out += resolveVars(found, lookup, unresolved, depth + 1);
    } else if (fallback !== undefined && depth < 10) {
      out += resolveVars(fallback, lookup, unresolved, depth + 1);
    } else {
      unresolved.add(name);
      out += `var(${name})`;
    }
    i = end + 1;
  }
  return out;
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

const LENGTH = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/i;

/** Number of CSS pixels per rem/em; the editor assumes the 16px default. */
const PX_PER_REM = 16;

function toRem(value: string): string | null {
  const m = LENGTH.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  if (!unit && n !== 0) return null;
  return `${formatNumber(unit === "px" ? n / PX_PER_REM : n)}rem`;
}

function toEm(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "normal") return "0em";
  const m = LENGTH.exec(trimmed);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (!unit && n !== 0) return null;
  return `${formatNumber(unit === "px" ? n / PX_PER_REM : n)}em`;
}

function toPx(value: string): string | null {
  const m = LENGTH.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  return `${formatNumber(unit === "rem" || unit === "em" ? n * PX_PER_REM : n)}px`;
}

const BARE_HSL =
  /^(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?$/;

/** Colour kept verbatim when culori reads it; Tailwind v3 `H S% L%` gets hsl(). */
function normalizeColor(value: string): string | null {
  const trimmed = value.trim();
  if (culori.parse(trimmed)) return trimmed;
  const bare = BARE_HSL.exec(trimmed);
  if (bare) {
    const candidate = `hsl(${bare[1]} ${bare[2]}% ${bare[3]}%${bare[4] ? ` / ${bare[4]}` : ""})`;
    if (culori.parse(candidate)) return candidate;
  }
  return null;
}

function normalizeOpacity(value: string): string | null {
  const m = /^(-?(?:\d+\.?\d*|\.\d+))(%?)$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return formatNumber(m[2] ? n / 100 : n);
}

/** Value for an editor key, or null when it cannot be read. */
function normalizeValue(
  key: string,
  value: string,
  keys: KeySets,
): string | null {
  if (keys.colors.has(key)) return normalizeColor(value);
  if (key === "radius" || key === "spacing") return toRem(value);
  if (key === "letter-spacing") return toEm(value);
  if (SHADOW_LENGTH_KEYS.has(key)) return toPx(value);
  if (key === "shadow-opacity") return normalizeOpacity(value);
  return value.trim() || null;
}

/** `--color-x: var(--x)` style indirection that adds nothing to the theme. */
function isIdentity(name: string, value: string): boolean {
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  if (!m) return false;
  const base = (n: string) => n.replace(/^--(?:color-)?/, "");
  return base(name) === base(m[1]!);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * The editor's per-mode styles read from stylesheet text. `light` and `dark`
 * hold only the keys the CSS sets, plus light's non-colour keys copied into a
 * dark that lacks them (a variable set in several blocks takes the last
 * declaration; var() references resolve within the same mode, then light,
 * then @theme); `ignored` lists custom properties the editor has no control
 * for and `warnings` lists what was skipped or unreadable.
 */
export function parseThemeCss(
  css: string,
  options: ParseThemeCssOptions = {},
): ParsedThemeCss {
  const keys = keySetsFor(options.extraColorKeys ?? []);
  const warnings: string[] = [];
  const skippedSelectors = new Set<string>();
  const declarations: Declaration[] = [];
  walk(
    scan(stripComments(css), warnings),
    { mode: null, theme: false },
    declarations,
    warnings,
    skippedSelectors,
  );

  // Last declaration wins per mode; @theme values are the lowest-priority
  // fallback for var() lookups (they are mode-agnostic).
  const maps: Record<Mode, Map<string, string>> = {
    light: new Map(),
    dark: new Map(),
  };
  const themeMap = new Map<string, string>();
  for (const d of declarations) {
    if (d.theme) themeMap.set(d.name, d.value);
    else maps[d.mode].set(d.name, d.value);
  }

  const result: Record<Mode, Record<string, string>> = { light: {}, dark: {} };
  const ignored = new Set<string>();
  const dropped = new Set<string>();

  for (const d of declarations) {
    const key = toEditorKey(d.name, keys);
    if (isIdentity(d.name, d.value)) continue;
    if (d.theme && DERIVED_RADIUS.test(d.name)) continue;
    if (!key) {
      ignored.add(d.name);
      continue;
    }

    const unresolved = new Set<string>();
    const lookup = (n: string) =>
      maps[d.mode].get(n) ?? maps.light.get(n) ?? themeMap.get(n);
    let value = resolveVars(d.value, lookup, unresolved);

    if (unresolved.size > 0) {
      if (FONT_KEYS.has(key)) {
        // next/font variables (`var(--font-x)`) are not defined in the pasted
        // CSS but exist at runtime on the page the editor themes (a host
        // preset may be written as `var(--font-x), sans-serif`), so
        // `var(--font-…)` members stay in the stack. Any other unknown var is
        // dropped, keeping the families around it.
        const isRuntimeFont = (n: string) => n.startsWith("--font-");
        const foreign = [...unresolved].filter((n) => !isRuntimeFont(n));
        if (foreign.length > 0) {
          const kept = splitTopLevel(value).filter(
            (m) =>
              !m.includes("var(") ||
              /^\s*var\(\s*--font-[\w-]+\s*\)\s*$/u.test(m),
          );
          const list = foreign.map((n) => `var(${n})`).join(", ");
          if (kept.length === 0) {
            ignored.add(d.name);
            dropped.add(
              `${d.name} points at ${list}, which is not defined in this CSS.`,
            );
            continue;
          }
          dropped.add(`${d.name}: dropped ${list} (not defined in this CSS).`);
          value = kept.map((m) => m.trim()).join(", ");
        }
      } else {
        ignored.add(d.name);
        dropped.add(
          `${d.name} uses ${[...unresolved].map((n) => `var(${n})`).join(", ")}, which is not defined in this CSS.`,
        );
        continue;
      }
    }

    const normalized = normalizeValue(key, value, keys);
    if (normalized === null) {
      warnings.push(`Could not read the value of ${d.name}: ${value}`);
      continue;
    }
    result[d.mode][key] = normalized;
  }

  warnings.push(...dropped);

  // Radius, fonts, spacing... are shared by both modes in most stylesheets and
  // only written under :root; mirror them so the dark theme is not left on the
  // previous values. Colours never mirror: a missing dark colour is a choice.
  for (const key of NON_COLOR_KEYS) {
    if (result.light[key] !== undefined && result.dark[key] === undefined) {
      result.dark[key] = result.light[key];
    }
  }

  if (skippedSelectors.size > 0) {
    const list = [...skippedSelectors];
    const shown = list.slice(0, MAX_SKIPPED_SELECTORS).map((s) => `\`${s}\``);
    const more =
      list.length > shown.length
        ? ` and ${list.length - shown.length} more`
        : "";
    warnings.push(
      `Skipped ${shown.join(", ")}${more}: only :root, html, .dark and equivalent root selectors are imported.`,
    );
  }

  return {
    light: result.light as PartialThemeStyleProps,
    dark: result.dark as PartialThemeStyleProps,
    ignored: [...ignored],
    warnings: [...new Set(warnings)],
  };
}

/**
 * The light and dark styles of parseThemeCss without its `ignored` and
 * `warnings`. Kept for the package's exports; prefer `parseThemeCss`.
 */
export function parseCSSVariables(css: string): Partial<ThemeStyles> {
  const { light, dark } = parseThemeCss(css);
  return {
    light: light as ThemeStyleProps,
    dark: dark as ThemeStyleProps,
  };
}

/** Fill a parsed theme's missing keys from the default styles of each mode. */
export function mergeWithDefaults(parsed: Partial<ThemeStyles>): ThemeStyles {
  return {
    light: {
      ...defaultLightStyles,
      ...(parsed.light || {}),
    },
    dark: {
      ...defaultDarkStyles,
      ...(parsed.dark || {}),
    },
  };
}

/** One `  --key: value;` line per style key; values are not converted. */
export function stylesToCSS(styles: ThemeStyleProps): string {
  return Object.entries(styles)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
}

/**
 * Parse for a validity check. `valid` is false for text without braces or
 * without any readable variable; a missing `:root` or `.dark` half is listed
 * in `errors` while `valid` stays true.
 */
export function validateCSSInput(css: string): {
  valid: boolean;
  styles?: Partial<ThemeStyles>;
  errors?: string[];
} {
  if (!css.includes("{") || !css.includes("}")) {
    return {
      valid: false,
      errors: ["Invalid CSS syntax: missing block delimiters"],
    };
  }
  const { light, dark } = parseThemeCss(css);
  const lightCount = Object.keys(light).length;
  const darkCount = Object.keys(dark).length;
  if (lightCount === 0 && darkCount === 0) {
    return {
      valid: false,
      errors: [
        "No CSS variables found. Make sure to use --variable-name format.",
      ],
    };
  }
  const errors: string[] = [];
  if (lightCount === 0) errors.push("No :root (light mode) variables found.");
  if (darkCount === 0) errors.push("No .dark mode variables found.");
  return {
    valid: true,
    styles: parseCSSVariables(css),
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * The colour keys of one mode's styles (COLOR_STYLE_KEYS, which includes
 * `shadow-color`).
 */
export function extractColorVariables(
  styles: ThemeStyleProps,
): Partial<ThemeStyleProps> {
  const result: Partial<ThemeStyleProps> = {};
  for (const key of COLOR_STYLE_KEYS) {
    const value = styles[key];
    if (value !== undefined) {
      (result as Record<string, string>)[key] = value;
    }
  }

  return result;
}
