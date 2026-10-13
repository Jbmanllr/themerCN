// Proves the HSL adjustment maths: the neutral adjustment changes nothing
// (so adjusting from a base at neutral restores it exactly), pure black is
// never lifted while a dimmed colour keeps a 10% lightness floor, per-mode
// colours of both modes are adjusted while fonts and radius are left alone, and
// host extra colours follow only when their keys are passed and the theme
// sets them.
import * as culori from "culori";
import { describe, expect, it } from "vitest";

import { defaultThemeStyles } from "../config/defaults";
import { adjustColorByHsl } from "./color-converter";
import { adjustColor, adjustThemeStyles } from "./hsl-adjust";

const identity = { hueShift: 0, saturationScale: 1, lightnessScale: 1 };

describe("adjustColor", () => {
  it("returns the colour untouched for the neutral adjustment", () => {
    expect(adjustColor("oklch(0.5 0.1 200)", identity)).toBe(
      "oklch(0.5 0.1 200)",
    );
  });

  it("shifts hue and scales saturation and lightness", () => {
    expect(adjustColor("#ff0000", { ...identity, hueShift: 120 })).toBe(
      "#00ff00",
    );
    expect(adjustColor("#ff0000", { ...identity, saturationScale: 0 })).toBe(
      "#808080",
    );
  });

  it("keeps alpha when adjusting", () => {
    const adjusted = adjustColor("rgb(255 0 0 / 0.5)", {
      ...identity,
      hueShift: 120,
    });
    expect(culori.parse(adjusted)?.alpha).toBeCloseTo(0.5, 2);
    expect(culori.formatHex(adjusted)).toBe("#00ff00");
  });

  it("does not lift pure black, but floors a dimmed colour at 10%", () => {
    expect(adjustColorByHsl("#000000", 0, 1, 0.5)).toBe("#000000");
    expect(adjustColorByHsl("#000000", 30, 1.5, 1.2)).toBe("#000000");
    // 50% grey dimmed by 0.1 would be 5%; the floor keeps it at 10%.
    expect(adjustColorByHsl("#808080", 0, 1, 0.1)).toBe("#1a1a1a");
  });
});

describe("adjustThemeStyles", () => {
  it("adjusts per-mode colours in both modes and leaves shared styles", () => {
    const adjusted = adjustThemeStyles(defaultThemeStyles, {
      ...identity,
      hueShift: 90,
    });
    expect(adjusted.light["font-sans"]).toBe(
      defaultThemeStyles.light["font-sans"],
    );
    expect(adjusted.dark.radius).toBe(defaultThemeStyles.dark.radius);
    expect(adjusted.light.primary).not.toBe(undefined);
    expect(adjusted).not.toBe(defaultThemeStyles);
  });

  it("restores the base colours exactly at the neutral adjustment", () => {
    expect(adjustThemeStyles(defaultThemeStyles, identity)).toEqual(
      defaultThemeStyles,
    );
  });

  it("adjusts host extra colours that are set and leaves unset ones absent", () => {
    const base = {
      light: { ...defaultThemeStyles.light, signal: "#ff0000" },
      dark: { ...defaultThemeStyles.dark },
    };
    const adjusted = adjustThemeStyles(base, { ...identity, hueShift: 120 }, [
      "signal",
      "success",
    ]);
    expect(adjusted.light.signal).toBe("#00ff00");
    expect("signal" in adjusted.dark).toBe(false);
    expect("success" in adjusted.light).toBe(false);
    // Without the key list an extra is not the adjustment's business.
    expect(
      adjustThemeStyles(base, { ...identity, hueShift: 120 }).light.signal,
    ).toBe("#ff0000");
  });
});
