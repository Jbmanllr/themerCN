// Pins the inspector's class matching: which utilities count as editor colour
// tokens (`matchThemeClasses`: whole classes only; variants, opacity and
// important markers allowed; shadow-color and unknown tokens ignored), the
// ancestor walk over duck-typed nodes (`findThemeClasses`, SVG `baseVal`),
// how a class splits for display (`segmentClassName`, e.g. `ring-offset` +
// `background`), and that registered Host extra colours become inspectable.
import { afterEach, describe, expect, it } from "vitest";
import { configureExtraColors } from "../../../config/extra-colors";
import { segmentClassName } from "./segment-classname";
import {
  INSPECTABLE_COLOR_KEYS,
  createThemeClassRegex,
  findThemeClasses,
  matchThemeClasses,
} from "./theme-class-regex";

describe("theme class regex", () => {
  it("is built from the editor's colour keys, without shadow-color", () => {
    expect(INSPECTABLE_COLOR_KEYS).toContain("sidebar-primary-foreground");
    expect(INSPECTABLE_COLOR_KEYS).not.toContain("shadow-color");
    const regex = createThemeClassRegex(["brand"]);
    expect(regex.test("bg-brand")).toBe(true);
    expect(regex.test("bg-primary")).toBe(false);
  });

  it.each([
    "bg-primary",
    "text-muted-foreground",
    "border-input",
    "ring-ring",
    "fill-chart-1",
    "stroke-chart-5",
    "outline-ring",
    "decoration-primary",
    "caret-primary",
    "divide-border",
    "from-primary",
    "via-accent",
    "to-secondary",
    "ring-offset-background",
    "bg-primary/90",
    "bg-card/[0.35]",
    "hover:bg-accent",
    "data-[state=open]:bg-accent/50",
    "dark:hover:text-sidebar-accent-foreground",
    "[&_svg]:text-muted-foreground",
    "!bg-primary",
    "bg-primary!",
  ])("matches %s", (className) => {
    expect(matchThemeClasses(className)).toEqual([className]);
  });

  it.each([
    "bg-blue-500",
    "text-sm",
    "border",
    "border-2",
    "shadow-sm",
    "bg-primary-500",
    "font-sans",
    "rounded-lg",
    "xbg-primary",
    "bg-primary/1000",
  ])("ignores %s", (className) => {
    expect(matchThemeClasses(className)).toEqual([]);
  });

  it("keeps source order and drops duplicates", () => {
    expect(
      matchThemeClasses("p-4 text-foreground bg-card text-foreground border"),
    ).toEqual(["text-foreground", "bg-card"]);
  });
});

describe("findThemeClasses", () => {
  type Node = {
    nodeType: number;
    parentElement: Node | null;
    className: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const node = (className: unknown, parentElement: Node | null): Node => ({
    nodeType: 1,
    parentElement,
    className,
    getBoundingClientRect: () => ({}) as DOMRect,
  });

  it("walks up to the nearest ancestor with token classes", () => {
    const root = node("bg-background", null);
    const card = node("bg-card text-card-foreground", root);
    const label = node("text-sm", card);
    expect(findThemeClasses(label, root)).toEqual({
      element: card,
      matches: ["bg-card", "text-card-foreground"],
    });
  });

  it("stops at the boundary and ignores non-elements", () => {
    const root = node("bg-background", null);
    const child = node("p-2", root);
    expect(findThemeClasses(child, root)).toBeNull();
    expect(findThemeClasses({ nodeType: 3 }, null)).toBeNull();
    expect(findThemeClasses(null, null)).toBeNull();
  });

  it("reads SVG class names from baseVal", () => {
    const svg = node({ baseVal: "fill-primary" }, null);
    expect(findThemeClasses(svg, null)?.matches).toEqual(["fill-primary"]);
  });
});

describe("segmentClassName", () => {
  it("splits variants, prefix, value and opacity", () => {
    expect(segmentClassName("hover:bg-primary/90")).toEqual({
      selector: "hover",
      prefix: "bg",
      value: "primary",
      opacity: "90",
    });
  });

  it("keeps multi-word tokens and bracketed variants whole", () => {
    expect(
      segmentClassName("data-[state=open]:text-sidebar-accent-foreground"),
    ).toEqual({
      selector: "data-[state=open]",
      prefix: "text",
      value: "sidebar-accent-foreground",
      opacity: null,
    });
  });

  it("uses the two-word ring-offset prefix", () => {
    expect(segmentClassName("ring-offset-background")).toMatchObject({
      prefix: "ring-offset",
      value: "background",
    });
  });

  it("drops important markers and keeps arbitrary opacity", () => {
    expect(segmentClassName("!bg-card/[0.35]")).toEqual({
      selector: null,
      prefix: "bg",
      value: "card",
      opacity: "[0.35]",
    });
  });
});

describe("host extra colours", () => {
  afterEach(() => configureExtraColors());

  it("matches classes of registered extra colours", () => {
    expect(matchThemeClasses("bg-signal text-signal-foreground")).toEqual([]);
    configureExtraColors([
      {
        title: "Brand",
        colors: [
          { key: "signal", label: "Signal" },
          { key: "signal-foreground", label: "Signal Foreground" },
        ],
      },
    ]);
    expect(
      matchThemeClasses("bg-signal hover:text-signal-foreground/80 p-2"),
    ).toEqual(["bg-signal", "hover:text-signal-foreground/80"]);
  });
});
