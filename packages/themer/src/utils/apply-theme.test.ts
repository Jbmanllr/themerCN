// Proves apply-theme's contract on a FakeDocument (no browser): values are
// written verbatim, tracking derives from letter spacing, the shadow
// variables and override sheet exist only for a theme that declares shadows
// (the sheet also mirrors the host's variant shadow rules), a re-apply or a
// removal touches exactly what was written, and Host extra colours are
// ordinary keys.
import { afterEach, describe, expect, it } from "vitest";
import { defaultThemeState } from "../config/defaults";
import { configureExtraColors } from "../config/extra-colors";
import type { ThemeEditorState } from "../types";
import {
  SHADOW_OVERRIDE_CSS,
  THEMER_OVERRIDES_ATTRIBUTE,
  applyThemeToDocument,
  applyThemeToElement,
  computeThemeProperties,
  removeThemeFromDocument,
  removeThemeFromElement,
} from "./apply-theme";
import { FakeDocument } from "./fake-document.test-helper";

function themeWith(
  light: Partial<ThemeEditorState["styles"]["light"]>,
  mode: ThemeEditorState["currentMode"] = "light",
): ThemeEditorState {
  return {
    ...defaultThemeState,
    currentMode: mode,
    styles: {
      light: { ...defaultThemeState.styles.light, ...light },
      dark: { ...defaultThemeState.styles.dark, ...light },
    },
  };
}

function root(doc: FakeDocument) {
  return doc.documentElement as unknown as HTMLElement;
}

describe("computeThemeProperties", () => {
  it("keeps colour and font values exactly as stored", () => {
    const properties = computeThemeProperties(
      themeWith({
        primary: "oklch(0.55 0.2 280)",
        background: "#FAF7F2",
        accent: "hsl(20 80% 50%)",
        "font-sans": "var(--font-dm-sans), sans-serif",
        "font-heading": '"Source Serif 4", ui-serif, serif',
      }),
    );

    expect(properties["--primary"]).toBe("oklch(0.55 0.2 280)");
    expect(properties["--background"]).toBe("#FAF7F2");
    expect(properties["--accent"]).toBe("hsl(20 80% 50%)");
    expect(properties["--font-sans"]).toBe("var(--font-dm-sans), sans-serif");
    expect(properties["--font-heading"]).toBe(
      '"Source Serif 4", ui-serif, serif',
    );
  });

  it("derives the tracking scale from the letter-spacing", () => {
    const properties = computeThemeProperties(
      themeWith({ "letter-spacing": "0.02em" }),
    );

    expect(properties["letter-spacing"]).toBe("0.02em");
    expect(properties["--letter-spacing"]).toBe("0.02em");
    expect(properties["--tracking-tighter"]).toBe(
      "calc(var(--letter-spacing) - 0.05em)",
    );
    expect(properties["--tracking-tight"]).toBe(
      "calc(var(--letter-spacing) - 0.025em)",
    );
    expect(properties["--tracking-normal"]).toBe("var(--letter-spacing)");
    expect(properties["--tracking-wide"]).toBe(
      "calc(var(--letter-spacing) + 0.025em)",
    );
    expect(properties["--tracking-wider"]).toBe(
      "calc(var(--letter-spacing) + 0.05em)",
    );
    expect(properties["--tracking-widest"]).toBe(
      "calc(var(--letter-spacing) + 0.1em)",
    );
  });

  it("leaves the host's shadows alone while the inputs are the defaults", () => {
    const keys = Object.keys(computeThemeProperties(defaultThemeState));
    expect(keys.filter((key) => key.startsWith("--shadow"))).toEqual([]);
  });

  it("writes the per-size shadows but neither raw shadow inputs nor helpers", () => {
    const keys = Object.keys(
      computeThemeProperties(themeWith({ "shadow-offset-x": "4px" })),
    );

    for (const size of ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"]) {
      expect(keys).toContain(`--shadow-${size}`);
    }
    expect(keys).toContain("--shadow");
    const sizes = new Set(
      ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"].map((s) => `--shadow-${s}`),
    );
    sizes.add("--shadow");
    expect(
      keys.filter((key) => key.startsWith("--shadow") && !sizes.has(key)),
    ).toEqual([]);
  });
});

