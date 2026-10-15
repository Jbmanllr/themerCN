// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// CSS / Tailwind export of the editor state. Changes from tweakcn's
// generator (utils/theme-style-generator.ts): every mode block is generated
// from that mode's own values (letter spacing and spacing included, so a
// dark-only value survives export), the heading font is exported as
// `--font-heading`, the `@theme inline` block never redefines
// `--tracking-normal` as itself, the radius scale is shadcn v4's
// multiplicative one the host previews with (not tweakcn's additive one), and
// Tailwind v3 output never carries oklch (v3 colour tokens are
// `hsl(var(--x))`, so oklch maps to hsl). Host extra colours
// (ThemerProps.extraColors; the caller passes their keys) are exported when
// the theme sets them: in the mode blocks that set them, in the
// `@theme inline` `--color-*` mapping and in the v3 config's colours.
//
// Contract: pure; the output is text users paste into their own project.
// Extra colour keys come only from the `extraColorKeys` argument (the Code
// dialog passes them, useThemer's export helpers do not). RADIUS_SCALE must
// keep matching shadcn's scale (packages/ui/src/styles/globals.css), so an
// export rounds like the preview.
//
// See: packages/themer/ARCHITECTURE.md ("Export and import").

import type {
  ThemeEditorState,
  ThemeStyles,
  ColorFormat,
  TailwindVersion,
  ThemeMode,
} from "../types";
import { colorFormatter } from "./color-converter";
import { SHADOW_SCALE_KEYS, getShadowMap } from "./shadows";
import { COLOR_STYLE_KEYS, defaultThemeState } from "../config/defaults";
import { extractFontFamily, isLocalFontFamily } from "./font-loader";

/** The theme colours a mode block and `@theme inline` export, in order. */
const EXPORT_COLOR_KEYS = COLOR_STYLE_KEYS.filter(
  (key) => key !== "shadow-color",
);

/**
 * shadcn v4's multiplicative radius scale, as the previewed host declares it
 * (packages/ui/src/styles/globals.css), so an export rounds like the preview; null
 * is `var(--radius)` itself.
 */
const RADIUS_SCALE = [
  ["xs", "0.5"],
  ["sm", "0.6"],
  ["md", "0.8"],
  ["lg", null],
  ["xl", "1.4"],
  ["2xl", "1.8"],
  ["3xl", "2.2"],
  ["4xl", "2.6"],
] as const;

function radiusValue(factor: string | null): string {
  return factor ? `calc(var(--radius) * ${factor})` : "var(--radius)";
}

function generateColorVariables(
  styles: ThemeStyles,
  mode: ThemeMode,
  formatColor: (color: string) => string,
): string {
  const modeStyles = styles[mode];

  return EXPORT_COLOR_KEYS.map(
    (key) => `\n  --${key}: ${formatColor(modeStyles[key])};`,
  ).join("");
}

/** Extra colour keys with a value in this mode. */
function setExtraKeys(
  styles: ThemeStyles,
  mode: ThemeMode,
  extraColorKeys: readonly string[],
): string[] {
  return extraColorKeys.filter((key) => Boolean(styles[mode][key]?.trim()));
}

/** Extra colour keys with a value in either mode. */
function exportedExtraKeys(
  styles: ThemeStyles,
  extraColorKeys: readonly string[],
): string[] {
  return extraColorKeys.filter(
    (key) =>
      Boolean(styles.light[key]?.trim()) || Boolean(styles.dark[key]?.trim()),
  );
}

/** `--key: value;` lines for the extra colours this mode sets. */
function generateExtraColorVariables(
  styles: ThemeStyles,
  mode: ThemeMode,
  formatColor: (color: string) => string,
  extraColorKeys: readonly string[],
): string {
  return setExtraKeys(styles, mode, extraColorKeys)
    .map((key) => `\n  --${key}: ${formatColor(styles[mode][key]!.trim())};`)
    .join("");
}

