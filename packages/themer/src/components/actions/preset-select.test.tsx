// @vitest-environment happy-dom

// The preset control is a combobox with arrows either side of it. Each of the
// three has to be named for assistive technology (the trigger carried only
// swatches and a label that changes), and the arrows step through the list.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPresetIds } from "../../config/presets";
import { PresetSelect } from "./preset-select";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
const onChange = vi.fn<(preset: string) => void>();

const byTestId = (id: string) =>
  container.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;

beforeEach(async () => {
  onChange.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const ids = getPresetIds();
  await act(async () =>
    root?.render(<PresetSelect value={ids[0]!} onChange={onChange} />),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

describe("PresetSelect", () => {
  it("names the trigger and both arrows", () => {
    expect(byTestId("themer-preset-trigger").getAttribute("aria-label")).toBe(
      "Theme preset",
    );
    expect(byTestId("themer-preset-trigger").getAttribute("role")).toBe(
      "combobox",
    );
    expect(byTestId("themer-preset-previous").getAttribute("aria-label")).toBe(
      "Previous theme",
    );
    expect(byTestId("themer-preset-next").getAttribute("aria-label")).toBe(
      "Next theme",
    );
  });

  it("steps to the next preset, and from the first back around to the last", async () => {
    const ids = getPresetIds();
    expect(ids.length).toBeGreaterThan(2);

    await act(async () => byTestId("themer-preset-next").click());
    expect(onChange).toHaveBeenLastCalledWith(ids[1]);

    await act(async () => byTestId("themer-preset-previous").click());
    expect(onChange).toHaveBeenLastCalledWith(ids.at(-1));
  });
});
