// Proves parseThemeCss on a host app's generated token sheet
// (fixtures/host-tokens.css: root and .dark colours verbatim, the light-only
// radius mirrored into dark, .theme-inverse never read, host-only tokens
// listed once as ignored, next/font variables kept in font stacks) and on hand-written CSS: braces in comments and strings, nested
// at-rules, selector lists, repeated blocks, unit and colour normalisation,
// var() chains and cycles, and host extra colour keys.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseThemeCss } from "./parse-css";

const webCss = readFileSync(
  resolve(__dirname, "fixtures/host-tokens.css"),
  "utf8",
);

describe("parseThemeCss on a host token sheet", () => {
  const parsed = parseThemeCss(webCss);

  it("reads the root and .dark colours verbatim", () => {
    expect(parsed.light.primary).toBe("#2B2430");
    expect(parsed.dark.primary).toBe("#FAF7F2");
    expect(parsed.light.background).toBe("#FAF7F2");
    expect(parsed.dark.background).toBe("#1B1720");
    expect(parsed.light["destructive-foreground"]).toBe("#FAF7F2");
  });

  it("mirrors the light-only radius into dark", () => {
    expect(parsed.light.radius).toBe("0.75rem");
    expect(parsed.dark.radius).toBe("0.75rem");
  });

  it("never takes values from .theme-inverse", () => {
    // .theme-inverse swaps modes: reading it would flip light.primary to dark's.
    expect(parsed.light.primary).not.toBe("#FAF7F2");
    expect(parsed.dark.primary).not.toBe("#2B2430");
    expect(parsed.warnings.join("\n")).toContain(".theme-inverse");
  });

  it("lists host-only tokens as ignored, once each", () => {
    expect(parsed.ignored).toEqual(
      expect.arrayContaining(["--blush", "--evidence", "--signal"]),
    );
    expect(new Set(parsed.ignored).size).toBe(parsed.ignored.length);
    expect(parsed.ignored).not.toContain("--color-blush");
    expect(parsed.ignored).not.toContain("--radius-lg");
  });

  it("keeps next/font variables in font stacks", () => {
    expect(parsed.light["font-serif"]).toBe(
      "var(--font-fraunces), ui-serif, Georgia, serif",
    );
    expect(parsed.light["font-sans"]).toBe("var(--font-dm-sans)");
    expect(parsed.ignored).not.toContain("--font-sans");
  });
});

describe("parseThemeCss font stacks", () => {
  it("drops unknown non-font vars but keeps the families around them", () => {
    const { light, warnings } = parseThemeCss(
      `:root { --font-sans: var(--brand), var(--font-inter), Inter, sans-serif; }`,
    );
    expect(light["font-sans"]).toBe("var(--font-inter), Inter, sans-serif");
    expect(warnings.join("\n")).toContain("var(--brand)");
    expect(warnings.join("\n")).not.toContain("var(--font-inter)");
  });
});

