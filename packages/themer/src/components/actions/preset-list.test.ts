// The picker's list rules: search, prev/next cycling and shuffle all act on
// the filtered list; the "New" badge window is five days; the trigger label
// carries `*` only while edits are unsaved. `now` and `random` are injected.
import { describe, expect, it } from "vitest";
import {
  cyclePresetId,
  filterPresetIds,
  formatPresetTriggerLabel,
  isPresetNew,
  pickRandomPresetId,
} from "./preset-list";

const labels: Record<string, string> = {
  default: "Default",
  "ocean-breeze": "Ocean Breeze",
  "themer-ocean-breeze": "Ocean Breeze (Themer)",
  nature: "Nature",
  banter: "Banter",
};
const ids = Object.keys(labels);
const getLabel = (id: string) => labels[id] ?? id;

describe("preset list filtering and cycling", () => {
  it("filters by id or label, case-insensitively", () => {
    expect(filterPresetIds(ids, "  OCEAN ", getLabel)).toEqual([
      "ocean-breeze",
      "themer-ocean-breeze",
    ]);
    expect(filterPresetIds(ids, "", getLabel)).toEqual(ids);
  });

  it("cycles within the filtered list and wraps around", () => {
    const filtered = filterPresetIds(ids, "ocean", getLabel);
    expect(cyclePresetId(filtered, "ocean-breeze", "next")).toBe(
      "themer-ocean-breeze",
    );
    expect(cyclePresetId(filtered, "themer-ocean-breeze", "next")).toBe(
      "ocean-breeze",
    );
    expect(cyclePresetId(filtered, "ocean-breeze", "prev")).toBe(
      "themer-ocean-breeze",
    );
  });

  it("enters the filtered list at its ends when the current preset is filtered out", () => {
    const filtered = filterPresetIds(ids, "ocean", getLabel);
    expect(cyclePresetId(filtered, "banter", "next")).toBe("ocean-breeze");
    expect(cyclePresetId(filtered, "banter", "prev")).toBe(
      "themer-ocean-breeze",
    );
    expect(cyclePresetId([], "banter", "next")).toBeUndefined();
  });

  it("shuffles to another preset of the filtered list", () => {
    const filtered = filterPresetIds(ids, "ocean", getLabel);
    for (const r of [0, 0.5, 0.999]) {
      expect(pickRandomPresetId(filtered, "ocean-breeze", () => r)).toBe(
        "themer-ocean-breeze",
      );
    }
    expect(pickRandomPresetId(["banter"], "banter", () => 0.7)).toBe("banter");
    expect(pickRandomPresetId([], "banter")).toBeUndefined();
  });
});

describe("preset badges and markers", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");

  it("marks presets created within five days as new", () => {
    expect(isPresetNew("2026-10-01", now)).toBe(true);
    expect(isPresetNew("2026-09-27", now)).toBe(false);
    expect(isPresetNew(undefined, now)).toBe(false);
    expect(isPresetNew("not a date", now)).toBe(false);
  });

  it("adds * to the label only while edits are unsaved", () => {
    expect(formatPresetTriggerLabel("Banter", true)).toBe("Banter*");
    expect(formatPresetTriggerLabel("Banter", false)).toBe("Banter");
  });
});