/** `--font-heading` falls back to the serif stack when a mode has none. */
function generateFontVariables(styles: ThemeStyles, mode: ThemeMode): string {
  const modeStyles = styles[mode];
  return `
  --font-sans: ${modeStyles["font-sans"]};
  --font-heading: ${modeStyles["font-heading"] ?? modeStyles["font-serif"]};
  --font-serif: ${modeStyles["font-serif"]};
  --font-mono: ${modeStyles["font-mono"]};`;
}

/** The eight per-size shadows computed for this mode (getShadowMap). */
function generateShadowVariables(
  themeState: ThemeEditorState,
  mode: ThemeMode,
): string {
  const shadowMap = getShadowMap(themeState, mode);
  return SHADOW_SCALE_KEYS.map(
    (key) => `\n  --${key}: ${shadowMap[key]};`,
  ).join("");
}

/** The six shadow parameters as `--shadow-x`, `--shadow-y`, ... */
function generateRawShadowVariables(
  styles: ThemeStyles,
  mode: ThemeMode,
  formatColor: (color: string) => string,
): string {
  const modeStyles = styles[mode];
  return `
  --shadow-x: ${modeStyles["shadow-offset-x"]};
  --shadow-y: ${modeStyles["shadow-offset-y"]};
  --shadow-blur: ${modeStyles["shadow-blur"]};
  --shadow-spread: ${modeStyles["shadow-spread"]};
  --shadow-opacity: ${modeStyles["shadow-opacity"]};
  --shadow-color: ${formatColor(modeStyles["shadow-color"])};`;
}

function modeLetterSpacing(styles: ThemeStyles, mode: ThemeMode): string {
  return (
    styles[mode]["letter-spacing"] ??
    defaultThemeState.styles[mode]["letter-spacing"]
  );
}

/** Whether either mode sets a letter spacing other than zero. */
function hasLetterSpacing(styles: ThemeStyles): boolean {
  return (["light", "dark"] as const).some((mode) => {
    const value = modeLetterSpacing(styles, mode).trim();
    return value !== "0em" && value !== "0" && value !== "normal";
  });
}

/**
 * Generate tracking (letter-spacing) variables for `@theme inline`. Each
 * mode block declares `--tracking-normal`; the scale is derived from it.
 * `--tracking-normal` itself is not redeclared here (that was a
 * self-reference).
 */
function generateTrackingVariables(styles: ThemeStyles): string {
  if (!hasLetterSpacing(styles)) {
    return "";
  }
  return `

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);`;
}

function indentBlock(value: string): string {
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
}

/** One `:root` (light) or `.dark` block holding that mode's own values. */
function generateThemeVariables(
  themeState: ThemeEditorState,
  mode: ThemeMode,
  formatColor: (color: string) => string,
  extraColorKeys: readonly string[],
): string {
  const { styles } = themeState;
  const selector = mode === "dark" ? ".dark" : ":root";

  const colorVars =
    generateColorVariables(styles, mode, formatColor) +
    generateExtraColorVariables(styles, mode, formatColor, extraColorKeys);
  const fontVars = generateFontVariables(styles, mode);
  const radiusVar = `\n  --radius: ${styles[mode].radius};`;
  const shadowVars = generateShadowVariables(themeState, mode);
  const rawShadowVars = generateRawShadowVariables(styles, mode, formatColor);

  const spacingVar = `\n  --spacing: ${styles[mode].spacing ?? defaultThemeState.styles[mode].spacing};`;
  const trackingVars = `\n  --tracking-normal: ${modeLetterSpacing(styles, mode)};`;

  return (
    selector +
    " {" +
    colorVars +
    fontVars +
    radiusVar +
    rawShadowVars +
    shadowVars +
    trackingVars +
    spacingVar +
    "\n}"
  );
}

function generateTailwindV4ThemeInline(
  styles: ThemeStyles,
  extraColorKeys: readonly string[],
): string {
  const extraColorMapping = exportedExtraKeys(styles, extraColorKeys)
    .map((key) => `\n  --color-${key}: var(--${key});`)
    .join("");
  const colorMapping = EXPORT_COLOR_KEYS.map(
    (key) => `  --color-${key}: var(--${key});`,
  ).join("\n");
  const radiusMapping = RADIUS_SCALE.map(
    ([size, factor]) => `  --radius-${size}: ${radiusValue(factor)};`,
  ).join("\n");
  const shadowMapping = SHADOW_SCALE_KEYS.map(
    (key) => `  --${key}: var(--${key});`,
  ).join("\n");
  return `@theme inline {
${colorMapping}${extraColorMapping}

  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

${radiusMapping}

${shadowMapping}${generateTrackingVariables(styles)}
}`;
}