describe("parseThemeCss scanning", () => {
  it("is not fooled by braces in comments and strings", () => {
    const { light } = parseThemeCss(`
      /* } :root { --primary: red; } */
      :root {
        --content: "} {";
        --primary: #111111; /* trailing } brace */
        --secondary: #222222;
      }`);
    expect(light.primary).toBe("#111111");
    expect(light.secondary).toBe("#222222");
  });

  it("recurses into nested @layer, @media and @supports", () => {
    const { light, dark } = parseThemeCss(`
      @layer base {
        @supports (color: oklch(0 0 0)) {
          @media (min-width: 40rem) { :root { --primary: oklch(0.5 0.1 200); } }
        }
        .dark { --primary: oklch(0.9 0.05 200); }
      }`);
    expect(light.primary).toBe("oklch(0.5 0.1 200)");
    expect(dark.primary).toBe("oklch(0.9 0.05 200)");
  });

  it("treats prefers-color-scheme: dark blocks as dark", () => {
    const { light, dark } = parseThemeCss(`
      :root { --background: #ffffff; }
      @media (prefers-color-scheme: dark) { :root { --background: #000000; } }`);
    expect(light.background).toBe("#ffffff");
    expect(dark.background).toBe("#000000");
  });

  it("accepts selector lists and ignores compound selectors", () => {
    const { light, dark, warnings } = parseThemeCss(`
      :root, html[data-theme="light"] { --primary: #111111; }
      [data-theme='dark'], html.dark { --primary: #eeeeee; }
      .dark .card { --primary: #ff0000; }
      .theme-x { --primary: #00ff00; }`);
    expect(light.primary).toBe("#111111");
    expect(dark.primary).toBe("#eeeeee");
    expect(warnings.join("\n")).toContain(".theme-x");
  });

  it("applies :root, .dark lists to both modes", () => {
    const { light, dark } = parseThemeCss(":root, .dark { --ring: #123456; }");
    expect(light.ring).toBe("#123456");
    expect(dark.ring).toBe("#123456");
  });

  it("merges repeated blocks in source order", () => {
    const { light } = parseThemeCss(
      ":root { --primary: #111111; --accent: #222222; } :root { --primary: #333333; }",
    );
    expect(light.primary).toBe("#333333");
    expect(light.accent).toBe("#222222");
  });

  it("skips non-theme at-rules and their contents", () => {
    const { light, ignored } = parseThemeCss(`
      @import "tailwindcss";
      @keyframes spin { from { --primary: #f00; } }
      @font-face { font-family: X; src: url(data:font/woff2;base64,AAA); }
      @property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
      :root { --primary: #111111; }`);
    expect(light.primary).toBe("#111111");
    expect(ignored).toEqual([]);
  });

  it("reports unbalanced braces without throwing", () => {
    const { light, warnings } = parseThemeCss(":root { --primary: #111111;");
    expect(light.primary).toBe("#111111");
    expect(warnings.join(" ")).toContain("Unbalanced");
  });

  it("returns nothing for text without theme variables", () => {
    const parsed = parseThemeCss("body { color: red; } hello");
    expect(parsed.light).toEqual({});
    expect(parsed.dark).toEqual({});
  });
});

