// Proves parseLength reads the mixed units the editor stores (`normal`,
// unitless, px, rem, em) in the unit a control edits, falls back for anything
// else, and that clampToRange pins a pill radius to a slider's maximum.
import { describe, expect, it } from "vitest";

import { clampToRange, parseLength } from "./length";

describe("parseLength", () => {
  it("reads `normal` letter spacing as zero", () => {
    expect(parseLength("normal", "em")).toBe(0);
  });

  it("takes a unitless number in the target unit", () => {
    expect(parseLength("0", "px")).toBe(0);
    expect(parseLength("0.25", "rem")).toBe(0.25);
  });

  it("converts px to rem at 16px and back", () => {
    expect(parseLength("9999px", "rem")).toBeCloseTo(624.9375);
    expect(parseLength("0.5rem", "px")).toBe(8);
  });

  it("treats rem and em alike", () => {
    expect(parseLength("-0.025em", "em")).toBe(-0.025);
    expect(parseLength("0.75rem", "em")).toBe(0.75);
  });

  it("returns the fallback for values it cannot read", () => {
    expect(parseLength(undefined, "px", 3)).toBe(3);
    expect(parseLength("calc(1px + 2px)", "px", 3)).toBe(3);
    expect(parseLength("var(--x)", "rem", 1)).toBe(1);
  });
});

describe("clampToRange", () => {
  it("keeps a pill radius on the slider's maximum", () => {
    expect(clampToRange(parseLength("9999px", "rem"), 0, 5)).toBe(5);
  });
});