function generateTailwindV3Config(
  colorFormat: ColorFormat = "hsl",
  extraKeys: readonly string[] = [],
): string {
  const colorToken = (key: string) => {
    return colorFormat === "hsl" ? `"hsl(var(--${key}))"` : `"var(--${key})"`;
  };
  const extraColors = extraKeys
    .map((key) => `\n        "${key}": ${colorToken(key)},`)
    .join("");
  const borderRadius = RADIUS_SCALE.map(
    ([size, factor]) =>
      `\n        ${/^\d/.test(size) ? `"${size}"` : size}: "${radiusValue(factor)}",`,
  ).join("");

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: ${colorToken("border")},
        input: ${colorToken("input")},
        ring: ${colorToken("ring")},
        background: ${colorToken("background")},
        foreground: ${colorToken("foreground")},
        primary: {
          DEFAULT: ${colorToken("primary")},
          foreground: ${colorToken("primary-foreground")},
        },
        secondary: {
          DEFAULT: ${colorToken("secondary")},
          foreground: ${colorToken("secondary-foreground")},
        },
        destructive: {
          DEFAULT: ${colorToken("destructive")},
          foreground: ${colorToken("destructive-foreground")},
        },
        muted: {
          DEFAULT: ${colorToken("muted")},
          foreground: ${colorToken("muted-foreground")},
        },
        accent: {
          DEFAULT: ${colorToken("accent")},
          foreground: ${colorToken("accent-foreground")},
        },
        popover: {
          DEFAULT: ${colorToken("popover")},
          foreground: ${colorToken("popover-foreground")},
        },
        card: {
          DEFAULT: ${colorToken("card")},
          foreground: ${colorToken("card-foreground")},
        },
        sidebar: {
          DEFAULT: ${colorToken("sidebar")},
          foreground: ${colorToken("sidebar-foreground")},
          primary: ${colorToken("sidebar-primary")},
          "primary-foreground": ${colorToken("sidebar-primary-foreground")},
          accent: ${colorToken("sidebar-accent")},
          "accent-foreground": ${colorToken("sidebar-accent-foreground")},
          border: ${colorToken("sidebar-border")},
          ring: ${colorToken("sidebar-ring")},
        },
        chart: {
          1: ${colorToken("chart-1")},
          2: ${colorToken("chart-2")},
          3: ${colorToken("chart-3")},
          4: ${colorToken("chart-4")},
          5: ${colorToken("chart-5")},
        },${extraColors}
      },
      borderRadius: {${borderRadius}
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
}`;
}

/**
 * Tailwind v3 has no oklch colour tokens (its config wraps variables in
 * `hsl()`), so an oklch choice exports as hsl there.
 */
function toExportColorFormat(
  colorFormat: ColorFormat,
  tailwindVersion: TailwindVersion,
): ColorFormat {
  return tailwindVersion === "3" && colorFormat === "oklch"
    ? "hsl"
    : colorFormat;
}

/**
 * The theme as a stylesheet: Tailwind 4 (`@import "tailwindcss"`, a `:root`
 * and a `.dark` block, `@theme inline`) or Tailwind 3 (`@tailwind` layers).
 * Throws when either mode's styles are missing. For Tailwind 3 an oklch
 * `colorFormat` exports as hsl. Extra colours are written only for the keys in
 * `extraColorKeys` that the theme sets.
 */
export function generateThemeCode(
  themeState: ThemeEditorState,
  colorFormat: ColorFormat = "hsl",
  tailwindVersion: TailwindVersion = "4",
  extraColorKeys: readonly string[] = [],
): string {
  if (!themeState?.styles?.light || !themeState?.styles?.dark) {
    throw new Error("Invalid theme styles: missing light or dark mode");
  }

  const exportFormat = toExportColorFormat(colorFormat, tailwindVersion);
  const formatColor = (color: string) =>
    colorFormatter(color, exportFormat, tailwindVersion);

  const lightTheme = generateThemeVariables(
    themeState,
    "light",
    formatColor,
    extraColorKeys,
  );
  const darkTheme = generateThemeVariables(
    themeState,
    "dark",
    formatColor,
    extraColorKeys,
  );

  if (tailwindVersion === "4") {
    const tailwindV4Theme = generateTailwindV4ThemeInline(
      themeState.styles,
      extraColorKeys,
    );
    const bodyLetterSpacing = hasLetterSpacing(themeState.styles)
      ? "\n    letter-spacing: var(--tracking-normal);"
      : "";

    return `@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

