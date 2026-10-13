// @vitest-environment happy-dom

// Every editor panel is built from collapsible sections. The title is a real
// heading wrapping the toggle button (a button cannot contain a heading, and
// section titles were missing from screen-reader heading navigation). The open
// state is remembered per section id, a search match can force a section open
// without changing what is remembered, and the content stays mounted while
// closed so the colour pickers inside stay registered for focus jumps.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePreferencesStore } from "../../stores/preferences-store";
import { ControlSection } from "./control-section";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

async function mount(props: Partial<Parameters<typeof ControlSection>[0]>) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <ControlSection
        title="Primary colors"
        description="Brand and action colors"
        headerAction={<button type="button">Reset</button>}
        {...props}
      >
        <input aria-label="Inside" />
      </ControlSection>,
    ),
  );
}

const toggle = () =>
  container.querySelector<HTMLButtonElement>("h3 button[aria-expanded]")!;

beforeEach(() => {
  usePreferencesStore.setState({ sectionStates: {} });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

describe("ControlSection", () => {
  it("makes the title a heading around the toggle, with the header action outside it", async () => {
    await mount({});

    const heading = container.querySelector("h3");
    expect(heading?.textContent).toContain("Primary colors");
    expect(heading?.textContent).toContain("Brand and action colors");
    expect(heading?.querySelector("button")).toBe(toggle());
    // A control beside the title is not part of the toggle or the heading.
    expect(toggle().textContent).not.toContain("Reset");
    expect(heading?.textContent).not.toContain("Reset");
  });

  it("opens and closes from the toggle and keeps the content mounted while closed", async () => {
    await mount({});
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector('input[aria-label="Inside"]'),
    ).not.toBeNull();

    await act(async () => toggle().click());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    await act(async () => toggle().click());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector('input[aria-label="Inside"]'),
    ).not.toBeNull();
  });

  it("remembers the open state under its id", async () => {
    await mount({ id: "colors-primary" });
    await act(async () => toggle().click());
    expect(usePreferencesStore.getState().sectionStates["colors-primary"]).toBe(
      true,
    );
  });

  it("opens from the remembered state, and a search match forces it open without changing that", async () => {
    usePreferencesStore.setState({
      sectionStates: { "colors-primary": false },
    });
    await mount({ id: "colors-primary", forceOpen: true });

    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(usePreferencesStore.getState().sectionStates["colors-primary"]).toBe(
      false,
    );
  });
});