describe("applyThemeToElement / removeThemeFromElement", () => {
  it("removes exactly what it set and leaves other inline styles alone", () => {
    const doc = new FakeDocument();
    const html = root(doc);
    html.style.setProperty("--host-owned", "1");

    const keys = applyThemeToElement(defaultThemeState, html);
    const style = doc.documentElement.style;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(style.getPropertyValue(key)).not.toBe("");

    removeThemeFromElement(html, keys);
    expect([...style.values.keys()]).toEqual(["--host-owned"]);
  });

  it("removes what was last applied when no key list is given", () => {
    const doc = new FakeDocument();
    const html = root(doc);

    applyThemeToElement(themeWith({ "letter-spacing": "0.01em" }), html);
    removeThemeFromElement(html);

    expect(doc.documentElement.style.length).toBe(0);
    expect(doc.headChildren("style")).toEqual([]);
  });

  it("drops properties a re-applied theme no longer has", () => {
    const doc = new FakeDocument();
    const html = root(doc);
    const withExtra = themeWith({ "letter-spacing": "0.01em" });
    applyThemeToElement(
      {
        ...withExtra,
        styles: {
          ...withExtra.styles,
          light: { ...withExtra.styles.light, "chart-9": "red" } as never,
        },
      },
      html,
    );
    expect(doc.documentElement.style.getPropertyValue("--chart-9")).toBe("red");

    applyThemeToElement(withExtra, html);
    expect(doc.documentElement.style.getPropertyValue("--chart-9")).toBe("");
  });

  it("toggles the dark class unless the host owns it", () => {
    const doc = new FakeDocument();
    const html = root(doc);

    applyThemeToElement(themeWith({}, "dark"), html);
    expect(doc.documentElement.classList.contains("dark")).toBe(true);

    applyThemeToElement(themeWith({}, "light"), html, { updateClass: false });
    expect(doc.documentElement.classList.contains("dark")).toBe(true);
  });

  it("injects one shadow override sheet per document and removes it", () => {
    const doc = new FakeDocument();
    const html = root(doc);

    applyThemeToElement(defaultThemeState, html);
    applyThemeToElement(themeWith({ "shadow-opacity": "0.3" }), html);

    const sheets = doc.headChildren("style");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.getAttribute(THEMER_OVERRIDES_ATTRIBUTE)).toBe("");
    expect(sheets[0]!.textContent).toBe(SHADOW_OVERRIDE_CSS);
    expect(SHADOW_OVERRIDE_CSS).toContain(
      ".shadow-sm { --tw-shadow: var(--shadow-sm) !important; }",
    );
    expect(SHADOW_OVERRIDE_CSS).toContain(
      ".shadow { --tw-shadow: var(--shadow) !important; }",
    );
    // A hover size still wins over the base size.
    expect(SHADOW_OVERRIDE_CSS).toContain(
      String.raw`.hover\:shadow-md:hover { --tw-shadow: var(--shadow-md) !important; }`,
    );

    removeThemeFromElement(html);
    expect(doc.headChildren("style")).toEqual([]);
  });

  // Tailwind inlines shadow values, so a host variant rule left alone shows
  // the stock shadow, or loses to the base size's `!important`.
  it("mirrors the host's variant shadow rules into the sheet, keeping their @media", () => {
    const doc = new FakeDocument();
    const hover = String.raw`.\[button\]\:not-disabled\:hover\:shadow-md:is(button):not(:disabled):hover`;
    const active = String.raw`.data-active\:shadow-sm[data-active]`;
    // The CSSOM writes a leading digit as a hex escape.
    const wide = String.raw`.\32 xl\:shadow-lg`;
    doc.styleSheets = [
      {
        cssRules: [
          {
            name: "utilities",
            cssText: "@layer utilities {}",
            cssRules: [
              shadowRule(".shadow-xs"),
              shadowRule(active),
              shadowRule(String.raw`.hover\:shadow-none:hover`),
              shadowRule(String.raw`.hover\:shadow-md\/50:hover`),
              {
                cssText: "@media (hover: hover) {}",
                cssRules: [shadowRule(hover)],
              },
              {
                cssText: "@media (width >= 96rem) {}",
                cssRules: [shadowRule(wide)],
              },
            ],
          },
        ],
      },
      // A cross-origin sheet cannot be read.
      {
        get cssRules(): never {
          throw new Error("SecurityError");
        },
      },
    ];

    applyThemeToElement(themeWith({ "shadow-opacity": "0.3" }), root(doc));

    const text = doc.headChildren("style")[0]!.textContent;
    expect(text.startsWith(SHADOW_OVERRIDE_CSS)).toBe(true);
    expect(text.slice(SHADOW_OVERRIDE_CSS.length)).toBe(
      [
        "",
        `${active} { --tw-shadow: var(--shadow-sm) !important; }`,
        "@media (hover: hover) {",
        `${hover} { --tw-shadow: var(--shadow-md) !important; }`,
        "}",
        "@media (width >= 96rem) {",
        `${wide} { --tw-shadow: var(--shadow-lg) !important; }`,
        "}",
      ].join("\n"),
    );
  });

  it("covers a stylesheet that loaded since the sheet was written on the next apply", () => {
    const doc = new FakeDocument();
    const html = root(doc);
    const theme = themeWith({ "shadow-opacity": "0.3" });
    applyThemeToElement(theme, html);
    expect(doc.headChildren("style")[0]!.textContent).toBe(SHADOW_OVERRIDE_CSS);

    const active = String.raw`.data-active\:shadow:is([data-active])`;
    doc.styleSheets.push({ cssRules: [shadowRule(active)] });
    applyThemeToElement(theme, html);

    const sheets = doc.headChildren("style");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.textContent).toBe(
      `${SHADOW_OVERRIDE_CSS}\n${active} { --tw-shadow: var(--shadow) !important; }`,
    );
  });
});