describe("parseThemeCss values", () => {
  it("keeps oklch, hsl, rgb and named colours unconverted", () => {
    const { light } = parseThemeCss(`:root {
      --primary: oklch(0.205 0 0 / 50%);
      --secondary: hsl(210 40% 96%);
      --accent: rgb(10, 20, 30);
      --muted: rebeccapurple;
    }`);
    expect(light.primary).toBe("oklch(0.205 0 0 / 50%)");
    expect(light.secondary).toBe("hsl(210 40% 96%)");
    expect(light.accent).toBe("rgb(10, 20, 30)");
    expect(light.muted).toBe("rebeccapurple");
  });

  it("wraps Tailwind v3 bare HSL", () => {
    const { light } = parseThemeCss(
      ":root { --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; }",
    );
    expect(light.background).toBe("hsl(0 0% 100%)");
    expect(light.foreground).toBe("hsl(222.2 84% 4.9%)");
  });

  it("normalises units", () => {
    const { light } = parseThemeCss(`:root {
      --radius: 12px;
      --spacing: 0.25rem;
      --letter-spacing: -0.8px;
      --shadow-x: 2;
      --shadow-y: 0.25rem;
      --shadow-blur: 8px;
      --shadow-spread: 0;
      --shadow-opacity: 25%;
      --shadow-color: #000000;
    }`);
    expect(light.radius).toBe("0.75rem");
    expect(light.spacing).toBe("0.25rem");
    expect(light["letter-spacing"]).toBe("-0.05em");
    expect(light["shadow-offset-x"]).toBe("2px");
    expect(light["shadow-offset-y"]).toBe("4px");
    expect(light["shadow-blur"]).toBe("8px");
    expect(light["shadow-spread"]).toBe("0px");
    expect(light["shadow-opacity"]).toBe("0.25");
    expect(light["shadow-color"]).toBe("#000000");
  });

  it("maps --tracking-normal and normal to 0em", () => {
    expect(
      parseThemeCss(":root { --tracking-normal: normal; }").light[
        "letter-spacing"
      ],
    ).toBe("0em");
    expect(
      parseThemeCss("@theme { --tracking-normal: 0.02em; }").light[
        "letter-spacing"
      ],
    ).toBe("0.02em");
  });

  it("mirrors light-only non-colour values, but not colours, and respects dark overrides", () => {
    const { dark } = parseThemeCss(`
      :root { --radius: 1rem; --font-mono: monospace; --primary: #111111; }
      .dark { --font-mono: "Fira Code", monospace; }`);
    expect(dark.radius).toBe("1rem");
    expect(dark["font-mono"]).toBe('"Fira Code", monospace');
    expect(dark.primary).toBeUndefined();
  });

  it("resolves var() chains in the same mode, then light, then fallbacks", () => {
    const { light, dark } = parseThemeCss(`
      :root { --brand: #111111; --primary: var(--brand); --ring: var(--missing, #abcdef); }
      .dark { --brand: #eeeeee; --primary: var(--brand); --accent: var(--brand); }
      :root { --muted: var(--shared); --shared: #444444; }
      .dark { --muted: var(--shared); }`);
    expect(light.primary).toBe("#111111");
    expect(dark.primary).toBe("#eeeeee");
    expect(light.ring).toBe("#abcdef");
    expect(light.muted).toBe("#444444");
    expect(dark.muted).toBe("#444444");
  });

  it("survives var() cycles", () => {
    const { light, ignored } = parseThemeCss(
      ":root { --a: var(--b); --b: var(--a); --primary: var(--a); }",
    );
    expect(light.primary).toBeUndefined();
    expect(ignored).toContain("--primary");
  });

  it("reads Tailwind v4 @theme literals and skips identity mappings", () => {
    const { light, ignored } = parseThemeCss(`
      :root { --primary: #111111; }
      @theme inline {
        --color-primary: var(--primary);
        --color-secondary: #222222;
        --color-brand: #333333;
      }`);
    expect(light.primary).toBe("#111111");
    expect(light.secondary).toBe("#222222");
    expect(ignored).toEqual(["--color-brand"]);
  });

  it("warns about colours it cannot read instead of storing them", () => {
    const { light, warnings } = parseThemeCss(
      ":root { --primary: color-mix(in srgb, red, blue); }",
    );
    expect(light.primary).toBeUndefined();
    expect(warnings.join(" ")).toContain("--primary");
  });
});

describe("parseThemeCss with host extra colours", () => {
  const css = `
:root { --signal: #3457FF; --success: 120 40% 30%; --unlisted: red; }
.dark { --signal: oklch(0.7 0.15 265); }
@theme inline { --color-signal: var(--signal); --color-warning: #8A5A00; }
`;

  it("imports configured extras as colours and ignores the rest", () => {
    const parsed = parseThemeCss(css, {
      extraColorKeys: ["signal", "success", "warning"],
    });
    expect(parsed.light.signal).toBe("#3457FF");
    expect(parsed.dark.signal).toBe("oklch(0.7 0.15 265)");
    // Tailwind v3 bare HSL reads as a colour, as for built-in keys.
    expect(parsed.light.success).toBe("hsl(120 40% 30%)");
    expect(parsed.light.warning).toBe("#8A5A00");
    expect(parsed.ignored).toContain("--unlisted");
    expect(parsed.ignored).not.toContain("--signal");
  });

  it("ignores extras that are not configured", () => {
    const parsed = parseThemeCss(css);
    expect(parsed.light.signal).toBeUndefined();
    expect(parsed.ignored).toContain("--signal");
  });

  it("parses extras from a host token sheet", () => {
    const parsed = parseThemeCss(webCss, { extraColorKeys: ["signal"] });
    expect(parsed.light.signal).toBeTypeOf("string");
    expect(parsed.dark.signal).toBeTypeOf("string");
  });
});
