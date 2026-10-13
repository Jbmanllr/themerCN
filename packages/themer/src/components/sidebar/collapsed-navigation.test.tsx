// @vitest-environment happy-dom

// The collapsed editor sidebar is a column of icon buttons. Each one names its
// panel for assistive technology (the tooltip alone is not a name), and
// pressing it opens that panel.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../themer-provider", () => ({
  useThemerContext: () => ({ config: { showTabAI: false } }),
}));

import { SidebarProvider } from "@villa/ui/components/sidebar";
import { useOverlayStore } from "../../stores/overlay-store";
import { CollapsedNavigation } from "./collapsed-navigation";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

beforeEach(async () => {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  useOverlayStore.setState({ activePanel: "colors" });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <SidebarProvider>
        <CollapsedNavigation />
      </SidebarProvider>,
    ),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

describe("CollapsedNavigation", () => {
  it("names every icon button by its panel", () => {
    const names = [...container.querySelectorAll("button")].map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(names).toEqual(["Colors", "Typography", "Other"]);
  });

  it("opens the panel of the pressed button", async () => {
    const typography = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Typography"]',
    );
    await act(async () => typography?.click());
    expect(useOverlayStore.getState().activePanel).toBe("typography");
  });
});
