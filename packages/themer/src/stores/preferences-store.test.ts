// Proves migratePreferences, the persisted-preferences upgrade: the merged
// "custom" preview tab becomes "live" (v0 -> v1), and a current version is
// returned untouched.
import { describe, expect, it } from "vitest";

import { PREFERENCES_VERSION, migratePreferences } from "./preferences-store";

describe("migratePreferences", () => {
  it("moves the merged Custom preview tab to Live", () => {
    expect(migratePreferences({ previewTab: "custom" }, 0)).toEqual({
      previewTab: "live",
    });
  });

  it("leaves other tabs for the preview tabs to normalise", () => {
    expect(migratePreferences({ previewTab: "unknown" }, 0)).toEqual({
      previewTab: "unknown",
    });
    expect(
      migratePreferences({ previewTab: "custom" }, PREFERENCES_VERSION),
    ).toEqual({ previewTab: "custom" });
  });
});