${lightTheme}

${darkTheme}

${tailwindV4Theme}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;${bodyLetterSpacing}
  }
}`;
  }

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
${indentBlock(lightTheme)}

${indentBlock(darkTheme)}
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;
}

/**
 * The Tailwind 3 `tailwind.config.js` colours, radius and font families.
 * `_tailwindVersion` is ignored: the output is always the v3 shape. Throws when
 * either mode's styles are missing.
 */
export function generateTailwindConfigCode(
  themeState: ThemeEditorState,
  colorFormat: ColorFormat = "hsl",
  _tailwindVersion: TailwindVersion = "3",
  extraColorKeys: readonly string[] = [],
): string {
  if (!themeState?.styles?.light || !themeState?.styles?.dark) {
    throw new Error("Invalid theme styles: missing light or dark mode");
  }

  return generateTailwindV3Config(
    toExportColorFormat(colorFormat, "3"),
    exportedExtraKeys(themeState.styles, extraColorKeys),
  );
}

const FONT_SLOTS = [
  { key: "font-sans" as const, varName: "fontSans", cssVar: "--font-sans" },
  {
    key: "font-heading" as const,
    varName: "fontHeading",
    cssVar: "--font-heading",
  },
  { key: "font-serif" as const, varName: "fontSerif", cssVar: "--font-serif" },
  { key: "font-mono" as const, varName: "fontMono", cssVar: "--font-mono" },
];

/**
 * A Next.js root `layout.tsx` that imports each Google family the light mode's
 * font slots name through `next/font/google` and binds it to the slot's CSS
 * variable. An OS family or a `var(...)` host font gets no import. Throws when
 * either mode's styles are missing.
 */
export function generateLayoutCode(themeState: ThemeEditorState): string {
  if (!themeState?.styles?.light || !themeState?.styles?.dark) {
    throw new Error("Invalid theme styles: missing light or dark mode");
  }

  const googleFonts: { importName: string; varName: string; cssVar: string }[] =
    [];

  for (const slot of FONT_SLOTS) {
    const fontFamily = extractFontFamily(themeState.styles.light[slot.key]);
    // An OS family (Georgia, Menlo) is not on Google: its CSS stack stands.
    if (!fontFamily || isLocalFontFamily(fontFamily)) continue;

    googleFonts.push({
      importName: fontFamily.replace(/ /g, "_"),
      varName: slot.varName,
      cssVar: slot.cssVar,
    });
  }

  const comment = `// For adding custom fonts with other frameworks, see:\n// https://tailwindcss.com/docs/font-family`;

  if (googleFonts.length === 0) {
    return `${comment}
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}`;
  }

  // Heading and serif often share a family: import it once, call it per slot.
  const importNames = [
    ...new Set(googleFonts.map((font) => font.importName)),
  ].join(", ");
  const fontConfigs = googleFonts
    .map(
      (font) => `
const ${font.varName} = ${font.importName}({
  subsets: ["latin"],
  variable: "${font.cssVar}",
});`,
    )
    .join("\n");
  const classNameParts = googleFonts
    .map((font) => `\${${font.varName}.variable}`)
    .join(" ");

  return `${comment}
import type { Metadata } from "next";
import { ${importNames} } from "next/font/google";
import "./globals.css";
${fontConfigs}

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={\`${classNameParts} antialiased\`}>
        {children}
      </body>
    </html>
  );
}`;
}
