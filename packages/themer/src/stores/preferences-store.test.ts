// Proves migratePreferences, the persisted-preferences upgrade: the merged
// "custom" preview tab becomes "live" (v0 -> v1), the legacy section open
// states move into `sectionStates` once and never override stored ones
// (v1 -> v2), and a current version is returned untouched without reading
// the legacy key.
import { describe, expect, it } from "vitest";

import { PREFERENCES_VERSION, migratePreferences } from "./preferences-store";

const noLegacy = () => undefined;

describe("migratePreferences", () => {
  it("moves the merged Custom preview tab to Live", () => {
    expect(migratePreferences({ previewTab: "custom" }, 0, noLegacy)).toEqual({
      previewTab: "live",
    });
  });

  it("leaves other tabs for the preview tabs to normalise", () => {
    expect(migratePreferences({ previewTab: "unknown" }, 0, noLegacy)).toEqual({
      previewTab: "unknown",
    });
    expect(
      migratePreferences({ previewTab: "custom" }, PREFERENCES_VERSION),
    ).toEqual({ previewTab: "custom" });
  });

  it("moves the legacy section open states into sectionStates once", () => {
    const legacy = { "colors-base": true, "other-hsl": false };
    expect(
      migratePreferences({ previewTab: "cards" }, 1, () => legacy),
    ).toEqual({ previewTab: "cards", sectionStates: legacy });
  });

  it("does not read the legacy states at the current version", () => {
    let reads = 0;
    migratePreferences({}, PREFERENCES_VERSION, () => {
      reads += 1;
      return { a: true };
    });
    expect(reads).toBe(0);
  });

  it("keeps stored section states over the legacy key", () => {
    expect(
      migratePreferences({ sectionStates: { x: true } }, 1, () => ({
        x: false,
      })),
    ).toEqual({ sectionStates: { x: true } });
  });
});