/** A compiled Tailwind shadow rule, as the CSSOM gives it. */
function shadowRule(selectorText: string) {
  const shadow = "0 4px 6px -1px var(--tw-shadow-color, #0000001a)";
  return {
    cssText: `${selectorText} { --tw-shadow: ${shadow}; }`,
    selectorText,
    style: {
      getPropertyValue: (property: string) =>
        property === "--tw-shadow" ? shadow : "",
    },
  };
}

describe("applyThemeToDocument", () => {
  it("loads the theme's Google fonts into that document and releases them", () => {
    const doc = new FakeDocument();
    const theme = themeWith({
      "font-sans": "Inter, ui-sans-serif, sans-serif",
      "font-heading": '"Source Serif 4", ui-serif, serif',
      "font-serif": "var(--font-fraunces), ui-serif, Georgia, serif",
      "font-mono": "ui-monospace, monospace",
    });

    applyThemeToDocument(doc.asDocument, theme, { loadFonts: true });
    applyThemeToDocument(doc.asDocument, theme, { loadFonts: true });
    const families = doc
      .headChildren("link")
      .map((link) => link.getAttribute("data-themer-font"));
    expect(families.sort()).toEqual(["Inter", "Source Serif 4"]);

    removeThemeFromDocument(doc.asDocument);
    expect(doc.head.children).toEqual([]);
    expect(doc.documentElement.style.length).toBe(0);
  });
});

describe("applyThemeToDocument over the head script", () => {
  it("replaces the head script's restore sheet in that document", () => {
    const doc = new FakeDocument();
    const restore = doc.createElement("style");
    restore.setAttribute("id", "themercn-restore");
    doc.head.appendChild(restore);

    applyThemeToDocument(doc.asDocument, themeWith({ primary: "#123456" }));

    expect(doc.getElementById("themercn-restore")).toBeNull();
    expect(root(doc).style.getPropertyValue("--primary")).toBe("#123456");
  });
});

describe("host extra colours", () => {
  afterEach(() => configureExtraColors());

  it("writes set extras as variables and removes them with the theme", () => {
    const doc = new FakeDocument();
    const html = root(doc);
    const theme = themeWith({ signal: "#3457FF", "success-foreground": "" });

    const keys = applyThemeToElement(theme, html);
    expect(doc.documentElement.style.getPropertyValue("--signal")).toBe(
      "#3457FF",
    );
    // An unset (blank) extra is not written: the host's CSS value shows.
    expect(keys).not.toContain("--success-foreground");

    applyThemeToElement(themeWith({}), html);
    expect(doc.documentElement.style.getPropertyValue("--signal")).toBe("");

    applyThemeToElement(theme, html);
    removeThemeFromElement(html);
    expect(doc.documentElement.style.length).toBe(0);
  });

  it("removes registered extras even without a record of the element", () => {
    configureExtraColors([
      { title: "Brand", colors: [{ key: "signal", label: "Signal" }] },
    ]);
    const doc = new FakeDocument();
    const html = root(doc);
    html.style.setProperty("--signal", "red");
    html.style.setProperty("--host-owned", "1");

    removeThemeFromElement(html);
    expect([...doc.documentElement.style.values.keys()]).toEqual([
      "--host-owned",
    ]);
  });
});
